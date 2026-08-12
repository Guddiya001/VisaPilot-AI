import { JobSource, JobType, WorkMode } from '@visapilot/shared';
import type { SearchFilters, Job } from '@visapilot/shared';
import { BaseCrawlerAdapter } from './base';

export class AshbyAdapter extends BaseCrawlerAdapter {
  readonly source = JobSource.ASHBY;
  readonly name = 'Ashby Adapter';

  constructor() {
    super(JobSource.ASHBY, {
      baseUrl: 'https://api.ashbyhq.com',
      rateLimitPerMinute: 30,
    });
  }

  async initialize(): Promise<void> {
    this.initialized = true;
  }

  async *searchJobs(filters: SearchFilters): AsyncGenerator<Job> {
    if (!this.initialized) await this.initialize();

    const boardToken = this.config.apiKey || this.extractBoardToken(this.config.baseUrl);
    if (!boardToken) {
      throw new Error('Ashby board token is required');
    }

    const apiUrl = `https://api.ashbyhq.com/posting-api/job-board/${boardToken}`;

    try {
      const response = await this.makeRequest(apiUrl);
      const data = await response.json() as { jobs: AshbyJob[] };

      for (const ashbyJob of data.jobs || []) {
        if (filters.query && !ashbyJob.title.toLowerCase().includes(filters.query.toLowerCase())) {
          continue;
        }

        yield this.normalizeJob({
          externalId: ashbyJob.id,
          title: ashbyJob.title,
          companyName: ashbyJob.board?.name || '',
          description: ashbyJob.descriptionHtml || ashbyJob.descriptionPlain,
          requirements: ashbyJob.descriptionPlain || ashbyJob.descriptionHtml || '',
          responsibilities: ashbyJob.descriptionPlain,
          location: ashbyJob.location || '',
          country: this.extractCountry(ashbyJob.location || ''),
          remote: ashbyJob.remote ?? false,
          workMode: ashbyJob.remote ? WorkMode.REMOTE : WorkMode.ONSITE,
          type: ashbyJob.employmentType || JobType.FULL_TIME,
          salaryMin: ashbyJob.salaryMin,
          salaryMax: ashbyJob.salaryMax,
          salaryCurrency: ashbyJob.salaryCurrency,
          source: JobSource.ASHBY,
          sourceUrl: `https://jobs.ashbyhq.com/${boardToken}/${ashbyJob.id}`,
          skills: [],
          postedAt: ashbyJob.publishedAt ? new Date(ashbyJob.publishedAt) : new Date(),
        });
      }
    } catch (error) {
      console.error(`[Ashby] Crawl error: ${error}`);
    }
  }

  async getJobDetails(externalId: string): Promise<Job> {
    throw new Error('Ashby adapter does not support individual job details');
  }

  normalizeJob(rawJob: Record<string, unknown>): Job {
    return rawJob as unknown as Job;
  }

  private extractBoardToken(url: string): string | null {
    const match = url.match(/ashbyhq\.com\/([a-zA-Z0-9-]+)/);
    return match ? match[1] : null;
  }
}

interface AshbyJob {
  id: string;
  title: string;
  descriptionHtml: string;
  descriptionPlain: string;
  location: string;
  remote: boolean;
  employmentType: string;
  salaryMin: number;
  salaryMax: number;
  salaryCurrency: string;
  publishedAt: string;
  board: {
    name: string;
  };
}
