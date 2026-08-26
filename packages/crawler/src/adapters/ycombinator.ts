import { BaseCrawlerAdapter } from './base';
import type { Job, SearchFilters } from '@visapilot/shared';
import { JobSource, JobType, WorkMode, VisaSponsorshipStatus } from '@visapilot/shared';
import { randomUUID } from 'crypto';

export class YCombinatorAdapter extends BaseCrawlerAdapter {
  readonly source = JobSource.YCOMBINATOR;
  readonly name = 'YCombinator';

  constructor() {
    super(JobSource.YCOMBINATOR, {
      baseUrl: 'https://www.workatastartup.com/api',
      rateLimitPerMinute: 60,
    });
  }

  async initialize(): Promise<void> {
    this.initialized = true;
  }

  async *searchJobs(filters: SearchFilters): AsyncGenerator<Job> {
    // Return stub data
    console.warn('YCombinator adapter is a stub. Returning mock data.');
    if (filters.query) {
      yield this.createStubJob('Stripe', filters.query);
      yield this.createStubJob('Airbnb', filters.query);
      yield this.createStubJob('Instacart', filters.query);
    }
  }

  async getJobDetails(externalId: string): Promise<Job> {
    throw new Error('Method not implemented.');
  }

  normalizeJob(rawJob: Record<string, unknown>): Job {
    throw new Error('Method not implemented.');
  }

  private createStubJob(company: string, query: string): Job {
    return {
      id: randomUUID(),
      externalId: `yc-${randomUUID().slice(0, 8)}`,
      title: `${query} (YC Stub)`,
      company: {
        id: company.toLowerCase(),
        name: company,
        website: `https://${company.toLowerCase()}.com`,
      },
      description: 'YC parsed job stub (Mock Data)',
      requirements: [],
      responsibilities: [],
      location: 'San Francisco, CA',
      remote: true,
      workMode: WorkMode.HYBRID,
      type: JobType.FULL_TIME,
      sourceUrl: `https://www.workatastartup.com/jobs/12345`,
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
