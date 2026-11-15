import { randomUUID } from 'crypto';
import { JobSource, JobType, WorkMode } from '@visapilot/shared';
import type { Job, SearchFilters } from '@visapilot/shared';
import { BaseCrawlerAdapter } from './base.ts';
import {
  COUNTRY_CITY_LOOKUP,
  expandGlobalVisaQueries,
  resolveCountryRegionCodes,
} from '../discovery/query-expander.ts';
import type { ExpandedQueryItem } from '../discovery/query-expander.ts';
import { extractAtsSlugFromUrl, knownSponsorRegistry } from '../discovery/known-sponsors.ts';
import { scoreJobTokenizedRelevance } from '../discovery/visa-classifier.ts';

interface SerpOrganicResult {
  title?: string;
  link?: string;
  snippet?: string;
  displayed_link?: string;
}

interface SerpGoogleJobsResult {
  job_id?: string;
  title?: string;
  company_name?: string;
  location?: string;
  description?: string;
  share_link?: string;
  apply_options?: Array<{ title?: string; link?: string }>;
  related_links?: Array<{ link?: string }>;
  detected_extensions?: {
    schedule_type?: string;
    work_from_home?: boolean;
    salary?: string;
    posted_at?: string;
  };
}

export class GoogleJobsAdapter extends BaseCrawlerAdapter {
  readonly source = JobSource.GOOGLE_JOBS;
  readonly name = 'Google Jobs API (SerpAPI)';
  private serpApiKey?: string;

  constructor(serpApiKey?: string) {
    super(JobSource.GOOGLE_JOBS, {
      baseUrl: 'https://serpapi.com/search.json',
      rateLimitPerMinute: 60,
      maxRetries: 2,
      timeout: 15000,
    });
    this.serpApiKey = serpApiKey?.trim() || undefined;
  }

  async initialize(): Promise<void> {
    this.initialized = true;
  }

  /**
   * Mode A: Queries SerpAPI Google Web Search (`engine=google`) with expanded
   * multi-region ATS site-dork queries and extracts structured ATS jobs.
   */
  async searchAtsDorks(
    filters: SearchFilters,
    options: { maxQueries?: number } = {},
  ): Promise<Job[]> {
    if (!this.serpApiKey) {
      return [];
    }

    const baseQuery = (filters.query || 'Software Engineer').trim();
    const expanded = expandGlobalVisaQueries({
      query: baseQuery,
      countries: filters.countries,
    });

    const maxQueries =
      options.maxQueries ??
      (filters.countries?.length === 1 ? expanded.atsDomains.length : 12);
    const selectedDorks = this.selectBalancedDorks(expanded.atsDorkQueries, maxQueries);

    const results = await this.mapWithConcurrency(
      selectedDorks,
      6,
      async (dorkItem): Promise<Job[]> => {
        const params = new URLSearchParams({
          engine: 'google',
          q: dorkItem.dorkQuery,
          num: '20',
          hl: 'en',
          api_key: this.serpApiKey!,
        });

        const url = `${this.config.baseUrl}?${params.toString()}`;
        const response = await this.makeRequest(url, {
          headers: { Accept: 'application/json' },
        });
        if (!response.ok) return [];

        const data = (await response.json()) as { organic_results?: SerpOrganicResult[] };
        const organic = Array.isArray(data.organic_results) ? data.organic_results : [];

        return organic
          .map((item) => this.parseOrganicResult(item, dorkItem))
          .filter((job): job is Job => job !== null);
      },
    );

    const jobs: Job[] = [];
    for (const res of results) {
      if (res.status === 'fulfilled') {
        jobs.push(...res.value);
      }
    }
    return this.deduplicateJobs(jobs);
  }

