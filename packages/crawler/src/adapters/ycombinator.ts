import { BaseCrawlerAdapter } from './base.ts';
import type { Job, SearchFilters } from '@visapilot/shared';
import { JobSource } from '@visapilot/shared';

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

  async *searchJobs(_filters: SearchFilters): AsyncGenerator<Job> {
    // Work at a Startup requires authenticated API access; never emit fake stubs.
    yield* [] as Job[];
  }

  async getJobDetails(_externalId: string): Promise<Job> {
    throw new Error('Method not implemented.');
  }

  normalizeJob(_rawJob: Record<string, unknown>): Job {
    throw new Error('Method not implemented.');
  }
}
