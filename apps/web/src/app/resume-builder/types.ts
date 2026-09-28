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

export type ResumeStrategy = 'A' | 'B' | 'C' | 'D' | 'E'; // A=Backend, B=AI Platform, C=Frontend-Heavy, D=SRE & Cloud Platform, E=Forward Deployed Engineer

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

// ─── Specialized ATS Resume Version 1: Frontend-Heavy ──────────────────
export const FRONTEND_HEAVY_RESUME_DATA: ResumeData = {
  basics: {
    name: "Ashish Kumar Singh",
    title: "Senior / Staff Frontend Engineer | Web Platform & UI Systems Lead",
    email: "ashish.singh.careers@gmail.com",
    phone: "+91 7982169443",
    location: "Noida, India (Open to Relocation: Germany, Netherlands, Ireland, UK, USA, Singapore | Visa Sponsorship Required)",
    linkedin: "https://www.linkedin.com/in/ashish-kumar-singh1986",
    github: "https://github.com/guddiya001",
    portfolio: "https://ashishkumarsingh.vercel.app",
    summary: "Staff- and Senior-level Frontend & Web Platform Engineer with 10+ years of experience architecting high-performance enterprise user interfaces, micro-frontends, design systems, and responsive web applications across Tier-1 healthcare, consumer banking, and global retail e-commerce. Proven track record leading frontend architecture across 6+ distributed engineering teams, pioneering enterprise Webpack Module Federation with React 18/19 and Next.js (App Router, Server Components), and driving dramatic performance optimizations: slashing bundle sizes by 35%, elevating Lighthouse scores from 62 to 94, and accelerating page load speeds by 40%. Deep expertise in TypeScript, state management (Redux Toolkit, Zustand, React Query), Core Web Vitals (LCP, INP, CLS), client-side caching, and WCAG 2.1 AA accessibility standards.",
    openTo: "Germany, Netherlands, Ireland, UK, USA, Singapore | Visa Sponsorship Required",
  },
  skillsFlat: [
    "Frontend Frameworks & Libraries: React.js (React 18/19, Hooks, Concurrent Mode), Next.js (App Router, Server Components, SSR, SSG, ISR), Redux Toolkit, Zustand, React Query (TanStack Query), Context API, Webpack Module Federation (Micro-frontends)",
    "Languages & Core Web: TypeScript, JavaScript (ES6+/Modern ECMAScript), HTML5 (Semantic HTML, Web Components), CSS3, Tailwind CSS, CSS Modules, SASS/SCSS, PostCSS",
    "Web Performance & Core Web Vitals: Core Web Vitals Optimization (LCP, INP, CLS, TTFB), Lighthouse Audits (62 → 94), Code Splitting, Tree Shaking, Dynamic Imports, Image/Asset Optimization, Client-Side Caching, Critical Rendering Path Tuning",
    "UI Architecture & Design Systems: Component-Driven Architecture, Design Systems (Storybook, Radix UI, Headless UI, Shadcn/ui), Responsive & Mobile-First Design, Cross-Browser Compatibility, Accessibility (a11y, WCAG 2.1 AA, ARIA roles, Keyboard Navigation)",
    "API Integration & Data Fetching: RESTful APIs, GraphQL, Server-Sent Events (SSE), WebSockets, Next.js Server Actions, Axios, Fetch API, Optimistic UI Updates, Error Boundary Resilience",
    "Testing, Tooling & Build Systems: Jest, React Testing Library, Cypress, Playwright, Storybook, Vite, Webpack, Babel, ESLint, Prettier, npm/pnpm/yarn, Git",
    "Full-Stack & Cloud Integration: Node.js, Express, RESTful APIs, GraphQL, WebSockets, AWS (S3, CloudFront), Vercel, Docker, GitHub Actions, GitLab CI/CD, Microservices",
    "Engineering Leadership: UI Component Governance, Frontend RFCs, Design-to-Code Collaboration (Figma, Design Tokens), Code Reviews, Mentoring (12+ Engineers), Agile/Scrum Delivery",
  ],
  experience: [
    {
      id: "fe-exp-1",
      role: "Senior Engineering Lead / Frontend Architecture Lead",
      company: "Persistent Systems Ltd. — UnitedHealth Group",
      location: "Noida, India",
      period: "Oct 2023 – Present",
      focus: ["Frontend", "React", "Next.js", "Micro-frontends", "Performance", "UI Architecture"],
      bullets: [
        "Spearheaded enterprise micro-frontend architecture utilizing Webpack Module Federation and React 18, decoupling monolithic clinical portals into independently deployable micro-apps adopted across 6+ distributed engineering teams.",
        "Engineered systematic web performance optimizations, shrinking JavaScript bundle sizes by 35%, elevating Google Lighthouse performance scores from 62 to 94, and improving Core Web Vitals (Largest Contentful Paint LCP improved by 1.8s), delivering a 40% uplift in page speed index.",
        "Architected interactive clinical diagnostic dashboards and real-time workflow portals using Next.js, React, TypeScript, and Tailwind CSS, enabling healthcare providers to review complex diagnostic data with zero lag and sub-second navigation.",
        "Implemented resilient client-side data fetching and state synchronization utilizing TanStack Query and Redux Toolkit, incorporating optimistic UI updates, background cache invalidation, and automated retry policies for mission-critical medical records.",
        "Established unified corporate Design System and Storybook documentation, crafting 50+ reusable, fully typed accessible components conforming strictly to WCAG 2.1 AA accessibility standards and HIPAA data privacy guidelines.",
        "Integrated frontend applications with streaming AI endpoints and REST/gRPC backend services, rendering real-time token streams, Markdown outputs, and interactive data visualizations without UI thread blocking.",
        "Instituted end-to-end frontend quality automation incorporating Jest, React Testing Library, and Cypress, maintaining 90%+ test coverage and configuring automated preview deployments via GitHub Actions.",
        "Mentored 12+ frontend and full-stack engineers on modern React patterns, TypeScript typing standards, and web performance profiling with Chrome DevTools.",
      ],
      metrics: [
        { metric: "Lighthouse Score", value: "62 → 94", verified: true },
        { metric: "Bundle Reduction", value: "35%", verified: true },
        { metric: "Page Speed Index", value: "+40%", verified: true },
        { metric: "Teams Adopted", value: "6+ squads", verified: true },
      ],
    },
    {
      id: "fe-exp-2",
      role: "Senior Software Engineer (Frontend & Financial UI)",
      company: "LTIMindtree Ltd. — DBS Bank",
      location: "Singapore Banking Domain (Remote/Onsite Support)",
      period: "Jul 2022 – Oct 2023",
      focus: ["React", "TypeScript", "Redux", "Financial UI", "Security", "a11y"],
      bullets: [
        "Developed mission-critical consumer banking web applications using React.js, TypeScript, and Redux, delivering real-time balance dashboards, transaction histories, and international transfer workflows under strict Monetary Authority of Singapore (MAS) regulatory standards.",
        "Built secure authentication and session management workflows, integrating OAuth 2.0 PKCE, biometric sign-in handshakes, and automated timeout guards to prevent unauthorized access and data leakage.",
        "Engineered complex dynamic financial data tables and interactive charts, supporting high-frequency client-side filtering, multi-column sorting, and pagination across 50,000+ transaction rows with virtualized windowing (React Virtual).",
        "Constructed reusable modular UI components with comprehensive prop validation and end-to-end type safety, accelerating new feature turnaround across banking squads by 30%.",
        "Implemented automated frontend test suites using Jest and React Testing Library, ensuring zero regression on critical payment and fund transfer user journeys with 85%+ branch coverage.",
        "Collaborated closely with UX designers, security auditors, and product managers, translating wireframes from Figma into pixel-perfect, accessible, and responsive user experiences.",
      ],
    },
    {
      id: "fe-exp-3",
      role: "Senior Software Engineer (Web & E-Commerce Applications)",
      company: "Coforge Ltd. — Walmart",
      location: "Noida, India",
      period: "Oct 2020 – Jun 2022",
      focus: ["React", "Next.js", "E-Commerce", "Web Performance", "State Management"],
      bullets: [
        "Engineered high-concurrency customer-facing retail web applications and checkout workflows using React, TypeScript, Next.js, and Node.js for Walmart's global e-commerce platform during high-traffic retail spikes (25M+ daily shoppers).",
        "Optimized client-side rendering pipelines and asset delivery, implementing aggressive image optimization (WebP/AVIF, responsive srcset), route-based code splitting, and browser cache headers, reducing cart abandonment rate by 12%.",
        "Architected shopping cart and checkout state management using Redux Toolkit, ensuring persistent offline cart recovery, multi-item inventory validation, and seamless payment gateway transitions.",
        "Integrated web observability tools (DataDog RUM, Sentry) to monitor real-time client-side JavaScript error rates, user session latency, and network waterfall bottlenecks, maintaining a 99.95% error-free user session rate.",
        "Partnered with cross-functional release teams to establish blue/green frontend canary deployments, verifying zero-downtime releases during bi-weekly production cycles.",
      ],
    },
    {
      id: "fe-exp-4",
      role: "Software Engineer (Full-Stack & Web Development)",
      company: "Previous Technology Organizations",
      location: "India",
      period: "Jan 2016 – Oct 2020",
      focus: ["Full Stack", "React", "JavaScript", "HTML5", "CSS3", "REST APIs"],
      bullets: [
        "Constructed responsive, cross-browser frontend user interfaces using React, JavaScript (ES6+), HTML5, CSS3, and Bootstrap/Tailwind CSS across healthcare, insurance, and SaaS domains.",
        "Integrated frontend applications with scalable RESTful API backends built with Node.js, Express, and TypeScript, handling user authentication, CRUD operations, and CSV/PDF data exports.",
        "Designed mobile-first responsive layouts tested across iOS Safari, Android Chrome, and modern desktop browsers, eliminating cross-browser visual discrepancies.",
        "Enforced frontend security best practices, mitigating Cross-Site Scripting (XSS), Cross-Site Request Forgery (CSRF), and securing localStorage/sessionStorage tokens.",
        "Actively participated in Agile ceremonies, sprint estimates, code reviews, and technical documentation.",
      ],
    },
  ],
  projects: [
    {
      id: "fe-proj-1",
      name: "Enterprise Micro-Frontend Architecture & Healthcare Portal",
      type: "UI Platform Architecture",
      description: "Enterprise-scale micro-frontend platform decoupling monolithic healthcare portals into independently deployable modules using React 18, Next.js, and Webpack 5 Module Federation across 6+ squads.",
      technologies: "React 18, Next.js, Webpack 5 Module Federation, TypeScript, Tailwind CSS, TanStack Query, Storybook",
      relevance: ["Micro-frontends", "React", "Next.js", "UI Architecture", "Performance"],
    },
    {
      id: "fe-proj-2",
      name: "Real-Time Financial Banking UI Portal",
      type: "FinTech Web Application",
      description: "High-security retail banking single-page application using React, TypeScript, Redux Toolkit, and WebSockets, rendering 50k+ virtualized transaction records at 60 FPS under MAS compliance.",
      technologies: "React, TypeScript, Redux Toolkit, React Virtual, Tailwind CSS, Jest, React Testing Library",
      relevance: ["React", "TypeScript", "Redux", "FinTech", "Virtualization"],
    },
    {
      id: "fe-proj-3",
      name: "Accessible Enterprise Design System & Component Library",
      type: "Design Systems",
      description: "Centralized component system with 50+ headless components conforming to WCAG 2.1 AA standards, documented in Storybook with automated visual regression tests.",
      technologies: "TypeScript, React, Tailwind CSS, Radix UI, Storybook, Vite, npm packaging",
      relevance: ["Design Systems", "Accessibility", "Storybook", "Tailwind CSS"],
    },
  ],
  education: [
    {
      id: "fe-edu-1",
      degree: "Master of Computer Applications (MCA)",
      school: "Uttar Pradesh Technical University (UPTU)",
      location: "India",
      year: "2013 – 2016",
    },
    {
      id: "fe-edu-2",
      degree: "Bachelor of Computer Applications (BCA)",
      school: "UPRTO University",
      location: "India",
      year: "2009 – 2012",
    },
  ],
  certificates: [
    "HackerRank: JavaScript (Advanced), React (Advanced), Problem Solving (Advanced), CSS (Advanced)",
    "Meta / Coursera: Advanced React & Front-End Development Specialization",
    "AWS: Cloud Practitioner / Cloud-Native Architecture Specialization",
    "W3C / Web Accessibility: Web Content Accessibility Guidelines (WCAG 2.1 AA)",
  ],
  achievements: [
    "Lighthouse Performance Uplift: Improved core portal Lighthouse score from 62 to 94, accelerating page load speed by 40%.",
    "Micro-Frontend Pioneer: Decoupled legacy monolith into Webpack Module Federation micro-frontends successfully adopted across 6+ global engineering teams.",
    "Bundle Optimization: Reduced enterprise JavaScript bundle footprint by 35%, eliminating critical initial load bottlenecks.",
    "Accessibility & Compliance: Engineered design system achieving 100% WCAG 2.1 AA accessibility compliance across enterprise healthcare and banking domains.",
  ],
  languages: ["English – Full Professional Proficiency"],
  coverLetter: {
    paragraphs: [
      "Dear Hiring Manager,",
      "I am a Senior / Staff Frontend Engineer with 9+ years of experience architecting enterprise web applications, micro-frontends, design systems, and high-performance user experiences across healthcare, banking, and global retail e-commerce.",
      "My core expertise centers on React 18/19, Next.js (App Router, Server Components), TypeScript, Webpack Module Federation, Tailwind CSS, state management (Redux Toolkit, Zustand, React Query), and deep Core Web Vitals optimization. At Persistent Systems supporting UnitedHealth Group, I decoupled monolithic portals into micro-frontends adopted across 6+ squads, reduced bundle sizes by 35%, and elevated Lighthouse scores from 62 to 94.",
      "I pride myself on bridging pixel-perfect design with rock-solid frontend engineering—enforcing WCAG 2.1 AA accessibility, end-to-end type safety, automated testing with Jest and Cypress, and seamless streaming API integrations.",
      "I would welcome the opportunity to discuss how my web platform architecture, performance tuning, and technical leadership experience can drive immediate value for your engineering team.",
      "Thank you for your consideration.",
      "Kind regards,",
      "Ashish Kumar Singh",
    ],
  },
  metadata: {
    profileVersion: "2.1",
    versionType: "frontend",
    optimizationMode: "Frontend & Web Platform Heavy ATS Alignment",
  },
};

