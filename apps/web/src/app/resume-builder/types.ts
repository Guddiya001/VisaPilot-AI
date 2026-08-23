// Resume Builder TypeScript Types
// Matches the data model from D:\ResumeBuilder in React

export interface ResumeBasics {
  name: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  portfolio: string;
  summary: string;
  openTo?: string;
}

export interface ResumeExperience {
  id: string;
  role: string;
  company: string;
  client?: string;
  location: string;
  period: string;
  bullets: string[];
}

export interface ResumeProject {
  id: string;
  name: string;
  description: string;
  technologies?: string;
}

export interface ResumeEducation {
  id: string;
  degree: string;
  school: string;
  location?: string;
  year?: string;
}

export interface CoverLetterData {
  paragraphs: string[];
}

export interface ResumeData {
  basics: ResumeBasics;
  experience: ResumeExperience[];
  skillsFlat: string[];
  projects: ResumeProject[];
  education: ResumeEducation[];
  certificates: string[];
  achievements: string[];
  languages: string[];
  coverLetter: CoverLetterData;
}

// ─── Full Resume Generation Pipeline Types ────────────────

export interface JDAnalysis {
  jobTitle: string;
  companyName: string;
  country: string;
  requiredSkills: string[];
  preferredSkills: string[];
  experienceYears: number;
  domainFocus: string[];
  visaIndicators: string[];
  roleLevel: string; // e.g. 'Senior', 'Staff', 'Lead', 'Principal'
  keyResponsibilities: string[];
  techStack: string[];
}

export interface InterviewProbability {
  atsPass: number;         // 0-100
  recruiterResponse: number; // 0-100
  technicalInterview: number; // 0-100
  offerProbability: number;  // 0-100
  expectedTimeline: string;  // e.g. '2-4 weeks'
}

export type ResumeStrategy = 'A' | 'B' | 'C'; // A=Backend, B=AI Platform, C=Full-Stack

export type FinalDecision =
  | 'APPLY_TODAY'
  | 'APPLY_WITH_REFERRAL'
  | 'APPLY_AFTER_RESUME_FIX'
  | 'SKIP_ROLE';

export interface GeneratedResumeResult {
  // Phase 1-2: JD Analysis
  jdAnalysis: JDAnalysis;
  // Phase 3: Strategy
  strategy: ResumeStrategy;
  strategyReason: string;
  // Phase 4-5: Generated Resume
  resumeData: ResumeData;
  // Phase 6-7: ATS Scoring
  atsScore: number;
  atsBreakdown: {
    keywordMatch: number;
    experienceMatch: number;
    skillsMatch: number;
    formattingScore: number;
  };
  // Phase 8: Cover Letter
  coverLetter: string;
  // Phase 9: Networking & Interview Probability
  networkingTips: string[];
  interviewProbability: InterviewProbability;
  // Phase 10: Final Decision
  finalDecision: FinalDecision;
  finalDecisionReason: string;
}

export type GenerationPhase =
  | 'idle'
  | 'analyzing_jd'
  | 'selecting_strategy'
  | 'generating_resume'
  | 'scoring_ats'
  | 'generating_cover_letter'
  | 'calculating_probability'
  | 'final_decision'
  | 'complete'
  | 'error';

export const GENERATION_PHASES: { key: GenerationPhase; label: string; icon: string }[] = [
  { key: 'analyzing_jd', label: 'Analyzing Job Description', icon: '🔍' },
  { key: 'selecting_strategy', label: 'Selecting Resume Strategy', icon: '🎯' },
  { key: 'generating_resume', label: 'Generating Optimized Resume', icon: '📝' },
  { key: 'scoring_ats', label: 'Running ATS Scoring', icon: '📊' },
  { key: 'generating_cover_letter', label: 'Crafting Cover Letter', icon: '✉️' },
  { key: 'calculating_probability', label: 'Calculating Interview Probability', icon: '📈' },
  { key: 'final_decision', label: 'Making Final Recommendation', icon: '✅' },
  { key: 'complete', label: 'Generation Complete', icon: '🎉' },
];

