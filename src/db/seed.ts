import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { sql, eq, and } from 'drizzle-orm';
import {
  personas,
  domainSelectors,
  qaSemanticMemory,
} from './schema.ts';

try {
  process.loadEnvFile?.();
} catch {}

const DATABASE_URL =
  process.env.DATABASE_URL?.trim() ||
  'postgresql://visapilot:visapilot@localhost:5433/visapilot';
const OLLAMA_BASE_URL =
  process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434';
const OLLAMA_EMBED_MODEL =
  process.env.OLLAMA_EMBED_MODEL ?? 'nomic-embed-text';
const EMBEDDING_DIM = 768;

/**
 * Generates a 768-dim vector using local Ollama (nomic-embed-text).
 * Falls back to a deterministic L2-normalized hash vector only if Ollama
 * is unreachable (e.g., in CI environments).
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_EMBED_MODEL,
        prompt: text,
      }),
      signal: AbortSignal.timeout(1500),
    });

    if (response.ok) {
      const data = (await response.json()) as { embedding?: number[] };
      if (Array.isArray(data.embedding) && data.embedding.length === EMBEDDING_DIM) {
        return data.embedding;
      }
    }
  } catch {
    console.warn(
      `[seed] Ollama unreachable at ${OLLAMA_BASE_URL}. Using deterministic 768-dim fallback vector for: "${text.slice(0, 48)}..."`
    );
  }

  // Deterministic unit-length fallback vector for offline/CI runs
  const raw = Array.from({ length: EMBEDDING_DIM }, (_, idx) => {
    let hash = 2166136261 ^ idx;
    for (let i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return ((hash >>> 0) % 2000) / 1000 - 1;
  });
  const norm = Math.sqrt(raw.reduce((acc, v) => acc + v * v, 0)) || 1;
  return raw.map((v) => Number((v / norm).toFixed(6)));
}

/**
 * 1. Active Persona Seed Data
 * Includes 3 work history entries in reverse-chronological order to support
 * Phase 6 "+ Add Another" repeater expansion out of the box.
 */