// ─── Specialized ATS Resume Version 2: Backend-Heavy ───────────────────
export const BACKEND_HEAVY_RESUME_DATA: ResumeData = {
  basics: {
    name: "Ashish Kumar Singh",
    title: "Senior Staff Software Engineer | Distributed Systems & High-Concurrency Backend Lead",
    email: "ashish.singh.careers@gmail.com",
    phone: "+91 7982169443",
    location: "Noida, India (Open to Relocation: Germany, Netherlands, Ireland, UK, USA, Singapore | Visa Sponsorship Required)",
    linkedin: "https://www.linkedin.com/in/ashish-kumar-singh1986",
    github: "https://github.com/guddiya001",
    portfolio: "https://ashishkumarsingh.vercel.app",
    summary: "Staff- and Senior-level Backend & Distributed Systems Engineer with 9+ years of experience architecting, scaling, and operating high-throughput microservices, event-driven streaming architectures, and mission-critical cloud backends across Tier-1 healthcare, consumer banking, and global retail e-commerce. Proven track record handling 15M+ to 25M+ daily requests/events under stringent latency budgets, driving a 40% reduction in endpoint latency and 45% reduction in primary database load. Deep polyglot backend mastery in Python (Asyncio, FastAPI), Go (Golang), Java (Spring Boot), Node.js, and TypeScript, with extensive experience managing enterprise message queues (Apache Kafka, RabbitMQ), distributed caching (Redis), and relational/NoSQL datastores (PostgreSQL, MongoDB, MySQL).",
    openTo: "Germany, Netherlands, Ireland, UK, USA, Singapore | Visa Sponsorship Required",
  },
  skillsFlat: [
    "Backend & Distributed Systems: Distributed Systems Architecture, Microservices Decomposition, High-Concurrency Systems, Event-Driven Architecture, RESTful APIs, gRPC, Protocol Buffers, Asynchronous Processing, Idempotent Processing, CQRS, Service Mesh",
    "Programming & Scripting Languages: Python (Asyncio, FastAPI, Django), Go (Golang, Goroutines, Channels), Java (Spring Boot, Hibernate), Node.js, TypeScript, SQL, Bash/Shell Scripting",
    "Message Queues & Streaming: Apache Kafka (Topics, Partitions, Consumer Groups, Schema Registry), RabbitMQ (Exchanges, Queues, DLQ Policies, Clustering), Event Sourcing, Pub/Sub Messaging",
    "Databases & Data Engineering: PostgreSQL (Streaming Replication, PgBouncer, Query Plan Tuning EXPLAIN ANALYZE, Indexing, Partitioning), MongoDB (Replica Sets, Sharding Keys, Write Concerns), Redis (Clustering, Sentinel, Eviction Policies, Distributed Locks), MySQL, DynamoDB, Schema Migrations",
    "Cloud & Container Infrastructure: Amazon Web Services (AWS - EKS, ECS, Lambda, RDS, S3, SQS, SNS, Route53, IAM), Microsoft Azure, Docker, Kubernetes (Deployments, Services, Ingress, HPA), Helm, Terraform (IaC), Zero-Downtime Deployments (Blue/Green, Canary)",
    "Linux Systems & Performance Tuning: Linux Troubleshooting, TCP/IP Socket Buffers (net.core.somaxconn), iptables, Kernel Tuning, Disk I/O Optimization (iostat, vmstat, strace), Resource Limits (ulimit)",
    "Observability & Incident Management: OpenTelemetry, Prometheus, Grafana, Loki, Sentry, DataDog, APM Distributed Tracing, Alert Management, 24/7 Incident Response, Root Cause Analysis (RCA), SLIs / SLOs / Error Budgets",
    "Engineering Practices & Compliance: Test-Driven Development (PyTest, JUnit, Jest), CI/CD Automation (GitHub Actions, Jenkins), OAuth 2.0 / JWT Authentication, RBAC, HIPAA & MAS Banking Compliance, Agile/Scrum Leadership",
  ],
  experience: [
    {
      id: "be-exp-1",
      role: "Senior Engineering Lead / Backend Platform Lead",
      company: "Persistent Systems Ltd. — UnitedHealth Group",
      location: "Noida, India",
      period: "Oct 2023 – Present",
      focus: ["Backend", "Distributed Systems", "Python", "Go", "PostgreSQL", "AWS", "gRPC"],
      bullets: [
        "Architected and scaled high-throughput distributed microservices and REST/gRPC backend APIs using Python (Asyncio, FastAPI) and Go (Golang), processing 15M+ daily requests across distributed clinical healthcare services with a 40% reduction in p99 endpoint latency.",
        "Spearheaded zero-downtime infrastructure and database migration of 45+ healthcare microservices and core PostgreSQL workloads to AWS (EKS, RDS PostgreSQL) using Terraform and Helm; implemented canary cutovers and dual-write data replication, achieving 100% data integrity with zero downtime.",
        "Optimized enterprise PostgreSQL databases, configuring PgBouncer connection pooling, tuning query execution plans via EXPLAIN ANALYZE, and designing composite index strategies that reduced average database query response time by 32%.",
        "Engineered secure API gateway and service-to-service communication layers using gRPC and RESTful protocols, enforcing OAuth 2.0 / JWT authentication, role-based access control (RBAC), and strict HIPAA healthcare compliance.",
        "Diagnosed and eliminated critical Linux networking bottlenecks across multi-node Kubernetes clusters, resolving socket buffer overruns (net.core.somaxconn, tcp_max_syn_backlog) and connection tracking saturation using tcpdump and ss, cutting p99 network latency by 38%.",
        "Built end-to-end distributed observability pipelines with OpenTelemetry, Prometheus, and Grafana, capturing service latency metrics, error budgets, and database connection pool saturation in real time.",
        "Directed 24/7 on-call incident management for mission-critical backend systems; authored automated recovery runbooks and eliminated 65% of false-positive alert noise, reducing MTTR by 45%.",
        "Mentored 12+ backend software engineers across design reviews, distributed systems patterns, database transaction isolation levels, and automated testing suites with PyTest.",
      ],
      metrics: [
        { metric: "Daily Requests", value: "15M+", verified: true },
        { metric: "Latency Reduction", value: "40%", verified: true },
        { metric: "Services Migrated", value: "45+", verified: true },
        { metric: "MTTR Reduction", value: "45%", verified: true },
      ],
    },
    {
      id: "be-exp-2",
      role: "Senior Software Engineer (Core Banking Microservices & Data)",
      company: "LTIMindtree Ltd. — DBS Bank",
      location: "Singapore Banking Domain (Remote/Onsite Support)",
      period: "Jul 2022 – Oct 2023",
      focus: ["Java Spring Boot", "Python", "PostgreSQL", "RabbitMQ", "Banking", "MAS Compliance"],
      bullets: [
        "Developed resilient consumer banking microservices and transaction processing engines using Java (Spring Boot), Python, and PostgreSQL under strict Monetary Authority of Singapore (MAS) regulatory standards with zero transaction data loss.",
        "Executed high-stakes core banking migration (Citi credit-card business migration into DBS cloud infrastructure), migrating payment microservices and high-concurrency database workloads with zero regulatory non-compliance.",
        "Administered enterprise PostgreSQL and RabbitMQ production clusters, implementing automated backup/recovery pipelines, read-replica streaming, connection pooling, and dead-letter exchange (DLQ) retry policies to sustain 99.99% banking availability.",
        "Optimized high-concurrency database queries, table indexing, and partition schemes in PostgreSQL and Oracle, decreasing transaction query execution times by 30% for end-of-day financial reconciliation.",
        "Constructed asynchronous event processing modules with idempotent consumer patterns, guaranteeing exactly-once transaction processing and comprehensive audit logging.",
        "Implemented automated testing suites using JUnit, Mockito, and Testcontainers, maintaining 85%+ test coverage across mission-critical financial backend components.",
        "Partnered directly with enterprise security auditors and international infrastructure teams, conducting disaster recovery drills and penetration test remediation.",
      ],
    },
    {
      id: "be-exp-3",
      role: "Senior Software Engineer (Distributed Systems & Messaging)",
      company: "Coforge Ltd. — Walmart",
      location: "Noida, India",
      period: "Oct 2020 – Jun 2022",
      focus: ["Kafka", "RabbitMQ", "Redis", "Microservices", "High-Concurrency", "Kubernetes"],
      bullets: [
        "Engineered distributed backend microservices and event streaming pipelines utilizing Apache Kafka and RabbitMQ, reliably processing 25M+ events/day during peak holiday retail spikes with sub-millisecond cache latency via Redis.",
        "Implemented multi-tier caching architectures with Redis Cluster and tuned relational/document databases (PostgreSQL, MongoDB), reducing peak load on primary database instances by 45%.",
        "Architected idempotent order ingestion workflows with distributed locking mechanisms (Redlock), completely preventing duplicate order placement and race conditions during high-volume flash sales.",
        "Modernized monolithic retail workflows into containerized microservices on Kubernetes (Docker), establishing automated Jenkins CI/CD delivery pipelines with blue/green zero-downtime deployment capabilities.",
        "Investigated and resolved Linux filesystem and storage I/O constraints, tuning inode allocations (df -i), writeback caches (vm.dirty_ratio), and file descriptor limits (ulimit -n) to prevent worker node cascading failures under heavy load.",
        "Partnered with global Site Reliability Engineering (SRE) teams to instrument application health checks and distributed tracing, maintaining a 99.95% production service availability record.",
      ],
    },
    {
      id: "be-exp-4",
      role: "Software Engineer (Backend & API Development)",
      company: "Previous Technology Organizations",
      location: "India",
      period: "Jan 2016 – Oct 2020",
      focus: ["Python", "Node.js", "PostgreSQL", "MySQL", "APIs", "Linux"],
      bullets: [
        "Built scalable RESTful backend services and APIs using Python (Django/Flask), Node.js, MySQL, and PostgreSQL across healthcare, insurance, and SaaS domains.",
        "Designed normalized relational database schemas, complex views, stored procedures, and triggers to support high-concurrency transactional workflows and reliable data exports.",
        "Implemented security controls including OAuth 2.0 authentication, JWT token validation, rate limiting, and sanitization middleware to mitigate OWASP Top 10 vulnerabilities.",
        "Administered Linux server fleets (Ubuntu, CentOS), automating cron jobs, log rotations, database backups, and health monitoring scripts using Bash.",
        "Participated in 24/7 on-call production rotations, responding to database locks, memory exhaustion alerts, and network timeouts; authored blameless post-mortems and root-cause analyses.",
      ],
    },
  ],
  projects: [
    {
      id: "be-proj-1",
      name: "High-Throughput Event Streaming & Distributed Caching Platform",
      type: "Distributed Systems Architecture",
      description: "Distributed streaming pipeline processing 25M+ events/day with Apache Kafka, RabbitMQ, and Redis Cluster on AWS EKS with zero message loss and sub-millisecond caching.",
      technologies: "Apache Kafka, RabbitMQ, Redis, Python, Go, Docker, Kubernetes, AWS",
      relevance: ["Kafka", "RabbitMQ", "Redis", "Distributed Systems", "High Concurrency"],
    },
    {
      id: "be-proj-2",
      name: "Zero-Downtime Cloud Microservices Migration",
      type: "Cloud Architecture & DB",
      description: "Migration of 45+ enterprise microservices and PostgreSQL databases to AWS EKS and RDS with Terraform, Helm, and PgBouncer connection pooling.",
      technologies: "PostgreSQL, PgBouncer, AWS EKS, AWS RDS, Terraform, Helm, Docker, Go, Python",
      relevance: ["PostgreSQL", "AWS", "Terraform", "Kubernetes", "Microservices"],
    },
    {
      id: "be-proj-3",
      name: "Scalable Multi-Tenant Microservices Architecture",
      type: "System Design",
      description: "Cloud-native multi-tenant backend architecture leveraging Go, Python (FastAPI), and Java (Spring Boot) with gRPC Protocol Buffers inter-service communication.",
      technologies: "Go, Python, Java Spring Boot, gRPC, Protocol Buffers, PostgreSQL, Docker, Kubernetes",
      relevance: ["gRPC", "Go", "Python", "Java Spring Boot", "Multi-tenant"],
    },
  ],
  education: [
    {
      id: "be-edu-1",
      degree: "Master of Computer Applications (MCA)",
      school: "Uttar Pradesh Technical University (UPTU)",
      location: "India",
      year: "2013 – 2016",
    },
    {
      id: "be-edu-2",
      degree: "Bachelor of Computer Applications (BCA)",
      school: "UPRTO University",
      location: "India",
      year: "2009 – 2012",
    },
  ],
  certificates: [
    "AWS: Cloud Practitioner / Cloud-Native Architecture Specialization",
    "HackerRank: Python (Advanced), SQL (Advanced), Problem Solving (Advanced), JavaScript (Advanced)",
    "DeepLearning.AI: Generative AI with Large Language Models",
    "Anthropic / Community: Model Context Protocol (MCP) Architecture & Agentic Systems",
  ],
  achievements: [
    "High-Throughput Scale: Scaled distributed backend platforms handling 15M+ to 25M+ daily transactions with sub-45ms latency and 99.95%+ availability.",
    "Latency & Database Optimization: Achieved a 40% reduction in endpoint latency and lowered peak primary database load by 45% via multi-tier caching and query plan tuning.",
    "Zero-Downtime Cloud Migration: Successfully orchestrated cloud migration of 45+ microservices and PostgreSQL databases with 100% data integrity and zero downtime.",
    "Regulatory Excellence: Architected consumer banking systems handling high-volume payments under strict MAS Singapore regulatory standards with zero transaction loss.",
  ],
  languages: ["English – Full Professional Proficiency"],
  coverLetter: {
    paragraphs: [
      "Dear Hiring Manager,",
      "I am a Senior Staff Software Engineer with 9+ years of experience designing, scaling, and operating high-throughput distributed backends, microservices architectures, and cloud-native systems across healthcare, banking, and retail e-commerce.",
      "My technical background centers on Python (Asyncio, FastAPI), Go (Golang), Java (Spring Boot), Node.js, and TypeScript, combined with hands-on architecture across Apache Kafka, RabbitMQ, Redis caching, PostgreSQL (PgBouncer, query plan tuning), and container orchestration on AWS EKS and Kubernetes.",
      "Throughout my career, I have handled 15M+ to 25M+ daily event streams, lowered p99 endpoint latency by 40%, cut primary database load by 45%, and orchestrated zero-downtime cloud migrations under strict regulatory compliance (HIPAA, MAS).",
      "I look forward to discussing how my distributed systems engineering, database optimization, and backend leadership can help your organization scale its mission-critical platforms.",
      "Thank you for your time and consideration.",
      "Kind regards,",
      "Ashish Kumar Singh",
    ],
  },
  metadata: {
    profileVersion: "2.1",
    versionType: "backend",
    optimizationMode: "Backend & Distributed Systems Heavy ATS Alignment",
  },
};