// Helper to generate unique IDs
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// Default sample data (from the reference project)
export const SAMPLE_RESUME_DATA: ResumeData = {
  basics: {
    name: 'Ashish Kumar Singh',
    title: 'Staff Backend AI Engineer | Context Retrieval & Agentic Architecture',
    email: 'ashish.singh.careers@gmail.com',
    phone: '+91 7982169443',
    location: 'India (Open to Relocation - Ireland/UK/EU | Visa Sponsorship Required)',
    linkedin: 'https://www.linkedin.com/in/ashish-kumar-singh1986',
    github: 'https://github.com/guddiya001',
    portfolio: 'https://ashishkumarsingh.vercel.app',
    summary:
      'Staff-level Backend Engineer with 9+ years of experience architecting distributed systems and building production-grade AI intelligence layers. Specialized in designing high-autonomy Agentic workflows, Model Context Protocol (MCP) integrations, and scalable retrieval orchestration APIs for highly regulated enterprise environments (Healthcare, Global FinTech).',
    openTo: '',
  },
  experience: [
    {
      id: 'exp-1',
      role: 'Senior Engineering Lead (Gen AI Context & Backend Architecture)',
      company: 'Persistent Systems Ltd / UnitedHealth Group',
      location: 'Noida, India',
      period: 'Oct 2023 - Present',
      bullets: [
        'Architected and shipped a production-grade AI-native context layer using Python and FastAPI, building the core retrieval orchestration APIs that empower AI agents with reliable, governed access to fragmented healthcare data.',
        'Spearheaded the integration of the Model Context Protocol (MCP) and agent-facing workflows (LangGraph/LangChain), enabling LLMs and internal tools to dynamically retrieve clinical context.',
        'Drove 0-to-1 system evolution for generative AI initiatives, navigating high ambiguity to transition early-stage PoCs into highly available backend services.',
        'Instrumented AI microservices with comprehensive telemetry (metrics, logs, traces) to ensure system reliability.',
        'Designed deterministic prompt engineering frameworks and evaluation pipelines for safe LLM outputs in regulated healthcare.',
      ],
    },
    {
      id: 'exp-2',
      role: 'Senior Software Engineer (Enterprise SaaS & Cloud Infrastructure)',
      company: 'LTIMindtree Ltd / DBS Bank',
      location: 'Singapore',
      period: 'Jun 2022 - Mar 2023',
      bullets: [
        'Engineered mission-critical, multi-tenant consumer banking backends using Java (Spring Boot) and Python within MAS compliance boundaries.',
        'Designed resilient SaaS foundations including secure data isolation patterns and distributed background jobs.',
        'Optimized complex SQL queries and enterprise data platforms for high-scale enterprise reporting.',
      ],
    },
    {
      id: 'exp-3',
      role: 'Senior Software Engineer (Distributed Systems)',
      company: 'Coforge Ltd / Walmart',
      location: 'Noida, India',
      period: 'Oct 2020 - Jun 2022',
      bullets: [
        'Built responsive customer-facing components and scalable REST APIs (Spring Boot, FastAPI) for massive global retail traffic.',
        'Optimized enterprise integration protocols and messaging queues for high-throughput, fault-tolerant data exchange.',
      ],
    },
    {
      id: 'exp-4',
      role: 'Software Engineer',
      company: 'Previous Organizations',
      location: 'India',
      period: 'Jan 2016 - Oct 2020',
      bullets: [
        'Developed full-stack web applications and backend services with Java, Spring Boot, Python, and robust database management.',
        'Gained deep foundational experience in API design, database optimization, and agile software delivery.',
      ],
    },
  ],
  skillsFlat: [
    'AI & Context Retrieval: Model Context Protocol (MCP), Retrieval Orchestration, Agentic Frameworks (LangChain, LangGraph), Gen AI Prompt Engineering, LLM Integration',
    'Backend & Architecture: Python, FastAPI, Java, Spring Boot, Distributed Systems, Multi-tenant SaaS Architecture, API Design, Microservices',
    'Data & Infrastructure: SQL, Snowflake (Concepts), Vector Data Management, AWS, GCP, Enterprise Integration Protocols',
    'Observability & Operations: System Telemetry (Metrics/Logs/Traces), High-Availability Operations, CI/CD, Background Jobs',
    'Engineering Leadership: 0-to-1 Product Development, Cross-functional Ambiguity Resolution, Architectural Decision Making, Agile',
  ],
  projects: [
    {
      id: 'proj-1',
      name: 'Enterprise AI Agent & MCP Workflow Orchestration',
      description: 'Python/FastAPI-based agentic workflow orchestration system.',
      technologies: 'Python, FastAPI, LangGraph, MCP',
    },
    {
      id: 'proj-2',
      name: 'LLM Integration & Secure Context Retrieval System',
      description: 'Secure retrieval system for enterprise LLM applications.',
      technologies: 'Python, Vector DB, RAG',
    },
    {
      id: 'proj-3',
      name: 'Scalable Multi-Tenant Microservices Architecture',
      description: 'Enterprise-grade multi-tenant platform.',
      technologies: 'Java, Spring Boot, Python, Kubernetes',
    },
  ],
  education: [
    {
      id: 'edu-1',
      degree: 'Master of Computer Applications (MCA)',
      school: 'Guru Gobind Singh Indraprastha University',
      location: 'India',
      year: '2016',
    },
    {
      id: 'edu-2',
      degree: 'Bachelor of Computer Applications (BCA)',
      school: 'UPRTO University',
      location: 'India',
      year: '2012',
    },
  ],
  certificates: [
    'Advanced Python & FastAPI Backend Development',
    'Large Language Models & Prompt Engineering',
    'Enterprise Java & Spring Boot Architecture',
    'Database Management & SQL Optimization',
  ],
  achievements: [
    'Architected multi-step AI workflows integrating LLMs via Python (FastAPI) and MCP, powering enterprise agentic automation.',
    'Operated as a foundational engineer on 0-to-1 initiatives, designing core retrieval APIs and context layers.',
    'Decoupled monolithic architectures into scalable, observable microservices using Java and Spring Boot.',
  ],
  languages: ['English – Full Professional Proficiency'],
  coverLetter: {
    paragraphs: [
      'Dear Hiring Manager,',
      'I am excited to apply for this position. With over nine years of experience building enterprise-scale applications across healthcare, banking, and retail industries, I am enthusiastic about the opportunity to contribute to your team.',
      'Throughout my career, I have designed and developed modern applications using Python, Java, TypeScript, React, microservices, Docker, Kubernetes, AWS, and CI/CD practices.',
      'I would welcome the opportunity to discuss how my experience can contribute to your team\'s success.',
      'Thank you for your time and consideration.',
      'Kind regards,',
      'Ashish Kumar Singh',
    ],
  },
};

// Empty starting data for new resumes
export const EMPTY_RESUME_DATA: ResumeData = {
  basics: {
    name: '',
    title: '',
    email: '',
    phone: '',
    location: '',
    linkedin: '',
    github: '',
    portfolio: '',
    summary: '',
    openTo: '',
  },
  experience: [],
  skillsFlat: [],
  projects: [],
  education: [],
  certificates: [],
  achievements: [],
  languages: [],
  coverLetter: { paragraphs: [] },
};