export const SEED_PERSONA = {
  name: 'Senior GenAI & Backend Engineering Lead',
  isActive: true,
  contactInfo: {
    firstName: 'Ashish',
    lastName: 'Singh',
    fullName: 'Ashish Kumar Singh',
    email: 'ashish.singh.careers@gmail.com',
    phone: '+91-7982169443',
    phoneNational: '7982169443',
    countryPhoneCode: '+91',
    phoneType: 'Mobile',
    addressLine1: 'Sector 62',
    city: 'Ghaziabad',
    state: 'Uttar Pradesh',
    postalCode: '201005',
    country: 'India',
    locationLabel: 'Ghaziabad, Uttar Pradesh, India',
    linkedinUrl: 'https://www.linkedin.com/in/ashish-kumar-singh1986',
    githubUrl: 'https://github.com/guddiya001',
    portfolioUrl: 'https://ashishkumarsingh.vercel.app/',
  },
  workHistory: [
    {
      jobTitle: 'Senior Engineering Lead — Generative AI & Backend Architecture',
      company: 'Persistent Systems',
      location: 'Noida, India',
      startDate: '2023-10-20',
      endDate: 'Present',
      currentlyWorking: true,
      description:
        'Architected enterprise GenAI copilot platforms, FastAPI microservices, hybrid RAG pipelines with pgvector and cross-encoder re-ranking, and Model Context Protocol (MCP) agentic tool integrations.',
    },
    {
      jobTitle: 'Senior Software Engineer — Enterprise Data & Integrations',
      company: 'LTIMindtree (DBS Bank)',
      location: 'Singapore',
      startDate: '2022-06-01',
      endDate: '2023-03-31',
      currentlyWorking: false,
      description:
        'Engineered high-throughput financial data workflows and resilient distributed backend services using Java Spring Boot, Python, and SQL with strict SLA guarantees.',
    },
    {
      jobTitle: 'Senior Software Engineer — Full-Stack Systems',
      company: 'Coforge (Walmart)',
      location: 'Noida, India',
      startDate: '2020-10-01',
      endDate: '2022-06-01',
      currentlyWorking: false,
      description:
        'Built scalable customer-facing React/Next.js interfaces and high-concurrency REST APIs supporting enterprise retail operations.',
    },
  ],
  education: [
    {
      institution: 'Guru Gobind Singh Indraprastha University',
      degree: 'Master of Computer Application',
      fieldOfStudy: 'Computer Science & Applications',
      startDate: '2013-06-01',
      endDate: '2016-06-01',
      gpa: '8.4/10',
    },
  ],
  skills: {
    languages: ['Python', 'TypeScript', 'JavaScript', 'Java', 'SQL', 'Node.js'],
    backend: ['FastAPI', 'Node.js', 'NestJS', 'Spring Boot', 'Celery', 'Redis'],
    frontend: ['React', 'Next.js', 'Tailwind CSS'],
    aiAndData: [
      'LangChain',
      'LangGraph',
      'Model Context Protocol (MCP)',
      'Hybrid RAG',
      'pgvector',
      'Pinecone',
      'Ollama',
      'Agents AI',
      'Agentic AI',
      'AI Agents',
      'AI Agentic AI',
      'AI Agentic Workflow',
      'RAG',
      'Hybrid RAG',
      'RAG Pipeline',
      'RAG System',
      'RAG Agent',
    ],
    cloudAndDevops: ['AWS', 'GCP', 'Azure', 'Docker', 'Kubernetes', 'CI/CD'],
    testing: ['Pytest', 'Vitest', 'Jest', 'Playwright', 'TDD'],
  },
  demographicsEeo: {
    gender: 'Male',
    ethnicity: 'Asian',
    veteranStatus: 'I am not a protected veteran',
    disabilityStatus: 'No, I do not have a disability',
  },
  visaWorkAuth: {
    authorizedToWorkInIndia: 'Yes',
    requiresVisaSponsorshipInternational: 'Yes',
    openToRelocation: 'Yes',
    workArrangementPreference: 'Remote or Hybrid',
    noticePeriodDays: '30',
    noticePeriodLabel: '30 days (negotiable)',
  },
  lockedFacts: {
    yearsOfExperience: '10+',
    currentEmployer: 'Persistent Systems',
    currentRoleStartDate: '2023-10-20',
    previousEmployer1: 'LTIMindtree',
    previousEmployer2: 'Coforge',
    highestDegree: 'Master of Computer Application',
    noticePeriodDays: '30',
    documents: {
      resumePath: 'vault/resumes/Ashish_Singh_GenAI_Engineering_Lead.pdf',
    },
  },
};

/**
 * 2. Baseline ATS Selectors (Workday, Greenhouse, Lever)
 */
export interface SeedSelectorEntry {
  domain: string;
  fieldSignature: string;
  cssOrXpath: string;
  mappedProfileKey: string;
  fieldType:
  | 'text'
  | 'select'
  | 'combobox'
  | 'radio'
  | 'checkbox'
  | 'file'
  | 'repeater_add_btn';
  formatMask?: string;
  confidence: number;
}

