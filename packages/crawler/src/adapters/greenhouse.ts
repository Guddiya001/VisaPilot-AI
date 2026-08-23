import { JobSource, JobType, WorkMode, VisaSponsorshipStatus } from '@visapilot/shared';
import type { SearchFilters, Job } from '@visapilot/shared';
import { BaseCrawlerAdapter } from './base';
import type { CrawledJob } from '../types';

interface GreenhouseJob {
  id: number;
  title: string;
  location: { name: string };
  updated_at: string;
  absolute_url: string;
  internal_job_id: number;
  metadata: Array<{
    id: number;
    name: string;
    value: string;
    value_type: string;
  }>;
}

interface GreenhouseJobDetail extends GreenhouseJob {
  content: string;
  departments: Array<{ name: string }>;
  offices: Array<{ name: string; location: string }>;
  education?: string;
  experience?: string;
}

export class GreenhouseAdapter extends BaseCrawlerAdapter {
  readonly source = JobSource.GREENHOUSE;
  readonly name = 'Greenhouse';
  private boardTokens: string[];

  constructor(boardTokens: string | string[] = 'github') {
    const tokens = Array.isArray(boardTokens) ? boardTokens : [boardTokens];
    super(JobSource.GREENHOUSE, {
      baseUrl: `https://boards-api.greenhouse.io/v1/boards/${tokens[0] || 'github'}`,
      rateLimitPerMinute: 60,
    });
    this.boardTokens = tokens.length > 0 ? tokens : ['github'];
  }

  async initialize(): Promise<void> {
    this.initialized = true;
  }

  async *searchJobs(filters: SearchFilters): AsyncGenerator<Job> {
    for (const token of this.boardTokens) {
      const boardUrl = `https://boards-api.greenhouse.io/v1/boards/${token}`;
      try {
        const url = `${boardUrl}/jobs?page=1&per_page=50&content=true`;
        const response = await this.makeRequest(url);
        const data = (await response.json()) as { jobs: GreenhouseJob[] };

        if (!data.jobs || data.jobs.length === 0) {
          continue;
        }

        for (const rawJob of data.jobs) {
          const job = this.createJobFromGreenhouse(
            rawJob,
            rawJob as unknown as GreenhouseJobDetail,
            token,
          );
          if (this.matchesFilters(job, filters)) {
            yield job;
          }
        }
      } catch {
        // Skip board on network error
      }
    }
  }

  async getJobDetails(externalId: string): Promise<Job> {
    const url = `${this.config.baseUrl}/jobs/${externalId}`;
    const response = await this.makeRequest(url);
    const detail = (await response.json()) as GreenhouseJobDetail;
    return this.createJobFromGreenhouse({ id: parseInt(externalId, 10) } as GreenhouseJob, detail);
  }

  normalizeJob(rawJob: Record<string, unknown>): Job {
    return this.createJobFromGreenhouse(
      rawJob as unknown as GreenhouseJob,
      rawJob as unknown as GreenhouseJobDetail,
    );
  }

