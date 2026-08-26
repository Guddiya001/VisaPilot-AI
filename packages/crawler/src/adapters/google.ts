import { BaseCrawlerAdapter } from './base';
import type { Job, SearchFilters } from '@visapilot/shared';
import { JobSource, JobType, WorkMode, VisaSponsorshipStatus } from '@visapilot/shared';
import { randomUUID } from 'crypto';

export class GoogleJobsAdapter extends BaseCrawlerAdapter {
  readonly source = JobSource.GOOGLE_JOBS;
  readonly name = 'Google Jobs API';
  private serpApiKey?: string;

  constructor(serpApiKey?: string) {
    super(JobSource.GOOGLE_JOBS, {
      baseUrl: 'https://serpapi.com/search',
      rateLimitPerMinute: 60,
    });
    this.serpApiKey = serpApiKey;
  }

  async initialize(): Promise<void> {
    this.initialized = true;
  }

  async *searchJobs(filters: SearchFilters): AsyncGenerator<Job> {
    if (!this.serpApiKey) {
      console.warn('SerpAPI key missing for Google Jobs. Returning stub.');
      if (filters.query) {
        yield this.createStubJob('GoogleTech', filters.query);
      }
      return;
    }
    
    // Stub implementation to bypass compilation error.
    console.warn('Google Jobs adapter is a stub. Returning mock data.');
    if (filters.query) {
       yield this.createStubJob('GoogleTech', filters.query);
    }
  }

  async getJobDetails(externalId: string): Promise<Job> {
    throw new Error('Method not implemented.');
  }

  normalizeJob(raw: any): Job {
    // raw.detected_extensions can contain schedule_type, posted_at, etc
    const scheduleType = raw.detected_extensions?.schedule_type || 'Full-time';
    const isRemote = raw.location?.toLowerCase().includes('remote') || false;

    let jobType = JobType.FULL_TIME;
    if (scheduleType.toLowerCase().includes('contract')) jobType = JobType.CONTRACT;
    else if (scheduleType.toLowerCase().includes('part')) jobType = JobType.PART_TIME;
    else if (scheduleType.toLowerCase().includes('intern')) jobType = JobType.INTERNSHIP;

    const applyUrl = raw.related_links?.[0]?.link || raw.share_link || 'https://careers.google.com';

    return {
      id: randomUUID(),
      externalId: raw.job_id || `goog-${randomUUID().slice(0, 8)}`,
      title: raw.title || 'Unknown Title',
      company: {
        id: raw.company_name?.toLowerCase().replace(/\s+/g, '-') || 'unknown',
        name: raw.company_name || 'Unknown Company',
        website: applyUrl,
      },
      description: raw.description || '',
      requirements: [], // Would need NLP to extract from description
      responsibilities: [],
      location: raw.location || 'Unknown',
      remote: isRemote,
      workMode: isRemote ? WorkMode.REMOTE : WorkMode.HYBRID,
      type: jobType,
      sourceUrl: applyUrl,
      postedAt: new Date(), // SerpApi gives '10 hours ago', would need parsing
      expiresAt: null,
      salaryMin: null, // Often inside extensions, e.g. "100K - 150K"
      salaryMax: null,
      salaryCurrency: 'USD',
      skills: [],
      category: 'Engineering',
      visaSponsorship: VisaSponsorshipStatus.UNKNOWN,
    } as unknown as Job;
  }

  private createStubJob(company: string, query: string): Job {
    return {
      id: randomUUID(),
      externalId: `goog-${randomUUID().slice(0, 8)}`,
      title: `${query} (Google Jobs Stub)`,
      company: {
        id: company.toLowerCase(),
        name: company,
        website: `https://${company.toLowerCase()}.com`,
      },
      description: 'Google Jobs parsed job stub (Mock Data)',
      requirements: [],
      responsibilities: [],
      location: 'Mountain View, CA',
      remote: false,
      workMode: WorkMode.HYBRID,
      type: JobType.FULL_TIME,
      sourceUrl: `https://careers.google.com`,
      postedAt: new Date(),
      expiresAt: null,
      salaryMin: null,
      salaryMax: null,
      salaryCurrency: 'USD',
      skills: [query],
      category: 'Engineering',
      visaSponsorship: VisaSponsorshipStatus.UNKNOWN,
    } as unknown as Job;
  }
}