export const SEED_DOMAIN_SELECTORS: SeedSelectorEntry[] = [
  // ==========================================
  // WORKDAY (myworkdayjobs.com)
  // ==========================================
  {
    domain: 'myworkdayjobs.com',
    fieldSignature: 'workday_first_name',
    cssOrXpath: 'input[data-automation-id="legalNameSection_firstName"]',
    mappedProfileKey: 'contactInfo.firstName',
    fieldType: 'text',
    confidence: 1.0,
  },
  {
    domain: 'myworkdayjobs.com',
    fieldSignature: 'workday_last_name',
    cssOrXpath: 'input[data-automation-id="legalNameSection_lastName"]',
    mappedProfileKey: 'contactInfo.lastName',
    fieldType: 'text',
    confidence: 1.0,
  },
  {
    domain: 'myworkdayjobs.com',
    fieldSignature: 'workday_address_line1',
    cssOrXpath: 'input[data-automation-id="addressSection_addressLine1"]',
    mappedProfileKey: 'contactInfo.addressLine1',
    fieldType: 'text',
    confidence: 1.0,
  },
  {
    domain: 'myworkdayjobs.com',
    fieldSignature: 'workday_city',
    cssOrXpath: 'input[data-automation-id="addressSection_city"]',
    mappedProfileKey: 'contactInfo.city',
    fieldType: 'text',
    confidence: 1.0,
  },
  {
    domain: 'myworkdayjobs.com',
    fieldSignature: 'workday_postal_code',
    cssOrXpath: 'input[data-automation-id="addressSection_postalCode"]',
    mappedProfileKey: 'contactInfo.postalCode',
    fieldType: 'text',
    confidence: 1.0,
  },
  {
    domain: 'myworkdayjobs.com',
    fieldSignature: 'workday_phone_device_type',
    cssOrXpath: 'button[data-automation-id="phone-device-type"]',
    mappedProfileKey: 'contactInfo.phoneType',
    fieldType: 'combobox',
    confidence: 0.98,
  },
  {
    domain: 'myworkdayjobs.com',
    fieldSignature: 'workday_phone_number',
    cssOrXpath: 'input[data-automation-id="phone-number"]',
    mappedProfileKey: 'contactInfo.phoneNational',
    fieldType: 'text',
    formatMask: 'NATIONAL_DIGITS_ONLY',
    confidence: 1.0,
  },
  {
    domain: 'myworkdayjobs.com',
    fieldSignature: 'workday_work_exp_repeater_add',
    cssOrXpath:
      'div[data-automation-id="workExperienceSection"] button[data-automation-id="Add"], div[data-automation-id="workExperienceSection"] button[data-automation-id="add-button"]',
    mappedProfileKey: 'workHistory',
    fieldType: 'repeater_add_btn',
    confidence: 1.0,
  },
  {
    domain: 'myworkdayjobs.com',
    fieldSignature: 'workday_work_job_title',
    cssOrXpath: 'input[data-automation-id="jobTitle"]',
    mappedProfileKey: 'workHistory[].jobTitle',
    fieldType: 'text',
    confidence: 1.0,
  },
  {
    domain: 'myworkdayjobs.com',
    fieldSignature: 'workday_work_company',
    cssOrXpath: 'input[data-automation-id="company"]',
    mappedProfileKey: 'workHistory[].company',
    fieldType: 'text',
    confidence: 1.0,
  },
  {
    domain: 'myworkdayjobs.com',
    fieldSignature: 'workday_work_location',
    cssOrXpath: 'input[data-automation-id="location"]',
    mappedProfileKey: 'workHistory[].location',
    fieldType: 'text',
    confidence: 1.0,
  },
  {
    domain: 'myworkdayjobs.com',
    fieldSignature: 'workday_work_description',
    cssOrXpath: 'textarea[data-automation-id="description"]',
    mappedProfileKey: 'workHistory[].description',
    fieldType: 'text',
    confidence: 1.0,
  },
  {
    domain: 'myworkdayjobs.com',
    fieldSignature: 'workday_education_repeater_add',
    cssOrXpath:
      'div[data-automation-id="educationSection"] button[data-automation-id="Add"], div[data-automation-id="educationSection"] button[data-automation-id="add-button"]',
    mappedProfileKey: 'education',
    fieldType: 'repeater_add_btn',
    confidence: 1.0,
  },
  {
    domain: 'myworkdayjobs.com',
    fieldSignature: 'workday_school_name',
    cssOrXpath: 'input[data-automation-id="school"]',
    mappedProfileKey: 'education[].institution',
    fieldType: 'combobox',
    confidence: 0.96,
  },
  {
    domain: 'myworkdayjobs.com',
    fieldSignature: 'workday_linkedin_input',
    cssOrXpath: 'input[data-automation-id="linkedinQuestion"]',
    mappedProfileKey: 'contactInfo.linkedinUrl',
    fieldType: 'text',
    confidence: 1.0,
  },
  {
    domain: 'myworkdayjobs.com',
    fieldSignature: 'workday_resume_file_upload',
    cssOrXpath: 'input[data-automation-id="file-upload-input-ref"]',
    mappedProfileKey: 'lockedFacts.documents.resumePath',
    fieldType: 'file',
    confidence: 1.0,
  },

  // ==========================================
  // GREENHOUSE (greenhouse.io / boards.greenhouse.io)
  // ==========================================
  {
    domain: 'greenhouse.io',
    fieldSignature: 'gh_first_name',
    cssOrXpath: 'input#first_name, input[name="job_application[first_name]"]',
    mappedProfileKey: 'contactInfo.firstName',
    fieldType: 'text',
    confidence: 1.0,
  },
  {
    domain: 'greenhouse.io',
    fieldSignature: 'gh_last_name',
    cssOrXpath: 'input#last_name, input[name="job_application[last_name]"]',
    mappedProfileKey: 'contactInfo.lastName',
    fieldType: 'text',
    confidence: 1.0,
  },
  {
    domain: 'greenhouse.io',
    fieldSignature: 'gh_email',
    cssOrXpath: 'input#email, input[name="job_application[email]"]',
    mappedProfileKey: 'contactInfo.email',
    fieldType: 'text',
    confidence: 1.0,
  },
  {
    domain: 'greenhouse.io',
    fieldSignature: 'gh_phone',
    cssOrXpath: 'input#phone, input[name="job_application[phone]"]',
    mappedProfileKey: 'contactInfo.phone',
    fieldType: 'text',
    formatMask: 'E164_OR_INTERNATIONAL',
    confidence: 1.0,
  },
  {
    domain: 'greenhouse.io',
    fieldSignature: 'gh_candidate_location',
    cssOrXpath:
      'input#job_application_location, input[name="job_application[location]"], input#candidate-location',
    mappedProfileKey: 'contactInfo.locationLabel',
    fieldType: 'combobox',
    confidence: 0.97,
  },
  {
    domain: 'greenhouse.io',
    fieldSignature: 'gh_resume_file',
    cssOrXpath: 'input#resume, input[type="file"][id*="resume"]',
    mappedProfileKey: 'lockedFacts.documents.resumePath',
    fieldType: 'file',
    confidence: 1.0,
  },
  {
    domain: 'greenhouse.io',
    fieldSignature: 'gh_linkedin_profile',
    cssOrXpath:
      'input[autocomplete*="linkedin" i], input[aria-label*="LinkedIn" i], input[name*="linkedin" i]',
    mappedProfileKey: 'contactInfo.linkedinUrl',
    fieldType: 'text',
    confidence: 0.98,
  },
  {
    domain: 'greenhouse.io',
    fieldSignature: 'gh_github_or_website',
    cssOrXpath:
      'input[aria-label*="GitHub" i], input[aria-label*="Website" i], input[aria-label*="Portfolio" i]',
    mappedProfileKey: 'contactInfo.githubUrl',
    fieldType: 'text',
    confidence: 0.96,
  },

  // ==========================================
  // LEVER (lever.co / jobs.lever.co)
  // ==========================================
  {
    domain: 'lever.co',
    fieldSignature: 'lever_resume_upload',
    cssOrXpath: 'input#resume-upload-input, input[name="resume"][type="file"]',
    mappedProfileKey: 'lockedFacts.documents.resumePath',
    fieldType: 'file',
    confidence: 1.0,
  },
  {
    domain: 'lever.co',
    fieldSignature: 'lever_full_name',
    cssOrXpath: 'input[name="name"]',
    mappedProfileKey: 'contactInfo.fullName',
    fieldType: 'text',
    confidence: 1.0,
  },
  {
    domain: 'lever.co',
    fieldSignature: 'lever_email',
    cssOrXpath: 'input[name="email"]',
    mappedProfileKey: 'contactInfo.email',
    fieldType: 'text',
    confidence: 1.0,
  },
  {
    domain: 'lever.co',
    fieldSignature: 'lever_phone',
    cssOrXpath: 'input[name="phone"]',
    mappedProfileKey: 'contactInfo.phone',
    fieldType: 'text',
    confidence: 1.0,
  },
  {
    domain: 'lever.co',
    fieldSignature: 'lever_current_org',
    cssOrXpath: 'input[name="org"]',
    mappedProfileKey: 'lockedFacts.currentEmployer',
    fieldType: 'text',
    confidence: 1.0,
  },
  {
    domain: 'lever.co',
    fieldSignature: 'lever_url_linkedin',
    cssOrXpath: 'input[name="urls[LinkedIn]"], input[name="urls[Linkedin]"]',
    mappedProfileKey: 'contactInfo.linkedinUrl',
    fieldType: 'text',
    confidence: 1.0,
  },
  {
    domain: 'lever.co',
    fieldSignature: 'lever_url_github',
    cssOrXpath: 'input[name="urls[GitHub]"], input[name="urls[Github]"]',
    mappedProfileKey: 'contactInfo.githubUrl',
    fieldType: 'text',
    confidence: 1.0,
  },
  {
    domain: 'lever.co',
    fieldSignature: 'lever_url_portfolio',
    cssOrXpath:
      'input[name="urls[Portfolio]"], input[name="urls[Personal Website]"]',
    mappedProfileKey: 'contactInfo.portfolioUrl',
    fieldType: 'text',
    confidence: 1.0,
  },
];

