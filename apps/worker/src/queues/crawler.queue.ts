import { Queue, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import { QUEUE_JOB_CRAWLING, JobSource } from '@visapilot/shared';
import { config } from '@visapilot/config';

const connection = new IORedis(config.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

export const crawlerQueue = new Queue(QUEUE_JOB_CRAWLING, { connection });
export const crawlerQueueEvents = new QueueEvents(QUEUE_JOB_CRAWLING, { connection });

export async function scheduleCrawl(source: JobSource, filters: Record<string, unknown> = {}): Promise<string> {
  const job = await crawlerQueue.add(
    `crawl-${source}-${Date.now()}`,
    { source, filters, timestamp: new Date().toISOString() },
    {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 100,
      removeOnFail: 50,
    },
  );
  return job.id || '';
}

export async function addPeriodicCrawlJobs(): Promise<void> {
  const sources = Object.values(JobSource).filter(
    (s) => s !== JobSource.MANUAL && s !== JobSource.COMPANY_CAREER && s !== JobSource.GOOGLE_JOBS,
  );

  for (const source of sources) {
    await crawlerQueue.add(
      `periodic-crawl-${source}`,
      { source, filters: {}, periodic: true },
      {
        repeat: { pattern: '0 */6 * * *' },
        attempts: 3,
        backoff: { type: 'exponential', delay: 10000 },
      },
    );
  }
}
