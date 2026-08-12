import { JobSource, JobType, WorkMode } from '@visapilot/shared';
import type { SearchFilters, Job } from '@visapilot/shared';
import { BaseCrawlerAdapter } from './base';
import RssParser from 'rss-parser';

export class RSSAdapter extends BaseCrawlerAdapter {
  readonly source = JobSource.RSS;
  readonly name = 'RSS Feed Adapter';
  private feeds: string[] = [];
  private parser: RssParser;

  constructor(config: Partial<Record<string, unknown>>) {
    super(JobSource.RSS, config as Record<string, unknown>);
    this.parser = new RssParser();
  }

  initialize(): Promise<void> {
    this.initialized = true;
    return Promise.resolve();
  }

  configureFeeds(feeds: string[]): void {
    this.feeds = feeds;
  }

  async *searchJobs(filters: SearchFilters): AsyncGenerator<Job> {
    if (!this.initialized) await this.initialize();

    const feedUrls = this.feeds.length > 0
      ? this.feeds
      : filters.sources?.includes(JobSource.RSS)
        ? [filters.query || '']
        : [];

    for (const feedUrl of feedUrls) {
      try {
        const feed = await this.parser.parseURL(feedUrl);

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
            companyName: feed.title || 'Unknown Company',
            description,
            requirements: description,
            responsibilities: undefined,
            location: this.extractLocation(description),
            country: this.extractCountry(description),
            remote: lowerDesc.includes('remote'),
            workMode: lowerDesc.includes('remote') ? WorkMode.REMOTE : WorkMode.ONSITE,
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
        // Skip failed feeds
      }
    }
  }

  async getJobDetails(externalId: string): Promise<Job> {
    throw new Error('RSS adapter does not support individual job details');
  }

  normalizeJob(rawJob: Record<string, unknown>): Job {
    return rawJob as unknown as Job;
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
