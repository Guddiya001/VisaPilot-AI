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

// ============ ATS Optimization Config ============
export const MAX_ATS_ITERATIONS = 5;
export const TARGET_ATS_SCORE = 100;

export const ATS_SCORE_WEIGHTS = {
  requiredSkills: 30,
  preferredSkills: 20,
  experienceMatch: 20,
  keywords: 15,
  responsibilities: 10,
  education: 5,
  formatting: 5,
} as const;

export const ATS_SCORE_MAX_TOTAL = Object.values(ATS_SCORE_WEIGHTS).reduce((a, b) => a + b, 0); // 105

export const ATS_MATCH_LEVEL_THRESHOLDS = {
  EXCELLENT: 95,
  STRONG: 90,
  GOOD: 80,
  NEEDS_OPTIMIZATION: 70,
} as const;

/**
 * Skill alias map: maps variant spellings/abbreviations to canonical forms.
 * All keys MUST be lowercase. Used by the ATS scorer to match equivalent terms.
 */
export const SKILL_ALIASES: Record<string, string[]> = {
  // JavaScript ecosystem
  'react': ['react.js', 'reactjs', 'react js'],
  'react.js': ['react', 'reactjs', 'react js'],
  'next.js': ['nextjs', 'next js', 'next'],
  'vue.js': ['vuejs', 'vue js', 'vue'],
  'node.js': ['nodejs', 'node js', 'node'],
  'express.js': ['expressjs', 'express'],
  'typescript': ['ts'],
  'javascript': ['js', 'ecmascript', 'es6', 'es2015'],

  // Python ecosystem
  'fastapi': ['fast api', 'fast-api'],

  // DevOps / Infrastructure
  'kubernetes': ['k8s'],
  'k8s': ['kubernetes'],
  'docker': ['containerization', 'containers'],
  'terraform': ['iac', 'infrastructure as code'],
  'ci/cd': ['cicd', 'ci cd', 'continuous integration', 'continuous delivery', 'continuous deployment'],
  'cicd': ['ci/cd', 'ci cd'],

  // Cloud
  'aws': ['amazon web services'],
  'gcp': ['google cloud', 'google cloud platform'],
  'azure': ['microsoft azure'],

  // Databases
  'postgresql': ['postgres', 'pg'],
  'postgres': ['postgresql', 'pg'],
  'mongodb': ['mongo'],
  'mongo': ['mongodb'],

  // Messaging
  'kafka': ['apache kafka'],
  'rabbitmq': ['rabbit mq', 'amqp'],

  // AI / ML
  'genai': ['generative ai', 'gen ai', 'gen-ai'],
  'generative ai': ['genai', 'gen ai', 'gen-ai'],
  'llm': ['large language model', 'large language models'],
  'rag': ['retrieval augmented generation', 'retrieval-augmented generation'],
  'ai agents': ['agentic ai', 'ai agent', 'intelligent agents'],
  'agentic ai': ['ai agents', 'ai agent'],
  'langchain': ['lang chain'],
  'langgraph': ['lang graph'],
  'mcp': ['model context protocol'],
  'model context protocol': ['mcp'],

  // Methodologies
  'agile': ['scrum', 'kanban'],
  'scrum': ['agile'],
  'tdd': ['test driven development', 'test-driven development'],
  'bdd': ['behavior driven development', 'behavior-driven development'],

  // Architecture
  'microservices': ['micro-services', 'micro services'],
  'rest': ['restful', 'rest api', 'rest apis'],
  'restful': ['rest', 'rest api', 'rest apis'],
  'graphql': ['graph ql'],

  // Observability
  'datadog': ['data dog'],
  'grafana': ['grafana dashboards'],
  'splunk': ['splunk enterprise'],

  // Testing
  'jest': ['jestjs'],
  'cypress': ['cypress.io'],
  'selenium': ['selenium webdriver'],
} as const;

// ============ AutoApply Queue ============
export const QUEUE_AUTO_APPLY = 'auto-apply';
export const QUEUE_PACKAGE_GENERATION = 'package-generation';
