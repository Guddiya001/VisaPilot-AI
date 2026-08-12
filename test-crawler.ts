import { crawlerService } from '@visapilot/crawler';

async function main() {
  console.log('Testing crawler...');
  try {
    const results = await crawlerService.searchJobs({ query: 'Software Engineer', limit: 5 });
    console.log(`Found ${results.jobs?.length || 0} jobs.`);
    if (results.errors?.length) {
      console.error('Errors:', results.errors);
    }
    if (results.jobs?.length) {
      console.log('First job:', results.jobs[0].title, 'at', results.jobs[0].companyName);
    }
  } catch (err) {
    console.error('Crawler failed:', err);
  }
}

main();
