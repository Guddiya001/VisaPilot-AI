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

export const TARGET_ROLES = [
  'Senior Software Engineer',
  'Senior Full-Stack Engineer',
  'Senior Frontend Engineer',
  'Senior Backend Engineer',
  'Staff Software Engineer',
  'Principal Software Engineer',
  'Lead Software Engineer',
  'Senior Platform Engineer',
  'Senior AI Engineer',
  'GenAI Engineer',
  'Agentic AI Engineer',
  'AI Platform Engineer',
  'Machine Learning Platform Engineer',
];

export const TARGET_SKILLS = [
  // Frontend
  'React.js', 'Next.js', 'TypeScript', 'JavaScript', 'Vue.js', 'Tailwind CSS', 'Redux', 'React Query',
  // Backend
  'Node.js', 'Express.js', 'NestJS', 'Fastify', 'Python', 'FastAPI', 'Flask', 'REST', 'GraphQL',
  // Architecture
  'Microservices', 'Distributed systems', 'Event-driven architecture', 'System design', 'Cloud-native architecture', 'Micro-frontends', 'Module Federation',
  // Infrastructure
  'AWS', 'GCP', 'Azure', 'Docker', 'Kubernetes', 'Terraform', 'Kafka', 'RabbitMQ', 'Redis', 'PostgreSQL', 'MySQL', 'MongoDB',
  // AI
  'GenAI', 'LLM', 'Agentic AI', 'AI Agents', 'MCP', 'Model Context Protocol', 'RAG', 'LangChain', 'LangGraph', 'LlamaIndex', 'Tool calling', 'AI orchestration', 'Vector databases', 'Embeddings', 'Prompt engineering'
];

export const COUNTRY_PRIORITY_TIERS: Record<string, number> = {
  // TIER 0
  'United States': 0, 'New York': 0, 'San Francisco': 0, 'Bay Area': 0, 'Seattle': 0, 'Austin': 0, 'Boston': 0, 'Chicago': 0, 'Denver': 0, 'Washington DC': 0, 'Los Angeles': 0, 'Remote US': 0,
  // TIER 1
  'Switzerland': 1, 'Germany': 1, 'Netherlands': 1, 'Australia': 1, 'Ireland': 1, 'UK': 1, 'Singapore': 1, 'Canada': 1,
  // TIER 2
  'Sweden': 2, 'Denmark': 2, 'Norway': 2, 'Estonia': 2, 'Poland': 2, 'UAE': 2, 'New Zealand': 2,
  // TIER 3
  'Remote worldwide': 3, 'Remote Europe': 3, 'Remote APAC': 3
};
