import { JobSource, JobType, WorkMode } from '@visapilot/shared';
import type { SearchFilters, Job } from '@visapilot/shared';
import { BaseCrawlerAdapter } from './base.ts';

interface LeverJob {
  id: string;
  text: string;
  description: string;
  descriptionPlain: string;
  categories: {
    commitment: string;
    department: string;
    location: string;
    team: string;
    allLocations: string[];
  };
  lists: Array<{
    text: string;
    content: string;
  }>;
  additionalPlain: string;
  hostedUrl: string;
  applyUrl: string;
}

export class LeverAdapter extends BaseCrawlerAdapter {
  readonly source = JobSource.LEVER;
  readonly name = 'Lever';
  private boardTokens: string[];

  constructor(boardTokens: string | string[] = ['atlassian', 'netflix', 'spotify', 'affirm', 'figma']) {
    const tokens = Array.isArray(boardTokens) ? boardTokens : [boardTokens];
    super(JobSource.LEVER, {
      baseUrl: 'https://api.lever.co/v0',
      rateLimitPerMinute: 60,
      maxRetries: 2,
      timeout: 10000,
    });
    this.boardTokens = tokens.length > 0 ? tokens : ['atlassian'];
  }

  getBoardTokens(): string[] {
    return [...this.boardTokens];
  }

  async initialize(): Promise<void> {
    this.initialized = true;
  }

  async *searchJobs(filters: SearchFilters): AsyncGenerator<Job> {
    const results = await this.mapWithConcurrency(
      this.boardTokens,
      8,
      async (company): Promise<Job[]> => {
        try {
          const url = `${this.config.baseUrl}/postings/${company}?limit=50&mode=json`;
          const response = await this.makeRequest(url);
          if (!response.ok) return [];
          const data = await response.json();
          const rawJobs: LeverJob[] = Array.isArray(data)
            ? data
            : (data as { data?: LeverJob[] })?.data || [];

          const companyName = company.charAt(0).toUpperCase() + company.slice(1);
          const validJobs: Job[] = [];

          for (const rawJob of rawJobs) {
            const normalizedJob = this.createJobFromLever(rawJob, companyName);
            if (this.matchesFilters(normalizedJob, filters)) {
              validJobs.push(normalizedJob);
            }
          }
          return validJobs;
        } catch {
          return [];
        }
      },
    );

    for (const result of results) {
      if (result.status === 'fulfilled') {
        for (const job of result.value) {
          yield job;
        }
      }
    }
  }

  async getJobDetails(externalId: string): Promise<Job> {
    const url = `${this.config.baseUrl}/postings/${externalId}`;
    const response = await this.makeRequest(url);
    const data = (await response.json()) as LeverJob;
    return this.createJobFromLever(data, 'Unknown Company');
  }

  normalizeJob(rawJob: Record<string, unknown>): Job {
    return this.createJobFromLever(rawJob as unknown as LeverJob, 'Unknown Company');
  }

  private createJobFromLever(job: LeverJob, companyName: string): Job {
    const description = job.descriptionPlain || job.description || '';
    const location = job.categories?.location || 'Remote';
    const country = this.extractCountry(location);

    const workMode = location.toLowerCase().includes('remote')
      ? WorkMode.REMOTE
      : location.toLowerCase().includes('hybrid')
        ? WorkMode.HYBRID
        : WorkMode.ONSITE;

    const jobType = job.categories?.commitment?.toLowerCase().includes('full time') || job.categories?.commitment?.toLowerCase().includes('full-time')
      ? JobType.FULL_TIME
      : job.categories?.commitment?.toLowerCase().includes('part time') || job.categories?.commitment?.toLowerCase().includes('part-time')
        ? JobType.PART_TIME
        : JobType.FULL_TIME;

    const skills = this.extractSkills(description);
    const sourceUrl = job.hostedUrl || job.applyUrl || '';
    const { visaSponsorship, visaNotes } = this.classifyVisaStatus({
      title: job.text || 'Untitled Position',
      companyName,
      location,
      country,
      description,
      sourceUrl,
    });

    return {
      id: '',
      externalId: job.id,
      title: job.text || 'Untitled Position',
      company: { id: '', name: companyName, locations: [location], createdAt: new Date(), updatedAt: new Date() },
      description: job.description || description || `Role: ${job.text} at ${companyName}.`,
      requirements: this.extractRequirements(job.lists),
      responsibilities: '',
      location,
      country,
      remote: workMode === WorkMode.REMOTE,
      workMode,
      type: jobType,
      source: JobSource.LEVER,
      sourceUrl,
      visaSponsorship,
      visaNotes,
      skills,
      postedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private extractSkills(description: string): string[] {
    const skillKeywords = [
      'javascript', 'typescript', 'python', 'java', 'react', 'angular', 'node',
      'aws', 'docker', 'kubernetes', 'sql', 'nosql', 'machine learning', 'ai',
      'agile', 'scrum', 'devops', 'ci/cd', 'terraform', 'graphql', 'rest api',
      'microservices', 'cloud', 'gcp', 'azure', 'git', 'linux', 'css', 'html',
    ];

    const lower = description.toLowerCase();
    return skillKeywords.filter((skill) => lower.includes(skill));
  }

  private extractRequirements(lists?: Array<{ text: string; content: string }>): string {
    if (!lists) return '';
    return lists
      .filter((l) => l.text?.toLowerCase().includes('requirement') || l.text?.toLowerCase().includes('qualification'))
      .map((l) => l.content)
      .join('\n');
  }

  private matchesFilters(job: Job, filters: SearchFilters): boolean {
    if (!this.matchesQueryFilter(job, filters.query)) return false;
    if (!this.matchesCountryFilter(job, filters.countries)) return false;
    if (filters.types?.length && !filters.types.includes(job.type)) return false;
    return true;
  }
}

export const leverAdapter = new LeverAdapter();