/**
 * 3. 15 Pre-Embedded Engineering Q&A Templates (Tier 2 Semantic Memory)
 * Uses dynamic tokens {{COMPANY_NAME}}, {{ROLE_TITLE}}, and {{YEARS_EXP}}.
 */
export interface SeedQaTemplate {
  category:
  | 'motivation'
  | 'technical'
  | 'leadership'
  | 'work_auth'
  | 'compensation'
  | 'logistics'
  | 'cover_note';
  rawQuestion: string;
  normalizedQuestion: string;
  answerTemplate: string;
  maxCharLimit: number;
}

export const SEED_QA_TEMPLATES: SeedQaTemplate[] = [
  {
    category: 'motivation',
    rawQuestion: 'Why do you want to work at our company for this role?',
    normalizedQuestion:
      'Why are you interested in joining {{COMPANY_NAME}} as a {{ROLE_TITLE}}?',
    answerTemplate:
      'I am excited to apply for the {{ROLE_TITLE}} role at {{COMPANY_NAME}} because of your focus on shipping production-grade, high-scale systems. With {{YEARS_EXP}} years of experience architecting distributed backend services, FastAPI/TypeScript platforms, and enterprise Generative AI workflows (RAG, pgvector, and MCP tool orchestration), I can contribute immediately to {{COMPANY_NAME}}\'s engineering roadmap.',
    maxCharLimit: 600,
  },
  {
    category: 'motivation',
    rawQuestion: 'In 1-2 sentences, why are you interested in this role?',
    normalizedQuestion:
      'Short summary of why you want to join {{COMPANY_NAME}} as {{ROLE_TITLE}}',
    answerTemplate:
      'With {{YEARS_EXP}} years building scalable backend architectures and production GenAI systems, I want to help {{COMPANY_NAME}} scale its core platform as a {{ROLE_TITLE}}.',
    maxCharLimit: 240,
  },
  {
    category: 'technical',
    rawQuestion:
      'Describe your experience building production Generative AI, LLM, and RAG systems.',
    normalizedQuestion:
      'What is your experience with Generative AI, LLM orchestration, RAG pipelines, and vector databases in production?',
    answerTemplate:
      'I have architected and deployed enterprise GenAI copilot platforms featuring hybrid retrieval (dense vector search via pgvector/Pinecone combined with lexical BM25 and cross-encoder re-ranking), stateful multi-step orchestration using LangGraph, and standardized tool execution via Model Context Protocol (MCP) servers backed by FastAPI and TypeScript.',
    maxCharLimit: 650,
  },
  {
    category: 'technical',
    rawQuestion:
      'Tell us about a complex backend or distributed system you architected from scratch.',
    normalizedQuestion:
      'Describe the most complex distributed backend architecture you have designed and scaled.',
    answerTemplate:
      'I architected a multi-tenant enterprise AI and data integration platform handling high-concurrency workflows across FastAPI, asynchronous Celery/Redis workers, and PostgreSQL/pgvector. By introducing tiered semantic caching, idempotent task locks, and strict Pydantic schema contracts, we reduced tail latency and cut downstream LLM inference costs significantly.',
    maxCharLimit: 650,
  },
  {
    category: 'technical',
    rawQuestion:
      'How do you prevent hallucinations, PII leaks, and reliability issues in LLM applications?',
    normalizedQuestion:
      'How do you enforce guardrails, anti-hallucination, and data privacy in enterprise AI systems?',
    answerTemplate:
      'I implement defense-in-depth guardrails: pre-flight PII scrubbing and token re-hydration before external inference, strict schema validation via Pydantic/Zod, deterministic fact-locking that forbids mutating verified entities, and grounded citation checks against retrieved vector context.',
    maxCharLimit: 550,
  },
  {
    category: 'technical',
    rawQuestion:
      'How do you approach testing, TDD, and code quality in backend and full-stack services?',
    normalizedQuestion:
      'Describe your testing philosophy and experience with Test-Driven Development (TDD).',
    answerTemplate:
      'I practice strict Red-Green-Refactor TDD across Python (pytest, pytest-asyncio) and TypeScript (Vitest, Jest), pairing contract validation (Pydantic v2 / Zod) with integration tests against transactional database fixtures so regressions are caught before code reaches production.',
    maxCharLimit: 500,
  },
  {
    category: 'technical',
    rawQuestion:
      'Share an example of diagnosing and resolving a critical production performance bottleneck.',
    normalizedQuestion:
      'Describe how you resolved a high-severity latency, database, or throughput bottleneck.',
    answerTemplate:
      'In a high-volume enterprise pipeline suffering from slow response times, I profiled query execution plans and introduced HNSW cosine indexing in pgvector alongside a multi-tier deterministic + semantic cache. This resolved 85%+ of repeated queries in under 30ms without hitting slow downstream services.',
    maxCharLimit: 550,
  },
  {
    category: 'leadership',
    rawQuestion:
      'Describe your engineering leadership style and how you mentor developers.',
    normalizedQuestion:
      'How do you lead engineering teams, conduct architecture reviews, and mentor engineers?',
    answerTemplate:
      'I lead by example as a hands-on player-coach—establishing clear architectural RFCs, automated TDD guardrails, and modular system boundaries while mentoring engineers through pair design sessions and constructive code reviews that elevate team autonomy and delivery velocity.',
    maxCharLimit: 550,
  },
  {
    category: 'leadership',
    rawQuestion:
      'Tell us about a time you aligned cross-functional stakeholders on a technical trade-off.',
    normalizedQuestion:
      'How do you collaborate with product managers and stakeholders when balancing speed vs. architecture?',
    answerTemplate:
      'When aligning product and engineering stakeholders at {{COMPANY_NAME}}-scale organizations, I translate technical trade-offs into measurable business metrics—latency, unit cost, compliance risk, and delivery timelines—and propose phased rollouts that deliver immediate user value without accumulating brittle technical debt.',
    maxCharLimit: 550,
  },
  {
    category: 'work_auth',
    rawQuestion:
      'Are you legally authorized to work in the country applied for, and do you require visa sponsorship?',
    normalizedQuestion:
      'What is your work authorization status and will you now or in the future require visa sponsorship?',
    answerTemplate:
      'I am fully authorized to work in India without restriction. For international on-site roles outside India, I would require employer visa sponsorship, and I am also fully equipped to start immediately in a global remote capacity.',
    maxCharLimit: 400,
  },
  {
    category: 'logistics',
    rawQuestion:
      'What is your notice period and how soon can you start if selected?',
    normalizedQuestion:
      'What is your current notice period and earliest available start date for {{COMPANY_NAME}}?',
    answerTemplate:
      'My standard notice period is 30 days, which is negotiable depending on project handover requirements, allowing a smooth and timely onboarding for the {{ROLE_TITLE}} role at {{COMPANY_NAME}}.',
    maxCharLimit: 350,
  },
  {
    category: 'logistics',
    rawQuestion:
      'Are you open to relocating or working in a hybrid/remote environment?',
    normalizedQuestion:
      'What are your preferences regarding remote work, hybrid schedules, and relocation?',
    answerTemplate:
      'I am comfortable working in remote, hybrid, or on-site environments and have extensive experience collaborating across global time zones (India, Singapore, Europe, and North America). I am also open to relocation for the right {{ROLE_TITLE}} opportunity.',
    maxCharLimit: 400,
  },
  {
    category: 'compensation',
    rawQuestion:
      'What are your salary or total compensation expectations for this role?',
    normalizedQuestion:
      'What is your expected compensation or desired salary range for the {{ROLE_TITLE}} position?',
    answerTemplate:
      'My compensation expectations are flexible and aligned with the market band for a {{ROLE_TITLE}} with {{YEARS_EXP}} years of full-stack and GenAI architecture experience at {{COMPANY_NAME}}. I look forward to discussing the full compensation structure (base, bonus, and equity) with the recruiting team.',
    maxCharLimit: 450,
  },
  {
    category: 'technical',
    rawQuestion:
      'What is your experience with full-stack TypeScript, Next.js, and modern frontend architectures?',
    normalizedQuestion:
      'Describe your full-stack experience with React, Next.js, TypeScript, and API design.',
    answerTemplate:
      'Beyond Python/FastAPI and Java Spring Boot backends, I build production full-stack applications using TypeScript, Next.js App Router, React, Tailwind CSS, and Drizzle/PostgreSQL, ensuring end-to-end type safety from database schemas to client interfaces.',
    maxCharLimit: 500,
  },
  {
    category: 'cover_note',
    rawQuestion:
      'Additional information, cover letter, or anything else you would like to share with the hiring team?',
    normalizedQuestion:
      'Provide a cover note or additional context for the {{COMPANY_NAME}} hiring team regarding {{ROLE_TITLE}}.',
    answerTemplate:
      'Thank you for reviewing my application for the {{ROLE_TITLE}} position at {{COMPANY_NAME}}. Across {{YEARS_EXP}} years in software engineering (including enterprise systems at Persistent Systems, DBS Bank, and Walmart), I have specialized in turning complex distributed backend and Generative AI challenges into reliable production platforms. I would welcome the opportunity to discuss how I can contribute to your team.',
    maxCharLimit: 700,
  },
];

