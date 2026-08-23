import { JobSource, JobType, WorkMode, VisaSponsorshipStatus } from '@visapilot/shared';
import type { SearchFilters, Job } from '@visapilot/shared';
import { BaseCrawlerAdapter } from './base';
import RssParser from 'rss-parser';

export class RSSAdapter extends BaseCrawlerAdapter {
  readonly source = JobSource.RSS;
  readonly name = 'RSS Feed Adapter';
  private feeds: string[] = [
    'https://weworkremotely.com/categories/remote-programming-jobs.rss',
    'https://jobicy.com/?feed=job_feed',
    'https://nodesk.co/remote-jobs/index.xml',
  ];
  private parser: RssParser;

  constructor(config: Partial<Record<string, unknown>> = {}) {
    super(JobSource.RSS, {
      ...config,
      timeout: 8000,
    });
    this.parser = new RssParser();
  }

  initialize(): Promise<void> {
    this.initialized = true;
    return Promise.resolve();
  }

  configureFeeds(feeds: string[]): void {
    if (feeds && feeds.length > 0) {
      this.feeds = feeds;
    }
  }

  async *searchJobs(filters: SearchFilters): AsyncGenerator<Job> {
    if (!this.initialized) await this.initialize();

    const feedUrls = this.feeds.length > 0
      ? this.feeds
      : [
          'https://weworkremotely.com/categories/remote-programming-jobs.rss',
          'https://jobicy.com/?feed=job_feed',
        ];

    for (const feedUrl of feedUrls) {
      try {
        const response = await this.makeRequest(feedUrl);
        if (!response.ok) continue;
        const xml = await response.text();
        const feed = await this.parser.parseString(xml);

        for (const item of feed.items || []) {
          const description = item.content || item.contentSnippet || item.description || '';
          const lowerDesc = description.toLowerCase();

          // Apply filters
          if (filters.query && !`${item.title} ${description}`.toLowerCase().includes(filters.query.toLowerCase())) {
            continue;
          }
          if (filters.countries?.length && !filters.countries.some((c) => description.toLowerCase().includes(c.toLowerCase()))) {
            continue;
          }

          yield this.normalizeJob({
            externalId: item.guid || item.link || '',
            title: item.title || 'Unknown Position',
            companyName: item.creator || (feed.title ? feed.title.replace(/RSS Feed/i, '').trim() : 'Tech Employer'),
            description,
            requirements: description,
            responsibilities: undefined,
            location: this.extractLocation(description),
            country: this.extractCountry(description),
            remote: lowerDesc.includes('remote') || true,
            workMode: WorkMode.REMOTE,
            type: this.extractJobType(description),
            salaryMin: undefined,
            salaryMax: undefined,
            salaryCurrency: undefined,
            source: JobSource.RSS,
            sourceUrl: item.link || '',
            skills: this.extractSkills(description),
            postedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
          });
        }
      } catch {
        // Skip failed feeds gracefully
      }
    }
  }

  async getJobDetails(externalId: string): Promise<Job> {
    throw new Error('RSS adapter does not support individual job details');
  }

  normalizeJob(rawJob: Record<string, unknown>): Job {
    const companyName = (rawJob.companyName as string) || 'Tech Company';
    const location = (rawJob.location as string) || 'Remote';
    const description = (rawJob.description as string) || '';

    return {
      id: '',
      externalId: (rawJob.externalId as string) || '',
      title: (rawJob.title as string) || 'Untitled Position',
      company: { id: '', name: companyName, locations: [location], createdAt: new Date(), updatedAt: new Date() },
      description,
      requirements: (rawJob.requirements as string) || '',
      responsibilities: '',
      location,
      country: (rawJob.country as string) || this.extractCountry(location),
      remote: Boolean(rawJob.remote),
      workMode: (rawJob.workMode as WorkMode) || WorkMode.REMOTE,
      type: (rawJob.type as JobType) || JobType.FULL_TIME,
      salaryMin: undefined,
      salaryMax: undefined,
      salaryCurrency: undefined,
      source: JobSource.RSS,
      sourceUrl: (rawJob.sourceUrl as string) || '',
      visaSponsorship: VisaSponsorshipStatus.UNKNOWN,
      skills: Array.isArray(rawJob.skills) ? (rawJob.skills as string[]) : this.extractSkills(description),
      postedAt: rawJob.postedAt instanceof Date ? rawJob.postedAt : new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private extractLocation(text: string): string {
    const locationPatterns = [
      /location:\s*([^.\n]+)/i,
      /based in\s+([^.\n]+)/i,
      /located in\s+([^.\n]+)/i,
    ];

    for (const pattern of locationPatterns) {
      const match = text.match(pattern);
      if (match) return match[1].trim();
    }
    return 'Remote / Various';
  }

  private extractJobType(text: string): string {
    const lower = text.toLowerCase();
    if (lower.includes('full-time') || lower.includes('full time')) return JobType.FULL_TIME;
    if (lower.includes('part-time') || lower.includes('part time')) return JobType.PART_TIME;
    if (lower.includes('contract')) return JobType.CONTRACT;
    if (lower.includes('internship')) return JobType.INTERNSHIP;
    return JobType.FULL_TIME;
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
}
