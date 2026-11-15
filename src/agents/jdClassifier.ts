import type {
  UniversalDomain,
  EngineeringPersona,
  DomainWeightDistribution,
} from '../schemas/candidateProfile.schema.ts';

export interface JobDescriptionInput {
  title?: string;
  description?: string;
  requiredSkills?: string[];
  preferredSkills?: string[];
  url?: string;
  companyName?: string;
  country?: string;
  workMode?: 'remote' | 'hybrid' | 'onsite';
}

export interface ParsedJobDescription {
  jobTitle: string;
  companyName?: string;
  url?: string;
  country?: string;
  workMode?: 'remote' | 'hybrid' | 'onsite';
  primaryDomain: UniversalDomain;
  secondaryDomain?: UniversalDomain;
  coreRequiredSkills: string[];
  preferredSkills: string[];
  domainWeightDistribution: DomainWeightDistribution;
  confidence: number;
  reasoning: string;
}

/**
 * Canonical skill capitalization lookup for clean ATS output when parsing raw text
 */
const CANONICAL_SKILL_NAMES: Record<string, string> = {
  go: 'Go',
  golang: 'Go',
  python: 'Python',
  fastapi: 'FastAPI',
  java: 'Java',
  'spring boot': 'Spring Boot',
  'node.js': 'Node.js',
  nestjs: 'NestJS',
  postgresql: 'PostgreSQL',
  postgres: 'PostgreSQL',
  cassandra: 'Apache Cassandra',
  'apache cassandra': 'Apache Cassandra',
  redis: 'Redis',
  mongodb: 'MongoDB',
  dynamodb: 'DynamoDB',
  kafka: 'Apache Kafka',
  'apache kafka': 'Apache Kafka',
  rabbitmq: 'RabbitMQ',
  grpc: 'gRPC',
  'rest api': 'RESTful APIs',
  restful: 'RESTful APIs',
  microservices: 'Microservices',
  'distributed systems': 'Distributed Systems',
  'system design': 'System Design',
  'event-driven': 'Event-Driven Architecture',
  sql: 'SQL',
  nosql: 'NoSQL',
  kubernetes: 'Kubernetes',
  k8s: 'Kubernetes',
  docker: 'Docker',
  terraform: 'Terraform',
  iac: 'Terraform IaC',
  helm: 'Helm',
  ansible: 'Ansible',
  argocd: 'ArgoCD',
  gitops: 'GitOps',
  aws: 'AWS',
  'amazon web services': 'AWS',
  gcp: 'GCP',
  'google cloud': 'GCP',
  azure: 'Azure',
  'ci/cd': 'CI/CD',
  'github actions': 'GitHub Actions',
  jenkins: 'Jenkins',
  prometheus: 'Prometheus',
  grafana: 'Grafana',
  opentelemetry: 'OpenTelemetry',
  datadog: 'Datadog',
  linux: 'Linux',
  react: 'React',
  'react.js': 'React',
  'next.js': 'Next.js',
  typescript: 'TypeScript',
  javascript: 'JavaScript',
  'tailwind css': 'Tailwind CSS',
  tailwind: 'Tailwind CSS',
  html5: 'HTML5',
  css3: 'CSS3',
  css: 'CSS3',
  webpack: 'Webpack',
  'module federation': 'Webpack Module Federation',
  'micro-frontends': 'Micro-frontends',
  vite: 'Vite',
  'core web vitals': 'Core Web Vitals',
  lighthouse: 'Lighthouse',
  storybook: 'Storybook',
  'design system': 'Design Systems',
  wcag: 'WCAG 2.1 AA',
  figma: 'Figma',
  'redux toolkit': 'Redux Toolkit',
  redux: 'Redux',
  zustand: 'Zustand',
  'tanstack query': 'TanStack Query',
  'react query': 'React Query',
  'react native': 'React Native',
  flutter: 'Flutter',
  ios: 'iOS',
  android: 'Android',
  graphql: 'GraphQL',
  llm: 'LLMs',
  'large language models': 'LLMs',
  genai: 'Generative AI',
  'generative ai': 'Generative AI',
  rag: 'RAG',
  'retrieval-augmented generation': 'RAG',
  'vector search': 'Vector Search',
  'vector database': 'Vector Databases',
  'model context protocol': 'Model Context Protocol (MCP)',
  mcp: 'Model Context Protocol (MCP)',
  langgraph: 'LangGraph',
  langchain: 'LangChain',
  pytorch: 'PyTorch',
  vllm: 'vLLM',
  ragas: 'Ragas',
  trulens: 'TruLens',
  pgvector: 'pgvector',
  chromadb: 'ChromaDB',
  chroma: 'ChromaDB',
  qdrant: 'Qdrant',
  'engineering leadership': 'Engineering Leadership',
  'architecture governance': 'Architecture Governance',
  rfc: 'RFC & ADR Governance',
  adr: 'RFC & ADR Governance',
  mentoring: 'Mentorship',
  'technical strategy': 'Technical Strategy',
};

