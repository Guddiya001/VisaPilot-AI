import { BaseCrawlerAdapter } from './base';
import type { Job, SearchFilters } from '@visapilot/shared';
import { JobSource, JobType, WorkMode, VisaSponsorshipStatus } from '@visapilot/shared';
import { randomUUID } from 'crypto';
import * as cheerio from 'cheerio';
import { config } from '@visapilot/config';

export class IndeedAdapter extends BaseCrawlerAdapter {
  readonly source = JobSource.INDEED;
  readonly name = 'Indeed';
  private proxyApiKey?: string;

  constructor() {
    super(JobSource.INDEED, {
      baseUrl: 'http://api.scraperapi.com',
      rateLimitPerMinute: 30,
    });
    // @ts-ignore - config types might not be updated yet
    this.proxyApiKey = config.PROXY_API_KEY;
  }

  async initialize(): Promise<void> {
    this.initialized = true;
  }

  async *searchJobs(filters: SearchFilters): AsyncGenerator<Job> {
    if (!this.proxyApiKey || this.proxyApiKey === 'your_proxy_api_key_here') {
      console.warn('Indeed proxy API key missing or invalid. Returning stub data.');
      if (filters.query) {
        yield this.createStubJob('IndeedTech', filters.query);
      }
      return;
    }

    let start = 0;
    let hasMore = true;

    while (hasMore) {
      const q = encodeURIComponent(filters.query || '');
      // @ts-ignore - SearchFilters might not have location in this version
      const l = encodeURIComponent(filters.location || '');
      const indeedUrl = `https://www.indeed.com/jobs?q=${q}&l=${l}&start=${start}`;
      
      const proxyUrl = `${this.config.baseUrl}/?api_key=${this.proxyApiKey}&url=${encodeURIComponent(indeedUrl)}`;

      try {
        const response = await this.makeRequest(proxyUrl);
        const html = await response.text();
        const $ = cheerio.load(html);
        
        const jobCards = $('.job_seen_beacon');
        
        if (jobCards.length === 0) {
          hasMore = false;
          break;
        }

        for (const el of jobCards.toArray()) {
          const card = $(el);
          const titleEl = card.find('h2.jobTitle span[title]');
          const title = titleEl.text().trim();
          
          const companyName = card.find('[data-testid="company-name"]').text().trim();
          const location = card.find('[data-testid="text-location"]').text().trim();
          const href = card.find('h2.jobTitle a').attr('href');
          const sourceUrl = href ? `https://www.indeed.com${href}` : indeedUrl;
          
          // ID extraction: Indeed URLs usually have jk=<id>
          const urlObj = new URL(sourceUrl, 'https://www.indeed.com');
          const jk = urlObj.searchParams.get('vjk') || urlObj.searchParams.get('jk');
          const externalId = jk ? `ind-${jk}` : `ind-${randomUUID().slice(0, 8)}`;
          
          const description = card.find('.job-snippet').text().trim();
          const salaryText = card.find('.salary-snippet-container').text().trim();
          const salary = this.extractSalary(salaryText);

          const job = {
            id: randomUUID(),
            externalId,
            title,
            company: {
              id: companyName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
              name: companyName,
              website: undefined as any,
            } as any,
            description,
            requirements: [] as string[],
            responsibilities: [] as string[],
            location,
            remote: location.toLowerCase().includes('remote'),
            workMode: location.toLowerCase().includes('remote') ? WorkMode.REMOTE : WorkMode.ONSITE,
            type: JobType.FULL_TIME,
            sourceUrl,
            postedAt: new Date(),
            expiresAt: null as any,
            salaryMin: (salary.min || null) as any,
            salaryMax: (salary.max || null) as any,
            salaryCurrency: salary.currency || 'USD',
            skills: filters.query ? [filters.query] : [],
            category: 'General',
            visaSponsorship: VisaSponsorshipStatus.UNKNOWN,
          } as unknown as Job;

          if (title) {
            yield job;
          }
        }
        
        start += 10; // Increment for the next page
        
        // Safety limit to avoid infinite loops
        if (start > 100) {
          hasMore = false;
        }

      } catch (error) {
        console.error('Failed to scrape Indeed via ScraperAPI:', error);
        hasMore = false;
      }
    }
  }

  async getJobDetails(externalId: string): Promise<Job> {
    throw new Error('Method not implemented.');
  }

  normalizeJob(rawJob: Record<string, unknown>): Job {
    throw new Error('Method not implemented.');
  }

  private createStubJob(company: string, query: string): Job {
    return {
      id: randomUUID(),
      externalId: `ind-${randomUUID().slice(0, 8)}`,
      title: `${query} (Indeed Stub)`,
      company: {
        id: company.toLowerCase(),
        name: company,
        website: `https://${company.toLowerCase()}.com`,
      },
      description: 'Indeed parsed job stub (Mock Data)',
      requirements: [],
      responsibilities: [],
      location: 'New York, NY',
      remote: false,
      workMode: WorkMode.ONSITE,
      type: JobType.FULL_TIME,
      sourceUrl: `https://www.indeed.com/viewjob?jk=12345`,
      postedAt: new Date(),
      expiresAt: null,
      salaryMin: null,
      salaryMax: null,
      salaryCurrency: 'USD',
      skills: [query],
      category: 'Engineering',
      visaSponsorship: VisaSponsorshipStatus.UNKNOWN,
    } as unknown as Job;
  }
}
