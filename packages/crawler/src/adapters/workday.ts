import { BaseCrawlerAdapter } from './base';
import type { Job, SearchFilters } from '@visapilot/shared';
import { JobSource, JobType, WorkMode, VisaSponsorshipStatus } from '@visapilot/shared';
import { randomUUID } from 'crypto';

export class WorkdayAdapter extends BaseCrawlerAdapter {
  readonly source = JobSource.WORKDAY;
  readonly name = 'Workday';
  private customCompanies: string[];

  constructor(companies: string[] = []) {
    super(JobSource.WORKDAY, {
      baseUrl: 'https://myworkdayjobs.com',
      rateLimitPerMinute: 30,
    });
    this.customCompanies = companies;
  }

  async initialize(): Promise<void> {
    this.initialized = true;
  }

  async *searchJobs(filters: SearchFilters): AsyncGenerator<Job> {
    console.warn('Workday adapter is a stub. Returning mock data.');
    const companiesToSearch = this.customCompanies.length > 0 ? this.customCompanies : ['WorkdayCorp'];
    
    if (filters.query) {
      for (const company of companiesToSearch) {
        yield this.createStubJob(company, filters.query);
      }
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
      externalId: `wd-${randomUUID().slice(0, 8)}`,
      title: `${query} (Workday Stub)`,
      company: {
        id: company.toLowerCase(),
        name: company,
        website: `https://${company.toLowerCase()}.com`,
      },
      description: 'Workday parsed job stub (Mock Data)',
      requirements: [],
      responsibilities: [],
      location: 'Dallas, TX',
      remote: false,
      workMode: WorkMode.HYBRID,
      type: JobType.FULL_TIME,
      sourceUrl: `https://${company}.myworkdayjobs.com/en-US/external/job/12345`,
      postedAt: new Date(),
      expiresAt: null,
      salaryMin: null,
      salaryMax: null,
      salaryCurrency: 'USD',
      skills: [query],
      category: 'Enterprise',
      visaSponsorship: VisaSponsorshipStatus.UNKNOWN,
    } as unknown as Job;
  }
}
