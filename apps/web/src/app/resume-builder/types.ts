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

// Default sample data (from the reference project)
export const SAMPLE_RESUME_DATA: ResumeData = {
  basics: {
    name: "Ashish Kumar Singh",

    title:
      "Senior Software Engineer | AI/ML | Agentic AI | Backend | Full Stack",

    email: "ashish.singh.careers@gmail.com",

    phone: "+91 7982169443",

    location:
      "India | Open to Relocation | Visa Sponsorship Required",

    linkedin:
      "https://www.linkedin.com/in/ashish-kumar-singh1986",

    github:
      "https://github.com/guddiya001",

    portfolio:
      "https://ashishkumarsingh.vercel.app",

    summary:
      "Senior Software Engineer with 9+ years of experience designing, building, and scaling production-grade AI, backend, full-stack, cloud-native, and distributed systems. Strong expertise in Generative AI, AI agents, agentic workflows, RAG, LLM integrations, MCP, LangChain, LangGraph, vector databases, AI observability, Python, Node.js, TypeScript, React, Next.js, REST APIs, microservices, PostgreSQL, AWS, Azure, GCP, Docker, Kubernetes, Terraform, and CI/CD. Experienced across healthcare, banking, retail, enterprise SaaS, and AI platforms, with proven ownership of architecture, 0-to-1 product development, production engineering, performance optimization, technical leadership, mentoring, and cross-functional delivery.",

    openTo:
      "Open to international relocation and visa-sponsored opportunities across USA, UK, Ireland, Germany, Netherlands, Poland, UAE, Singapore, and Australia."
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

      company: "Persistent Systems Ltd / UnitedHealth Group",

      location: "Noida, India",

      period: "Oct 2023 - Present",

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
        "Lead AI, backend, and full-stack engineering initiatives for enterprise healthcare applications using Python, FastAPI, Node.js, TypeScript, React, REST APIs, microservices, AWS, Azure, GCP, Docker, Kubernetes, and CI/CD.",

        "Architect and build production-grade Generative AI applications integrating LLMs, AI agents, agentic workflows, RAG, embeddings, vector databases, prompt engineering, and enterprise business workflows.",

        "Design agentic workflows using LangChain and LangGraph to orchestrate LLMs, tools, retrieval systems, APIs, application state, and business operations.",

        "Implement Model Context Protocol (MCP) integrations enabling AI agents and LLM-powered applications to securely interact with enterprise tools, services, and data.",

        "Design retrieval orchestration and contextual AI services that provide governed access to fragmented enterprise healthcare data.",

        "Build scalable REST APIs and backend microservices using Python, FastAPI, Node.js, and distributed-system architecture.",

        "Develop AI observability capabilities covering metrics, logs, traces, workflow behavior, retrieval quality, system reliability, and production performance.",

        "Design and implement cloud-native applications using AWS, Azure, GCP, Docker, Kubernetes, Terraform, and CI/CD.",

        "Architect reusable frontend components and application workflows using React, TypeScript, and modern web application architecture.",

        "Lead 0-to-1 engineering initiatives, taking solutions from technical discovery and proof of concept through architecture, implementation, deployment, monitoring, and production support.",

        "Conduct architecture reviews, code reviews, technical design sessions, mentoring, engineering standards, and technical decision-making across distributed engineering teams.",

        "Collaborate with product managers, domain experts, UX teams, backend engineers, data teams, QA, security, and business stakeholders to deliver scalable enterprise AI solutions."
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

      company: "LTIMindtree Ltd / DBS Bank",

      location: "Singapore",

      period: "Jun 2022 - Mar 2023",

      focus: [
        "Backend",
        "Full Stack",
        "Banking",
        "Distributed Systems",
        "Cloud"
      ],

      bullets: [
        "Developed production banking applications using Node.js, Python, TypeScript, JavaScript, React, PostgreSQL, REST APIs, and microservices.",

        "Designed scalable backend services and APIs supporting customer workflows and transaction-oriented banking systems.",

        "Built reusable React and TypeScript components and integrated frontend applications with backend services and APIs.",

        "Worked with SQL, PostgreSQL, relational data models, service integrations, validation, error handling, and application reliability.",

        "Developed resilient enterprise services with emphasis on scalability, security, maintainability, performance, and production reliability.",

        "Collaborated with product, engineering, architecture, QA, security, and business teams to deliver production software.",

        "Participated in technical design, code reviews, debugging, performance optimization, automated testing, and production support."
      ]
    },

    {
      id: "exp-3",

      role: "Senior Software Engineer",

      company: "Coforge Ltd / Walmart",

      location: "Noida, India",

      period: "Oct 2020 - Jun 2022",

      focus: [
        "Backend",
        "Full Stack",
        "Retail",
        "Distributed Systems",
        "Data"
      ],

      bullets: [
        "Developed enterprise retail applications using Node.js, Python, React.js, TypeScript, PostgreSQL, MongoDB, REST APIs, and microservices.",

        "Built data-intensive dashboards, business workflows, and analytics applications supporting high-volume retail operations.",

        "Designed backend APIs and service integrations connecting frontend applications, databases, and distributed enterprise systems.",

        "Developed reusable React components and scalable application architecture patterns to improve maintainability and development velocity.",

        "Worked with SQL and NoSQL databases for data persistence, querying, transformation, and application workflows.",

        "Improved application scalability, performance, reliability, and maintainability through architectural and engineering improvements.",

        "Collaborated with distributed engineering and product teams to prototype, implement, test, deploy, and support production systems."
      ]
    },

    {
      id: "exp-4",

      role: "Software Engineer",

      company: "Previous Organizations",

      location: "India",

      period: "Jan 2016 - Oct 2020",

      focus: [
        "Full Stack",
        "Backend",
        "Web Applications",
        "APIs",
        "Databases"
      ],

      bullets: [
        "Built full-stack web applications using Python, Node.js, JavaScript, React.js, TypeScript, SQL, PostgreSQL, MongoDB, and REST APIs.",

        "Developed backend services, APIs, frontend components, database integrations, and business workflows for enterprise applications.",

        "Implemented data access, querying, transformation, validation, and persistence using relational and NoSQL databases.",

        "Collaborated with product and engineering teams to translate business requirements into scalable production software.",

        "Contributed to architecture, testing, debugging, deployment, performance optimization, and production support."
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
    "Generative AI",
    "AI Agents",
    "Agentic AI",
    "Agentic Workflows",
    "LLM Applications",
    "RAG",
    "Retrieval-Augmented Generation",
    "LangChain",
    "LangGraph",
    "MCP",
    "Model Context Protocol",
    "OpenAI",
    "Gemini",
    "Vector Databases",
    "Embeddings",
    "Prompt Engineering",
    "AI Observability",
    "AI Evaluation",
    "Python",
    "FastAPI",
    "Node.js",
    "Express.js",
    "NestJS",
    "TypeScript",
    "JavaScript",
    "React.js",
    "Next.js",
    "REST APIs",
    "GraphQL",
    "Microservices",
    "Distributed Systems",
    "System Design",
    "API Architecture",
    "Cloud-Native Architecture",
    "PostgreSQL",
    "SQL",
    "MongoDB",
    "MySQL",
    "Redis",
    "Kafka",
    "AWS",
    "Azure",
    "GCP",
    "Docker",
    "Kubernetes",
    "Terraform",
    "CI/CD",
    "Git",
    "Splunk",
    "Monitoring",
    "Logging",
    "Observability",
    "Automated Testing",
    "Code Reviews",
    "Technical Leadership",
    "Architecture",
    "Mentoring",
    "Agile"
  ],

  education: [
    {
      id: "edu-1",
      degree: "Master of Computer Applications (MCA)",
      school: "Guru Gobind Singh Indraprastha University",
      location: "India",
      year: "2016"
    },
    {
      id: "edu-2",
      degree: "Bachelor of Computer Applications (BCA)",
      school: "UPRTO University",
      location: "India",
      year: "2012"
    }
  ],

  certificates: [
    "Advanced Python & FastAPI Backend Development",
    "Large Language Models & Prompt Engineering",
    "Enterprise Java & Spring Boot Architecture",
    "Database Management & SQL Optimization",
    "AWS Cloud Fundamentals",
    "Docker & Kubernetes",
    "System Design",
    "React.js Architecture"
  ],

  achievements: [
    "Architected a micro-frontend platform adopted by 6+ global engineering teams.",

    "Reduced frontend bundle size by 35% through large-scale application modernization.",

    "Improved Page Speed Index by 40% through frontend architecture and performance optimization.",

    "Improved Lighthouse performance score from 62 to 94 through Core Web Vitals and frontend optimization.",

    "Architected AI agent and MCP workflows integrating LLMs, retrieval systems, tools, and enterprise services.",

    "Led 0-to-1 engineering initiatives from technical discovery and proof of concept through production deployment and operations."
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
    profileVersion: "2.0",

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
// export const SAMPLE_RESUME_DATA: ResumeData = {
//   basics: {
//     name: 'Ashish Kumar Singh',
//     title: 'Staff Backend AI Engineer | Context Retrieval & Agentic Architecture',
//     email: 'ashish.singh.careers@gmail.com',
//     phone: '+91 7982169443',
//     location: 'India (Open to Relocation - Ireland/UK/EU | Visa Sponsorship Required)',
//     linkedin: 'https://www.linkedin.com/in/ashish-kumar-singh1986',
//     github: 'https://github.com/guddiya001',
//     portfolio: 'https://ashishkumarsingh.vercel.app',
//     summary:
//       'Staff-level Backend Engineer with 9+ years of experience architecting distributed systems and building production-grade AI intelligence layers. Specialized in designing high-autonomy Agentic workflows, Model Context Protocol (MCP) integrations, and scalable retrieval orchestration APIs for highly regulated enterprise environments (Healthcare, Global FinTech).',
//     openTo: '',
//   },
//   experience: [
//     {
//       id: 'exp-1',
//       role: 'Senior Engineering Lead (Gen AI Context & Backend Architecture)',
//       company: 'Persistent Systems Ltd / UnitedHealth Group',
//       location: 'Noida, India',
//       period: 'Oct 2023 - Present',
//       bullets: [
//         'Architected and shipped a production-grade AI-native context layer using Python and FastAPI, building the core retrieval orchestration APIs that empower AI agents with reliable, governed access to fragmented healthcare data.',
//         'Spearheaded the integration of the Model Context Protocol (MCP) and agent-facing workflows (LangGraph/LangChain), enabling LLMs and internal tools to dynamically retrieve clinical context.',
//         'Drove 0-to-1 system evolution for generative AI initiatives, navigating high ambiguity to transition early-stage PoCs into highly available backend services.',
//         'Instrumented AI microservices with comprehensive telemetry (metrics, logs, traces) to ensure system reliability.',
//         'Designed deterministic prompt engineering frameworks and evaluation pipelines for safe LLM outputs in regulated healthcare.',
//       ],
//     },
//     {
//       id: 'exp-2',
//       role: 'Senior Software Engineer (Enterprise SaaS & Cloud Infrastructure)',
//       company: 'LTIMindtree Ltd / DBS Bank',
//       location: 'Singapore',
//       period: 'Jun 2022 - Mar 2023',
//       bullets: [
//         'Engineered mission-critical, multi-tenant consumer banking backends using Java (Spring Boot) and Python within MAS compliance boundaries.',
//         'Designed resilient SaaS foundations including secure data isolation patterns and distributed background jobs.',
//         'Optimized complex SQL queries and enterprise data platforms for high-scale enterprise reporting.',
//       ],
//     },
//     {
//       id: 'exp-3',
//       role: 'Senior Software Engineer (Distributed Systems)',
//       company: 'Coforge Ltd / Walmart',
//       location: 'Noida, India',
//       period: 'Oct 2020 - Jun 2022',
//       bullets: [
//         'Built responsive customer-facing components and scalable REST APIs (Spring Boot, FastAPI) for massive global retail traffic.',
//         'Optimized enterprise integration protocols and messaging queues for high-throughput, fault-tolerant data exchange.',
//       ],
//     },
//     {
//       id: 'exp-4',
//       role: 'Software Engineer',
//       company: 'Previous Organizations',
//       location: 'India',
//       period: 'Jan 2016 - Oct 2020',
//       bullets: [
//         'Developed full-stack web applications and backend services with Java, Spring Boot, Python, and robust database management.',
//         'Gained deep foundational experience in API design, database optimization, and agile software delivery.',
//       ],
//     },
//   ],
//   skillsFlat: [
//     'AI & Context Retrieval: Model Context Protocol (MCP), Retrieval Orchestration, Agentic Frameworks (LangChain, LangGraph), Gen AI Prompt Engineering, LLM Integration',
//     'Backend & Architecture: Python, FastAPI, Java, Spring Boot, Distributed Systems, Multi-tenant SaaS Architecture, API Design, Microservices',
//     'Data & Infrastructure: SQL, Snowflake (Concepts), Vector Data Management, AWS, GCP, Enterprise Integration Protocols',
//     'Observability & Operations: System Telemetry (Metrics/Logs/Traces), High-Availability Operations, CI/CD, Background Jobs',
//     'Engineering Leadership: 0-to-1 Product Development, Cross-functional Ambiguity Resolution, Architectural Decision Making, Agile',
//   ],
//   projects: [
//     {
//       id: 'proj-1',
//       name: 'Enterprise AI Agent & MCP Workflow Orchestration',
//       description: 'Python/FastAPI-based agentic workflow orchestration system.',
//       technologies: 'Python, FastAPI, LangGraph, MCP',
//     },
//     {
//       id: 'proj-2',
//       name: 'LLM Integration & Secure Context Retrieval System',
//       description: 'Secure retrieval system for enterprise LLM applications.',
//       technologies: 'Python, Vector DB, RAG',
//     },
//     {
//       id: 'proj-3',
//       name: 'Scalable Multi-Tenant Microservices Architecture',
//       description: 'Enterprise-grade multi-tenant platform.',
//       technologies: 'Java, Spring Boot, Python, Kubernetes',
//     },
//   ],
//   education: [
//     {
//       id: 'edu-1',
//       degree: 'Master of Computer Applications (MCA)',
//       school: 'Guru Gobind Singh Indraprastha University',
//       location: 'India',
//       year: '2016',
//     },
//     {
//       id: 'edu-2',
//       degree: 'Bachelor of Computer Applications (BCA)',
//       school: 'UPRTO University',
//       location: 'India',
//       year: '2012',
//     },
//   ],
//   certificates: [
//     'Advanced Python & FastAPI Backend Development',
//     'Large Language Models & Prompt Engineering',
//     'Enterprise Java & Spring Boot Architecture',
//     'Database Management & SQL Optimization',
//   ],
//   achievements: [
//     'Architected multi-step AI workflows integrating LLMs via Python (FastAPI) and MCP, powering enterprise agentic automation.',
//     'Operated as a foundational engineer on 0-to-1 initiatives, designing core retrieval APIs and context layers.',
//     'Decoupled monolithic architectures into scalable, observable microservices using Java and Spring Boot.',
//   ],
//   languages: ['English – Full Professional Proficiency'],
//   coverLetter: {
//     paragraphs: [
//       'Dear Hiring Manager,',
//       'I am excited to apply for this position. With over nine years of experience building enterprise-scale applications across healthcare, banking, and retail industries, I am enthusiastic about the opportunity to contribute to your team.',
//       'Throughout my career, I have designed and developed modern applications using Python, Java, TypeScript, React, microservices, Docker, Kubernetes, AWS, and CI/CD practices.',
//       'I would welcome the opportunity to discuss how my experience can contribute to your team\'s success.',
//       'Thank you for your time and consideration.',
//       'Kind regards,',
//       'Ashish Kumar Singh',
//     ],
//   },
// };

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
