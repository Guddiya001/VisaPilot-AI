import { BaseCrawlerAdapter } from './base';
import type { Job, SearchFilters } from '@visapilot/shared';
import { JobSource, JobType, WorkMode, VisaSponsorshipStatus } from '@visapilot/shared';
import { randomUUID } from 'crypto';

export class WellfoundAdapter extends BaseCrawlerAdapter {
  readonly source = JobSource.WELLFOUND;
  readonly name = 'Wellfound';

  constructor() {
    super(JobSource.WELLFOUND, {
      baseUrl: 'https://wellfound.com/graphql', // Or proxy
      rateLimitPerMinute: 30,
    });
  }

  async initialize(): Promise<void> {
    this.initialized = true;
  }

  async *searchJobs(filters: SearchFilters): AsyncGenerator<Job> {
    console.warn('Wellfound adapter is a stub. Returning mock data.');
    if (filters.query) {
      yield this.createStubJob('AngelTech', filters.query);
      yield this.createStubJob('StartupX', filters.query);
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
      externalId: `wf-${randomUUID().slice(0, 8)}`,
      title: `${query} (Wellfound Stub)`,
      company: {
        id: company.toLowerCase(),
        name: company,
        website: `https://${company.toLowerCase()}.com`,
      },
      description: 'Wellfound parsed job stub (Mock Data)',
      requirements: [],
      responsibilities: [],
      location: 'Remote',
      remote: true,
      workMode: WorkMode.REMOTE,
      type: JobType.FULL_TIME,
      sourceUrl: `https://wellfound.com/jobs/12345`,
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
