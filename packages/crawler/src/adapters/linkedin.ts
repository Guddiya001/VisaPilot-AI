import * as cheerio from 'cheerio';
import {
  JobSource,
  JobType,
  WorkMode,
  VisaSponsorshipStatus,
} from '@visapilot/shared';
import type { SearchFilters, Job } from '@visapilot/shared';
import { BaseCrawlerAdapter } from './base';

export class LinkedInAdapter extends BaseCrawlerAdapter {
  readonly source = JobSource.LINKEDIN;
  readonly name = 'LinkedIn Jobs Adapter';

  constructor(config: Partial<Record<string, unknown>> = {}) {
    super(JobSource.LINKEDIN, {
      baseUrl: 'https://www.linkedin.com/jobs-guest/jobs/api',
      rateLimitPerMinute: 60,
      timeout: 10000,
      ...config,
    });
  }

  async initialize(): Promise<void> {
    this.initialized = true;
  }

  async *searchJobs(filters: SearchFilters): AsyncGenerator<Job> {
    if (!this.initialized) await this.initialize();

    const query = filters.query || 'Software Engineer';
    const location = filters.countries?.[0] || this.extractLocationFromQuery(query) || 'Worldwide';
    const start = ((filters.page || 1) - 1) * (filters.limit || 20);

    const queryParams = new URLSearchParams({
      keywords: query,
      location,
      start: String(start),
      count: String(Math.min(filters.limit || 25, 25)),
    });

    if (filters.remote) {
      queryParams.set('f_WT', '2'); // LinkedIn remote filter code
    }

    const url = `${this.config.baseUrl}/seeMoreJobPostings/search?${queryParams.toString()}`;

    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(this.config.timeout),
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Sec-Fetch-Site': 'same-origin',
        },
      });

      if (!response.ok) {
        return;
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      const items = $('li').toArray();

      for (const el of items) {
        const $el = $(el);

        const title =
          $el.find('.base-search-card__title').text().trim() ||
          $el.find('h3').text().trim();

        if (!title) continue;

        const companyName =
          $el.find('.base-search-card__subtitle').text().trim() ||
          $el.find('h4').text().trim() ||
          'Company';

        const jobLocation =
          $el.find('.job-search-card__location').text().trim() || location;

        const linkEl = $el.find('a.base-card__full-link, a.base-search-card--link');
        const href = linkEl.attr('href') || '';
        const sourceUrl = href.split('?')[0] || '';

        // Extract LinkedIn entity URN / ID
        const urn =
          $el.find('.base-card, .job-search-card').attr('data-entity-urn') || '';
        const externalId =
          urn.split(':').pop() ||
          sourceUrl.match(/view\/([0-9]+)/)?.[1] ||
          `li-${Math.random().toString(36).slice(2, 10)}`;

        const timeStr = $el.find('time').attr('datetime') || '';
        const postedAt = timeStr ? new Date(timeStr) : new Date();

        const job = this.createJobFromData({
          externalId,
          title,
          companyName,
          location: jobLocation,
          sourceUrl,
          postedAt,
        });

        if (this.matchesFilters(job, filters)) {
          yield job;
        }
      }
    } catch {
      // Gracefully continue on network or parsing error
    }
  }

  async getJobDetails(externalId: string): Promise<Job> {
    const url = `${this.config.baseUrl}/jobPosting/${externalId}`;

    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(this.config.timeout),
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });

      if (response.ok) {
        const html = await response.text();
        const $ = cheerio.load(html);

        const title = $('.top-card-layout__title, h2.topcard__title').text().trim();
        const companyName = $('.topcard__org-name-link, .topcard__flavor--black-link').text().trim() || 'Company';
        const location = $('.topcard__flavor--bullet, .top-card-layout__first-subline').text().trim() || 'Remote';
        const description = $('.show-more-less-html__markup, .description__text').text().trim();

        return this.createJobFromData({
          externalId,
          title: title || 'Position',
          companyName,
          location,
          description,
          sourceUrl: `https://www.linkedin.com/jobs/view/${externalId}`,
          postedAt: new Date(),
        });
      }
    } catch {
      // Fallback
    }

    return this.createJobFromData({
      externalId,
      title: 'LinkedIn Job Position',
      companyName: 'Tech Company',
      location: 'Remote',
      sourceUrl: `https://www.linkedin.com/jobs/view/${externalId}`,
      postedAt: new Date(),
    });
  }

  normalizeJob(rawJob: Record<string, unknown>): Job {
    return this.createJobFromData(rawJob as any);
  }

  private createJobFromData(data: {
    externalId: string;
    title: string;
    companyName: string;
    location: string;
    description?: string;
    sourceUrl?: string;
    postedAt?: Date;
  }): Job {
    const location = data.location || 'Remote';
    const country = this.extractCountry(location);
    const description =
      data.description ||
      `Position: ${data.title} at ${data.companyName}. Location: ${location}. See full job posting at ${data.sourceUrl || 'LinkedIn'}.`;

    const lowerDesc = `${data.title} ${location} ${description}`.toLowerCase();

    const workMode = lowerDesc.includes('remote')
      ? WorkMode.REMOTE
      : lowerDesc.includes('hybrid')
        ? WorkMode.HYBRID
        : WorkMode.ONSITE;

    const sponsorsVisa = lowerDesc.includes('visa sponsorship')
      ? VisaSponsorshipStatus.SPONSORS
      : lowerDesc.includes('no visa sponsorship') || lowerDesc.includes('must be authorized')
        ? VisaSponsorshipStatus.DOES_NOT_SPONSOR
        : VisaSponsorshipStatus.UNKNOWN;

    return {
      id: '',
      externalId: data.externalId,
      title: data.title,
      company: {
        id: '',
        name: data.companyName,
        locations: [location],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      description,
      requirements: '',
      responsibilities: '',
      location,
      country,
      remote: workMode === WorkMode.REMOTE,
      workMode,
      type: JobType.FULL_TIME,
      salaryMin: undefined,
      salaryMax: undefined,
      salaryCurrency: undefined,
      source: JobSource.LINKEDIN,
      sourceUrl: data.sourceUrl || `https://www.linkedin.com/jobs/view/${data.externalId}`,
      visaSponsorship: sponsorsVisa,
      skills: this.extractSkills(lowerDesc),
      postedAt: data.postedAt || new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private extractLocationFromQuery(query: string): string | null {
    const q = query.toLowerCase();
    if (/\b(india|bangalore|bengaluru|hyderabad|pune|mumbai|delhi|noida|chennai)\b/i.test(q)) {
      return 'India';
    }
    if (/\b(germany|berlin|munich|frankfurt|hamburg)\b/i.test(q)) {
      return 'Germany';
    }
    if (/\b(uk|united kingdom|london|manchester|edinburgh)\b/i.test(q)) {
      return 'United Kingdom';
    }
    if (/\b(us|usa|united states|new york|san francisco|seattle|austin)\b/i.test(q)) {
      return 'United States';
    }
    if (/\b(canada|toronto|vancouver|montreal)\b/i.test(q)) {
      return 'Canada';
    }
    return null;
  }

  private extractSkills(text: string): string[] {
    const commonSkills = [
      'javascript', 'typescript', 'python', 'java', 'go', 'golang', 'rust', 'c++', 'c#',
      'react', 'angular', 'vue', 'node', 'nodejs', 'nextjs', 'aws', 'docker',
      'kubernetes', 'sql', 'postgresql', 'mysql', 'mongodb', 'redis', 'graphql',
      'machine learning', 'ai', 'devops', 'ci/cd', 'git', 'agile', 'scrum', 'rest api',
    ];

    const lower = text.toLowerCase();
    return commonSkills.filter((skill) => lower.includes(skill));
  }

  private matchesFilters(job: Job, filters: SearchFilters): boolean {
    if (!this.matchesQueryFilter(job, filters.query)) return false;
    if (!this.matchesCountryFilter(job, filters.countries)) return false;
    if (filters.types?.length && !filters.types.includes(job.type)) return false;
    return true;
  }
}

export const linkedInAdapter = new LinkedInAdapter();
