import {
  GreenhouseAdapter,
  LeverAdapter,
  AshbyAdapter,
  RSSAdapter,
  LinkedInAdapter,
  crawlerService,
} from '@visapilot/crawler';
import { JobSource } from '@visapilot/shared';

declare const describe: any;
declare const it: any;
declare const expect: any;

describe('Crawler Adapters Live Health Check', () => {
  it('1. GreenhouseAdapter should fetch live jobs from Greenhouse boards', async () => {
    const greenhouse = new GreenhouseAdapter(['github', 'postman', 'cloudflare']);
    const jobs: any[] = [];
    for await (const job of greenhouse.searchJobs({ limit: 5 })) {
      jobs.push(job);
      if (jobs.length >= 3) break;
    }

    expect(jobs.length).toBeGreaterThan(0);
    expect(jobs[0].title).toBeDefined();
    expect(jobs[0].company?.name).toBeDefined();
    expect(jobs[0].source).toBe(JobSource.GREENHOUSE);
  }, 20000);

  it('2. LeverAdapter should fetch live jobs from Lever company boards', async () => {
    const lever = new LeverAdapter(['atlassian', 'netflix', 'spotify', 'affirm']);
    const jobs: any[] = [];
    for await (const job of lever.searchJobs({ limit: 5 })) {
      jobs.push(job);
      if (jobs.length >= 3) break;
    }

    expect(jobs.length).toBeGreaterThan(0);
    expect(jobs[0].title).toBeDefined();
    expect(jobs[0].company?.name).toBeDefined();
    expect(jobs[0].source).toBe(JobSource.LEVER);
  }, 20000);

  it('3. AshbyAdapter should fetch live jobs from Ashby boards', async () => {
    const ashby = new AshbyAdapter(['linear', 'retool', 'openai', 'ramp']);
    const jobs: any[] = [];
    for await (const job of ashby.searchJobs({ limit: 5 })) {
      jobs.push(job);
      if (jobs.length >= 3) break;
    }

    expect(jobs.length).toBeGreaterThan(0);
    expect(jobs[0].title).toBeDefined();
    expect(jobs[0].company?.name).toBeDefined();
    expect(jobs[0].source).toBe(JobSource.ASHBY);
  }, 20000);

  it('4. RSSAdapter should parse and fetch live jobs from tech feeds', async () => {
    const rss = new RSSAdapter({ baseUrl: '' });
    rss.configureFeeds([
      'https://weworkremotely.com/categories/remote-programming-jobs.rss',
      'https://jobicy.com/?feed=job_feed',
    ]);
    const jobs: any[] = [];
    for await (const job of rss.searchJobs({ limit: 5 })) {
      jobs.push(job);
      if (jobs.length >= 3) break;
    }

    expect(jobs.length).toBeGreaterThan(0);
    expect(jobs[0].title).toBeDefined();
    expect(jobs[0].source).toBe(JobSource.RSS);
  }, 20000);

  it('5. LinkedInAdapter should fetch live jobs from LinkedIn guest postings API', async () => {
    const linkedin = new LinkedInAdapter();
    const jobs: any[] = [];
    for await (const job of linkedin.searchJobs({ query: 'Software Engineer', limit: 5 })) {
      jobs.push(job);
      if (jobs.length >= 3) break;
    }

    expect(jobs.length).toBeGreaterThan(0);
    expect(jobs[0].title).toBeDefined();
    expect(jobs[0].company?.name).toBeDefined();
    expect(jobs[0].source).toBe(JobSource.LINKEDIN);
    expect(jobs[0].sourceUrl).toContain('linkedin.com');
  }, 20000);

  it('6. CrawlerService aggregator should aggregate results from multiple active adapters including LinkedIn', async () => {
    const result = await crawlerService.searchJobs({
      query: 'Engineer',
      limit: 10,
    });

    expect(result.jobs).toBeDefined();
    expect(result.jobs.length).toBeGreaterThan(0);
    const sources = [...new Set(result.jobs.map((j) => j.source))];
    expect(sources.length).toBeGreaterThan(0);
  }, 30000);
});
