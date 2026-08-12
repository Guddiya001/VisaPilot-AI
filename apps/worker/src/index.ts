import { Worker, Queue, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import {
  QUEUE_JOB_CRAWLING,
  QUEUE_JOB_PROCESSING,
  QUEUE_EMBEDDING,
  QUEUE_AI_ANALYSIS,
  QUEUE_NOTIFICATION,
} from '@visapilot/shared';
import { config } from '@visapilot/config';
import { crawlerService } from '@visapilot/crawler';

const connection = new IORedis(config.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

const queues = {
  crawling: new Queue(QUEUE_JOB_CRAWLING, { connection }),
  processing: new Queue(QUEUE_JOB_PROCESSING, { connection }),
  embedding: new Queue(QUEUE_EMBEDDING, { connection }),
  aiAnalysis: new Queue(QUEUE_AI_ANALYSIS, { connection }),
  notification: new Queue(QUEUE_NOTIFICATION, { connection }),
};

async function processCrawlingJob(job: { data: { source?: string; filters?: Record<string, unknown> } }) {
  console.log(`[Worker] Processing crawling job: ${job.data.source || 'all'}`);
  const result = await crawlerService.searchJobs(job.data.filters || {});
  return result;
}

async function processEmbeddingJob(job: { data: { content: string; resourceId: string; resourceType: string } }) {
  console.log(`[Worker] Generating embedding for ${job.data.resourceType}: ${job.data.resourceId}`);
  const { ollamaClient } = await import('@visapilot/ai');
  const embedding = await ollamaClient.generateEmbedding(job.data.content);
  return { embedding, resourceId: job.data.resourceId, resourceType: job.data.resourceType };
}

async function processAIJob(job: { data: { type: string; payload: Record<string, unknown> } }) {
  console.log(`[Worker] Processing AI analysis: ${job.data.type}`);
  const { coordinatorAgent } = await import('@visapilot/ai');
  const result = await coordinatorAgent.process(job.data.payload);
  return result;
}

async function processNotificationJob(job: { data: { userId: string; type: string; title: string; body: string } }) {
  console.log(`[Worker] Sending notification to ${job.data.userId}: ${job.data.title}`);
  return { sent: true, userId: job.data.userId, type: job.data.type };
}

const workers = [
  new Worker(QUEUE_JOB_CRAWLING, processCrawlingJob, {
    connection,
    concurrency: config.QUEUE_CONCURRENCY || 3,
  }),
  new Worker(QUEUE_EMBEDDING, processEmbeddingJob, {
    connection,
    concurrency: 5,
  }),
  new Worker(QUEUE_AI_ANALYSIS, processAIJob, {
    connection,
    concurrency: 2,
  }),
  new Worker(QUEUE_NOTIFICATION, processNotificationJob, {
    connection,
    concurrency: 10,
  }),
];

workers.forEach((worker) => {
  worker.on('completed', (job) => {
    console.log(`[Worker] Job ${job.id} completed successfully`);
  });
  worker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed:`, err.message);
  });
});

console.log('🚀 VisaPilot Worker started');
console.log(`📋 Queues: ${Object.keys(queues).join(', ')}`);
console.log(`👷 Workers: ${workers.length} active`);

process.on('SIGTERM', async () => {
  console.log('Shutting down workers...');
  await Promise.all(workers.map((w) => w.close()));
  await connection.quit();
  process.exit(0);
});