// ─── Specialized ATS Resume Version 3: AI Version ──────────────────────
export const AI_VERSION_RESUME_DATA: ResumeData = {
  basics: {
    name: "Ashish Kumar Singh",
    title: "Senior AI Engineer | Generative AI & Agentic Systems Lead",
    email: "ashish.singh.careers@gmail.com",
    phone: "+91 7982169443",
    location: "Noida, India (Open to Relocation: Germany, Netherlands, Ireland, UK, USA, Singapore | Visa Sponsorship Required)",
    linkedin: "https://www.linkedin.com/in/ashish-kumar-singh1986",
    github: "https://github.com/guddiya001",
    portfolio: "https://ashishkumarsingh.vercel.app",
    summary: "Staff- and Senior-level AI & Software Engineer with 9+ years of experience architecting high-throughput distributed backends and production-grade Generative AI, agentic systems, and enterprise LLM platforms across Tier-1 healthcare, consumer banking, and global retail e-commerce. Proven track record taking AI solutions from initial exploration to high-throughput production (15M+ requests/month), designing advanced RAG pipelines, vector search (pgvector, Chroma, Qdrant), dense semantic embeddings, and structuring cyclical multi-agent workflows using Python (FastAPI), LangGraph, LangChain, and Model Context Protocol (MCP). Expert in enforcing prompt design, structured output validation (Pydantic, JSON Schema), and quantitative LLM evaluation (Ragas, DeepEval) alongside classical ML baselines (PyTorch, scikit-learn, NLP) to eliminate hallucinations (<1.5% rate) and slash clinician research time by 40%.",
    openTo: "Germany, Netherlands, Ireland, UK, USA, Singapore | Visa Sponsorship Required",
  },
  skillsFlat: [
    "Generative AI & Agentic Architectures: Generative AI, Large Language Models (LLM), Agentic Systems, AI Agents, LangGraph (Multi-Agent StateGraphs, Conditional Routing, State Persistence), LangChain (LCEL), Model Context Protocol (MCP), Autonomous Tool Calling, Human-in-the-Loop, Semantic Caching",
    "RAG, Embeddings & Vector Search: Advanced RAG (Hierarchical Semantic Chunking, Hybrid Search BM25 + Dense Vectors, Reciprocal Rank Fusion RRF, Cohere Re-ranking), Vector Search, Dense Embeddings (text-embedding-3, Cohere), Vector Databases (pgvector, Chroma, Qdrant, Pinecone), Metadata Filtering",
    "Prompt Design & Structured Outputs: Prompt Engineering, Defensive Prompting (Few-Shot Reasoning, Chain-of-Thought, System Instructions), Structured Output Enforcement (Pydantic Models, Instructor, JSON Schema, Function Calling), Hallucination Mitigation",
    "LLM Evaluation & MLOps/LLMOps: LLM Evaluation (Ragas Framework, DeepEval, TruLens - Faithfulness, Answer Relevancy, Context Recall), MLOps / LLMOps, LangSmith Distributed Tracing, Model Registry, Token Cost & Latency Optimization, Production AI Deployment, AI Solution from Exploration to Production",
    "Machine Learning Frameworks & Classical ML/NLP: PyTorch, TensorFlow, scikit-learn, Classical ML (RandomForest, XGBoost, Logistic Regression), Natural Language Processing (NLP), spaCy, NLTK, Named Entity Recognition (NER), Semantic Classification, Fine-Tuning (LoRA, PEFT)",
    "Cloud AI Services & Container Orchestration: Microsoft Azure (Azure OpenAI Service, Azure AI Search, AKS, Azure Blob Storage), Amazon Web Services (AWS - Bedrock, EKS, EC2, S3), Docker, Kubernetes, Helm",
    "Programming & Scripting Languages: Python (Asyncio, FastAPI, PyTest), TypeScript, Node.js, Go (Golang), Java (Spring Boot), SQL, Bash",
    "Databases & Event Ingestion: PostgreSQL (pgvector, Streaming Replication), MongoDB, Redis (Semantic Caching), RabbitMQ, Apache Kafka",
    "Observability & Reliability: OpenTelemetry, LangSmith, Prometheus, Grafana, Loki, Sentry, Alert Management, SLIs / SLOs / Error Budgets, HIPAA & Healthcare Privacy Compliance",
    "Engineering Leadership: AI System Design Reviews, Prompt Versioning with Git, Mentoring (12+ Engineers), Cross-Functional Stakeholder Communication (Medical Directors, Product Teams)",
  ],
  experience: [
    {
      id: "ai-exp-1",
      role: "Senior AI Engineer / Engineering Lead",
      company: "Persistent Systems Ltd. — UnitedHealth Group",
      location: "Noida, India",
      period: "Oct 2023 – Present",
      focus: ["Generative AI", "LangGraph", "MCP", "RAG", "Vector Search", "LLM Evaluation", "FastAPI"],
      bullets: [
        "Architected and scaled production Generative AI context retrieval and autonomous agentic workflows using Python, FastAPI, LangGraph, and Model Context Protocol (MCP), automating clinical diagnostic pipelines and cutting clinician research time by 40%.",
        "Engineered advanced RAG pipelines incorporating hierarchical semantic chunking, vector search with dense embeddings (pgvector, Chroma, Qdrant), and hybrid search (BM25 + cosine similarity) with Cohere reranking, reducing retrieval hallucination rates below 1.5% with sub-45ms p99 query latency.",
        "Implemented defensive prompt design and structured output enforcement using Pydantic, Instructor, and dynamic JSON Schema validation with tool calling, eliminating 100% of schema drift and downstream integration parsing errors across microservice APIs.",
        "Institutionalized rigorous LLM evaluation frameworks using Ragas and DeepEval to continuously benchmark faithfulness, context recall, and answer relevancy; instrumented LangSmith and OpenTelemetry for end-to-end distributed tracing, token cost monitoring, and latency optimization.",
        "Led AI solutions from initial discovery and exploration to resilient high-throughput production (handling 15M+ requests/month), containerizing microservices on Docker, Kubernetes (EKS/AKS), and integrating Azure OpenAI Service with zero-trust RBAC guardrails.",
        "Developed classical ML and NLP baseline classifiers using scikit-learn and PyTorch for named entity recognition (NER) and clinical intent classification, optimizing compute cost by routing deterministic queries away from expensive LLM calls.",
        "Spearheaded zero-downtime infrastructure migration of 45+ distributed healthcare microservices and core databases from legacy virtualized infrastructure to AWS (EKS, RDS PostgreSQL, S3) using Terraform and Helm, sustaining 100% data integrity with zero downtime.",
        "Collaborated directly with cross-functional business stakeholders, medical directors, and product managers to translate complex clinical workflows into quantitative AI acceptance criteria, delivering 3.4x operational ROI.",
        "Mentored 12+ software and AI engineers on agentic architecture design, prompt versioning with GitHub Actions CI, and test-driven evaluation suites.",
      ],
      metrics: [
        { metric: "Monthly AI Requests", value: "15M+", verified: true },
        { metric: "Hallucination Rate", value: "<1.5%", verified: true },
        { metric: "Clinician Time Saved", value: "40%", verified: true },
        { metric: "Operational ROI", value: "3.4x", verified: true },
      ],
    },
    {
      id: "ai-exp-2",
      role: "Senior Software Engineer / AI Data Systems & Reliability",
      company: "LTIMindtree Ltd. — DBS Bank",
      location: "Singapore Banking Domain (Remote/Onsite Support)",
      period: "Jul 2022 – Oct 2023",
      focus: ["Classical ML", "NLP", "Python", "Java", "PostgreSQL", "Banking"],
      bullets: [
        "Engineered classical ML and NLP data processing pipelines for financial transaction categorization and fraud anomaly detection using scikit-learn and Python, improving categorization accuracy by 28%.",
        "Developed resilient consumer banking microservices and data processing engines using Java (Spring Boot), Go, Python, and PostgreSQL under strict Monetary Authority of Singapore (MAS) regulatory standards with zero transaction data loss.",
        "Architected secure RESTful and gRPC APIs integrating relational and vector-ready databases (PostgreSQL, Redis), ensuring zero data loss and automated audit trail logging.",
        "Administered enterprise PostgreSQL and RabbitMQ production clusters, implementing automated backup/recovery pipelines, read-replica replication, connection pooling via PgBouncer, and dead-letter exchange (DLQ) policies to sustain 99.99% banking availability.",
        "Automated operational maintenance workflows and alerting using Bash scripting and Python for database health probes and automated failover drills, saving 15+ hours of manual toil per week.",
      ],
    },
    {
      id: "ai-exp-3",
      role: "Senior Software Engineer (ML Data Pipelines & Backend)",
      company: "Coforge Ltd. — Walmart",
      location: "Noida, India",
      period: "Oct 2020 – Jun 2022",
      focus: ["ML Data", "Python", "scikit-learn", "Kafka", "Redis", "Distributed Systems"],
      bullets: [
        "Constructed machine learning data ingestion pipelines and customer recommendation services using Python, scikit-learn, and Node.js for high-concurrency retail e-commerce operations.",
        "Engineered distributed retail backend services and event streaming pipelines utilizing Apache Kafka and RabbitMQ, handling 25M+ events/day during peak holiday spikes with sub-millisecond cache latency via Redis.",
        "Managed and optimized SQL/NoSQL databases (PostgreSQL, MongoDB), tuning replica sets, sharding keys, and indexes, reducing peak primary database load by 45%.",
        "Partnered with global Site Reliability Engineering (SRE) teams to instrument application health checks, Prometheus metrics exporters, and distributed tracing, maintaining a 99.95% production service availability record.",
      ],
    },
    {
      id: "ai-exp-4",
      role: "Software Engineer (Text Processing & Full-Stack)",
      company: "Previous Technology Organizations",
      location: "India",
      period: "Jan 2016 – Oct 2020",
      focus: ["NLP", "Text Processing", "Python", "APIs", "Linux"],
      bullets: [
        "Implemented classical text processing and NLP tokenization routines using regular expressions and Python libraries to extract structured metadata from raw text feeds.",
        "Built scalable RESTful backend services and APIs using Python (Django/Flask), Node.js, TypeScript, MySQL, and PostgreSQL across healthcare, insurance, and SaaS domains.",
        "Administered Linux server infrastructure (Ubuntu, CentOS), managing filesystem partitions, cron scheduling, and automated log rotations to prevent disk saturation outages.",
        "Implemented security controls including OAuth 2.0 authentication, JWT token validation, role-based access control (RBAC), and sanitization middleware to mitigate OWASP Top 10 vulnerabilities.",
      ],
    },
  ],
  projects: [
    {
      id: "ai-proj-1",
      name: "Enterprise Autonomous AI Agent & MCP Platform",
      type: "Agentic AI / LLMs",
      description: "Production-grade agentic workflow platform using Python, FastAPI, LangGraph, and Model Context Protocol (MCP) for autonomous clinical tool execution and context retrieval across 5M+ records.",
      technologies: "Python, FastAPI, LangGraph, LangChain, Model Context Protocol (MCP), pgvector, Chroma, Pydantic, Azure OpenAI, Ragas, Docker",
      relevance: ["AI Agents", "LangGraph", "MCP", "RAG", "Vector Databases", "LLM Evaluation"],
    },
    {
      id: "ai-proj-2",
      name: "High-Throughput Distributed RAG Ingestion Pipeline",
      type: "RAG & Vector Search",
      description: "Event-driven RAG data pipeline on Azure and AWS utilizing RabbitMQ, Apache Kafka, and Redis for asynchronous semantic indexing and hierarchical chunking.",
      technologies: "Python, PyTorch, scikit-learn, Apache Kafka, Redis, PostgreSQL, Azure Blob Storage, Docker, Kubernetes",
      relevance: ["RAG", "Kafka", "Embeddings", "Vector Search", "Cohere"],
    },
    {
      id: "ai-proj-3",
      name: "Clinical Intent Classification & LLM Routing Engine",
      type: "Classical ML / Cost Optimization",
      description: "Hybrid query router using scikit-learn, PyTorch, and FastAPI routing deterministic medical queries to classical ML classifiers, reducing LLM token spend by 35%.",
      technologies: "Python, PyTorch, scikit-learn, FastAPI, spaCy, NLTK, Docker",
      relevance: ["Classical ML", "PyTorch", "Cost Optimization", "NLP"],
    },
  ],
  education: [
    {
      id: "ai-edu-1",
      degree: "Master of Computer Applications (MCA)",
      school: "Uttar Pradesh Technical University (UPTU)",
      location: "India",
      year: "2013 – 2016",
    },
    {
      id: "ai-edu-2",
      degree: "Bachelor of Computer Applications (BCA)",
      school: "UPRTO University",
      location: "India",
      year: "2009 – 2012",
    },
  ],
  certificates: [
    "DeepLearning.AI: Generative AI with Large Language Models",
    "DeepLearning.AI: LangChain for LLM Application Development",
    "Anthropic / Community: Model Context Protocol (MCP) Architecture & Agentic Systems",
    "AWS: Cloud Practitioner / Cloud-Native Architecture Specialization",
    "HackerRank: Python (Advanced), Problem Solving (Advanced), SQL (Advanced), JavaScript (Advanced)",
  ],
  achievements: [
    "Enterprise AI Scale: Scaled production GenAI platforms handling 15M+ monthly requests with 99.95%+ availability.",
    "Hallucination Mitigation: Reduced retrieval hallucination rates below 1.5% and lowered endpoint latency by 40% via hybrid search and semantic caching.",
    "Clinician Time Saved: Slashed clinician diagnostic research time by 40% through autonomous LangGraph agentic workflows.",
    "Quantified Business ROI: Delivered 3.4x operational ROI by translating complex healthcare workflows into automated production AI solutions.",
  ],
  languages: ["English – Full Professional Proficiency"],
  coverLetter: {
    paragraphs: [
      "Dear Hiring Manager,",
      "I am a Senior AI & Systems Software Engineer with 9+ years of experience architecting high-throughput distributed backends and production-grade Generative AI, agentic workflows, and LLM platforms.",
      "My recent production work focuses on autonomous agentic workflows using Python (FastAPI), LangGraph, LangChain, and the Model Context Protocol (MCP), combined with advanced RAG pipelines (hierarchical chunking, pgvector, Chroma, Qdrant, hybrid BM25 + dense vectors, Cohere reranking). I enforce defensive prompt engineering, Pydantic structured output validation, and quantitative LLM evaluation with Ragas and DeepEval.",
      "At Persistent Systems supporting UnitedHealth Group, I architected AI diagnostic pipelines handling 15M+ requests/month, achieving a 40% clinician time reduction, sub-45ms latency, <1.5% hallucination rate, and 3.4x operational ROI.",
      "I would welcome the opportunity to discuss how my hands-on AI platform engineering, evaluation frameworks, and distributed systems background can accelerate your GenAI initiatives.",
      "Thank you for your consideration.",
      "Kind regards,",
      "Ashish Kumar Singh",
    ],
  },
  metadata: {
    profileVersion: "2.1",
    versionType: "ai",
    optimizationMode: "AI & Generative AI / Agentic Systems Heavy ATS Alignment",
  },
};

