import type { ICrawlerAdapter, SearchFilters, Job } from '@visapilot/shared';
import { JobSource } from '@visapilot/shared';
import type { CrawlerResult, CrawlerError, CrawledJob } from './types';
import { GreenhouseAdapter } from './adapters/greenhouse.ts';
import { LeverAdapter } from './adapters/lever.ts';
import { AshbyAdapter } from './adapters/ashby.ts';
import { RSSAdapter } from './adapters/rss.ts';
import { LinkedInAdapter } from './adapters/linkedin.ts';
import { IndeedAdapter } from './adapters/indeed.ts';
import { GoogleJobsAdapter } from './adapters/google.ts';
import { config } from '@visapilot/config';

export class CrawlerService {
  private adapters: Map<JobSource, ICrawlerAdapter> = new Map();
  private configuredBoardTokens: string[] = [];
  private isRunning = false;
  private errors: CrawlerError[] = [];

  constructor() {
    this.registerAdapters();
  }

  private registerAdapters(): void {
    // Greenhouse — curated global visa-sponsoring tech companies across US/UK/EU/APAC/CA
    const greenhouseBoards = [
      // Global Visa Sponsor Hubs (UK / EU / APAC / CA)
      'monzo',
      'wise',
      'deliveroo',
      'booking',
      'adyen',
      'zalando',
      'deliveryhero',
      'hellofresh',
      'n26',
      'klarna',
      'canva',
      'atlassian',
      'grab',
      'checkout',
      'starlingbank',
      'skyscanner',
      'miro',
      'mollie',
      'personio',
      'celonis',
      'intercom',
      'mercari',
      'airwallex',
      'xero',
      // Big Tech & Cloud
      'cloudflare',
      'datadog',
      'shopify',
      'mongodb',
      'gitlab',
      'elastic',
      'twilio',
      'dropbox',
      // Fintech & SaaS
      'stripe',
      'gusto',
      'duolingo',
      'plaid',
      'figma',
      'notion',
      'robinhood',
      'mercury',
      'brex',
      // AI / Infra
      'openai',
      'vercel',
      'linear',
      'ramp',
      'supabase',
      // International-friendly
      'airbnb',
      'reddit',
      'lyft',
      'coinbase',
    ];
    const greenhouse = new GreenhouseAdapter(greenhouseBoards);

    // Lever — curated global & verified boards
    const leverBoards = [
      'spotify',
      'revolut',
      'wise',
      'deliveroo',
      'canva',
      'atlassian',
      'klarna',
      'n26',
      'grab',
      'cohere',
      'wealthsimple',
      'figma',
      'affirm',
      'square',
      'coinbase',
      'doordash',
      'lyft',
      'palantir',
      'reddit',
      'pinterest',
      'zendesk',
      'amplitude',
      'verkada',
    ];
    const lever = new LeverAdapter(leverBoards);

    // Ashby — curated high-growth & global sponsor boards
    const ashbyBoards = [
      'revolut',
      'monzo',
      'cohere',
      'retool',
      'fly',
      'resend',
      'turso',
      'dbt-labs',
      'airbyte',
      'mattermost',
      'temporal',
    ];
    const ashby = new AshbyAdapter(ashbyBoards);

    this.configuredBoardTokens = Array.from(
      new Set([...greenhouseBoards, ...leverBoards, ...ashbyBoards]),
    );

    // RSS feeds — remote & visa-focused worldwide feeds
    const rss = new RSSAdapter({ baseUrl: '' });
    rss.configureFeeds([
      'https://weworkremotely.com/categories/remote-programming-jobs.rss',
      'https://jobicy.com/?feed=job_feed',
      'https://nodesk.co/remote-jobs/index.xml',
      'https://remoteok.com/remote-jobs.rss',
    ]);

    const linkedin = new LinkedInAdapter();
    const google = new GoogleJobsAdapter(config.SERP_API_KEY);

    this.adapters.set(JobSource.GREENHOUSE, greenhouse);
    this.adapters.set(JobSource.LEVER, lever);
    this.adapters.set(JobSource.ASHBY, ashby);
    this.adapters.set(JobSource.RSS, rss);
    this.adapters.set(JobSource.LINKEDIN, linkedin);
    this.adapters.set(JobSource.GOOGLE_JOBS, google);

    if (config.PROXY_API_KEY && config.PROXY_API_KEY !== 'your_proxy_api_key_here') {
      this.adapters.set(JobSource.INDEED, new IndeedAdapter());
    }
  }

  getRegisteredSources(): JobSource[] {
    return Array.from(this.adapters.keys());
  }

  getAdapter(source: JobSource): ICrawlerAdapter | undefined {
    return this.adapters.get(source);
  }

  getConfiguredBoardTokens(): string[] {
    return [...this.configuredBoardTokens];
  }

