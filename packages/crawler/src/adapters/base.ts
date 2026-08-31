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

  // ─── Shared Smart Filter Utilities ───

  /**
   * Words to strip from search queries before matching against job data.
   * Includes visa/sponsorship terms (handled separately), common English stop words, and filler words.
   */
  private static readonly QUERY_STOP_WORDS = new Set([
    'jobs', 'job', 'for', 'with', 'and', 'the', 'a', 'an', 'in', 'at', 'of', 'to',
    'h1b', 'h-1b', 'visa', 'sponsorship', 'sponsor', 'remote', 'worldwide', 'global',
    'immigration', 'work', 'permit', 'relocation', 'engineer', 'developer', 'senior',
    'lead', 'staff', 'principal', 'junior', 'mid', 'level',
  ]);

  /**
   * Common tech aliases. When a user searches for one variant,
   * we also try the canonical alternatives.
   */
  private static readonly TECH_ALIASES: Record<string, string[]> = {
    'react': ['reactjs', 'react.js'],
    'reactjs': ['react', 'react.js'],
    'react.js': ['react', 'reactjs'],
    'node': ['nodejs', 'node.js'],
    'nodejs': ['node', 'node.js'],
    'node.js': ['node', 'nodejs'],
    'next': ['nextjs', 'next.js'],
    'nextjs': ['next', 'next.js'],
    'next.js': ['next', 'nextjs'],
    'vue': ['vuejs', 'vue.js'],
    'vuejs': ['vue', 'vue.js'],
    'typescript': ['ts'],
    'ts': ['typescript'],
    'javascript': ['js'],
    'js': ['javascript'],
    'python': ['py'],
    'golang': ['go'],
    'kubernetes': ['k8s'],
    'k8s': ['kubernetes'],
    'postgresql': ['postgres'],
    'postgres': ['postgresql'],
    'mongodb': ['mongo'],
    'mongo': ['mongodb'],
    'gen ai': ['genai', 'generative ai', 'llm'],
    'genai': ['gen ai', 'generative ai', 'llm'],
    'generative ai': ['gen ai', 'genai', 'llm'],
    'llm': ['gen ai', 'genai', 'generative ai'],
    'ci/cd': ['cicd'],
    'cicd': ['ci/cd'],
    'machine learning': ['ml'],
    'ml': ['machine learning'],
    'artificial intelligence': ['ai'],
  };

  /**
   * Smart query matching: parses user queries with OR/comma logic,
   * strips stop words, and matches ANY keyword group against the job.
   *
   * Query "Gen AI or ReactJS, Python" becomes groups: [["gen","ai"], ["reactjs"], ["python"]]
   * A job matches if ALL tokens within ANY single group appear in the haystack.
   *
   * Returns true if the job matches the query (or if there's no query).
   */
  protected matchesQueryFilter(job: Job, query: string | undefined): boolean {
    if (!query || query.trim().length === 0) return true;

    // Split query by "or" (case insensitive) and commas to create OR groups
    const orGroups = query
      .split(/\s+or\s+|,/i)
      .map(g => g.trim())
      .filter(g => g.length > 0);

    if (orGroups.length === 0) return true;

    const haystack = `${job.title} ${job.description || ''} ${(job.skills || []).join(' ')}`.toLowerCase();

    // A job matches if ANY group fully matches (all tokens in that group found)
    return orGroups.some(group => {
      // Tokenize the group, strip stop words and punctuation
      const tokens = group
        .toLowerCase()
        .replace(/[^a-z0-9+#./\s-]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 0 && !BaseCrawlerAdapter.QUERY_STOP_WORDS.has(w));

      if (tokens.length === 0) return true;

      // Check if all tokens in this group match (with alias expansion)
      return tokens.every(token => {
        // Direct match
        if (haystack.includes(token)) return true;

        // Alias-based match
        const aliases = BaseCrawlerAdapter.TECH_ALIASES[token];
        if (aliases) {
          return aliases.some(alias => haystack.includes(alias));
        }

        // Word-boundary match for very short tokens (2-3 chars)
        if (token.length <= 3) {
          const regex = new RegExp(`\\b${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
          return regex.test(haystack);
        }

        return false;
      });
    });
  }

  /**
   * Smart country/location matching with city → country inference.
   * Returns true if the job location matches any of the filter countries, or if no countries filter is set.
   */
  protected matchesCountryFilter(job: Job, countries: string[] | undefined): boolean {
    if (!countries?.length) return true;

    const location = (job.location || '').toLowerCase();
    const country = (job.country || '').toLowerCase();

    return countries.some(fc => {
      const fcl = fc.toLowerCase();
      if (country.includes(fcl) || location.includes(fcl)) return true;
      if ((fcl === 'united states' || fcl === 'us' || fcl === 'usa') &&
          /\b(ca|ny|tx|wa|il|co|ma|fl|ga|nj|nc|va|or|az|mn)\b|san francisco|new york|seattle|austin|boston|chicago|los angeles|remote/i.test(location)) return true;
      if ((fcl === 'united kingdom' || fcl === 'uk') &&
          /london|manchester|edinburgh|birmingham|bristol/i.test(location)) return true;
      if (fcl === 'canada' && /toronto|vancouver|montreal|ottawa/i.test(location)) return true;
      if (fcl === 'germany' && /berlin|munich|hamburg|frankfurt/i.test(location)) return true;
      if (fcl === 'remote') return job.remote === true;
      return false;
    });
  }
}