/**
 * Domain-specific keyword and skill dictionaries
 */
const DOMAIN_KEYWORDS: Record<UniversalDomain, string[]> = {
  backend_distributed_systems: [
    'backend', 'distributed systems', 'microservices', 'grpc', 'rest api', 'restful',
    'system design', 'high concurrency', 'scalability', 'concurrency', 'high-throughput',
    'go', 'golang', 'python', 'fastapi', 'java', 'spring boot', 'node.js', 'nestjs',
    'postgresql', 'postgres', 'cassandra', 'apache cassandra', 'redis', 'mongodb',
    'dynamodb', 'kafka', 'apache kafka', 'rabbitmq', 'event-driven', 'message queue',
    'sql', 'nosql', 'database optimization', 'sharding', 'replication', 'acid',
  ],

  ai_llm_architecture: [
    'ai', 'artificial intelligence', 'machine learning', 'ml', 'llm', 'large language models',
    'genai', 'generative ai', 'rag', 'retrieval-augmented generation', 'vector search',
    'vector database', 'embeddings', 'model context protocol', 'mcp', 'langgraph',
    'langchain', 'pytorch', 'vllm', 'ragas', 'trulens', 'prompt engineering',
    'tool calling', 'agentic', 'ai agents', 'multi-agent', 'semantic search',
    'pgvector', 'chroma', 'chromadb', 'qdrant', 'dense retrieval', 'fine-tuning',
  ],

  frontend_web_platform: [
    'frontend', 'front-end', 'web platform', 'ui', 'user interface', 'ux', 'client-side',
    'react', 'react.js', 'next.js', 'vue', 'angular', 'typescript', 'javascript',
    'html5', 'css3', 'css', 'tailwind', 'tailwind css', 'webpack', 'module federation',
    'micro-frontends', 'vite', 'core web vitals', 'lcp', 'inp', 'cls', 'lighthouse',
    'storybook', 'design system', 'design tokens', 'wcag', 'a11y', 'accessibility',
    'figma', 'redux', 'redux toolkit', 'zustand', 'tanstack query', 'react query',
    'react native', 'mobile web', 'flutter', 'ios', 'android', 'swift', 'kotlin',
  ],

  devops_cloud_infra: [
    'devops', 'sre', 'site reliability', 'platform engineering', 'cloud infrastructure',
    'kubernetes', 'k8s', 'docker', 'containers', 'terraform', 'iac', 'infrastructure as code',
    'helm', 'ansible', 'argocd', 'gitops', 'aws', 'amazon web services', 'gcp', 'google cloud',
    'azure', 'ci/cd', 'github actions', 'jenkins', 'gitlab ci', 'prometheus', 'grafana',
    'opentelemetry', 'datadog', 'loki', 'jaeger', 'linux', 'bash', 'observability',
    'monitoring', 'slo', 'sli', 'incident management', 'canary deployment', 'blue-green',
  ],

  fullstack_general: [
    'fullstack', 'full-stack', 'full stack', 'generalist', 'web application', 'web applications',
    'end-to-end', 'frontend and backend', 'client and server', 'graphql', 'api', 'apis',
    'web development', 'saas', 'product engineer', 'full stack development', 'mobile',
  ],

  engineering_leadership: [
    'engineering manager', 'director of engineering', 'vp of engineering', 'head of engineering',
    'engineering lead', 'technical lead', 'tech lead', 'staff engineer', 'principal engineer',
    'lead engineer', 'mentoring', 'coaching', 'technical strategy', 'roadmapping',
    'architecture governance', 'rfc', 'adr', 'hiring', 'interviewing', 'agile', 'scrum',
    'stakeholder management', 'compliance', 'hipaa', 'mas', 'soc 2', 'mttr', 'developer velocity',
  ],
};

/**
 * Normalizes input text into searchable lowercase tokens
 */
function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9#+.\s-]/g, ' ');
}

