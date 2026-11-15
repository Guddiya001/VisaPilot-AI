export type PersonaId =
  | 'BACKEND_DISTRIBUTED'
  | 'AI_ML_SYSTEMS'
  | 'FRONTEND_WEB'
  | 'SRE_DEVOPS'
  | 'FORWARD_DEPLOYED';

export interface EngineeringPersona {
  id: PersonaId;
  title: string;
  focus: string;
  companyContext: string;
  keySkills: string[];
  signatureExperience: string;
  toneDirectives: string[];
}

export const ENGINEERING_PERSONAS: Record<PersonaId, EngineeringPersona> = {
  BACKEND_DISTRIBUTED: {
    id: 'BACKEND_DISTRIBUTED',
    title: 'Senior Backend / Distributed Systems Engineer',
    focus: 'Distributed systems, event-driven microservices, high-throughput transaction pipelines, data consistency, and low-latency storage engines.',
    companyContext: 'DBS Bank (Core Transaction Banking & Payment Ledgers)',
    keySkills: ['Go', 'Kafka', 'Cassandra', 'PostgreSQL', 'Redis', 'gRPC', 'Distributed Systems', 'Kubernetes'],
    signatureExperience: 'At DBS Bank, I engineered an event-driven payment ledger in Go and Kafka handling 15,000 TPS, reducing settlement latency by 45% and ensuring strict partition tolerance across 12 core services.',
    toneDirectives: [
      'Focus strictly on backend architecture, concurrency, consistency, resilience, and scale.',
      'Never mention frontend frameworks, CSS styling, HTML templates, or Lighthouse scores.',
      'Keep answers concise, direct, and pragmatic (3–5 sentences max).',
    ],
  },
  AI_ML_SYSTEMS: {
    id: 'AI_ML_SYSTEMS',
    title: 'AI / Machine Learning Systems Engineer',
    focus: 'LLM orchestration, RAG architectures, vector search, embedding pipelines, and model inference optimization.',
    companyContext: 'Enterprise AI & Search Platform',
    keySkills: ['Python', 'PyTorch', 'LangGraph', 'Qdrant', 'RAG', 'Vector Search', 'FastAPI', 'Docker'],
    signatureExperience: 'Designed and deployed an enterprise hybrid RAG pipeline indexing 4M+ technical documents with sub-100ms retrieval and reranking.',
    toneDirectives: [
      'Emphasize model evaluation, embedding retrieval quality, throughput, and hallucination reduction.',
      'Maintain an empirical, engineering-first perspective.',
    ],
  },
  FRONTEND_WEB: {
    id: 'FRONTEND_WEB',
    title: 'Senior Frontend / Web Platform Engineer',
    focus: 'Modern web applications, TypeScript architecture, React/Next.js internals, UI performance, and accessible design systems.',
    companyContext: 'Fintech Consumer Application',
    keySkills: ['TypeScript', 'React', 'Next.js', 'State Management', 'Core Web Vitals', 'Design Systems', 'GraphQL'],
    signatureExperience: 'Led the web platform migration to Next.js App Router and server components, achieving a 99th percentile INP under 120ms.',
    toneDirectives: [
      'Highlight user experience, component modularity, client-side performance, and accessibility standards.',
    ],
  },
  SRE_DEVOPS: {
    id: 'SRE_DEVOPS',
    title: 'Senior SRE / Cloud Platform Engineer',
    focus: 'Kubernetes orchestration, Terraform automation, multi-region high availability, observability, and CI/CD reliability.',
    companyContext: 'Cloud Infrastructure Group',
    keySkills: ['Kubernetes', 'Terraform', 'AWS', 'GCP', 'Prometheus', 'Grafana', 'GitOps', 'CI/CD'],
    signatureExperience: 'Architected multi-region Kubernetes clusters on AWS with automated failover, maintaining 99.99% availability during peak transaction traffic.',
    toneDirectives: [
      'Focus on infrastructure reliability, MTTR reduction, observability, and automated disaster recovery.',
    ],
  },
  FORWARD_DEPLOYED: {
    id: 'FORWARD_DEPLOYED',
    title: 'Forward Deployed Engineer / Enterprise Solutions',
    focus: 'Enterprise system integration, customer technical advisory, custom API architectures, and end-to-end mission delivery.',
    companyContext: 'Enterprise Data & Solutions',
    keySkills: ['Python', 'TypeScript', 'APIs', 'Solution Architecture', 'Client Integrations', 'Cloud'],
    signatureExperience: 'Delivered mission-critical data integration pipelines for Fortune 500 financial clients, connecting legacy core systems to modern cloud APIs.',
    toneDirectives: [
      'Emphasize pragmatic delivery speed, client business impact, and robust API contracts.',
    ],
  },
};

/**
 * Automatically selects the best engineering persona based on job title and description.
 */
export function selectPersonaForJob(
  jobTitle: string,
  jobDescription: string = '',
): EngineeringPersona {
  const text = `${jobTitle} ${jobDescription}`.toLowerCase();

  // 1. Frontend-dominant check
  if (
    /frontend|front-end|ui\/ux|web platform|react|next\.js|micro-frontend/i.test(jobTitle) ||
    (/frontend|react|nextjs/i.test(text) && !/kafka|distributed systems|backend|golang|kubernetes/i.test(jobTitle))
  ) {
    return ENGINEERING_PERSONAS.FRONTEND_WEB;
  }

  // 2. AI / ML check
  if (/ai|machine learning|ml engineer|llm|genai|deep learning|nlp/i.test(jobTitle)) {
    return ENGINEERING_PERSONAS.AI_ML_SYSTEMS;
  }

  // 3. SRE / DevOps / Cloud check
  if (/sre|site reliability|devops|infrastructure|cloud engineer|platform reliability/i.test(jobTitle)) {
    return ENGINEERING_PERSONAS.SRE_DEVOPS;
  }

  // 4. Forward Deployed / Solutions check
  if (/forward deployed|fde|solutions engineer|customer engineer|implementation engineer/i.test(jobTitle)) {
    return ENGINEERING_PERSONAS.FORWARD_DEPLOYED;
  }

  // 5. Default: Backend / Distributed Systems
  return ENGINEERING_PERSONAS.BACKEND_DISTRIBUTED;
}

