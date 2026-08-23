import type { ICrawlerAdapter, SearchFilters, Job } from '@visapilot/shared';
import { JobSource } from '@visapilot/shared';
import { jobNormalizer } from './normalizer';
import type { CrawlerResult, CrawlerError, CrawledJob } from './types';
import { GreenhouseAdapter } from './adapters/greenhouse';
import { LeverAdapter } from './adapters/lever';
import { AshbyAdapter } from './adapters/ashby';
import { RSSAdapter } from './adapters/rss';
import { LinkedInAdapter } from './adapters/linkedin';

export class CrawlerService {
  private adapters: Map<JobSource, ICrawlerAdapter> = new Map();
  private isRunning = false;
  private errors: CrawlerError[] = [];

  constructor() {
    this.registerAdapters();
  }

  private registerAdapters(): void {
    // Use real public board tokens and feeds to fetch actual live job data
    const greenhouse = new GreenhouseAdapter([
      'github',
      'dropbox',
      'razorpay',
      'automattic',
      'canonical',
      'postman',
      'cloudflare',
    ]);
    const lever = new LeverAdapter([
      'atlassian',
      'netflix',
      'spotify',
      'affirm',
      'figma',
    ]);
    const ashby = new AshbyAdapter([
      'linear',
      'retool',
      'openai',
      'ramp',
      'brex',
    ]);
    const rss = new RSSAdapter({ baseUrl: '' });
    rss.configureFeeds([
      'https://weworkremotely.com/categories/remote-programming-jobs.rss',
      'https://jobicy.com/?feed=job_feed',
      'https://nodesk.co/remote-jobs/index.xml',
    ]);
    const linkedin = new LinkedInAdapter();

    this.adapters.set(JobSource.GREENHOUSE, greenhouse);
    this.adapters.set(JobSource.LEVER, lever);
    this.adapters.set(JobSource.ASHBY, ashby);
    this.adapters.set(JobSource.RSS, rss);
    this.adapters.set(JobSource.LINKEDIN, linkedin);
  }

  async searchJobs(
    filters: SearchFilters,
    sources?: JobSource[],
  ): Promise<CrawlerResult> {
    this.isRunning = true;
    this.errors = [];
    const startTime = Date.now();
    const allJobs: CrawledJob[] = [];

    const activeSources = sources || Object.values(JobSource).filter(
      (s) => s !== JobSource.MANUAL && s !== JobSource.COMPANY_CAREER && s !== JobSource.GOOGLE_JOBS,
    );

    for (const source of activeSources) {
      if (!this.isRunning) break;

      const adapter = this.adapters.get(source);
      if (!adapter) continue;

      try {
        const isHealthy = await adapter.healthCheck();
        if (!isHealthy) {
          this.errors.push({
            source,
            code: 'HEALTH_CHECK_FAILED',
            message: `${source} adapter is not healthy`,
            retryable: true,
          });
          continue;
        }

        for await (const job of adapter.searchJobs(filters)) {
          const crawledJob = this.jobToCrawledJob(job, source);
          allJobs.push(crawledJob);
        }
      } catch (error) {
        this.errors.push({
          source,
          code: 'CRAWL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown crawler error',
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
