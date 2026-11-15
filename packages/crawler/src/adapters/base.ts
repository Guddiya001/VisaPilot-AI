import { JobSource, VisaSponsorshipStatus } from '@visapilot/shared';
import type { ICrawlerAdapter, SearchFilters, Job, CrawlerConfig } from '@visapilot/shared';
import type { CrawlerAdapterConfig, CrawlerError } from '../types';
import {
  COUNTRY_CITY_LOOKUP,
  NON_TECHNICAL_TITLES as DISCOVERY_NON_TECHNICAL_TITLES,
  TECH_AND_ROLE_ALIASES,
  buildSafeTermRegex,
  resolveCountryRegionCodes,
  scoreTokenizedRelevance,
} from '../discovery/query-expander.ts';
import { classifySponsorshipTwoTier } from '../discovery/visa-classifier.ts';
import type { VisaClassifiableJob } from '../discovery/visa-classifier.ts';

export abstract class BaseCrawlerAdapter implements ICrawlerAdapter {
  abstract readonly source: JobSource;
  abstract readonly name: string;

  protected config: CrawlerAdapterConfig;
  protected initialized = false;

  constructor(source: JobSource, config: Partial<CrawlerAdapterConfig>) {
    this.config = {
      source,
      baseUrl: config.baseUrl || '',
      apiKey: config.apiKey,
      rateLimitPerMinute: config.rateLimitPerMinute || 60,
      maxRetries: config.maxRetries || 3,
      timeout: config.timeout || 30000,
    };
  }

  abstract initialize(): Promise<void>;
  abstract searchJobs(filters: SearchFilters): AsyncGenerator<Job>;
  abstract getJobDetails(externalId: string): Promise<Job>;
  abstract normalizeJob(rawJob: Record<string, unknown>): Job;