  private createJobFromGreenhouse(
    job: GreenhouseJob,
    detail: GreenhouseJobDetail,
    token?: string,
  ): Job {
    const location = job.location?.name || detail.offices?.[0]?.location || 'Unknown';
    const description = this.parseDescription(detail.content || '');
    const companyName = token
      ? token.charAt(0).toUpperCase() + token.slice(1)
      : this.extractCompanyName();

    return {
      id: '',
      externalId: String(job.id || detail.internal_job_id),
      title: job.title || '',
      company: { id: '', name: companyName, locations: [], createdAt: new Date(), updatedAt: new Date() },
      description: description.fullDescription || `Position: ${job.title} at ${companyName}.`,
      requirements: description.requirements,
      responsibilities: description.responsibilities,
      location,
      country: this.extractCountry(location),
      remote: location.toLowerCase().includes('remote'),
      workMode: this.detectWorkMode(location),
      type: JobType.FULL_TIME,
      source: JobSource.GREENHOUSE,
      sourceUrl: job.absolute_url || '',
      visaSponsorship: VisaSponsorshipStatus.UNKNOWN,
      skills: this.extractSkills(description.fullDescription),
      department: detail.departments?.[0]?.name,
      experienceLevel: detail.experience,
      postedAt: new Date(job.updated_at || Date.now()),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Creates a job from the listing endpoint data (no full detail fetch).
   * Used as fallback when individual job detail fetch fails.
   */
  private createJobFromListing(job: GreenhouseJob): Job {
    const location = job.location?.name || 'Unknown';

    return {
      id: '',
      externalId: String(job.id),
      title: job.title || '',
      company: { id: '', name: this.extractCompanyName(), locations: [], createdAt: new Date(), updatedAt: new Date() },
      description: `Position: ${job.title} at ${this.extractCompanyName()}. Location: ${location}. Apply at ${job.absolute_url}`,
      requirements: '',
      responsibilities: '',
      location,
      country: this.extractCountry(location),
      remote: location.toLowerCase().includes('remote'),
      workMode: this.detectWorkMode(location),
      type: JobType.FULL_TIME,
      source: JobSource.GREENHOUSE,
      sourceUrl: job.absolute_url || '',
      visaSponsorship: VisaSponsorshipStatus.UNKNOWN,
      skills: [],
      department: undefined,
      experienceLevel: undefined,
      postedAt: new Date(job.updated_at || Date.now()),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Extracts a human-readable company name from the Greenhouse board URL.
   * e.g. "github" from "https://boards-api.greenhouse.io/v1/boards/github"
   */
  private extractCompanyName(): string {
    const match = this.config.baseUrl.match(/\/boards\/([^/]+)/);
    if (match) {
      const name = match[1];
      // Capitalize first letter
      return name.charAt(0).toUpperCase() + name.slice(1);
    }
    return 'Unknown Company';
  }

  private parseDescription(content: string): {
    fullDescription: string;
    requirements: string;
    responsibilities: string;
  } {
    const cleaned = content.replace(/<[^>]*>/g, '\n').replace(/&amp;/g, '&').replace(/</g, '<').replace(/>/g, '>').replace(/"/g, '"');
    const requirementsMatch = cleaned.match(/(?:Requirements|Qualifications|What you'll need):?([^]*?)(?=\n(?:Responsibilities|Benefits|About|$))/i);
    const responsibilitiesMatch = cleaned.match(/(?:Responsibilities|What you'll do|The role):?([^]*?)(?=\n(?:Requirements|Qualifications|About|$))/i);

    return {
      fullDescription: cleaned.trim(),
      requirements: requirementsMatch ? requirementsMatch[1].trim() : '',
      responsibilities: responsibilitiesMatch ? responsibilitiesMatch[1].trim() : '',
    };
  }

private detectWorkMode(location: string): WorkMode {
    const lower = location.toLowerCase();
    if (lower.includes('remote') || lower.includes('anywhere')) return WorkMode.REMOTE;
    if (lower.includes('hybrid')) return WorkMode.HYBRID;
    return WorkMode.ONSITE;
  }

  private extractSkills(text: string): string[] {
    const commonTechSkills = [
      'javascript', 'typescript', 'python', 'java', 'go', 'rust', 'c++', 'ruby',
      'react', 'angular', 'vue', 'node', 'express', 'django', 'flask', 'spring',
      'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'ci/cd',
      'sql', 'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch',
      'graphql', 'rest', 'api', 'microservices', 'system design',
      'machine learning', 'ai', 'data science', 'deep learning', 'nlp',
    ];

    const lower = text.toLowerCase();
    return commonTechSkills.filter((skill) => lower.includes(skill));
  }

private matchesFilters(job: Job, filters: SearchFilters): boolean {
    // Countries filter
    if (filters.countries?.length) {
      const jobCountry = (job.country || '').toLowerCase();
      const matchesCountry = filters.countries.some(c => jobCountry.includes(c.toLowerCase()));
      if (!matchesCountry) return false;
    }
    // Remote filter
    if (filters.remote === true && !job.remote) return false;
    // Work mode filter
    if (filters.workMode?.length && !filters.workMode.includes(job.workMode as any)) return false;
    // Job type filter
    if (filters.types?.length && !filters.types.includes(job.type as any)) return false;

    // Don't filter by query here — the SearchAgent handles query matching and scoring
    return true;
  }
}

