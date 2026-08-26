import {
  GreenhouseAdapter,
  LeverAdapter,
  AshbyAdapter,
  RSSAdapter,
  IndeedAdapter,
  crawlerService,
} from './packages/crawler/src';
import { JobSource } from './packages/shared/src';

async function testAdapter(name: string, adapterFn: () => AsyncGenerator<any>) {
  console.log(`\n----------------------------------------`);
  console.log(`Testing Adapter: ${name}...`);
  const jobs: any[] = [];
  try {
    for await (const job of adapterFn()) {
      jobs.push(job);
      if (jobs.length >= 3) break; // Collect up to 3 sample jobs
    }
    console.log(`[${name}] SUCCESS: Found ${jobs.length} sample jobs`);
    for (const job of jobs) {
      console.log(`  - [${job.company?.name || job.companyName || 'Unknown'}] ${job.title} (${job.location || 'Remote'}) [Source: ${job.source}]`);
    }
  } catch (err) {
    console.error(`[${name}] ERROR:`, err instanceof Error ? err.message : String(err));
  }
}

async function main() {
  console.log('========================================');
  console.log('TESTING ALL LIVE CRAWLER ADAPTERS');
  console.log('========================================');

  // 1. Greenhouse Adapter
  const greenhouse = new GreenhouseAdapter(['github', 'dropbox', 'postman', 'cloudflare']);
  await testAdapter('Greenhouse', () => greenhouse.searchJobs({ limit: 5 }));

  // 2. Lever Adapter
  const lever = new LeverAdapter(['atlassian', 'netflix', 'spotify', 'affirm']);
  await testAdapter('Lever', () => lever.searchJobs({ limit: 5 }));

  // 3. Ashby Adapter
  const ashby = new AshbyAdapter(['linear', 'retool', 'openai', 'ramp']);
  await testAdapter('Ashby', () => ashby.searchJobs({ limit: 5 }));

  // 4. RSS Adapter
  const rss = new RSSAdapter({ baseUrl: '' });
  rss.configureFeeds([
    'https://remoteok.com/remote-jobs.rss',
    'https://weworkremotely.com/remote-jobs.rss',
    'https://hnhiring.com/feed.rss',
  ]);
  await testAdapter('RSS Feed', () => rss.searchJobs({ limit: 5 }));

  // 5. Indeed Adapter
  const indeed = new IndeedAdapter();
  await testAdapter('Indeed', () => indeed.searchJobs({ query: 'Software Engineer', limit: 5 }));

  // 6. Full CrawlerService Multi-Adapter Aggregator
  console.log(`\n----------------------------------------`);
  console.log(`Testing CrawlerService Aggregator...`);
  const results = await crawlerService.searchJobs({
    query: 'Engineer',
    limit: 10,
  });

  console.log(`[CrawlerService] Found ${results.jobs?.length || 0} jobs across all adapters.`);
  const sources = [...new Set((results.jobs || []).map((j) => j.source))];
  console.log(`[CrawlerService] Active sources returned:`, sources);
  console.log('========================================\n');
}

main().catch(console.error);