  validateConfig(config: CrawlerConfig): boolean {
    return !!config.sourceUrl;
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  protected async makeRequest(url: string, options: RequestInit = {}): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          ...options,
          signal: AbortSignal.timeout(this.config.timeout),
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'VisaPilot-AI/1.0',
            ...options.headers,
          },
        });

        if (response.ok) {
          return response;
        }

        // 404 from Greenhouse means board exists but no active jobs — return response gracefully
        if (response.status === 404) {
          return response;
        }

        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('Retry-After') || '5', 10);
          await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
          continue;
        }

        if (response.status >= 400 && response.status < 500) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        if (attempt < this.config.maxRetries - 1) {
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  protected createError(
    code: string,
    message: string,
    url?: string,
    retryable = true,
  ): CrawlerError {
    return {
      source: this.source,
      url,
      code,
      message,
      retryable,
    };
  }

  protected extractCountry(location: string): string {
    const codes = resolveCountryRegionCodes(location, true);
    if (codes.length > 0) {
      const entry = COUNTRY_CITY_LOOKUP.find((c) => c.code === codes[0]);
      if (entry) {
        return entry.country;
      }
    }

    const parts = location.split(',').map((p) => p.trim());
    return parts[parts.length - 1] || 'Unknown';
  }

  protected extractSalary(text: string): { min?: number; max?: number; currency?: string } {
    const rangePattern = /(\$|€|£)?(\d[\d,]*)\s*[-–to]+\s*(\$|€|£)?(\d[\d,]*)\s*(K|k)?\s*(per year|annually|\/yr|\/year)?/i;
    const rangeMatch = text.match(rangePattern);
    if (rangeMatch) {
      const currency = rangeMatch[1] || rangeMatch[3] || '$';
      const min = parseInt(rangeMatch[2].replace(/,/g, ''), 10);
      const max = parseInt(rangeMatch[4].replace(/,/g, ''), 10);
      const isK = rangeMatch[5]?.toLowerCase() === 'k';
      return {
        min: min * (isK ? 1000 : 1),
        max: max * (isK ? 1000 : 1),
        currency: currency === '$' ? 'USD' : currency === '€' ? 'EUR' : 'GBP',
      };
    }
    return {};
  }

  // ─── Shared Smart Filter Utilities ───

  /**
   * Common tech & role aliases shared with the query discovery module.
   */
  public static readonly TECH_ALIASES: Record<string, string[]> = TECH_AND_ROLE_ALIASES;

  public static readonly NON_TECHNICAL_TITLES = DISCOVERY_NON_TECHNICAL_TITLES;

  /**
   * Smart query matching using tokenized weighted overlap, alias expansion,
   * OR/comma group splitting, and non-technical title filtering.
   *
   * Returns true if the job matches the query (or if there's no query).
   */
  protected matchesQueryFilter(job: Job, query: string | undefined): boolean {
    if (!query || query.trim().length === 0) return true;

    return scoreTokenizedRelevance(query, {
      title: job.title,
      description: job.description,
      skills: job.skills,
    }).matched;
  }

  /**
   * Smart country/location matching using the expanded 9-region + global hub city lookup map.
   * Returns true if the job location matches any of the filter countries, or if no countries filter is set.
   */
  protected matchesCountryFilter(job: Job, countries: string[] | undefined): boolean {
    if (!countries?.length) return true;

    const location = job.location || '';
    const country = job.country || '';

    const jobCountryCodes = resolveCountryRegionCodes(country, false);
    const jobLocationCodes = resolveCountryRegionCodes(location, true);
    const jobCodes = new Set([...jobCountryCodes, ...jobLocationCodes]);

    return countries.some((fc) => {
      const fcl = fc.trim().toLowerCase();
      if (!fcl) return false;
      if (fcl === 'all' || fcl === 'worldwide' || fcl === 'global') return true;
      if (fcl === 'remote') {
        return job.remote === true || /\bremote\b/i.test(location);
      }

      const filterCodes = resolveCountryRegionCodes(fc, false);
      if (filterCodes.length > 0) {
        return filterCodes.some((code) => jobCodes.has(code));
      }

      // Fallback word-boundary match for regions/cities outside the core lookup map
      const fallbackReg = buildSafeTermRegex(fcl);
      return fallbackReg.test(country) || fallbackReg.test(location);
    });
  }

  /**
   * Executes async workers over items with bounded concurrency using Promise.allSettled.
   */
  protected async mapWithConcurrency<T, R>(
    items: readonly T[],
    concurrency: number,
    worker: (item: T, index: number) => Promise<R>,
  ): Promise<PromiseSettledResult<R>[]> {
    const results: PromiseSettledResult<R>[] = new Array(items.length);
    if (items.length === 0) return results;

    const workerCount = Math.max(1, Math.min(concurrency, items.length));
    let nextIndex = 0;

    const runWorker = async () => {
      while (true) {
        const currentIndex = nextIndex++;
        if (currentIndex >= items.length) break;
        try {
          const value = await worker(items[currentIndex], currentIndex);
          results[currentIndex] = { status: 'fulfilled', value };
        } catch (reason) {
          results[currentIndex] = { status: 'rejected', reason };
        }
      }
    };

    await Promise.allSettled(Array.from({ length: workerCount }, () => runWorker()));
    return results;
  }

  /**
   * Classifies job sponsorship via the Two-Tier classifier and maps it to VisaSponsorshipStatus.
   */
  protected classifyVisaStatus(job: VisaClassifiableJob): {
    visaSponsorship: VisaSponsorshipStatus;
    visaNotes: string;
  } {
    const classification = classifySponsorshipTwoTier(job);

    let visaSponsorship: VisaSponsorshipStatus;
    switch (classification.category) {
      case 'VISA_SPONSORED':
      case 'KNOWN_SPONSOR_SILENT':
        visaSponsorship = VisaSponsorshipStatus.SPONSORS;
        break;
      case 'RELOCATION_PROVIDED':
        visaSponsorship = VisaSponsorshipStatus.RELOCATION_SUPPORT;
        break;
      case 'NOT_SPONSORED':
        visaSponsorship = VisaSponsorshipStatus.DOES_NOT_SPONSOR;
        break;
      case 'UNCLEAR':
      default:
        visaSponsorship = VisaSponsorshipStatus.UNKNOWN;
        break;
    }

    const schemeLabel = classification.primaryScheme ? ` [${classification.primaryScheme}]` : '';
    const visaNotes = `${classification.category}${schemeLabel}: ${classification.evidence.join('; ')}`;

    return { visaSponsorship, visaNotes };
  }
}

