import { JobSource, JobType, WorkMode, VisaSponsorshipStatus } from '@visapilot/shared';
import type { SearchFilters, Job } from '@visapilot/shared';
import { BaseCrawlerAdapter } from './base';

export class AshbyAdapter extends BaseCrawlerAdapter {
  readonly source = JobSource.ASHBY;
  readonly name = 'Ashby Adapter';
  private boardTokens: string[];

  constructor(boardTokens: string | string[] = ['linear', 'retool', 'openai', 'ramp', 'brex']) {
    const tokens = Array.isArray(boardTokens) ? boardTokens : [boardTokens];
    super(JobSource.ASHBY, {
      baseUrl: 'https://api.ashbyhq.com',
      rateLimitPerMinute: 60,
      timeout: 10000,
    });
    this.boardTokens = tokens.length > 0 ? tokens : ['linear'];
  }

  async initialize(): Promise<void> {
    this.initialized = true;
  }

  async *searchJobs(filters: SearchFilters): AsyncGenerator<Job> {
    for (const boardToken of this.boardTokens) {
      const apiUrl = `https://api.ashbyhq.com/posting-api/job-board/${boardToken}`;

      try {
        const response = await this.makeRequest(apiUrl);
        const data = (await response.json()) as { jobs?: AshbyJob[] };
        const companyName = boardToken.charAt(0).toUpperCase() + boardToken.slice(1);

        for (const ashbyJob of data.jobs || []) {
          const job = this.createJobFromAshby(ashbyJob, boardToken, companyName);
          if (this.matchesFilters(job, filters)) {
            yield job;
          }
        }
      } catch {
        // Skip inaccessible Ashby boards
      }
    }
  }

  async getJobDetails(externalId: string): Promise<Job> {
    throw new Error('Ashby adapter does not support individual job details');
  }

  normalizeJob(rawJob: Record<string, unknown>): Job {
    return this.createJobFromAshby(rawJob as unknown as AshbyJob, 'unknown', 'Unknown Company');
  }

  private createJobFromAshby(ashbyJob: AshbyJob, boardToken: string, companyName: string): Job {
    const location = ashbyJob.location || (ashbyJob.remote ? 'Remote' : 'Unknown');
    const country = this.extractCountry(location);
    const description = ashbyJob.descriptionPlain || ashbyJob.descriptionHtml || `Role at ${companyName}`;

    return {
      id: '',
      externalId: ashbyJob.id,
      title: ashbyJob.title || 'Untitled Position',
      company: { id: '', name: ashbyJob.board?.name || companyName, locations: [location], createdAt: new Date(), updatedAt: new Date() },
      description,
      requirements: ashbyJob.descriptionPlain || '',
      responsibilities: ashbyJob.descriptionPlain || '',
      location,
      country,
      remote: ashbyJob.remote ?? location.toLowerCase().includes('remote'),
      workMode: ashbyJob.remote ? WorkMode.REMOTE : this.detectWorkMode(location),
      type: (ashbyJob.employmentType as JobType) || JobType.FULL_TIME,
      salaryMin: ashbyJob.salaryMin,
      salaryMax: ashbyJob.salaryMax,
      salaryCurrency: ashbyJob.salaryCurrency,
      source: JobSource.ASHBY,
      sourceUrl: `https://jobs.ashbyhq.com/${boardToken}/${ashbyJob.id}`,
      visaSponsorship: VisaSponsorshipStatus.UNKNOWN,
      skills: this.extractSkills(description),
      postedAt: ashbyJob.publishedAt ? new Date(ashbyJob.publishedAt) : new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private extractSkills(text: string): string[] {
    const commonSkills = [
      'javascript', 'typescript', 'python', 'java', 'go', 'rust',
      'react', 'angular', 'vue', 'node', 'nodejs', 'aws', 'docker',
      'kubernetes', 'sql', 'nosql', 'postgresql', 'mongodb', 'redis',
      'machine learning', 'ai', 'data science', 'devops', 'ci/cd',
      'git', 'agile', 'scrum', 'rest', 'graphql', 'api',
    ];

    const lower = text.toLowerCase();
    return commonSkills.filter((skill) => lower.includes(skill));
  }

  private detectWorkMode(location: string): WorkMode {
    const lower = location.toLowerCase();
    if (lower.includes('remote')) return WorkMode.REMOTE;
    if (lower.includes('hybrid')) return WorkMode.HYBRID;
    return WorkMode.ONSITE;
  }

  private matchesFilters(job: Job, filters: SearchFilters): boolean {
    if (!this.matchesQueryFilter(job, filters.query)) return false;
    if (!this.matchesCountryFilter(job, filters.countries)) return false;
    if (filters.types?.length && !filters.types.includes(job.type)) return false;
    return true;
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
