import { JobSource } from '@visapilot/shared';
import type { ICrawlerAdapter, SearchFilters, Job, CrawlerConfig } from '@visapilot/shared';
import type { CrawlerAdapterConfig, CrawledJob, CrawlerError } from '../types';

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
    const countryMap: Record<string, string> = {
      'united states': 'United States',
      'usa': 'United States',
      'uk': 'United Kingdom',
      'united kingdom': 'United Kingdom',
      'canada': 'Canada',
      'australia': 'Australia',
      'germany': 'Germany',
      'france': 'France',
      'netherlands': 'Netherlands',
      'singapore': 'Singapore',
      'japan': 'Japan',
      'india': 'India',
    };

    const lower = location.toLowerCase();
    for (const [key, country] of Object.entries(countryMap)) {
      if (lower.includes(key)) {
        return country;
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
}

