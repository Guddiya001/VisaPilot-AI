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

  async initialize(): Promise<void> {
    this.initialized = true;
  }

  async *searchJobs(filters: SearchFilters): AsyncGenerator<Job> {
    for (const company of this.boardTokens) {
      try {
        const url = `${this.config.baseUrl}/postings/${company}?limit=50&mode=json`;
        const response = await this.makeRequest(url);
        const data = await response.json();
        const rawJobs: LeverJob[] = Array.isArray(data) ? data : (data as { data?: LeverJob[] })?.data || [];

        const companyName = company.charAt(0).toUpperCase() + company.slice(1);

        for (const rawJob of rawJobs) {
          const normalizedJob = this.createJobFromLever(rawJob, companyName);
          if (this.matchesFilters(normalizedJob, filters)) {
            yield normalizedJob;
          }
        }
      } catch {
        // Skip inaccessible company boards
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
    const lowerDesc = description.toLowerCase();
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

    const sponsorsVisa = lowerDesc.includes('visa sponsorship')
      ? VisaSponsorshipStatus.SPONSORS
      : lowerDesc.includes('no visa sponsorship') || lowerDesc.includes('must be authorized')
        ? VisaSponsorshipStatus.DOES_NOT_SPONSOR
        : VisaSponsorshipStatus.UNKNOWN;

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
      sourceUrl: job.hostedUrl || job.applyUrl || '',
      visaSponsorship: sponsorsVisa,
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