// ─── Specialized ATS Resume Version 4: FDE (Forward Deployed Engineer) ──
export const FDE_VERSION_RESUME_DATA: ResumeData = {
  basics: {
    name: "Ashish Kumar Singh",
    title: "Staff Forward Deployed Engineer | Enterprise Solutions & Client Deployment Lead",
    email: "ashish.singh.careers@gmail.com",
    phone: "+91 7982169443",
    location: "Noida, India (Open to Relocation: Germany, Netherlands, Ireland, UK, USA, Singapore | Visa Sponsorship Required)",
    linkedin: "https://www.linkedin.com/in/ashish-kumar-singh1986",
    github: "https://github.com/guddiya001",
    portfolio: "https://ashishkumarsingh.vercel.app",
    summary: "Staff-level Forward Deployed Engineer (FDE) and Technical Solutions Lead with 9+ years of experience bridging enterprise client problem spaces and high-velocity engineering execution across Fortune 50 healthcare (UnitedHealth Group), Tier-1 consumer banking (DBS Bank Singapore), and global retail e-commerce (Walmart). Proven track record deploying complex AI platforms, distributed systems, and cloud architectures directly into customer environments—driving 0-to-1 solutions from initial discovery through resilient enterprise production. Trusted technical advisor to C-level executives, medical directors, and security compliance boards, translating high-stakes business requirements into robust software while guaranteeing 99.95%+ availability, strict regulatory compliance (HIPAA, MAS), zero transaction data loss, and quantifiable ROI (3.4x operational ROI, 40% clinician workflow acceleration).",
    openTo: "Germany, Netherlands, Ireland, UK, USA, Singapore | Visa Sponsorship Required",
  },
  skillsFlat: [
    "Forward Deployed & Solutions Engineering: Forward Deployed Engineering, Customer-Facing Technical Architecture, Enterprise Software Deployment, 0-to-1 Rapid Prototyping, Production Rollouts, Customer Onboarding & Integration, Solutions Scoping, Proof-of-Concept (PoC) to Production, Technical Requirements Gathering",
    "Enterprise System Architecture & APIs: Microservices Architecture, RESTful APIs, gRPC, Distributed Systems, Event-Driven Architecture, Custom API Gateways, Secure Enterprise Integrations, Backward Compatibility, Schema Migration Strategies",
    "Production AI & Data Platforms: Enterprise Generative AI, Model Context Protocol (MCP) Client/Server Architectures, Autonomous AI Agents (LangGraph), Advanced RAG, Vector Search (pgvector, Chroma), Semantic Caching, LLM Evaluation (Ragas), Hallucination Guardrails",
    "Full-Stack & UI Systems: Python (FastAPI, Asyncio), Go (Golang), Java (Spring Boot), Node.js, TypeScript, React.js, Next.js, Webpack Module Federation, Tailwind CSS, Responsive Enterprise Dashboards",
    "Enterprise Cloud, Security & Compliance: Amazon Web Services (AWS - EKS, RDS, S3, IAM, CloudWatch), Microsoft Azure (Azure OpenAI, AKS), Docker, Kubernetes, Helm, Terraform (IaC), Zero-Trust Architecture, Role-Based Access Control (RBAC), HIPAA & MAS Banking Regulatory Compliance, Data Governance",
    "High-Stakes Migrations & Mission-Critical Reliability: Legacy-to-Cloud Migrations, Zero-Downtime Cutover, Dual-Write Data Synchronization, 24/7 Incident Escalation, Disaster Recovery (DR) Drills, Enterprise SLAs / SLOs / Error Budgets, Root Cause Analysis (RCA)",
    "Stakeholder Leadership & Communication: Executive-Level Technical Presentations, Business Stakeholder Alignment, Client Workshop Facilitation, Scope of Work (SOW) Delivery, Mentoring (12+ Engineers), Cross-Functional Leadership (Engineering, Compliance, Product)",
  ],
  experience: [
    {
      id: "fde-exp-1",
      role: "Staff Forward Deployed Engineer / Technical Lead",
      company: "Persistent Systems Ltd. — UnitedHealth Group",
      location: "Noida, India",
      period: "Oct 2023 – Present",
      focus: ["FDE", "Enterprise Client Deployment", "MCP", "AI Platform", "Zero-Downtime Migration", "ROI"],
      bullets: [
        "Deployed enterprise-grade Generative AI and Model Context Protocol (MCP) agentic platforms directly into client clinical environments, partnering with medical directors, IT security teams, and clinical operations to translate fragmented clinical data workflows into automated production software.",
        "Drove 3.4x operational ROI for the healthcare client, architecting autonomous retrieval workflows with Python, FastAPI, and LangGraph that cut clinician diagnostic research and chart review time by 40%.",
        "Spearheaded high-stakes zero-downtime client infrastructure migration of 45+ distributed healthcare microservices and core databases from on-premises virtualized infrastructure to AWS (EKS, RDS PostgreSQL, S3) using Terraform and Helm; implemented canary cutovers and dual-write replication, achieving 100% data integrity with zero client downtime.",
        "Implemented zero-trust security and RBAC guardrails conforming to strict HIPAA compliance and enterprise audit regulations, preventing data exfiltration and ensuring customer patient data remained strictly isolated during LLM tool invocations.",
        "Engineered an enterprise micro-frontend clinical portal utilizing Webpack Module Federation and React 18, allowing 6+ distributed squads to independently build and release clinical modules into the customer's core portal without coordination bottlenecks.",
        "Diagnosed and resolved critical client infrastructure bottlenecks in Kubernetes networking and Linux storage I/O under live clinical traffic, reducing p99 response latency by 38% and eliminating AWS EBS storage throttling.",
        "Established comprehensive enterprise observability pipelines using Prometheus, Grafana, Loki, Sentry, and LangSmith, providing client leadership with real-time dashboards on system uptime, error budgets, and AI token expenditures.",
        "Mentored 12+ client and vendor engineers, conducting hands-on architectural design workshops, establishing production-grade code review governance, and creating repeatable deployment runbooks.",
      ],
      metrics: [
        { metric: "Client ROI", value: "3.4x", verified: true },
        { metric: "Workflow Acceleration", value: "40%", verified: true },
        { metric: "Migration Downtime", value: "0 hours", verified: true },
        { metric: "Compliance", value: "100% HIPAA", verified: true },
      ],
    },
    {
      id: "fde-exp-2",
      role: "Senior Solutions Engineer / Technical Deployment Lead",
      company: "LTIMindtree Ltd. — DBS Bank",
      location: "Singapore Banking Domain (Remote/Onsite Support)",
      period: "Jul 2022 – Oct 2023",
      focus: ["Solutions Engineering", "Banking Migration", "MAS Compliance", "Client Leadership", "APIs"],
      bullets: [
        "Served as lead technical deployment engineer for the high-stakes migration of Citi consumer credit-card business into DBS Bank's core cloud infrastructure, collaborating directly with enterprise banking leadership, compliance auditors, and international engineering squads across Singapore and India.",
        "Delivered 100% compliance with strict Monetary Authority of Singapore (MAS) regulatory standards, executing complex payment microservice and database migrations with zero transaction data loss.",
        "Architected and deployed secure RESTful and gRPC API gateways integrating enterprise PostgreSQL, Redis, and RabbitMQ production clusters, sustaining 99.99% banking availability during high-concurrency peak transaction windows.",
        "Rapidly developed customer-facing banking web portals using React.js and TypeScript, integrating multi-factor banking authentication workflows and real-time financial balances under aggressive deployment timelines.",
        "Automated operational health checks and disaster recovery failover drills using Bash and Python, reducing manual client operational toil by 15+ hours per week.",
        "Facilitated cross-functional alignment sessions between enterprise security auditors, product managers, and infrastructure architects, translating complex technical architectures into transparent executive progress reports.",
      ],
    },
    {
      id: "fde-exp-3",
      role: "Senior Software Engineer (Enterprise Client Systems & Reliability)",
      company: "Coforge Ltd. — Walmart",
      location: "Noida, India",
      period: "Oct 2020 – Jun 2022",
      focus: ["Client Deployment", "Retail Systems", "Kafka", "Redis", "Incident Response"],
      bullets: [
        "Partnered directly with enterprise retail stakeholders and global SRE teams to deploy high-throughput event streaming pipelines utilizing Apache Kafka and RabbitMQ, handling 25M+ events/day during peak holiday retail spikes with sub-millisecond cache latency via Redis.",
        "Modernized legacy monolithic order workflows into containerized microservices on Kubernetes, establishing automated Jenkins CI/CD delivery pipelines with blue/green zero-downtime deployment capabilities.",
        "Tuned relational and document databases (PostgreSQL, MongoDB) under live peak retail loads, reducing primary database load by 45% and ensuring continuous inventory synchronization across multi-channel retail operations.",
        "Served in primary escalation rotation for production incidents, conducting rapid root cause analysis (RCA) and authoring blameless post-mortems that maintained a 99.95% production service availability record.",
      ],
    },
    {
      id: "fde-exp-4",
      role: "Software Engineer (Client Solutions & Full-Stack)",
      company: "Previous Technology Organizations",
      location: "India",
      period: "Jan 2016 – Oct 2020",
      focus: ["Client Solutions", "Full Stack", "Requirements Gathering", "APIs", "Security"],
      bullets: [
        "Engineered full-stack web applications and custom RESTful API integrations for enterprise clients across healthcare, insurance, and SaaS domains using Python (Django/Flask), Node.js, React, MySQL, and PostgreSQL.",
        "Engaged directly with client business stakeholders to gather technical requirements, define API contracts, and draft technical specifications and architecture diagrams.",
        "Administered client Linux server deployments (Ubuntu, CentOS), automating system backups, database replication, and monitoring scripts to guarantee high application availability.",
        "Implemented rigorous enterprise security controls, including OAuth 2.0 authentication, JWT token validation, role-based access control (RBAC), and input sanitization to eliminate OWASP vulnerabilities.",
      ],
    },
  ],
  projects: [
    {
      id: "fde-proj-1",
      name: "Enterprise Client Deployment & MCP Integration Platform (UnitedHealth Group)",
      type: "Forward Deployed AI Engineering",
      description: "Deployed production-grade agentic workflow platform directly into the customer's enterprise infrastructure using Python, FastAPI, LangGraph, and MCP, cutting clinician research time by 40% with 3.4x ROI.",
      technologies: "Python, FastAPI, LangGraph, Model Context Protocol (MCP), AWS, Docker, Kubernetes, PostgreSQL, HIPAA Compliance",
      relevance: ["FDE", "MCP", "AI Deployment", "Client ROI", "Healthcare"],
    },
    {
      id: "fde-proj-2",
      name: "High-Stakes Consumer Banking Migration Engine (DBS Bank Singapore)",
      type: "Enterprise Migration & Solutions",
      description: "Migration architecture for onboarding Citi consumer credit-card workloads into DBS Bank core platform under MAS banking regulations with zero transaction loss and 99.99% availability.",
      technologies: "Java Spring Boot, Go, PostgreSQL, RabbitMQ, Redis, Kubernetes, MAS Compliance",
      relevance: ["Banking Migration", "MAS Compliance", "Solutions Engineering", "Zero Downtime"],
    },
    {
      id: "fde-proj-3",
      name: "Real-Time Partner Ingestion & Order Synchronization Gateway (Walmart)",
      type: "Enterprise Integration",
      description: "High-throughput event streaming gateway on Apache Kafka, RabbitMQ, and Redis handling 25M+ events/day during peak retail spikes with automated client reconciliation.",
      technologies: "Apache Kafka, RabbitMQ, Redis, Node.js, TypeScript, Kubernetes, Docker",
      relevance: ["Partner Ingestion", "Kafka", "Redis", "Enterprise Retail"],
    },
  ],
  education: [
    {
      id: "fde-edu-1",
      degree: "Master of Computer Applications (MCA)",
      school: "Uttar Pradesh Technical University (UPTU)",
      location: "India",
      year: "2013 – 2016",
    },
    {
      id: "fde-edu-2",
      degree: "Bachelor of Computer Applications (BCA)",
      school: "UPRTO University",
      location: "India",
      year: "2009 – 2012",
    },
  ],
  certificates: [
    "Anthropic / Community: Model Context Protocol (MCP) Architecture & Agentic Systems",
    "AWS: Cloud Practitioner / Cloud-Native Architecture Specialization",
    "DeepLearning.AI: Generative AI with Large Language Models",
    "DeepLearning.AI: LangChain for LLM Application Development",
    "HackerRank: Problem Solving (Advanced), Python (Advanced), SQL (Advanced), JavaScript (Advanced)",
  ],
  achievements: [
    "Enterprise Client ROI: Delivered 3.4x operational ROI and slashed diagnostic research time by 40% by deploying production Generative AI in enterprise healthcare.",
    "Zero-Data-Loss Migration: Successfully led consumer banking migration for Tier-1 bank under strict MAS Singapore regulatory standards with zero transaction data loss.",
    "High-Velocity Deployment: Accelerated client feature delivery by 30% by instituting modular micro-frontends across 6+ distributed teams.",
    "Mission-Critical Availability: Maintained 99.95%+ production availability for enterprise client workloads handling up to 25M+ daily transactions.",
  ],
  languages: ["English – Full Professional Proficiency"],
  coverLetter: {
    paragraphs: [
      "Dear Hiring Manager,",
      "I am a Staff Forward Deployed Engineer (FDE) and Technical Solutions Lead with 9+ years of experience deploying mission-critical AI systems, distributed backends, and cloud platforms directly into Fortune 50 enterprise client environments.",
      "My track record spans Tier-1 healthcare (UnitedHealth Group), consumer banking (DBS Bank Singapore), and global retail (Walmart). I specialize in rapidly translating ambiguous, high-stakes customer problem spaces into 0-to-1 production architectures—driving quantifiable business results such as 3.4x operational ROI, 40% workflow acceleration, and zero transaction data loss during high-stakes core banking migrations.",
      "With hands-on mastery in Python (FastAPI), Go, Java, TypeScript, React, Docker, Kubernetes, AWS/Azure, and the Model Context Protocol (MCP), I partner effectively with both C-suite business stakeholders and frontline engineering squads to scope, build, deploy, and operationalize high-impact solutions.",
      "I would welcome the opportunity to discuss how my customer-centric engineering leadership and rapid deployment experience can drive strategic success for your enterprise clients.",
      "Thank you for your time and consideration.",
      "Kind regards,",
      "Ashish Kumar Singh",
    ],
  },
  metadata: {
    profileVersion: "2.1",
    versionType: "fde",
    optimizationMode: "Forward Deployed Engineer (FDE) / Enterprise Solutions ATS Alignment",
  },
};