  /**
   * Mode B: Queries SerpAPI Google Jobs (`engine=google_jobs`) with regional `gl`
   * country codes and extracts direct apply URLs and full job descriptions.
   */
  async searchGoogleJobs(filters: SearchFilters): Promise<Job[]> {
    if (!this.serpApiKey) {
      return [];
    }

    const query = (filters.query || 'Software Engineer').trim();
    const glCodes = this.resolveRegionalGlCodes(filters.countries);

    const results = await this.mapWithConcurrency(glCodes, 4, async (gl): Promise<Job[]> => {
      const params = new URLSearchParams({
        engine: 'google_jobs',
        q: query,
        gl,
        hl: 'en',
        api_key: this.serpApiKey!,
      });

      const url = `${this.config.baseUrl}?${params.toString()}`;
      const response = await this.makeRequest(url, {
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) return [];

      const data = (await response.json()) as { jobs_results?: SerpGoogleJobsResult[] };
      const rawJobs = Array.isArray(data.jobs_results) ? data.jobs_results : [];
      return rawJobs.map((raw) => this.normalizeJob(raw as unknown as Record<string, unknown>));
    });

    const jobs: Job[] = [];
    for (const res of results) {
      if (res.status === 'fulfilled') {
        jobs.push(...res.value);
      }
    }
    return this.deduplicateJobs(jobs);
  }

  async *searchJobs(filters: SearchFilters): AsyncGenerator<Job> {
    if (!this.serpApiKey) {
      return;
    }

    const [dorkResult, googleJobsResult] = await Promise.allSettled([
      this.searchAtsDorks(filters),
      this.searchGoogleJobs(filters),
    ]);

    const combined: Job[] = [];
    if (dorkResult.status === 'fulfilled') combined.push(...dorkResult.value);
    if (googleJobsResult.status === 'fulfilled') combined.push(...googleJobsResult.value);

    const uniqueJobs = this.deduplicateJobs(combined);
    for (const job of uniqueJobs) {
      if (filters.query && !scoreJobTokenizedRelevance(job, filters.query).isRelevant) {
        continue;
      }
      if (!this.matchesCountryFilter(job, filters.countries)) {
        continue;
      }
      if (filters.remote === true && !job.remote) {
        continue;
      }
      yield job;
    }
  }

  async getJobDetails(_externalId: string): Promise<Job> {
    throw new Error('Google Jobs adapter does not support individual job detail lookup');
  }

  normalizeJob(raw: Record<string, unknown>): Job {
    const item = raw as unknown as SerpGoogleJobsResult;
    const scheduleType = item.detected_extensions?.schedule_type || 'Full-time';
    const location = item.location || 'Unknown';
    const isRemote =
      item.detected_extensions?.work_from_home === true ||
      /\bremote\b/i.test(location);

    let jobType = JobType.FULL_TIME;
    const scheduleLower = scheduleType.toLowerCase();
    if (scheduleLower.includes('contract')) jobType = JobType.CONTRACT;
    else if (scheduleLower.includes('part')) jobType = JobType.PART_TIME;
    else if (scheduleLower.includes('intern')) jobType = JobType.INTERNSHIP;

    const applyUrl =
      item.apply_options?.[0]?.link ||
      item.related_links?.[0]?.link ||
      item.share_link ||
      '';

    const companyName = (item.company_name || 'Unknown Company').trim();
    const title = (item.title || 'Unknown Title').trim();
    const description = item.description || '';
    const country = this.extractCountry(location);
    const salary = this.extractSalary(item.detected_extensions?.salary || description);
    const { visaSponsorship, visaNotes } = this.classifyVisaStatus({
      title,
      companyName,
      location,
      country,
      description,
      sourceUrl: applyUrl,
      applyUrl,
    });

    const now = new Date();
    return {
      id: randomUUID(),
      externalId: item.job_id || `gj-${randomUUID().slice(0, 8)}`,
      title,
      company: {
        id: companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'unknown',
        name: companyName,
        locations: location && location !== 'Unknown' ? [location] : [],
        createdAt: now,
        updatedAt: now,
      },
      description,
      requirements: '',
      responsibilities: '',
      location,
      country,
      remote: isRemote,
      workMode: isRemote ? WorkMode.REMOTE : WorkMode.ONSITE,
      type: jobType,
      salaryMin: salary.min,
      salaryMax: salary.max,
      salaryCurrency: salary.currency,
      source: JobSource.GOOGLE_JOBS,
      sourceUrl: applyUrl,
      visaSponsorship,
      visaNotes,
      skills: this.extractSkills(`${title} ${description}`),
      category: 'Engineering',
      postedAt: now,
      createdAt: now,
      updatedAt: now,
      applyUrl,
    } as Job & { applyUrl?: string };
  }

  private parseOrganicResult(item: SerpOrganicResult, dorkItem: ExpandedQueryItem): Job | null {
    const link = (item.link || '').trim();
    const rawTitle = (item.title || '').trim();
    if (!link || !rawTitle) {
      return null;
    }

    const atsSource = this.detectAtsSource(link);
    const atsSlug = extractAtsSlugFromUrl(link);
    const sponsorMatch = knownSponsorRegistry.lookup({
      sourceUrl: link,
      atsSlug: atsSlug || undefined,
    });

    const companyName =
      sponsorMatch?.canonicalName ||
      (atsSlug ? this.formatCompanySlug(atsSlug) : this.extractCompanyFromTitle(rawTitle)) ||
      'Unknown Company';

    const title = this.cleanSerpTitle(rawTitle, companyName);
    const snippet = (item.snippet || '').trim();
    const inferredLocation = this.inferLocationFromSnippet(snippet, dorkItem.country);
    const country = this.extractCountry(inferredLocation);
    const isRemote = /\bremote\b/i.test(`${title} ${snippet}`);

    const { visaSponsorship, visaNotes } = this.classifyVisaStatus({
      title,
      companyName,
      location: inferredLocation,
      country,
      description: snippet,
      sourceUrl: link,
      applyUrl: link,
      atsSlug: atsSlug || undefined,
    });

    const now = new Date();
    return {
      id: randomUUID(),
      externalId: `serp-${Buffer.from(link).toString('base64url').slice(0, 24)}`,
      title,
      company: {
        id: (atsSlug || companyName.toLowerCase()).replace(/[^a-z0-9]+/g, '-') || 'unknown',
        name: companyName,
        locations: inferredLocation ? [inferredLocation] : [],
        createdAt: now,
        updatedAt: now,
      },
      description: snippet || `${title} at ${companyName}`,
      requirements: '',
      responsibilities: '',
      location: inferredLocation,
      country,
      remote: isRemote,
      workMode: isRemote ? WorkMode.REMOTE : WorkMode.ONSITE,
      type: JobType.FULL_TIME,
      source: atsSource,
      sourceUrl: link,
      visaSponsorship,
      visaNotes,
      skills: this.extractSkills(`${title} ${snippet}`),
      category: 'Engineering',
      postedAt: now,
      createdAt: now,
      updatedAt: now,
      applyUrl: link,
    } as Job & { applyUrl?: string };
  }

  private selectBalancedDorks(
    dorks: ExpandedQueryItem[],
    maxQueries: number,
  ): ExpandedQueryItem[] {
    if (dorks.length <= maxQueries) {
      return dorks;
    }

    const byDomain = new Map<string, ExpandedQueryItem[]>();
    for (const dork of dorks) {
      const key = dork.atsDomain || 'default';
      const list = byDomain.get(key) || [];
      list.push(dork);
      byDomain.set(key, list);
    }

    const selected: ExpandedQueryItem[] = [];
    const queues = Array.from(byDomain.values());
    let round = 0;

    while (selected.length < maxQueries) {
      let addedInRound = false;
      for (const queue of queues) {
        if (round < queue.length && selected.length < maxQueries) {
          selected.push(queue[round]);
          addedInRound = true;
        }
      }
      if (!addedInRound) break;
      round++;
    }

    return selected;
  }

  private resolveRegionalGlCodes(countries?: string[]): string[] {
    if (!countries?.length) {
      return ['uk', 'de', 'nl'];
    }

    const codes = new Set<string>();
    for (const country of countries) {
      const resolved = resolveCountryRegionCodes(country, false);
      for (const code of resolved) {
        codes.add(code);
      }
    }

    return codes.size > 0 ? Array.from(codes).slice(0, 4) : ['uk', 'de', 'nl'];
  }

  private detectAtsSource(url: string): JobSource {
    const lower = url.toLowerCase();
    if (lower.includes('greenhouse.io')) return JobSource.GREENHOUSE;
    if (lower.includes('lever.co')) return JobSource.LEVER;
    if (lower.includes('ashbyhq.com')) return JobSource.ASHBY;
    if (lower.includes('myworkdayjobs.com')) return JobSource.WORKDAY;
    if (lower.includes('smartrecruiters.com')) return JobSource.SMARTRECRUITERS;
    return JobSource.GOOGLE_JOBS;
  }

  private formatCompanySlug(slug: string): string {
    return slug
      .split(/[-_]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private extractCompanyFromTitle(title: string): string | null {
    const atMatch = title.match(/\bat\s+([^-|]+)$/i);
    if (atMatch?.[1]) return atMatch[1].trim();
    const dashMatch = title.match(/\s+[-|]\s+([^-|]+)$/);
    if (dashMatch?.[1] && !/(greenhouse|lever|ashby|workday|smartrecruiters)/i.test(dashMatch[1])) {
      return dashMatch[1].trim();
    }
    return null;
  }

  private cleanSerpTitle(rawTitle: string, companyName: string): string {
    let cleaned = rawTitle
      .replace(/^Job Application for\s+/i, '')
      .replace(/\s*[|-]\s*(Greenhouse|Lever|Ashby|Workday|SmartRecruiters)\s*$/i, '')
      .trim();

    if (companyName && companyName !== 'Unknown Company') {
      const escapedCompany = companyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      cleaned = cleaned
        .replace(new RegExp(`\\s+(?:at|@|\\-|\\|)\\s*${escapedCompany}$`, 'i'), '')
        .trim();
    }

    return cleaned || rawTitle;
  }

  private inferLocationFromSnippet(snippet: string, fallbackCountry: string): string {
    const codes = resolveCountryRegionCodes(snippet, true);
    if (codes.length > 0) {
      const entry = COUNTRY_CITY_LOOKUP.find((c) => c.code === codes[0]);
      if (entry) {
        const matchedCity = entry.cities.find((city) =>
          new RegExp(`\\b${city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(snippet),
        );
        return matchedCity ? `${matchedCity}, ${entry.country}` : entry.country;
      }
    }
    if (/\bremote\b/i.test(snippet)) {
      return fallbackCountry ? `Remote (${fallbackCountry})` : 'Remote';
    }
    return fallbackCountry || 'Unknown';
  }

  private extractSkills(text: string): string[] {
    const commonSkills = [
      'javascript', 'typescript', 'python', 'java', 'go', 'golang', 'rust', 'c++',
      'react', 'node', 'nodejs', 'aws', 'gcp', 'azure', 'docker', 'kubernetes',
      'terraform', 'kafka', 'cassandra', 'postgresql', 'redis', 'graphql', 'microservices',
    ];
    const lower = text.toLowerCase();
    return commonSkills.filter((skill) =>
      new RegExp(`(?:^|[^a-z0-9])${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=$|[^a-z0-9])`, 'i').test(lower),
    );
  }

  private deduplicateJobs(jobs: Job[]): Job[] {
    const seen = new Set<string>();
    const unique: Job[] = [];

    for (const job of jobs) {
      const key = job.sourceUrl
        ? job.sourceUrl.split('?')[0].toLowerCase()
        : `${job.title.toLowerCase()}::${job.company.name.toLowerCase()}::${job.location.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(job);
      }
    }

    return unique;
  }
}