function toCanonicalSkill(rawKw: string): string {
  const lower = rawKw.toLowerCase().trim();
  if (CANONICAL_SKILL_NAMES[lower]) {
    return CANONICAL_SKILL_NAMES[lower];
  }
  return rawKw.charAt(0).toUpperCase() + rawKw.slice(1);
}

/**
 * Well-known job URL patterns / lookup metadata when URL alone is passed offline
 */
const KNOWN_URL_METADATA: Array<{
  pattern: RegExp;
  title: string;
  companyName: string;
  country: string;
  workMode: 'remote' | 'hybrid' | 'onsite';
  syntheticDescription: string;
  skills: string[];
}> = [
  {
    pattern: /monzo\/jobs\/6036797/i,
    title: 'Senior Staff Backend Engineer',
    companyName: 'Monzo',
    country: 'UK',
    workMode: 'remote',
    syntheticDescription:
      'Monzo Senior Staff Backend Engineer distributed systems core banking microservices Go Apache Kafka Apache Cassandra PostgreSQL Kubernetes GCP gRPC',
    skills: ['Go', 'Distributed Systems', 'Apache Kafka', 'Apache Cassandra', 'Kubernetes', 'PostgreSQL', 'Microservices', 'gRPC'],
  },
];

function extractCompanyFromUrl(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('greenhouse.io') || parsed.hostname.includes('lever.co')) {
      const parts = parsed.pathname.split('/').filter(Boolean);
      return parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) : undefined;
    }
    const hostParts = parsed.hostname.split('.').filter((p) => !['www', 'jobs', 'careers', 'boards', 'job-boards'].includes(p));
    if (hostParts.length >= 2) {
      const name = hostParts[0];
      return name ? name.charAt(0).toUpperCase() + name.slice(1) : undefined;
    }
  } catch {
    // Ignore invalid URL
  }
  return undefined;
}

function extractTitleFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split('/').filter(Boolean);
    // Look from last segment backwards for descriptive slug
    for (let i = parts.length - 1; i >= 0; i--) {
      const seg = parts[i] || '';
      if (['jobs', 'job', 'apply', 'careers', 'roles', 'positions'].includes(seg.toLowerCase())) {
        continue;
      }
      const cleanSlug = seg
        .replace(/^\d+-?/, '')
        .replace(/-?\d+$/, '')
        .replace(/[-_]/g, ' ')
        .trim();
      if (cleanSlug.length > 3 && !/^\d+$/.test(cleanSlug)) {
        return cleanSlug
          .split(/\s+/)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
      }
    }
  } catch {
    // Ignore URL parse error
  }
  return 'Software Engineer';
}

function extractCompanyFromText(text: string): string | undefined {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  for (const line of lines.slice(0, 10)) {
    const compMatch = line.match(/^(?:Company|Organization|Employer):\s*(.+)/i);
    if (compMatch && compMatch[1]) {
      return compMatch[1].trim();
    }
    const atMatch = line.match(/\b(?:at|@)\s+([A-Z][A-Za-z0-9&.\-]{1,28})/);
    if (atMatch && atMatch[1]) {
      const cleaned = atMatch[1].trim().replace(/\s+(?:is|looking|seeking|hiring).*$/i, '');
      if (cleaned.length > 1 && !['We', 'Our', 'The', 'Remote', 'Hybrid'].includes(cleaned)) {
        return cleaned;
      }
    }
  }
  return undefined;
}

function extractLocationFromText(text: string): {
  country?: string;
  workMode?: 'remote' | 'hybrid' | 'onsite';
} {
  const headerSlice = text.slice(0, 1500);
  let workMode: 'remote' | 'hybrid' | 'onsite' | undefined;
  if (/\b(remote|work from home|wfh|distributed team)\b/i.test(headerSlice)) {
    workMode = 'remote';
  } else if (/\bhybrid\b/i.test(headerSlice)) {
    workMode = 'hybrid';
  } else if (/\b(onsite|on-site|in-office)\b/i.test(headerSlice)) {
    workMode = 'onsite';
  }

  let country: string | undefined;
  const countryPatterns: Array<[RegExp, string]> = [
    [/\b(?:UK|United Kingdom|London|Edinburgh|Manchester|England|Scotland)\b/i, 'UK'],
    [/\b(?:Germany|Berlin|Munich|Frankfurt|Hamburg)\b/i, 'Germany'],
    [/\b(?:Netherlands|Amsterdam|Rotterdam|Utrecht)\b/i, 'Netherlands'],
    [/\b(?:USA|United States|San Francisco|New York|Seattle|Austin)\b/i, 'USA'],
    [/\b(?:Singapore)\b/i, 'Singapore'],
    [/\b(?:Ireland|Dublin)\b/i, 'Ireland'],
    [/\b(?:Canada|Toronto|Vancouver|Montreal)\b/i, 'Canada'],
    [/\b(?:Australia|Sydney|Melbourne)\b/i, 'Australia'],
  ];

  for (const [re, c] of countryPatterns) {
    if (re.test(headerSlice)) {
      country = c;
      break;
    }
  }

  return { country, workMode };
}