  async searchJobs(
    filters: SearchFilters,
    sources?: JobSource[],
  ): Promise<CrawlerResult> {
    this.isRunning = true;
    this.errors = [];
    const startTime = Date.now();

    const activeSources = (sources || Object.values(JobSource).filter(
      (s) => s !== JobSource.MANUAL && s !== JobSource.COMPANY_CAREER,
    )).filter(s => this.adapters.has(s));

    // Run ALL adapters in parallel with a 20-second hard timeout each.
    // This cuts total crawl time from O(n*latency) → O(max_single_latency).
    const ADAPTER_TIMEOUT_MS = 12_000;

    const adapterResults = await Promise.allSettled(
      activeSources.map(async (source) => {
        const adapter = this.adapters.get(source)!;
        const jobs: CrawledJob[] = [];

        const collectJobs = async () => {
          for await (const job of adapter.searchJobs(filters)) {
            jobs.push(this.jobToCrawledJob(job, source));
          }
          return jobs;
        };

        let timerId: ReturnType<typeof setTimeout> | undefined;
        const timeoutPromise = new Promise<never>((_, reject) => {
          timerId = setTimeout(
            () => reject(new Error(`Adapter ${source} timed out after ${ADAPTER_TIMEOUT_MS}ms`)),
            ADAPTER_TIMEOUT_MS,
          );
        });

        try {
          return await Promise.race([collectJobs(), timeoutPromise]);
        } finally {
          if (timerId !== undefined) clearTimeout(timerId);
        }
      }),
    );

    const allJobs: CrawledJob[] = [];
    for (let i = 0; i < adapterResults.length; i++) {
      const result = adapterResults[i];
      if (result.status === 'fulfilled') {
        allJobs.push(...result.value);
      } else {
        this.errors.push({
          source: activeSources[i],
          code: 'CRAWL_ERROR',
          message: result.reason instanceof Error ? result.reason.message : 'Unknown crawler error',
          retryable: true,
        });
      }
    }

    const duration = Date.now() - startTime;

    return {
      jobs: allJobs,
      errors: this.errors,
      metadata: {
        source: JobSource.MANUAL,
        totalFetched: allJobs.length,
        totalProcessed: allJobs.length,
        duration,
        cached: false,
      },
    };
  }

  async crawlSource(
    source: JobSource,
    filters: SearchFilters,
  ): Promise<CrawlerResult> {
    const adapter = this.adapters.get(source);
    if (!adapter) {
      throw new Error(`No adapter registered for source: ${source}`);
    }

    const startTime = Date.now();
    const jobs: CrawledJob[] = [];

    try {
      for await (const job of adapter.searchJobs(filters)) {
        const crawledJob = this.jobToCrawledJob(job, source);
        jobs.push(crawledJob);
      }
    } catch (error) {
      return {
        jobs: [],
        errors: [{
          source,
          code: 'CRAWL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          retryable: true,
        }],
        metadata: {
          source,
          totalFetched: 0,
          totalProcessed: 0,
          duration: Date.now() - startTime,
          cached: false,
        },
      };
    }

    return {
      jobs,
      errors: [],
      metadata: {
        source,
        totalFetched: jobs.length,
        totalProcessed: jobs.length,
        duration: Date.now() - startTime,
        cached: false,
      },
    };
  }

  async getJobDetails(source: JobSource, externalId: string): Promise<Job | null> {
    const adapter = this.adapters.get(source);
    if (!adapter) return null;

    try {
      return await adapter.getJobDetails(externalId);
    } catch {
      return null;
    }
  }

  async *streamSearchJobs(
    filters: SearchFilters,
    sources?: JobSource[],
    batchSize = 10
  ): AsyncGenerator<CrawledJob[]> {
    this.isRunning = true;
    this.errors = [];

    const activeSources = (sources || Object.values(JobSource).filter(
      (s) => s !== JobSource.MANUAL && s !== JobSource.COMPANY_CAREER,
    )).filter(s => this.adapters.has(s));

    const ADAPTER_TIMEOUT_MS = 20_000;

    let buffer: CrawledJob[] = [];
    let activeAdapters = activeSources.length;
    let notify: () => void;
    let p = new Promise<void>(resolve => { notify = resolve; });

    activeSources.forEach(source => {
      const adapter = this.adapters.get(source)!;
      (async () => {
        try {
          const iterator = adapter.searchJobs(filters);
          while (true) {
            let timerId: ReturnType<typeof setTimeout> | undefined;
            const timeoutPromise = new Promise<never>((_, reject) => {
              timerId = setTimeout(() => reject(new Error('timeout')), ADAPTER_TIMEOUT_MS);
            });
            let stepResult: IteratorResult<Job>;
            try {
              stepResult = await Promise.race([iterator.next(), timeoutPromise]);
            } finally {
              if (timerId !== undefined) clearTimeout(timerId);
            }
            const { value: job, done } = stepResult;
            if (done) break;
            if (job) {
              buffer.push(this.jobToCrawledJob(job, source));
              notify();
            }
          }
        } catch (err) {
          this.errors.push({
            source,
            code: 'CRAWL_ERROR',
            message: err instanceof Error ? err.message : 'Unknown crawler error',
            retryable: true,
          });
        } finally {
          activeAdapters--;
          notify();
        }
      })();
    });

    while (activeAdapters > 0 || buffer.length > 0) {
      if (buffer.length >= batchSize || (activeAdapters === 0 && buffer.length > 0)) {
        const batch = buffer.splice(0, batchSize);
        yield batch;
      } else {
        await p;
        p = new Promise<void>(resolve => { notify = resolve; });
      }
    }
  }

  stop(): void {
    this.isRunning = false;
  }

  getStatus(): { running: boolean; errors: number; adapters: number } {
    return {
      running: this.isRunning,
      errors: this.errors.length,
      adapters: this.adapters.size,
    };
  }

  private jobToCrawledJob(job: Job, source: JobSource): CrawledJob {
    return {
      externalId: job.externalId || job.id,
      title: job.title,
      companyName: job.company.name,
      description: job.description,
      requirements: job.requirements,
      responsibilities: job.responsibilities,
      location: job.location,
      country: job.country,
      remote: job.remote,
      workMode: job.workMode,
      type: job.type,
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      salaryCurrency: job.salaryCurrency,
      source,
      sourceUrl: job.sourceUrl,
      applyUrl: (job as any).applyUrl,
      skills: job.skills,
      category: job.category,
      department: job.department,
      experienceLevel: job.experienceLevel,
      educationLevel: (job as any).educationLevel,
      postedAt: job.postedAt,
      expiresAt: job.expiresAt,
    };
  }
}

export const crawlerService = new CrawlerService();
