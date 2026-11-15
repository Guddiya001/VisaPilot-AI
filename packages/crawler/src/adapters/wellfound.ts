import { BaseCrawlerAdapter } from './base.ts';
import type { Job, SearchFilters } from '@visapilot/shared';
import { JobSource } from '@visapilot/shared';

export class WellfoundAdapter extends BaseCrawlerAdapter {
  readonly source = JobSource.WELLFOUND;
  readonly name = 'Wellfound';

  constructor() {
    super(JobSource.WELLFOUND, {
      baseUrl: 'https://wellfound.com/graphql',
      rateLimitPerMinute: 30,
    });
  }

  async initialize(): Promise<void> {
    this.initialized = true;
  }

  async *searchJobs(_filters: SearchFilters): AsyncGenerator<Job> {
    // Wellfound GraphQL requires authenticated session; never emit fake stubs.
    yield* [] as Job[];
  }

  async getJobDetails(_externalId: string): Promise<Job> {
    throw new Error('Method not implemented.');
  }

  normalizeJob(_rawJob: Record<string, unknown>): Job {
    throw new Error('Method not implemented.');
  }
}
