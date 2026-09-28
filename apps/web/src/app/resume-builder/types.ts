// Resume Builder TypeScript Types
// Matches the data model from D:\ResumeBuilder in React

import { CandidateProfile } from "@visapilot/shared";

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
  focus?: string[];
  metrics?: { metric: string; value: string; verified?: boolean }[];
}

export interface ResumeProject {
  id: string;
  name: string;
  description: string;
  technologies?: string;
  type?: string;
  relevance?: string[];
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

export interface ResumeMetadata {
  template?: string;
  theme?: string;
  lastUpdated?: string;
  [key: string]: any;
}

export interface SkillDetail {
  name: string;
  aliases: string[];
  evidence?: string;
  confidence?: number;
  canClaimInExperience?: boolean;
}

export type SkillGroups = Record<string, SkillDetail[]>;

export interface ResumeData {
  basics: ResumeBasics;
  experience: ResumeExperience[];
  skillsFlat: string[];
  candidateProfile?: Partial<CandidateProfile>;
  mobility?: any;
  skills?: SkillGroups;
  projects: ResumeProject[];
  education: ResumeEducation[];
  certificates: string[];
  achievements: string[];
  languages: string[];
  coverLetter: CoverLetterData;
  metadata?: ResumeMetadata;
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

export const MASTER_RESUME_TEXT = `# Ashish Kumar Singh
**Senior Software Engineer | Senior Backend Engineer | AI / GenAI Engineer**

Location: Noida, India (Open to Relocation: Germany, Netherlands, Ireland, UK, USA, Singapore | Visa Sponsorship Required)  
Email: ashish.singh.careers@gmail.com | Phone: +91 7982169443  
LinkedIn: https://www.linkedin.com/in/ashish-kumar-singh1986 | GitHub: https://github.com/guddiya001 | Portfolio: https://ashishkumarsingh.vercel.app

---

## PROFESSIONAL SUMMARY
Staff- and Senior-level Software Engineer with 9+ years of experience architecting, scaling, and operating high-throughput backend systems, cloud-native microservices, and production-grade Generative AI platforms across enterprise healthcare, Tier-1 banking, and global retail e-commerce. Proven expertise in building autonomous agentic workflows using Python (FastAPI), Model Context Protocol (MCP), LangChain, LangGraph, and RAG retrieval pipelines, alongside resilient distributed backends with Node.js, TypeScript, Go, and Java (Spring Boot). Track record of driving 0-to-1 greenfield engineering initiatives, optimizing high-scale databases (PostgreSQL, Redis, Kafka), lowering latency by 40%, and maintaining 99.95% production availability for systems handling millions of daily requests.

---

## CORE TECHNICAL SKILLS
- **Programming Languages:** Python (Asyncio, FastAPI), TypeScript, JavaScript (ES6+), Go (Golang), Java (Spring Boot), SQL
- **AI & Generative AI:** Agentic Systems, Model Context Protocol (MCP), LangChain, LangGraph, RAG (Retrieval-Augmented Generation), Vector Databases (pgvector, ChromaDB), Embeddings, LLM Evaluation & Guardrails
- **Backend & Distributed Systems:** Microservices Architecture, RESTful APIs, gRPC, Event-Driven Architecture, Message Queues (Apache Kafka, RabbitMQ), Distributed Caching (Redis), High-Concurrency Systems
- **Databases & Data Engineering:** PostgreSQL, MySQL, MongoDB, DynamoDB, Oracle SQL, Database Indexing, Schema Optimization, Data Ingestion Pipelines
- **Cloud & DevOps:** Amazon Web Services (AWS - ECS, EKS, Lambda, S3, RDS, SQS), Microsoft Azure, Google Cloud (GCP), Docker, Kubernetes, Helm, Terraform, CI/CD (GitHub Actions, GitLab CI, Jenkins)
- **Frontend & Web Technologies:** React.js, Next.js, Redux Toolkit, Webpack Module Federation (Micro-frontends), HTML5, CSS3/Tailwind CSS, Core Web Vitals
- **Engineering Best Practices:** System Design, Observability (DataDog, Prometheus, Grafana, OpenTelemetry), TDD (Jest, PyTest, JUnit), MAS/HIPAA Regulatory Compliance, Agile/Scrum Leadership

---

## PROFESSIONAL EXPERIENCE

### Senior Engineering Lead | Persistent Systems Ltd. — UnitedHealth Group
*Noida, India | Oct 2023 – Present*
- **Architected** and deployed enterprise-grade Generative AI context retrieval and agentic orchestration platforms using Python, FastAPI, LangGraph, and Model Context Protocol (MCP), automating clinical workflows and decreasing manual clinician research time by 40%.
- **Engineered** high-performance distributed backend microservices and REST/gRPC APIs using Python and Go, handling 15M+ daily requests with a 40% reduction in endpoint latency.
- **Implemented** secure Model Context Protocol (MCP) clients and servers to standardize tool execution and data retrieval across fragmented clinical records, enforcing strict healthcare compliance and RBAC guardrails.
- **Spearheaded** an enterprise micro-frontend architecture utilizing Webpack Module Federation and React 18, enabling independent continuous deployment across 6+ distributed engineering teams.
- **Built** comprehensive end-to-end AI observability pipelines incorporating OpenTelemetry, DataDog, and Prometheus to monitor LLM token consumption, latency budgets, retrieval relevance, and system uptime.
- **Optimized** client-side application bundle sizes by 35% and improved Core Web Vitals (Lighthouse score 62 → 94), delivering a 40% uplift in web application load performance.
- **Led** technical architecture reviews, code quality governance, and mentorship for 12+ engineers across Agile sprints, establishing reusable backend libraries and CI/CD pipelines.

### Senior Software Engineer | LTIMindtree Ltd. — DBS Bank
*Singapore (Remote/Onsite Support) | Jul 2022 – Oct 2023*
- **Developed** resilient, high-volume consumer banking microservices and transaction processing engines using Java (Spring Boot), Python, and PostgreSQL under strict Monetary Authority of Singapore (MAS) regulatory standards.
- **Designed** highly scalable RESTful APIs and asynchronous event processing modules with zero transaction data loss and automated audit trail logging.
- **Optimized** high-concurrency database queries, table indexing, and partition schemes in PostgreSQL and Oracle, decreasing transaction query execution times by 30% for financial reporting.
- **Created** reusable modular web applications using React.js and TypeScript, integrating banking authentication workflows, real-time balance feeds, and end-to-end type safety.
- **Implemented** automated integration and unit testing suites using JUnit, Mockito, and Jest, maintaining 85%+ test coverage across core financial components.
- **Collaborated** directly with enterprise security auditors, technical product managers, and infrastructure teams to ensure fault tolerance, zero-trust network policies, and seamless deployments.

### Senior Software Engineer | Coforge Ltd. — Walmart
*Noida, India | Oct 2020 – Jun 2022*
- **Engineered** distributed backend microservices and customer-facing order workflows using Node.js, Express, TypeScript, and Spring Boot for Walmart's global retail e-commerce platform during peak retail spikes.
- **Architected** high-throughput event streaming and messaging pipelines utilizing Apache Kafka and RabbitMQ, guaranteeing idempotent order ingestion and real-time inventory synchronization.
- **Implemented** multi-tier caching architectures with Redis and tuned relational/document databases (PostgreSQL, MongoDB), reducing peak load on primary databases by 45%.
- **Automated** continuous delivery and blue/green deployment workflows using Jenkins, Docker, and Kubernetes, eliminating deployment downtime across bi-weekly production release cycles.
- **Collaborated** with international site reliability engineering (SRE) and QA teams to instrument application health checks and distributed tracing, maintaining a 99.95% production service availability record.

### Software Engineer | Previous Technology Organizations
*India | Jan 2016 – Oct 2020*
- **Built** full-stack web applications and scalable RESTful API backends using Python (Django/Flask), Node.js, React.js, MySQL, and PostgreSQL across healthcare, insurance, and SaaS domains.
- **Designed** normalized relational database models, views, and stored procedures to handle high-concurrency data transactions and reliable analytics exports.
- **Constructed** responsive, cross-browser frontend user interfaces using React, JavaScript (ES6+), HTML5, and CSS3, integrating state management and API services.
- **Implemented** security controls including OAuth 2.0 authentication, JWT token validation, role-based access control (RBAC), and sanitization middleware to mitigate OWASP Top 10 vulnerabilities.
- **Participated** in all phases of the Agile software development lifecycle (SDLC), contributing to sprint planning, backlog grooming, peer code reviews, and production release support.

---

## EDUCATION & CERTIFICATIONS

### Education
- **Master of Computer Applications (MCA)** — Uttar Pradesh Technical University (UPTU), India | *2013 – 2016*
- **Bachelor of Computer Applications (BCA)** — UPRTO University, India | *2009 – 2012*

### Certifications & Continuous Learning
- **DeepLearning.AI**: Generative AI with Large Language Models
- **DeepLearning.AI**: LangChain for LLM Application Development
- **HackerRank**: Python (Advanced), Problem Solving (Advanced), JavaScript (Advanced), SQL (Advanced)
- **Anthropic / Community**: Model Context Protocol (MCP) Architecture & Agentic Workflow Design
- **AWS**: Cloud Practitioner / Cloud-Native Architecture Specialization
`;

// Default sample data (from the reference project)
export const SAMPLE_RESUME_DATA: ResumeData = {
  basics: {
    name: "Ashish Kumar Singh",

    title:
      "Senior Software Engineer | Senior Backend Engineer | AI / GenAI Engineer",

    email: "ashish.singh.careers@gmail.com",

    phone: "+91 7982169443",

    location:
      "Noida, India (Open to Relocation: Germany, Netherlands, Ireland, UK, USA, Singapore | Visa Sponsorship Required)",

    linkedin:
      "https://www.linkedin.com/in/ashish-kumar-singh1986",

    github:
      "https://github.com/guddiya001",

    portfolio:
      "https://ashishkumarsingh.vercel.app",

    summary:
      "Staff- and Senior-level Software Engineer with 9+ years of experience architecting, scaling, and operating high-throughput backend systems, cloud-native microservices, and production-grade Generative AI platforms across enterprise healthcare, Tier-1 banking, and global retail e-commerce. Proven expertise in building autonomous agentic workflows using Python (FastAPI), Model Context Protocol (MCP), LangChain, LangGraph, and RAG retrieval pipelines, alongside resilient distributed backends with Node.js, TypeScript, Go, and Java (Spring Boot). Track record of driving 0-to-1 greenfield engineering initiatives, optimizing high-scale databases (PostgreSQL, Redis, Kafka), lowering latency by 40%, and maintaining 99.95% production availability for systems handling millions of daily requests.",

    openTo:
      "Germany, Netherlands, Ireland, UK, USA, Singapore | Visa Sponsorship Required"
  },

  candidateProfile: {
    totalExperienceYears: 9,

    seniority: [
      "Senior Software Engineer",
      "Senior Engineering Lead",
      "Technical Lead",
      "AI/ML Tech Lead"
    ],

    primarySpecializations: [
      "Artificial Intelligence",
      "Generative AI",
      "Agentic AI",
      "AI Agents",
      "RAG",
      "LLM Applications",
      "Backend Engineering",
      "Full Stack Engineering",
      "Distributed Systems",
      "Cloud-Native Architecture",
      "Microservices",
      "System Design",
      "Technical Leadership"
    ],

    domains: [
      "Healthcare",
      "Banking",
      "Retail",
      "Enterprise SaaS",
      "AI Platforms"
    ],

    targetRoles: [
      "Senior Software Engineer",
      "Senior AI Engineer",
      "AI/ML Engineer",
      "AI/ML Tech Lead",
      "AI Engineering Lead",
      "Senior Backend Engineer",
      "Staff Software Engineer",
      "Senior Full Stack Engineer",
      "AI Platform Engineer",
      "Backend Platform Engineer",
      "Generative AI Engineer",
      "Agentic AI Engineer"
    ]
  },

  mobility: {
    currentCountry: "India",

    openToRelocation: true,

    targetCountries: [
      "United States",
      "United Kingdom",
      "Ireland",
      "Germany",
      "Netherlands",
      "Poland",
      "United Arab Emirates",
      "Singapore",
      "Australia"
    ],

    visaSponsorshipRequired: true,

    preferredVisaTypes: [
      "Employer Sponsored Work Visa",
      "H-1B",
      "O-1",
      "Skilled Worker Visa",
      "EU Blue Card",
      "Critical Skills Employment Permit"
    ]
  },

  skills: {
    ai: [
      {
        name: "Generative AI",
        aliases: ["GenAI", "Generative Artificial Intelligence"],
        evidence: "professional",
        confidence: 0.95,
        canClaimInExperience: true
      },
      {
        name: "AI Agents",
        aliases: ["AI Agent", "Autonomous AI Agents"],
        evidence: "professional",
        confidence: 0.95,
        canClaimInExperience: true
      },
      {
        name: "Agentic AI",
        aliases: ["Agentic Systems", "Agentic Workflows"],
        evidence: "professional",
        confidence: 0.95,
        canClaimInExperience: true
      },
      {
        name: "RAG",
        aliases: [
          "Retrieval-Augmented Generation",
          "Retrieval Augmented Generation"
        ],
        evidence: "professional",
        confidence: 0.95,
        canClaimInExperience: true
      },
      {
        name: "LangChain",
        aliases: [],
        evidence: "professional",
        confidence: 0.95,
        canClaimInExperience: true
      },
      {
        name: "LangGraph",
        aliases: [],
        evidence: "professional",
        confidence: 0.95,
        canClaimInExperience: true
      },
      {
        name: "MCP",
        aliases: ["Model Context Protocol"],
        evidence: "professional",
        confidence: 0.95,
        canClaimInExperience: true
      },
      {
        name: "OpenAI",
        aliases: ["OpenAI APIs"],
        evidence: "professional",
        confidence: 0.90,
        canClaimInExperience: true
      },
      {
        name: "Gemini",
        aliases: ["Google Gemini"],
        evidence: "professional",
        confidence: 0.90,
        canClaimInExperience: true
      },
      {
        name: "Vector Databases",
        aliases: ["Vector DB", "Vector Stores"],
        evidence: "professional",
        confidence: 0.90,
        canClaimInExperience: true
      },
      {
        name: "AI Observability",
        aliases: ["LLM Observability"],
        evidence: "professional",
        confidence: 0.90,
        canClaimInExperience: true
      },
      {
        name: "Prompt Engineering",
        aliases: ["Prompt Design"],
        evidence: "professional",
        confidence: 0.90,
        canClaimInExperience: true
      }
    ],

    backend: [
      {
        name: "Node.js",
        aliases: ["NodeJS"],
        evidence: "professional",
        confidence: 0.98,
        canClaimInExperience: true
      },
      {
        name: "Python",
        aliases: ["Python 3"],
        evidence: "professional",
        confidence: 0.95,
        canClaimInExperience: true
      },
      {
        name: "FastAPI",
        aliases: ["Fast API"],
        evidence: "professional",
        confidence: 0.90,
        canClaimInExperience: true
      },
      {
        name: "Express.js",
        aliases: ["Express"],
        evidence: "professional",
        confidence: 0.95,
        canClaimInExperience: true
      },
      {
        name: "NestJS",
        aliases: [],
        evidence: "professional",
        confidence: 0.85,
        canClaimInExperience: true
      },
      {
        name: "REST APIs",
        aliases: ["RESTful APIs", "REST API"],
        evidence: "professional",
        confidence: 0.98,
        canClaimInExperience: true
      },
      {
        name: "GraphQL",
        aliases: [],
        evidence: "professional",
        confidence: 0.90,
        canClaimInExperience: true
      },
      {
        name: "Microservices",
        aliases: ["Microservice Architecture"],
        evidence: "professional",
        confidence: 0.98,
        canClaimInExperience: true
      }
    ],

    frontend: [
      {
        name: "React.js",
        aliases: ["React", "ReactJS"],
        evidence: "professional",
        confidence: 0.98,
        canClaimInExperience: true
      },
      {
        name: "Next.js",
        aliases: ["NextJS"],
        evidence: "professional",
        confidence: 0.90,
        canClaimInExperience: true
      },
      {
        name: "TypeScript",
        aliases: ["TS"],
        evidence: "professional",
        confidence: 0.98,
        canClaimInExperience: true
      },
      {
        name: "JavaScript",
        aliases: ["JS", "ECMAScript"],
        evidence: "professional",
        confidence: 0.98,
        canClaimInExperience: true
      },
      {
        name: "HTML5",
        aliases: ["HTML"],
        evidence: "professional",
        confidence: 0.95,
        canClaimInExperience: true
      },
      {
        name: "CSS3",
        aliases: ["CSS"],
        evidence: "professional",
        confidence: 0.95,
        canClaimInExperience: true
      }
    ],

    databases: [
      {
        name: "PostgreSQL",
        aliases: ["Postgres"],
        evidence: "professional",
        confidence: 0.95,
        canClaimInExperience: true
      },
      {
        name: "MongoDB",
        aliases: ["Mongo"],
        evidence: "professional",
        confidence: 0.95,
        canClaimInExperience: true
      },
      {
        name: "MySQL",
        aliases: [],
        evidence: "professional",
        confidence: 0.85,
        canClaimInExperience: true
      },
      {
        name: "Redis",
        aliases: [],
        evidence: "professional",
        confidence: 0.90,
        canClaimInExperience: true
      },
      {
        name: "Kafka",
        aliases: ["Apache Kafka"],
        evidence: "professional",
        confidence: 0.90,
        canClaimInExperience: true
      },
      {
        name: "SQL",
        aliases: ["Structured Query Language"],
        evidence: "professional",
        confidence: 0.95,
        canClaimInExperience: true
      }
    ],

    cloud: [
      {
        name: "AWS",
        aliases: ["Amazon Web Services"],
        evidence: "professional",
        confidence: 0.95,
        canClaimInExperience: true
      },
      {
        name: "Azure",
        aliases: ["Microsoft Azure"],
        evidence: "professional",
        confidence: 0.90,
        canClaimInExperience: true
      },
      {
        name: "GCP",
        aliases: ["Google Cloud", "Google Cloud Platform"],
        evidence: "professional",
        confidence: 0.85,
        canClaimInExperience: true
      },
      {
        name: "Docker",
        aliases: ["Docker Containers"],
        evidence: "professional",
        confidence: 0.98,
        canClaimInExperience: true
      },
      {
        name: "Kubernetes",
        aliases: ["K8s"],
        evidence: "professional",
        confidence: 0.90,
        canClaimInExperience: true
      },
      {
        name: "Terraform",
        aliases: ["Infrastructure as Code", "IaC"],
        evidence: "professional",
        confidence: 0.85,
        canClaimInExperience: true
      }
    ],

    devops: [
      {
        name: "CI/CD",
        aliases: ["Continuous Integration", "Continuous Deployment"],
        evidence: "professional",
        confidence: 0.95,
        canClaimInExperience: true
      },
      {
        name: "Git",
        aliases: ["GitHub", "GitLab"],
        evidence: "professional",
        confidence: 0.98,
        canClaimInExperience: true
      },
      {
        name: "Monitoring",
        aliases: ["Application Monitoring"],
        evidence: "professional",
        confidence: 0.95,
        canClaimInExperience: true
      },
      {
        name: "Logging",
        aliases: [],
        evidence: "professional",
        confidence: 0.95,
        canClaimInExperience: true
      },
      {
        name: "Observability",
        aliases: ["System Observability"],
        evidence: "professional",
        confidence: 0.95,
        canClaimInExperience: true
      },
      {
        name: "Splunk",
        aliases: [],
        evidence: "professional",
        confidence: 0.85,
        canClaimInExperience: true
      }
    ],

    architecture: [
      {
        name: "Distributed Systems",
        aliases: [],
        evidence: "professional",
        confidence: 0.95,
        canClaimInExperience: true
      },
      {
        name: "System Design",
        aliases: ["Software Architecture"],
        evidence: "professional",
        confidence: 0.95,
        canClaimInExperience: true
      },
      {
        name: "Cloud-Native Architecture",
        aliases: [],
        evidence: "professional",
        confidence: 0.90,
        canClaimInExperience: true
      },
      {
        name: "Event-Driven Architecture",
        aliases: [],
        evidence: "professional",
        confidence: 0.85,
        canClaimInExperience: true
      },
      {
        name: "API Architecture",
        aliases: [],
        evidence: "professional",
        confidence: 0.95,
        canClaimInExperience: true
      }
    ],

    leadership: [
      {
        name: "Technical Leadership",
        aliases: ["Engineering Leadership"],
        evidence: "professional",
        confidence: 0.95,
        canClaimInExperience: true
      },
      {
        name: "Architecture Leadership",
        aliases: ["Technical Architecture"],
        evidence: "professional",
        confidence: 0.95,
        canClaimInExperience: true
      },
      {
        name: "Code Reviews",
        aliases: ["Code Review"],
        evidence: "professional",
        confidence: 0.95,
        canClaimInExperience: true
      },
      {
        name: "Mentoring",
        aliases: ["Technical Mentoring"],
        evidence: "professional",
        confidence: 0.95,
        canClaimInExperience: true
      },
      {
        name: "Agile",
        aliases: ["Agile Development"],
        evidence: "professional",
        confidence: 0.95,
        canClaimInExperience: true
      }
    ]
  },

  experience: [
    {
      id: "exp-1",
      role: "Senior Engineering Lead",
      company: "Persistent Systems Ltd. — UnitedHealth Group",
      location: "Noida, India",
      period: "Oct 2023 – Present",
      focus: [
        "AI",
        "Generative AI",
        "Agentic AI",
        "Backend",
        "Full Stack",
        "Cloud",
        "Architecture",
        "Technical Leadership"
      ],
      bullets: [
        "Architected and deployed enterprise-grade Generative AI context retrieval and agentic orchestration platforms using Python, FastAPI, LangGraph, and Model Context Protocol (MCP), automating clinical workflows and decreasing manual clinician research time by 40%.",
        "Engineered high-performance distributed backend microservices and REST/gRPC APIs using Python and Go, handling 15M+ daily requests with a 40% reduction in endpoint latency.",
        "Implemented secure Model Context Protocol (MCP) clients and servers to standardize tool execution and data retrieval across fragmented clinical records, enforcing strict healthcare compliance and RBAC guardrails.",
        "Spearheaded an enterprise micro-frontend architecture utilizing Webpack Module Federation and React 18, enabling independent continuous deployment across 6+ distributed engineering teams.",
        "Built comprehensive end-to-end AI observability pipelines incorporating OpenTelemetry, DataDog, and Prometheus to monitor LLM token consumption, latency budgets, retrieval relevance, and system uptime.",
        "Optimized client-side application bundle sizes by 35% and improved Core Web Vitals (Lighthouse score 62 → 94), delivering a 40% uplift in web application load performance.",
        "Led technical architecture reviews, code quality governance, and mentorship for 12+ engineers across Agile sprints, establishing reusable backend libraries and CI/CD pipelines."
      ],
      metrics: [
        {
          metric: "Micro-frontend adoption",
          value: "6+ global engineering teams",
          verified: true
        },
        {
          metric: "Frontend bundle reduction",
          value: "35%",
          verified: true
        },
        {
          metric: "Page Speed Index improvement",
          value: "40%",
          verified: true
        },
        {
          metric: "Lighthouse improvement",
          value: "62 to 94",
          verified: true
        }
      ]
    },
    {
      id: "exp-2",
      role: "Senior Software Engineer",
      company: "LTIMindtree Ltd. — DBS Bank",
      location: "Singapore (Remote/Onsite Support)",
      period: "Jul 2022 – Oct 2023",
      focus: [
        "Backend",
        "Full Stack",
        "Banking",
        "Distributed Systems",
        "Cloud"
      ],
      bullets: [
        "Developed resilient, high-volume consumer banking microservices and transaction processing engines using Java (Spring Boot), Python, and PostgreSQL under strict Monetary Authority of Singapore (MAS) regulatory standards.",
        "Designed highly scalable RESTful APIs and asynchronous event processing modules with zero transaction data loss and automated audit trail logging.",
        "Optimized high-concurrency database queries, table indexing, and partition schemes in PostgreSQL and Oracle, decreasing transaction query execution times by 30% for financial reporting.",
        "Created reusable modular web applications using React.js and TypeScript, integrating banking authentication workflows, real-time balance feeds, and end-to-end type safety.",
        "Implemented automated integration and unit testing suites using JUnit, Mockito, and Jest, maintaining 85%+ test coverage across core financial components.",
        "Collaborated directly with enterprise security auditors, technical product managers, and infrastructure teams to ensure fault tolerance, zero-trust network policies, and seamless deployments."
      ]
    },
    {
      id: "exp-3",
      role: "Senior Software Engineer",
      company: "Coforge Ltd. — Walmart",
      location: "Noida, India",
      period: "Oct 2020 – Jun 2022",
      focus: [
        "Backend",
        "Full Stack",
        "Retail",
        "Distributed Systems",
        "Data"
      ],
      bullets: [
        "Engineered distributed backend microservices and customer-facing order workflows using Node.js, Express, TypeScript, and Spring Boot for Walmart's global retail e-commerce platform during peak retail spikes.",
        "Architected high-throughput event streaming and messaging pipelines utilizing Apache Kafka and RabbitMQ, guaranteeing idempotent order ingestion and real-time inventory synchronization.",
        "Implemented multi-tier caching architectures with Redis and tuned relational/document databases (PostgreSQL, MongoDB), reducing peak load on primary databases by 45%.",
        "Automated continuous delivery and blue/green deployment workflows using Jenkins, Docker, and Kubernetes, eliminating deployment downtime across bi-weekly production release cycles.",
        "Collaborated with international site reliability engineering (SRE) and QA teams to instrument application health checks and distributed tracing, maintaining a 99.95% production service availability record."
      ]
    },
    {
      id: "exp-4",
      role: "Software Engineer",
      company: "Previous Technology Organizations",
      location: "India",
      period: "Jan 2016 – Oct 2020",
      focus: [
        "Full Stack",
        "Backend",
        "Web Applications",
        "APIs",
        "Databases"
      ],
      bullets: [
        "Built full-stack web applications and scalable RESTful API backends using Python (Django/Flask), Node.js, React.js, MySQL, and PostgreSQL across healthcare, insurance, and SaaS domains.",
        "Designed normalized relational database models, views, and stored procedures to handle high-concurrency data transactions and reliable analytics exports.",
        "Constructed responsive, cross-browser frontend user interfaces using React, JavaScript (ES6+), HTML5, and CSS3, integrating state management and API services.",
        "Implemented security controls including OAuth 2.0 authentication, JWT token validation, role-based access control (RBAC), and sanitization middleware to mitigate OWASP Top 10 vulnerabilities.",
        "Participated in all phases of the Agile software development lifecycle (SDLC), contributing to sprint planning, backlog grooming, peer code reviews, and production release support."
      ]
    }
  ],

  projects: [
    {
      id: "proj-1",

      name: "Enterprise AI Agent & MCP Workflow Platform",

      type: "AI / Personal or Professional Project",

      description:
        "AI-powered workflow orchestration platform using agentic workflows, LLM integrations, retrieval, tool calling, and Model Context Protocol.",

      technologies:
        "Python, FastAPI, LangGraph, LangChain, MCP, RAG, Vector Databases, LLMs",

      relevance: [
        "AI Agents",
        "Agentic AI",
        "MCP",
        "RAG",
        "LLM Applications",
        "Backend",
        "AI Architecture"
      ]
    },

    {
      id: "proj-2",

      name: "LLM Integration & Secure Context Retrieval Platform",

      type: "AI / Personal or Professional Project",

      description:
        "Context retrieval platform for enterprise LLM applications supporting retrieval orchestration, embeddings, vector search, and grounded AI responses.",

      technologies:
        "Python, FastAPI, RAG, Vector Databases, Embeddings, LLM APIs",

      relevance: [
        "RAG",
        "Vector Databases",
        "LLM",
        "Enterprise AI",
        "Retrieval"
      ]
    },

    {
      id: "proj-3",

      name: "Scalable Multi-Tenant Microservices Platform",

      type: "Software Architecture",

      description:
        "Cloud-native multi-tenant application platform using microservices, distributed systems, containerization, and scalable backend architecture.",

      technologies:
        "Node.js, Python, Java, Spring Boot, Docker, Kubernetes, PostgreSQL",

      relevance: [
        "Microservices",
        "Distributed Systems",
        "Cloud",
        "Backend",
        "System Design"
      ]
    },

    {
      id: "proj-4",

      name: "Enterprise Healthcare Platform",

      type: "Professional Project",

      description:
        "Enterprise healthcare platform supporting complex workflows, scalable APIs, cloud-native services, frontend applications, and AI-enabled capabilities.",

      technologies:
        "Python, FastAPI, Node.js, React, TypeScript, AWS, Azure, Docker, Kubernetes, PostgreSQL",

      relevance: [
        "Healthcare",
        "Enterprise",
        "AI",
        "Full Stack",
        "Cloud"
      ]
    }
  ],

  skillsFlat: [
    "Programming Languages: Python (Asyncio, FastAPI), TypeScript, JavaScript (ES6+), Go (Golang), Java (Spring Boot), SQL",
    "AI & Generative AI: Agentic Systems, Model Context Protocol (MCP), LangChain, LangGraph, RAG (Retrieval-Augmented Generation), Vector Databases (pgvector, ChromaDB), Embeddings, LLM Evaluation & Guardrails",
    "Backend & Distributed Systems: Microservices Architecture, RESTful APIs, gRPC, Event-Driven Architecture, Message Queues (Apache Kafka, RabbitMQ), Distributed Caching (Redis), High-Concurrency Systems",
    "Databases & Data Engineering: PostgreSQL, MySQL, MongoDB, DynamoDB, Oracle SQL, Database Indexing, Schema Optimization, Data Ingestion Pipelines",
    "Cloud & DevOps: Amazon Web Services (AWS - ECS, EKS, Lambda, S3, RDS, SQS), Microsoft Azure, Google Cloud (GCP), Docker, Kubernetes, Helm, Terraform, CI/CD (GitHub Actions, GitLab CI, Jenkins)",
    "Frontend & Web Technologies: React.js, Next.js, Redux Toolkit, Webpack Module Federation (Micro-frontends), HTML5, CSS3/Tailwind CSS, Core Web Vitals",
    "Engineering Best Practices: System Design, Observability (DataDog, Prometheus, Grafana, OpenTelemetry), TDD (Jest, PyTest, JUnit), MAS/HIPAA Regulatory Compliance, Agile/Scrum Leadership"
  ],

  education: [
    {
      id: "edu-1",
      degree: "Master of Computer Applications (MCA)",
      school: "Uttar Pradesh Technical University (UPTU)",
      location: "India",
      year: "2013 – 2016"
    },
    {
      id: "edu-2",
      degree: "Bachelor of Computer Applications (BCA)",
      school: "UPRTO University",
      location: "India",
      year: "2009 – 2012"
    }
  ],

  certificates: [
    "DeepLearning.AI: Generative AI with Large Language Models",
    "DeepLearning.AI: LangChain for LLM Application Development",
    "HackerRank: Python (Advanced), Problem Solving (Advanced), JavaScript (Advanced), SQL (Advanced)",
    "Anthropic / Community: Model Context Protocol (MCP) Architecture & Agentic Workflow Design",
    "AWS: Cloud Practitioner / Cloud-Native Architecture Specialization"
  ],

  achievements: [
    "Architected and deployed enterprise-grade Generative AI and MCP platforms, reducing clinician research time by 40%.",
    "Engineered high-performance Go and Python microservices handling 15M+ daily requests with 40% latency reduction.",
    "Spearheaded enterprise micro-frontend architecture utilizing Webpack Module Federation adopted across 6+ distributed engineering teams.",
    "Optimized client-side web application performance, improving Lighthouse score from 62 to 94 and reducing bundle size by 35%.",
    "Maintained 99.95% production availability for mission-critical banking and global retail e-commerce systems."
  ],

  languages: [
    "English – Full Professional Proficiency"
  ],

  coverLetter: {
    paragraphs: [
      "Dear Hiring Manager,",
      "I am a Senior Software Engineer with 9+ years of experience building production-grade AI, backend, full-stack, cloud-native, and distributed systems across healthcare, banking, retail, enterprise SaaS, and AI platforms.",
      "My recent work focuses on Generative AI, AI agents, agentic workflows, RAG, LangChain, LangGraph, MCP, LLM integrations, vector databases, and AI observability, combined with strong backend and cloud engineering experience using Python, FastAPI, Node.js, TypeScript, React, PostgreSQL, AWS, Azure, GCP, Docker, Kubernetes, and Terraform.",
      "I bring a technical-generalist mindset and enjoy owning problems end-to-end—from architecture and implementation through deployment, observability, reliability, and production operations. I have also led architecture discussions, code reviews, mentoring, and cross-functional delivery across distributed engineering teams.",
      "I am open to international relocation and require employer-sponsored work authorization where applicable.",
      "I would welcome the opportunity to discuss how my AI, backend, full-stack, cloud, and technical leadership experience can contribute to your engineering organization.",
      "Thank you for your time and consideration.",
      "Kind regards,",
      "Ashish Kumar Singh"
    ]
  },

  metadata: {
    profileVersion: "2.1",

    optimizationMode:
      "JD-specific dynamic optimization",

    primaryGoal:
      "Maximize ATS pass, recruiter response, technical interview, and offer probability",

    truthPolicy:
      "Never invent professional experience, technologies, metrics, employers, projects, certifications, or responsibilities.",

    resumeGenerationPolicy:
      "Select and reorder verified candidate evidence based on the target JD.",

    keywordPolicy:
      "Use exact JD terminology when supported; otherwise use semantically equivalent verified terminology.",

    claimPolicy: {
      professionalExperience:
        "Only verified professional experience",

      projects:
        "Only verified project-level experience",

      skills:
        "Professional, project, or clearly defensible familiarity",

      missing:
        "Never claim"
    }
  }
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