/**
 * Main Idempotent Seeder Function
 */
export async function runSeed(customPool?: Pool) {
  const pool =
    customPool ??
    new Pool({
      connectionString: DATABASE_URL,
    });
  const db = drizzle(pool);

  try {
    console.log('[seed] 1/4 Ensuring pgvector extension is enabled...');
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS vector;`);

    // ---------------------------------------------------------
    // Step 1: Upsert Active Persona
    // ---------------------------------------------------------
    console.log('[seed] 2/4 Upserting active Persona...');
    const existingPersonas = await db
      .select()
      .from(personas)
      .where(eq(personas.name, SEED_PERSONA.name));

    let personaId: string;
    if (existingPersonas.length > 0) {
      personaId = existingPersonas[0].id;
      await db
        .update(personas)
        .set({
          isActive: true,
          contactInfo: SEED_PERSONA.contactInfo,
          workHistory: SEED_PERSONA.workHistory,
          education: SEED_PERSONA.education,
          skills: SEED_PERSONA.skills,
          demographicsEeo: SEED_PERSONA.demographicsEeo,
          visaWorkAuth: SEED_PERSONA.visaWorkAuth,
          lockedFacts: SEED_PERSONA.lockedFacts,
        })
        .where(eq(personas.id, personaId));
      console.log(`[seed] Updated existing Persona (${personaId})`);
    } else {
      const [inserted] = await db
        .insert(personas)
        .values(SEED_PERSONA)
        .returning({ id: personas.id });
      personaId = inserted.id;
      console.log(`[seed] Inserted new Persona (${personaId})`);
    }

    // ---------------------------------------------------------
    // Step 2: Upsert Domain Selectors (Workday, Greenhouse, Lever)
    // ---------------------------------------------------------
    console.log(
      `[seed] 3/4 Upserting ${SEED_DOMAIN_SELECTORS.length} ATS Domain Selectors...`
    );
    let selectorsUpserted = 0;

    for (const sel of SEED_DOMAIN_SELECTORS) {
      const existing = await db
        .select({ id: domainSelectors.id })
        .from(domainSelectors)
        .where(
          and(
            eq(domainSelectors.domain, sel.domain),
            eq(domainSelectors.fieldSignature, sel.fieldSignature)
          )
        );

      if (existing.length > 0) {
        await db
          .update(domainSelectors)
          .set({
            cssOrXpath: sel.cssOrXpath,
            mappedProfileKey: sel.mappedProfileKey,
            fieldType: sel.fieldType,
            formatMask: sel.formatMask ?? null,
            confidence: sel.confidence,
          })
          .where(eq(domainSelectors.id, existing[0].id));
      } else {
        await db.insert(domainSelectors).values({
          domain: sel.domain,
          fieldSignature: sel.fieldSignature,
          cssOrXpath: sel.cssOrXpath,
          mappedProfileKey: sel.mappedProfileKey,
          fieldType: sel.fieldType,
          formatMask: sel.formatMask ?? null,
          confidence: sel.confidence,
          hitCount: 1,
        });
      }
      selectorsUpserted++;
    }

    //Also mirror greenhouse.io selectors to boards.greenhouse.io and lever.co to jobs.lever.co
    const aliasPairs: Array<[string, string]> = [
      ['greenhouse.io', 'boards.greenhouse.io'],
      ['lever.co', 'jobs.lever.co'],
    ];
    for (const [baseDomain, aliasDomain] of aliasPairs) {
      const baseEntries = SEED_DOMAIN_SELECTORS.filter(
        (s) => s.domain === baseDomain
      );
      for (const sel of baseEntries) {
        const existingAlias = await db
          .select({ id: domainSelectors.id })
          .from(domainSelectors)
          .where(
            and(
              eq(domainSelectors.domain, aliasDomain),
              eq(domainSelectors.fieldSignature, sel.fieldSignature)
            )
          );

        if (existingAlias.length === 0) {
          await db.insert(domainSelectors).values({
            domain: aliasDomain,
            fieldSignature: sel.fieldSignature,
            cssOrXpath: sel.cssOrXpath,
            mappedProfileKey: sel.mappedProfileKey,
            fieldType: sel.fieldType,
            formatMask: sel.formatMask ?? null,
            confidence: sel.confidence,
            hitCount: 1,
          });
          selectorsUpserted++;
        }
      }
    }
    console.log(`[seed] Upserted ${selectorsUpserted} total selector rules.`);

    // ---------------------------------------------------------
    // Step 3: Embed & Upsert 15 Q&A Templates into qaSemanticMemory
    // ---------------------------------------------------------
    console.log(
      `[seed] 4/4 Embedding & upserting ${SEED_QA_TEMPLATES.length} Q&A templates via ${OLLAMA_EMBED_MODEL}...`
    );
    let qaUpserted = 0;

    for (const qa of SEED_QA_TEMPLATES) {
      const embedding = await generateEmbedding(
        `${qa.rawQuestion} ${qa.normalizedQuestion}`
      );

      const existingQa = await db
        .select({ id: qaSemanticMemory.id })
        .from(qaSemanticMemory)
        .where(
          and(
            eq(qaSemanticMemory.personaId, personaId),
            eq(qaSemanticMemory.normalizedQuestion, qa.normalizedQuestion)
          )
        );

      if (existingQa.length > 0) {
        await db
          .update(qaSemanticMemory)
          .set({
            category: qa.category,
            rawQuestion: qa.rawQuestion,
            embedding,
            answerTemplate: qa.answerTemplate,
            maxCharLimit: qa.maxCharLimit,
          })
          .where(eq(qaSemanticMemory.id, existingQa[0].id));
      } else {
        await db.insert(qaSemanticMemory).values({
          personaId,
          category: qa.category,
          rawQuestion: qa.rawQuestion,
          normalizedQuestion: qa.normalizedQuestion,
          embedding,
          answerTemplate: qa.answerTemplate,
          maxCharLimit: qa.maxCharLimit,
          usageCount: 1,
        });
      }
      qaUpserted++;
    }

    console.log(
      `[seed] Complete! Persona: 1 | Selectors: ${selectorsUpserted} | Q&A Vectors: ${qaUpserted}`
    );

    return {
      personaId,
      selectorsCount: selectorsUpserted,
      qaTemplatesCount: qaUpserted,
    };
  } finally {
    if (!customPool) {
      await pool.end();
    }
  }
}

// Execute directly when invoked via `pnpm db:seed` / `tsx src/db/seed.ts`
const isDirectRun =
  typeof process !== 'undefined' &&
  process.argv[1] &&
  process.argv[1].replace(/\\/g, '/').endsWith('src/db/seed.ts');

if (isDirectRun) {
  runSeed().catch((err) => {
    console.error('[seed] Fatal error during database seeding:', err);
    process.exit(1);
  });
}