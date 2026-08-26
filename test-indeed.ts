import { IndeedAdapter } from '../../packages/crawler/src/adapters/indeed';

async function run() {
  console.log('Testing Indeed Adapter...');
  const indeed = new IndeedAdapter();
  let count = 0;
  for await (const job of indeed.searchJobs({ query: 'Software Engineer' })) {
    console.log(`- [${job.company.name}] ${job.title} at ${job.location}`);
    count++;
    if (count >= 5) break;
  }
  if (count === 0) {
    console.log('No jobs found (or proxy failed).');
  } else {
    console.log(`Successfully fetched ${count} jobs.`);
  }
}

run().catch(console.error);
