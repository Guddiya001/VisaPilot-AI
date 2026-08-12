import { JobSource, JobType, WorkMode, VisaSponsorshipStatus } from '@visapilot/shared';
import type { SearchFilters, Job } from '@visapilot/shared';
import { BaseCrawlerAdapter } from './base';

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

  constructor(baseUrl?: string) {
    super(JobSource.LEVER, {
      baseUrl: baseUrl || 'https://api.lever.co/v0',
      rateLimitPerMinute: 30,
      maxRetries: 3,
      timeout: 30000,
    });
  }

  async initialize(): Promise<void> {
    this.initialized = true;
  }

  async *searchJobs(filters: SearchFilters): AsyncGenerator<Job> {
    const url = `${this.config.baseUrl}/postings?limit=100`;
    const response = await this.makeRequest(url);
    const data = (await response.json()) as { data: LeverJob[] };

    for (const rawJob of data.data || []) {
      const normalizedJob = this.normalizeJob(rawJob as unknown as Record<string, unknown>);
      if (this.matchesFilters(normalizedJob, filters)) {
        yield normalizedJob;
      }
    }
  }

  async getJobDetails(externalId: string): Promise<Job> {
    const url = `${this.config.baseUrl}/postings/${externalId}`;
    const response = await this.makeRequest(url);
    const data = (await response.json()) as LeverJob;
    return this.normalizeJob(data as unknown as Record<string, unknown>);
  }

  normalizeJob(rawJob: Record<string, unknown>): Job {
    const job = rawJob as unknown as LeverJob;
    const description = job.descriptionPlain || job.description || '';
    const lowerDesc = description.toLowerCase();

    const workMode = job.categories?.location?.toLowerCase().includes('remote')
      ? WorkMode.REMOTE
      : WorkMode.ONSITE;

    const jobType = job.categories?.commitment?.toLowerCase().includes('full time')
      ? JobType.FULL_TIME
      : job.categories?.commitment?.toLowerCase().includes('part time')
        ? JobType.PART_TIME
        : JobType.FULL_TIME;

    const skills = this.extractSkills(description);
    const location = job.categories?.location || 'Remote';
    const country = this.extractCountry(location);

    const sponsorsVisa = lowerDesc.includes('visa sponsorship')
      ? VisaSponsorshipStatus.SPONSORS
      : lowerDesc.includes('no visa sponsorship') || lowerDesc.includes('must be authorized')
        ? VisaSponsorshipStatus.DOES_NOT_SPONSOR
        : VisaSponsorshipStatus.UNKNOWN;

    return {
      id: '',
      externalId: job.id,
      title: job.text || 'Untitled Position',
      company: { id: '', name: '', locations: [], createdAt: new Date(), updatedAt: new Date() },
      description: job.description || description,
      requirements: this.extractRequirements(job.lists),
      responsibilities: '',
      location,
      country,
      remote: workMode === WorkMode.REMOTE,
      workMode,
      type: jobType,
      source: JobSource.LEVER,
      sourceUrl: job.hostedUrl || '',
      visaSponsorship: sponsorsVisa,
      skills,
      postedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Job;
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
    if (filters.query && !job.title.toLowerCase().includes(filters.query.toLowerCase()) &&
        !job.description.toLowerCase().includes(filters.query.toLowerCase())) {
      return false;
    }
    if (filters.countries?.length && !filters.countries.includes(job.country)) return false;
    if (filters.types?.length && !filters.types.includes(job.type)) return false;
    return true;
  }
}

export const leverAdapter = new LeverAdapter();

