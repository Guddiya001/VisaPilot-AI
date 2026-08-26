import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const envSchema = z.object({
  // App
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  HOST: z.string().default('0.0.0.0'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error', 'fatal']).default('info'),

  // Database
  DATABASE_URL: z.string().default('postgresql://visapilot:visapilot@localhost:5432/visapilot'),
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // Auth
  JWT_SECRET: z.string().default('visapilot-dev-secret-change-in-production'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().default('visapilot-refresh-secret-change-in-production'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // AI Provider
  AI_PROVIDER: z.enum(['local', 'groq', 'gemini', 'agentrouter']).default('local'),
  GROQ_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  AGENTROUTER_API_KEY: z.string().optional(),

  // Ollama
  OLLAMA_BASE_URL: z.string().default('http://localhost:11434'),
  //OLLAMA_MODEL: z.string().default('gemma3:4b'),minimax-m3:cloud
  OLLAMA_MODEL: z.string().default('minimax-m3:cloud'),
  OLLAMA_EMBEDDING_MODEL: z.string().default('nomic-embed-text'),
  OLLAMA_REQUEST_TIMEOUT: z.coerce.number().default(30000),

  // API
  API_RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  API_RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
  API_VERSION: z.string().default('v1'),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:3000'),

  // Swagger
  SWAGGER_ENABLED: z.coerce.boolean().default(true),
  SWAGGER_TITLE: z.string().default('VisaPilot AI API'),
  SWAGGER_DESCRIPTION: z.string().default('AI-Powered International Job Search Platform API'),
  SWAGGER_VERSION: z.string().default('1.0.0'),

  // Monitoring
  SENTRY_DSN: z.string().optional(),

  // Queue
  QUEUE_CONCURRENCY: z.coerce.number().default(5),

  // Crawler
  CRAWLER_INTERVAL_MINUTES: z.coerce.number().default(60),
  CRAWLER_MAX_JOBS_PER_RUN: z.coerce.number().default(500),
  CRAWLER_USER_AGENT: z.string().default(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  ),
  SERP_API_KEY: z.string().optional(),
  PROXY_API_KEY: z.string().optional(),

  // Storage
  STORAGE_PROVIDER: z.enum(['local', 's3', 'gcs']).default('local'),
  STORAGE_LOCAL_PATH: z.string().default('./uploads'),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().optional(),
  AWS_S3_BUCKET: z.string().optional(),

  // Email
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().default('noreply@visapilot.ai'),
});

function validateConfig() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment configuration');
  }

  return parsed.data;
}

export const config = validateConfig();

export type Config = z.infer<typeof envSchema>;