function extractTitleFromText(text: string): string {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  for (const line of lines.slice(0, 5)) {
    if (/^#+\s*(.+)/i.test(line)) {
      return line.replace(/^#+\s*/, '').replace(/\s+(?:at|@)\s+.+$/i, '').trim();
    }
    if (/^(?:Job\s*Title|Role|Position):\s*(.+)/i.test(line)) {
      return line.replace(/^(?:Job\s*Title|Role|Position):\s*/i, '').trim();
    }
  }

  const headerSample = text.slice(0, 1200);
  const titlePatterns = [
    /\b(?:Senior\s+|Staff\s+|Principal\s+|Lead\s+)*(?:Backend|Distributed\s+Systems)\s+(?:Engineer|Architect)\b/i,
    /\b(?:Senior\s+|Staff\s+|Principal\s+|Lead\s+)*(?:Frontend|Front-End|Web\s+Platform|UI|Mobile|React\s+Native)\s+(?:Engineer|Architect|Developer)\b/i,
    /\b(?:Senior\s+|Staff\s+|Principal\s+|Lead\s+)*(?:AI|ML|LLM|Machine\s+Learning|Generative\s+AI)\s+(?:Engineer|Architect|Scientist)\b/i,
    /\b(?:Senior\s+|Staff\s+|Principal\s+|Lead\s+)*(?:DevOps|SRE|Platform|Cloud|Site\s+Reliability)\s+(?:Engineer|Architect)\b/i,
    /\b(?:Senior\s+|Staff\s+|Principal\s+|Lead\s+)*Full-?Stack\s+(?:Engineer|Tech\s+Lead|Developer|Architect)\b/i,
    /\b(?:Engineering\s+Manager|Director\s+of\s+Engineering|VP\s+of\s+Engineering|Head\s+of\s+Engineering|Engineering\s+Lead|Technical\s+Lead)\b/i,
  ];

  for (const pattern of titlePatterns) {
    const match = headerSample.match(pattern);
    if (match) {
      return match[0].trim();
    }
  }

  const firstLine = (lines[0] || 'Software Engineer').replace(/\s+(?:at|@)\s+.+$/i, '').trim();
  return firstLine.length > 80 ? 'Software Engineer' : firstLine;
}

/**
 * Parses metadata from any input shape (raw JD string, URL string, or structured JobDescriptionInput)
 */
function parseMetadataFromInput(input: string | JobDescriptionInput): {
  jobTitle: string;
  companyName?: string;
  url?: string;
  country?: string;
  workMode?: 'remote' | 'hybrid' | 'onsite';
  rawText: string;
  requiredSkills: string[];
  preferredSkills: string[];
} {
  if (typeof input === 'object') {
    const rawText = [
      input.title || '',
      input.companyName || '',
      input.description || '',
      ...(input.requiredSkills || []),
      ...(input.preferredSkills || []),
    ].join('\n');

    const loc = extractLocationFromText(input.description || '');

    return {
      jobTitle: input.title || extractTitleFromText(rawText),
      companyName: input.companyName || extractCompanyFromUrl(input.url) || extractCompanyFromText(rawText),
      url: input.url,
      country: input.country || loc.country,
      workMode: input.workMode || loc.workMode,
      rawText,
      requiredSkills: input.requiredSkills || [],
      preferredSkills: input.preferredSkills || [],
    };
  }

  const trimmed = input.trim();
  const isUrl = /^https?:\/\//i.test(trimmed);
  if (isUrl) {
    for (const known of KNOWN_URL_METADATA) {
      if (known.pattern.test(trimmed)) {
        return {
          jobTitle: known.title,
          companyName: known.companyName,
          url: trimmed,
          country: known.country,
          workMode: known.workMode,
          rawText: known.syntheticDescription,
          requiredSkills: known.skills,
          preferredSkills: [],
        };
      }
    }

    const company = extractCompanyFromUrl(trimmed);
    const title = extractTitleFromUrl(trimmed);
    return {
      jobTitle: title,
      companyName: company,
      url: trimmed,
      rawText: `${company || ''} ${title} ${trimmed}`,
      requiredSkills: [],
      preferredSkills: [],
    };
  }

  const title = extractTitleFromText(trimmed);
  const company = extractCompanyFromText(trimmed);
  const loc = extractLocationFromText(trimmed);

  return {
    jobTitle: title,
    companyName: company,
    country: loc.country,
    workMode: loc.workMode,
    rawText: trimmed,
    requiredSkills: [],
    preferredSkills: [],
  };
}

/**
 * Universal Job Description Parser and Domain Classifier
 * Takes any raw JD text, job URL, or structured JD object and produces domain classification,
 * required skills, and exact per-persona weighting distribution.
 */
export function classifyJobDescription(
  input: string | JobDescriptionInput
): ParsedJobDescription {
  const meta = parseMetadataFromInput(input);
  const normalizedText = normalizeText(meta.rawText);
  const normalizedTitle = normalizeText(meta.jobTitle);

  const rawScores: Record<UniversalDomain, number> = {
    backend_distributed_systems: 0,
    ai_llm_architecture: 0,
    frontend_web_platform: 0,
    devops_cloud_infra: 0,
    fullstack_general: 0,
    engineering_leadership: 0,
  };

  // 1. High-weight scoring on Job Title (+30 / +35 points)
  if (/\b(backend|distributed|systems?|server|database|core banking|ledger|streaming)\b/i.test(normalizedTitle)) {
    rawScores.backend_distributed_systems += 30;
  }
  if (/\b(ai|artificial intelligence|machine learning|ml|llm|genai|generative ai|nlp|rag|agentic)\b/i.test(normalizedTitle)) {
    rawScores.ai_llm_architecture += 30;
  }
  if (/\b(frontend|front-end|web platform|ui|ux|client-side|react|angular|vue|mobile|react native|ios|android|flutter)\b/i.test(normalizedTitle)) {
    rawScores.frontend_web_platform += 30;
  }
  if (/\b(devops|sre|site reliability|platform engineer|cloud engineer|infra|infrastructure)\b/i.test(normalizedTitle)) {
    rawScores.devops_cloud_infra += 30;
  }
  if (/\b(fullstack|full-stack|full stack|generalist|product engineer)\b/i.test(normalizedTitle)) {
    rawScores.fullstack_general += 38;
  }
  if (/\b(engineering manager|director|vp|head of engineering|engineering lead|lead engineer|tech lead)\b/i.test(normalizedTitle)) {
    rawScores.engineering_leadership += 30;
  }

  // Track extracted skills by domain so primary domain skills lead extracted requiredSkills
  const skillsByDomain: Record<UniversalDomain, string[]> = {
    backend_distributed_systems: [],
    ai_llm_architecture: [],
    frontend_web_platform: [],
    devops_cloud_infra: [],
    fullstack_general: [],
    engineering_leadership: [],
  };

  // 2. Keyword & Skill scoring across domains
  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS) as Array<[UniversalDomain, string[]]>) {
    for (const kw of keywords) {
      const kwRegex = new RegExp(`\\b${kw.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');

      if (meta.requiredSkills.some((s) => s.toLowerCase() === kw || s.toLowerCase().includes(kw))) {
        rawScores[domain] += 4;
      } else if (meta.preferredSkills.some((s) => s.toLowerCase() === kw || s.toLowerCase().includes(kw))) {
        rawScores[domain] += 2;
      }

      if (kwRegex.test(normalizedText)) {
        rawScores[domain] += 1;
        const canonical = toCanonicalSkill(kw);
        if (!skillsByDomain[domain].some((s) => s.toLowerCase() === canonical.toLowerCase())) {
          // Only extract genuine concrete skills/technologies into skills list (avoid generic adjectives)
          if (kw.length >= 2 && !['ui', 'ai', 'ml', 'api', 'apis', 'backend', 'frontend', 'fullstack', 'full-stack', 'full stack', 'devops', 'sre'].includes(kw)) {
            skillsByDomain[domain].push(canonical);
          }
        }
      }
    }
  }

  // Determine Primary & Secondary Domains
  const sortedDomains = (Object.keys(rawScores) as UniversalDomain[]).sort(
    (a, b) => rawScores[b] - rawScores[a]
  );

  const primaryDomain = sortedDomains[0];
  const secondaryCandidate = sortedDomains[1];
  const secondaryDomain =
    rawScores[secondaryCandidate] >= rawScores[primaryDomain] * 0.35 &&
    rawScores[secondaryCandidate] >= 6
      ? secondaryCandidate
      : undefined;

  // Assemble ordered extracted skills if meta.requiredSkills wasn't explicitly provided
  const orderedExtractedSkills: string[] = [];
  const prioritizedDomains: UniversalDomain[] = [
    primaryDomain,
    ...(secondaryDomain ? [secondaryDomain] : []),
    ...sortedDomains.filter((d) => d !== primaryDomain && d !== secondaryDomain),
  ];

  for (const d of prioritizedDomains) {
    for (const sk of skillsByDomain[d]) {
      if (!orderedExtractedSkills.some((existing) => existing.toLowerCase() === sk.toLowerCase())) {
        orderedExtractedSkills.push(sk);
      }
    }
  }

  // 3. Compute domainWeightDistribution: Record<EngineeringPersona, number>
  const weights: DomainWeightDistribution = {
    backend_distributed_systems: 0,
    ai_llm_architecture: 0,
    frontend_web_platform: 0,
    devops_cloud_infra: 0,
    fullstack_general: 0,
    engineering_leadership: 0,
    fullstack_platform: 0,
  };

  if (primaryDomain === 'backend_distributed_systems') {
    weights.frontend_web_platform = 0.0;
    const devopsScore = rawScores.devops_cloud_infra;
    if (devopsScore >= 8) {
      weights.backend_distributed_systems = 0.85;
      weights.devops_cloud_infra = 0.15;
    } else {
      weights.backend_distributed_systems = 1.0;
    }
  } else if (primaryDomain === 'frontend_web_platform') {
    weights.backend_distributed_systems = 0.0;
    weights.devops_cloud_infra = 0.0;
    weights.ai_llm_architecture = 0.0;
    weights.frontend_web_platform = 1.0;
    weights.fullstack_general = 0.0;
    weights.fullstack_platform = 0.0;
  } else if (primaryDomain === 'ai_llm_architecture') {
    weights.frontend_web_platform = 0.0;
    weights.ai_llm_architecture = 0.75;
    weights.backend_distributed_systems = 0.20;
    weights.devops_cloud_infra = 0.05;
  } else if (primaryDomain === 'devops_cloud_infra') {
    weights.frontend_web_platform = 0.0;
    weights.devops_cloud_infra = 0.80;
    weights.backend_distributed_systems = 0.20;
  } else if (primaryDomain === 'fullstack_general') {
    const devopsScore = rawScores.devops_cloud_infra;
    if (devopsScore >= 6) {
      weights.backend_distributed_systems = 0.45;
      weights.frontend_web_platform = 0.45;
      weights.devops_cloud_infra = 0.10;
    } else {
      weights.backend_distributed_systems = 0.50;
      weights.frontend_web_platform = 0.50;
    }
    weights.fullstack_general = 0.50;
    weights.fullstack_platform = 0.50;
  } else if (primaryDomain === 'engineering_leadership') {
    weights.engineering_leadership = 0.60;
    if (secondaryDomain && secondaryDomain !== 'fullstack_general') {
      weights[secondaryDomain] = 0.25;
      if (secondaryDomain !== 'devops_cloud_infra') {
        weights.devops_cloud_infra = 0.15;
      } else {
        weights.backend_distributed_systems = 0.15;
      }
    } else {
      weights.backend_distributed_systems = 0.25;
      weights.devops_cloud_infra = 0.15;
    }
  }

  const totalScore = Object.values(rawScores).reduce((sum, v) => sum + v, 0);
  const confidence =
    totalScore > 0
      ? Math.min(0.99, Number((rawScores[primaryDomain] / totalScore).toFixed(2)))
      : 0.75;

  const reasoning = `Classified as ${primaryDomain} (score: ${rawScores[primaryDomain]}) based on title "${meta.jobTitle}" and required technical competencies.`;

  return {
    jobTitle: meta.jobTitle,
    companyName: meta.companyName,
    url: meta.url,
    country: meta.country,
    workMode: meta.workMode,
    primaryDomain,
    secondaryDomain,
    coreRequiredSkills:
      meta.requiredSkills.length > 0
        ? meta.requiredSkills
        : orderedExtractedSkills.slice(0, 10),
    preferredSkills: meta.preferredSkills,
    domainWeightDistribution: weights,
    confidence,
    reasoning,
  };
}
