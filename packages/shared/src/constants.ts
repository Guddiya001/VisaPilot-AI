export const PROJECT_NAME = 'VisaPilot AI';
export const PROJECT_VERSION = '1.0.0';
export const PROJECT_DESCRIPTION = 'AI-Powered International Job Search Platform';

export const API_VERSION = 'v1';
export const API_PREFIX = `/api/${API_VERSION}`;

export const PAGINATION_DEFAULT_PAGE = 1;
export const PAGINATION_DEFAULT_LIMIT = 20;
export const PAGINATION_MAX_LIMIT = 100;

export const JOB_EXPIRY_DAYS = 30;
export const MAX_RESUME_SIZE_MB = 10;
export const MAX_RESUME_FILE_SIZE = MAX_RESUME_SIZE_MB * 1024 * 1024;
export const ALLOWED_RESUME_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

export const OLLAMA_DEFAULT_BASE_URL = 'http://localhost:11434';
export const OLLAMA_DEFAULT_MODEL = 'qwen3';
export const OLLAMA_EMBEDDING_MODEL = 'nomic-embed-text';
export const OLLAMA_REQUEST_TIMEOUT_MS = 30000;

export const REDIS_DEFAULT_PORT = 6379;
export const REDIS_DEFAULT_HOST = 'localhost';

export const QUEUE_JOB_CRAWLING = 'job-crawling';
export const QUEUE_JOB_PROCESSING = 'job-processing';
export const QUEUE_EMBEDDING = 'embedding';
export const QUEUE_AI_ANALYSIS = 'ai-analysis';
export const QUEUE_NOTIFICATION = 'notification';

export const CACHE_TTL_JOBS = 60 * 5; // 5 minutes
export const CACHE_TTL_COMPANIES = 60 * 30; // 30 minutes
export const CACHE_TTL_ANALYSIS = 60 * 60; // 1 hour

export const AUTH_TOKEN_EXPIRY = '15m';
export const AUTH_REFRESH_TOKEN_EXPIRY = '7d';
export const AUTH_REFRESH_TOKEN_EXPIRY_SECONDS = 7 * 24 * 60 * 60;

export const ATS_MATCH_THRESHOLD = 0.7; // 70% minimum match
export const VISA_CONFIDENCE_THRESHOLD = 0.6;

export const RAG_MAX_RESULTS = 10;
export const RAG_SIMILARITY_THRESHOLD = 0.75;

export const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
export const RATE_LIMIT_MAX_REQUESTS = 100;
export const RATE_LIMIT_AUTH_MAX_REQUESTS = 20;

