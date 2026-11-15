import { BaseCrawlerAdapter } from './base.ts';
import type { Job, SearchFilters } from '@visapilot/shared';
import { JobSource } from '@visapilot/shared';

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

  async *searchJobs(_filters: SearchFilters): AsyncGenerator<Job> {
    // Workday public scraping requires tenant-specific CXS endpoints; never emit fake stubs.
    void this.customCompanies;
    yield* [] as Job[];
  }

  async getJobDetails(_externalId: string): Promise<Job> {
    throw new Error('Method not implemented.');
  }

  normalizeJob(_rawJob: Record<string, unknown>): Job {
    throw new Error('Method not implemented.');
  }
}
