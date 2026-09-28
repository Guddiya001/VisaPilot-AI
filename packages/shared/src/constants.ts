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
  'Node.js', 'Express.js', 'NestJS', 'Fastify', 'Python', 'FastAPI', 'Flask', 'REST', 'GraphQL', 'Golang', 'Go',
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
  // ── JavaScript / TypeScript ecosystem ─────────────────────────────────────
  'react': ['react.js', 'reactjs', 'react js'],
  'react.js': ['react', 'reactjs', 'react js'],
  'next.js': ['nextjs', 'next js', 'next'],
  'vue.js': ['vuejs', 'vue js', 'vue'],
  'angular': ['angularjs', 'angular.js'],
  'node.js': ['nodejs', 'node js', 'node'],
  'express.js': ['expressjs', 'express', 'express js'],
  'nestjs': ['nest.js', 'nest js'],
  'typescript': ['ts'],
  'javascript': ['js', 'ecmascript', 'es6', 'es2015', 'es6+'],

  // ── Python ecosystem ───────────────────────────────────────────────────────
  'python': ['py'],
  'fastapi': ['fast api', 'fast-api'],
  'django': ['django rest framework', 'drf'],
  'flask': ['flask api'],

  // ── Go ecosystem ───────────────────────────────────────────────────────────
  'go': ['golang', 'go lang', 'go language'],
  'golang': ['go', 'go lang', 'go language'],
  'gin': ['gin-gonic', 'gin framework'],

  // ── Java ecosystem ─────────────────────────────────────────────────────────
  'java': ['core java', 'java se', 'java ee', 'j2ee'],
  'spring boot': ['spring', 'springboot', 'spring framework', 'spring mvc'],
  'spring': ['spring boot', 'springboot', 'spring framework'],
  'jvm': ['java virtual machine', 'java vm'],
  'hibernate': ['jpa', 'java persistence api'],

  // ── Scala / Akka ecosystem ─────────────────────────────────────────────────
  'scala': ['scala lang'],
  'akka': ['akka streams', 'akka actors'],

  // ── Kotlin ecosystem ───────────────────────────────────────────────────────
  'kotlin': ['kotlin jvm', 'kotlin/jvm'],
  'ktor': ['ktor framework'],

  // ── Rust ecosystem ─────────────────────────────────────────────────────────
  'rust': ['rust lang', 'rust-lang'],
  'actix': ['actix-web', 'actix web'],
  'tokio': ['tokio async'],

  // ── C# / .NET ecosystem ───────────────────────────────────────────────────
  'c#': ['csharp', 'c sharp', '.net', 'dotnet'],
  '.net': ['dotnet', 'csharp', 'c#', 'asp.net', 'asp.net core'],
  'asp.net': ['asp.net core', 'aspnet', 'asp net'],
  'dotnet': ['c#', '.net', 'csharp'],

  // ── Ruby ecosystem ─────────────────────────────────────────────────────────
  'ruby': ['ruby lang', 'ruby language'],
  'ruby on rails': ['rails', 'ror', 'rails framework'],
  'rails': ['ruby on rails', 'ror'],

  // ── Elixir ecosystem ───────────────────────────────────────────────────────
  'elixir': ['elixir lang'],
  'phoenix': ['phoenix framework', 'phoenix liveview'],

  // ── PHP ecosystem ──────────────────────────────────────────────────────────
  'php': ['php 8', 'php8'],
  'laravel': ['laravel framework', 'laravel php'],

  // ── DevOps / Infrastructure / SRE ─────────────────────────────────────────
  'kubernetes': ['k8s', 'kube'],
  'k8s': ['kubernetes', 'kube'],
  'docker': ['containerization', 'containers', 'container'],
  'terraform': ['iac', 'infrastructure as code', 'tf'],
  'helm': ['helm charts', 'kubernetes helm'],
  'argocd': ['argo cd', 'argo'],
  'ansible': ['ansible playbook', 'ansible playbooks', 'ansible roles', 'ansible automation'],
  'bash': ['bash scripting', 'shell scripting', 'sh', 'shell'],
  'linux': ['linux systems', 'linux administration', 'linux troubleshooting', 'unix', 'rhel', 'centos', 'ubuntu', 'debian'],
  'linux troubleshooting': ['linux debugging', 'kernel troubleshooting', 'system troubleshooting', 'strace', 'iostat', 'vmstat'],
  'linux networking': ['networking', 'tcp/ip', 'iptables', 'tcpdump', 'socket buffers', 'conntrack', 'sysctl somaxconn', 'network troubleshooting'],
  'linux filesystems': ['filesystems', 'file systems', 'ext4', 'xfs', 'inode', 'storage i/o', 'disk i/o', 'zfs', 'btrfs', 'filesystem tuning'],
  'infrastructure migration': ['cloud migration', 'service migration', 'database migration', 'zero-downtime migration', 'workload migration', 'data migration', 'infrastructure modernization'],
  'incident response': ['incident management', 'incident commander', 'on-call', 'sev-1', 'outage response', 'pagerduty', 'opsgenie'],
  'alert management': ['alerting', 'alert triage', 'monitoring alerts', 'pagerduty', 'opsgenie', 'alertmanager'],
  'dynamic environments': ['ephemeral environments', 'preview environments', 'on-demand environments', 'dynamic environments on kubernetes'],
  'ci/cd': ['cicd', 'ci cd', 'continuous integration', 'continuous delivery', 'continuous deployment', 'pipelines'],
  'cicd': ['ci/cd', 'ci cd', 'continuous integration', 'continuous delivery'],
  'github actions': ['github ci', 'gh actions'],
  'gitlab ci/cd': ['gitlab ci', 'gitlab pipelines'],

  // ── Cloud providers ────────────────────────────────────────────────────────
  'aws': ['amazon web services', 'amazon aws'],
  'gcp': ['google cloud', 'google cloud platform', 'google cloud services'],
  'azure': ['microsoft azure', 'azure cloud'],

  // ── Databases (SQL) ────────────────────────────────────────────────────────
  'postgresql': ['postgres', 'pg', 'psql'],
  'postgres': ['postgresql', 'pg', 'psql'],
  'mysql': ['mysql db'],
  'mariadb': ['maria db'],
  'sqlite': ['sqlite3'],
  'mssql': ['microsoft sql server', 'sql server'],

  // ── Databases (NoSQL) ─────────────────────────────────────────────────────
  'mongodb': ['mongo', 'mongo db'],
  'mongo': ['mongodb', 'mongo db'],
  'redis': ['redis cache', 'redis db'],
  'elasticsearch': ['elastic search', 'elastic', 'opensearch'],
  'cassandra': ['apache cassandra'],
  'dynamodb': ['dynamo db', 'aws dynamodb'],

  // ── Analytics / Data Warehouses ───────────────────────────────────────────
  'snowflake': ['snowflake db', 'snowflake data warehouse'],
  'clickhouse': ['click house'],
  'bigquery': ['google bigquery', 'bq'],

  // ── Messaging & Streaming ─────────────────────────────────────────────────
  'kafka': ['apache kafka', 'confluent kafka'],
  'rabbitmq': ['rabbit mq', 'amqp', 'rabbit'],
  'nats': ['nats.io', 'nats messaging'],
  'aws sqs': ['sqs', 'simple queue service'],
  'aws sns': ['sns', 'simple notification service'],
  'kinesis': ['aws kinesis', 'amazon kinesis'],
  'pubsub': ['google pub/sub', 'google pubsub'],

  // ── API patterns ──────────────────────────────────────────────────────────
  'rest': ['restful', 'rest api', 'rest apis', 'http api'],
  'restful': ['rest', 'rest api', 'rest apis'],
  'graphql': ['graph ql', 'graph-ql'],
  'grpc': ['gRPC', 'g-rpc', 'protocol buffers'],
  'websockets': ['websocket', 'ws', 'socket.io'],

  // ── Architecture patterns ─────────────────────────────────────────────────
  'microservices': ['micro-services', 'micro services', 'service oriented architecture'],
  'event-driven architecture': ['event driven', 'event-driven', 'eda'],
  'distributed systems': ['distributed computing', 'distributed architecture'],
  'system design': ['software architecture', 'architectural design'],
  'cloud-native': ['cloud native', 'cloud-native architecture'],

  // ── Observability ─────────────────────────────────────────────────────────
  'datadog': ['data dog', 'dd'],
  'grafana': ['grafana dashboards', 'grafana monitoring'],
  'splunk': ['splunk enterprise', 'splunk cloud'],
  'prometheus': ['prometheus monitoring'],
  'loki': ['grafana loki', 'logql', 'loki logging'],
  'sentry': ['sentry.io', 'sentry error tracking', 'sentry apm'],
  'opentelemetry': ['open telemetry', 'otel'],
  'new relic': ['newrelic', 'new-relic'],

  // ── Testing ───────────────────────────────────────────────────────────────
  'jest': ['jestjs', 'jest test'],
  'cypress': ['cypress.io', 'cypress e2e'],
  'selenium': ['selenium webdriver', 'selenium grid'],
  'playwright': ['playwright test'],
  'vitest': ['vite test'],

  // ── AI / Generative AI / ML Ecosystem ─────────────────────────────────────
  'genai': ['generative ai', 'gen ai', 'gen-ai'],
  'generative ai': ['genai', 'gen ai', 'gen-ai'],
  'llm': ['large language model', 'large language models'],
  'large language models': ['llm', 'large language model'],
  'rag': ['retrieval augmented generation', 'retrieval-augmented generation', 'advanced rag'],
  'vector search': ['vector databases', 'vector db', 'vector store', 'dense vector search', 'semantic search', 'pgvector', 'chroma', 'qdrant', 'pinecone'],
  'vector databases': ['vector search', 'vector db', 'vector store', 'pgvector', 'chroma', 'qdrant'],
  'embeddings': ['text embeddings', 'semantic embeddings', 'dense embeddings', 'text-embedding-3', 'cohere embeddings'],
  'prompt design': ['prompt engineering', 'system prompts', 'few-shot prompt design', 'chain of thought'],
  'prompt engineering': ['prompt design', 'system prompts', 'few-shot prompt design'],
  'structured output': ['structured outputs', 'pydantic', 'json schema', 'function calling', 'instructor'],
  'llm evaluation': ['ragas', 'deepeval', 'trulens', 'model evaluation', 'llm evals', 'eval benchmarks'],
  'agentic systems': ['agentic ai', 'ai agents', 'autonomous agents', 'multi-agent systems', 'agentic workflows'],
  'ai agents': ['agentic ai', 'ai agent', 'intelligent agents', 'llm agents', 'agentic systems'],
  'agentic ai': ['ai agents', 'ai agent', 'llm agents', 'agentic systems'],
  'langchain': ['lang chain', 'langchain ai', 'lcel'],
  'langgraph': ['lang graph', 'stategraph', 'multi-agent graph'],
  'mcp': ['model context protocol'],
  'model context protocol': ['mcp'],
  'production ai systems': ['production ai', 'production ml', 'production llm', 'enterprise ai systems'],
  'production ai': ['production ai systems', 'production ml', 'enterprise ai'],
  'ai solution from exploration to production': ['exploration to production', 'ai lifecycle', 'poc to production', '0 to 1 ai'],
  'mlops': ['llmops', 'ml ops', 'llm ops', 'langsmith', 'model registry'],
  'llmops': ['mlops', 'llm ops', 'langsmith', 'token cost optimization'],
  'pytorch': ['py torch', 'torch', 'deep learning'],
  'tensorflow': ['tensor flow', 'tf'],
  'scikit-learn': ['sklearn', 'scikit learn'],
  'classical ml': ['machine learning', 'ml', 'classical machine learning', 'tabular models', 'randomforest', 'xgboost'],
  'machine learning': ['ml', 'classical ml', 'machine learning engineering'],
  'nlp': ['natural language processing', 'text processing', 'spacy', 'nltk', 'named entity recognition', 'ner'],
  'natural language processing': ['nlp', 'text processing'],
  'azure openai': ['azure openai service', 'azure ai', 'azure ai search'],
  'project ownership': ['ownership', 'end-to-end ownership', 'technical ownership', 'lead ownership'],
  'mentoring': ['mentor', 'coaching', 'mentorship', 'team mentoring'],
  'international collaboration': ['global teams', 'cross-border collaboration', 'distributed teams'],
  'business stakeholder communication': ['stakeholder management', 'stakeholder communication', 'business communication'],

  // ── Security ──────────────────────────────────────────────────────────────
  'oauth': ['oauth 2.0', 'oauth2'],
  'jwt': ['json web token', 'json web tokens'],
  'sso': ['single sign-on', 'single sign on'],
  'rbac': ['role based access control', 'role-based access'],

  // ── Methodologies ─────────────────────────────────────────────────────────
  'agile': ['scrum', 'kanban', 'agile methodology'],
  'scrum': ['agile', 'scrum methodology'],
  'tdd': ['test driven development', 'test-driven development'],
  'bdd': ['behavior driven development', 'behavior-driven development'],
  'devops': ['dev ops', 'dev-ops'],
  'sre': ['site reliability engineering', 'site reliability engineer'],
} as const;

// ============ AutoApply Queue ============
export const QUEUE_AUTO_APPLY = 'auto-apply';
export const QUEUE_PACKAGE_GENERATION = 'package-generation';