// ─── Preset Catalog ─────────────────────────────────────────────────────
export type ResumePresetId = 'master' | 'frontend' | 'backend' | 'ai' | 'fde';

export interface ResumePresetMeta {
  id: ResumePresetId;
  label: string;
  badge: string;
  icon: string;
  roleTitle: string;
  tagline: string;
  color: string;
  targetRoles: string[];
  data: ResumeData;
}

export const RESUME_PRESETS: ResumePresetMeta[] = [
  {
    id: 'master',
    label: 'Master Resume',
    badge: 'Comprehensive',
    icon: 'FileText',
    roleTitle: 'Senior Software Engineer | Senior Backend Engineer | AI / GenAI Engineer',
    tagline: 'Complete 9+ years career profile spanning AI, Backend, Full-Stack, and Cloud',
    color: 'from-gray-700 to-gray-900',
    targetRoles: [
      'Staff Software Engineer',
      'Senior Engineering Lead',
      'Technical Architect',
    ],
    data: SAMPLE_RESUME_DATA,
  },
  {
    id: 'frontend',
    label: 'Frontend Heavy',
    badge: 'UI Systems',
    icon: 'Layout',
    roleTitle: 'Senior / Staff Frontend Engineer | Web Platform & UI Systems Lead',
    tagline: 'React 18/19, Next.js, Micro-Frontends, Core Web Vitals (62→94), Design Systems',
    color: 'from-amber-500 to-orange-600',
    targetRoles: [
      'Senior Frontend Engineer',
      'Staff Frontend Engineer',
      'Web Platform Lead',
      'UI/UX Systems Architect',
    ],
    data: FRONTEND_HEAVY_RESUME_DATA,
  },
  {
    id: 'backend',
    label: 'Backend Heavy',
    badge: 'Distributed Systems',
    icon: 'Server',
    roleTitle: 'Senior Staff Software Engineer | Distributed Systems & High-Concurrency Backend Lead',
    tagline: 'Python, Go, Java, Kafka, RabbitMQ, Redis, PostgreSQL (PgBouncer), 25M+ events/day',
    color: 'from-blue-600 to-indigo-700',
    targetRoles: [
      'Senior Backend Engineer',
      'Staff Backend Engineer',
      'Distributed Systems Lead',
      'Backend Platform Engineer',
    ],
    data: BACKEND_HEAVY_RESUME_DATA,
  },
  {
    id: 'ai',
    label: 'AI Version',
    badge: 'Generative AI',
    icon: 'Sparkles',
    roleTitle: 'Senior AI Engineer | Generative AI & Agentic Systems Lead',
    tagline: 'LangGraph, MCP, RAG, pgvector, Pydantic, Ragas, Azure OpenAI, 15M+ requests/mo',
    color: 'from-purple-600 to-pink-600',
    targetRoles: [
      'Senior AI Engineer',
      'Generative AI Engineer',
      'Agentic AI Architect',
      'LLM Platform Engineer',
    ],
    data: AI_VERSION_RESUME_DATA,
  },
  {
    id: 'fde',
    label: 'FDE Version',
    badge: 'Forward Deployed',
    icon: 'Rocket',
    roleTitle: 'Staff Forward Deployed Engineer | Enterprise Solutions & Client Deployment Lead',
    tagline: 'Customer-facing technical architecture, 0-to-1 rapid deployment, 3.4x ROI, HIPAA/MAS',
    color: 'from-emerald-600 to-teal-700',
    targetRoles: [
      'Forward Deployed Engineer (FDE)',
      'Enterprise Solutions Architect',
      'Customer Engineering Lead',
      'Technical Deployment Lead',
    ],
    data: FDE_VERSION_RESUME_DATA,
  },
];
