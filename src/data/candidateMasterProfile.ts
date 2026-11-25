import type { CandidateMasterProfile } from '../schemas/candidateProfile.schema.ts';
import { CandidateMasterProfileSchema } from '../schemas/candidateProfile.schema.ts';

/**
 * Candidate Master Profile Data
 * Contains modular achievement blocks and tailored variants for ALL universal engineering domains:
 * - backend_distributed_systems
 * - ai_llm_architecture
 * - frontend_web_platform
 * - devops_cloud_infra
 * - fullstack_general
 * - engineering_leadership
 * (with fullstack_platform supported as a backward-compatible alias)
 */
const rawCandidateMasterProfile: CandidateMasterProfile = {
  basics: {
    name: 'Ashish Kumar Singh',
    email: 'ashish.singh.careers@gmail.com',
    phone: '+91 7982169443',
    location: 'Noida, India',
    linkedin: 'https://www.linkedin.com/in/ashish-kumar-singh1986',
    github: 'https://github.com/guddiya001',
    portfolio: 'https://ashishkumarsingh.vercel.app',
    openTo: 'UK, Germany, Netherlands, Ireland, USA, Singapore | Visa Sponsorship Required',
  },

  summaries: {
    backend_distributed_systems:
      'Senior Staff Backend Engineer with 10+ years of experience designing, operating, and scaling high-throughput distributed systems, event-driven microservices, and fault-tolerant database topologies across banking, healthcare, and global retail e-commerce. Proven track record leading distributed platform architecture across 6+ teams, building RESTful and gRPC microservices in Go, Python (FastAPI), Java (Spring Boot), and Node.js/NestJS. Deep expertise in high-throughput streaming with Apache Kafka and RabbitMQ, distributed databases (PostgreSQL, Apache Cassandra, Redis), Kubernetes container clusters on AWS and GCP, and regulatory compliance (MAS, SOC 2, HIPAA).',

    ai_llm_architecture:
      'Senior Staff AI & LLM Systems Engineer with 10+ years of experience building production Generative AI platforms, stateful multi-agent workflows, and retrieval-augmented generation (RAG) pipelines across healthcare and financial services. Proven expertise in Model Context Protocol (MCP), LangGraph, LangChain, semantic vector search (pgvector, Chroma, Qdrant), high-throughput vLLM inference clusters, and LLM evaluation with Ragas and TruLens, keeping hallucination rates below 1.5% across 15M+ monthly requests.',

    devops_cloud_infra:
      'Staff DevOps & SRE Platform Engineer with 10+ years of experience building cloud platform infrastructure, automated CI/CD pipelines, and high-availability container clusters across AWS and GCP. Deep expertise in Kubernetes (EKS, GKE), Terraform infrastructure-as-code, Docker, Helm, GitOps (ArgoCD), and site reliability engineering (SRE). Maintained 99.999% platform availability, cut deployment lead times by 70%, and built observability systems using Prometheus, Grafana, OpenTelemetry, and Datadog.',

    fullstack_general:
      'Staff Full-Stack Software Engineer with 10+ years of experience building end-to-end cloud applications, fast web frontends, and distributed backend microservices across healthcare, banking, and retail. Led full-stack engineering across 6+ squads, pairing backend services (Python FastAPI, Go, Node.js/NestJS, PostgreSQL, Redis) with accessible web interfaces (TypeScript, Next.js, React), taking systems from initial design to containerized Kubernetes deployments on AWS and GCP.',

    engineering_leadership:
      'Engineering Lead & Technical Architect with 10+ years of experience scaling distributed engineering organizations, guiding system architecture, and delivering cross-functional platforms across healthcare, digital banking, and retail. Led 12+ senior engineers across 6+ squads, establishing architecture decision records (ADRs), RFC design reviews, and clear engineering workflows while meeting HIPAA, MAS, and SOC 2 compliance and reducing incident MTTR by 45%.',

    fullstack_platform:
      'Staff Full-Stack & Platform Engineer with 10+ years of experience delivering end-to-end cloud platforms, scalable microservice architectures, and modern web applications across consumer banking, healthcare, and retail. Designed resilient backends with Go, Python, and Node.js coupled with fast frontends using Next.js, React, and TypeScript, alongside Docker, Kubernetes, CI/CD automation, and cloud infrastructure on AWS and GCP.',

    frontend_web_platform:
      'Staff- and Senior-level Frontend & Web Platform Engineer with 10+ years of experience building high-performance enterprise web applications, micro-frontends, and design systems across healthcare, banking, and global retail e-commerce. Led frontend architecture across 6+ engineering teams, decoupling portals with Webpack Module Federation, React 18/19, and Next.js (App Router, Server Components), reducing JavaScript bundle sizes by 35%, raising Lighthouse scores from 62 to 94, and improving page load speed by 40%. Deep expertise in TypeScript, Redux Toolkit, Zustand, React Query, Core Web Vitals (LCP, INP, CLS), and WCAG 2.1 AA accessibility.',
  },

  skillsByPersona: {
    backend_distributed_systems: {
      'Core Programming Languages': ['Go', 'Python', 'Java', 'TypeScript', 'Node.js', 'SQL', 'C++'],
      'Backend Frameworks & APIs': ['FastAPI', 'Spring Boot', 'NestJS', 'Express.js', 'gRPC', 'RESTful APIs', 'GraphQL', 'Protocol Buffers'],
      'Distributed Systems & Messaging': ['Apache Kafka', 'RabbitMQ', 'Event-Driven Architecture', 'Distributed Caching', 'Microservices Architecture', 'System Design'],
      'Databases & Storage': ['PostgreSQL', 'Apache Cassandra', 'Redis', 'MongoDB', 'DynamoDB', 'Elasticsearch', 'SQL/NoSQL Database Tuning'],
      'Cloud & Infrastructure': ['Kubernetes', 'Docker', 'AWS', 'GCP', 'Terraform', 'Helm', 'CI/CD', 'GitHub Actions', 'Linux Internals'],
      'Security & Reliability': ['OAuth 2.0 PKCE', 'Zero-Trust Architecture', 'RBAC', 'MAS Banking Compliance', 'HIPAA', 'Prometheus', 'Grafana', 'Sentry', 'OpenTelemetry'],
    },
    ai_llm_architecture: {
      'Generative AI & Agentic Workflows': ['Model Context Protocol (MCP)', 'LangGraph', 'LangChain', 'AI Agents', 'Tool Calling', 'Agentic Systems', 'Multi-Agent Orchestration'],
      'RAG & Vector Search': ['RAG', 'Retrieval-Augmented Generation', 'pgvector', 'ChromaDB', 'Qdrant', 'Dense Embeddings', 'Hybrid Search (BM25 + Cosine)', 'Reciprocal Rank Fusion'],
      'LLM Serving & Evaluation': ['vLLM', 'PagedAttention', 'Continuous Batching', 'Ragas', 'TruLens', 'Prompt Engineering', 'Pydantic Structured Outputs'],
      'Languages & Frameworks': ['Python', 'FastAPI', 'PyTorch', 'TypeScript', 'Node.js', 'Docker', 'Kubernetes'],
    },
    devops_cloud_infra: {
      'Container Orchestration & Compute': ['Kubernetes', 'Docker', 'AWS EKS', 'GCP GKE', 'Helm', 'Linux'],
      'Infrastructure as Code & Automation': ['Terraform', 'Ansible', 'GitOps (ArgoCD)', 'Bash Scripting', 'Python Automation'],
      'Cloud Platforms & Networking': ['AWS', 'Google Cloud Platform (GCP)', 'VPC', 'IAM & RBAC', 'Cloudflare', 'Load Balancers'],
      'CI/CD & Delivery': ['GitHub Actions', 'Jenkins', 'Canary Deployments', 'Blue-Green Deployment', 'Artifact Registry'],
      'Observability & SRE': ['Prometheus', 'Grafana', 'OpenTelemetry', 'Datadog', 'Loki', 'SLO/SLI Management', 'Incident Response'],
    },
    fullstack_general: {
      'Languages & Core Web': ['TypeScript', 'JavaScript', 'Python', 'Go', 'HTML5', 'CSS3', 'SQL'],
      'Frontend Frameworks': ['React 18/19', 'Next.js', 'Redux Toolkit', 'Zustand', 'React Query', 'Tailwind CSS'],
      'Backend Frameworks & APIs': ['Node.js', 'NestJS', 'FastAPI', 'Spring Boot', 'RESTful APIs', 'GraphQL', 'gRPC'],
      'Databases & Storage': ['PostgreSQL', 'Redis', 'MongoDB', 'Apache Cassandra'],
      'Cloud & DevOps': ['Docker', 'Kubernetes', 'AWS', 'GCP', 'Terraform', 'CI/CD Pipelines'],
    },
    engineering_leadership: {
      'Technical Leadership & Governance': ['Engineering Leadership', 'Architecture Governance', 'RFC & ADR Processes', 'Cross-Functional Roadmapping', 'Technical Hiring & Mentorship'],
      'Engineering Operations & Delivery': ['Agile/Scrum Leadership', 'Sprint Delivery', 'Release Management', 'Root Cause Analysis (RCA)', 'Incident MTTR Reduction'],
      'Architecture & Strategy': ['Enterprise System Architecture', 'Microservices Strategy', 'Domain-Driven Design (DDD)', 'Disaster Recovery (DR)', 'FinOps'],
      'Regulatory Compliance': ['HIPAA Compliance', 'MAS Banking Regulations', 'SOC 2 Type II', 'Data Governance'],
    },
    fullstack_platform: {
      'Languages & Frameworks': ['TypeScript', 'JavaScript', 'Python', 'Go', 'React', 'Next.js', 'Node.js', 'NestJS', 'FastAPI'],
      'Databases & APIs': ['PostgreSQL', 'Redis', 'MongoDB', 'REST APIs', 'GraphQL', 'gRPC', 'WebSockets'],
      'Cloud & DevOps': ['Docker', 'Kubernetes', 'AWS', 'GCP', 'Terraform', 'CI/CD Pipelines', 'GitHub Actions'],
    },
    frontend_web_platform: {
      'Frontend Frameworks & Libraries': ['React.js', 'React 18/19', 'Next.js (App Router, Server Components)', 'Redux Toolkit', 'Zustand', 'React Query (TanStack Query)', 'Webpack Module Federation'],
      'Languages & Core Web': ['TypeScript', 'JavaScript (ES6+)', 'HTML5', 'CSS3', 'Tailwind CSS', 'CSS Modules', 'PostCSS'],
      'Web Performance & Core Web Vitals': ['Core Web Vitals (LCP, INP, CLS)', 'Lighthouse Optimization (62 -> 94)', 'Code Splitting', 'Tree Shaking', 'Client-Side Caching'],
      'UI Architecture & Design Systems': ['Storybook', 'Radix UI', 'Shadcn/ui', 'Responsive Design', 'WCAG 2.1 AA Accessibility', 'Figma Design Tokens'],
    },
  },

  experiences: [
    {
      id: 'exp-persistent-systems',
      company: 'Persistent Systems Ltd.',
      client: 'UnitedHealth Group',
      location: 'Noida, India',
      period: 'Oct 2023 – Present',
      personaVariants: {
        backend_distributed_systems: {
          roleTitle: 'Senior Staff Backend Engineer / Engineering Lead',
          bullets: [
            'Architected and deployed high-throughput healthcare backend microservices using Python (FastAPI), Java (Spring Boot), and Node.js/NestJS, handling 15M+ monthly API transactions with 99.99% availability under strict HIPAA data privacy regulations.',
            'Engineered resilient event-driven data streaming pipelines utilizing Apache Kafka and RabbitMQ, establishing dead-letter queue (DLQ) policies, consumer lag monitoring, and idempotent transaction processing across 45+ distributed clinical microservices.',
            'Optimized relational and NoSQL database topologies (PostgreSQL, MongoDB, DynamoDB, and Redis), tuning connection pooling with PgBouncer, index strategy, and query plans to slash p99 database response latency from 180ms to 28ms.',
            'Migrated 45+ monolithic services to containerized microservices on Kubernetes (AWS EKS & GCP) using automated Terraform modules and Helm deployment charts, achieving zero-downtime cutovers.',
            'Directed technical architecture reviews, API contracts (REST, gRPC, Protobuf), and zero-trust RBAC authentication with OAuth 2.0 and JWT, mentoring 12+ backend developers in distributed systems best practices.',
          ],
          techStack: ['Python', 'FastAPI', 'Java', 'Spring Boot', 'Node.js', 'NestJS', 'PostgreSQL', 'Redis', 'Apache Kafka', 'RabbitMQ', 'Kubernetes', 'Docker', 'AWS', 'GCP', 'Terraform', 'gRPC'],
        },
        ai_llm_architecture: {
          roleTitle: 'Senior AI Platform & LLM Systems Lead',
          bullets: [
            'Built production Generative AI context retrieval and stateful agentic workflows using Python, FastAPI, LangGraph, and Model Context Protocol (MCP), automating clinical diagnostic pipelines and cutting clinician research turnaround time by 40%.',
            'Designed advanced RAG pipelines incorporating hierarchical semantic chunking, dense vector search (pgvector, Chroma, Qdrant), and hybrid search (BM25 + cosine similarity) with Cohere reranking, reducing retrieval hallucination rates below 1.5%.',
            'Implemented defensive prompt design and guaranteed structured output enforcement using Pydantic, Instructor, and dynamic JSON Schema validation with tool calling, eliminating schema drift and downstream integration parsing errors.',
            'Established quantitative LLM evaluation pipelines using Ragas and Deepeval to continuously benchmark faithfulness, context recall, and answer relevancy across multi-agent workflows.',
          ],
          techStack: ['Python', 'FastAPI', 'LangGraph', 'LangChain', 'Model Context Protocol (MCP)', 'pgvector', 'ChromaDB', 'Qdrant', 'Ragas', 'Docker', 'Kubernetes', 'Azure OpenAI'],
        },
        devops_cloud_infra: {
          roleTitle: 'Staff DevOps & Cloud Platform Lead',
          bullets: [
            'Migrated enterprise cloud platforms across AWS (EKS) and GCP, scaling multi-region Kubernetes clusters hosting 45+ containerized microservices with automated failover and 99.99% availability.',
            'Wrote modular, reusable Terraform Infrastructure as Code (IaC) templates and Helm deployment charts, reducing environment provisioning lead time from 3 days to under 15 minutes.',
            'Built end-to-end GitOps delivery pipelines using GitHub Actions, ArgoCD, and Docker, implementing blue-green rollouts and automated canary analysis with zero deployment downtime.',
            'Built enterprise observability and telemetry infrastructure using Prometheus, Grafana, OpenTelemetry, and Loki, establishing SLI/SLO tracking, APM tracing, and cutting incident MTTR by 45%.',
            'Configured zero-trust cloud security and compliance (HIPAA, SOC 2), managing IAM least-privilege policies, secret management via HashiCorp Vault, and automated container vulnerability scanning.',
          ],
          techStack: ['Kubernetes', 'Docker', 'AWS EKS', 'GCP', 'Terraform', 'Helm', 'ArgoCD', 'GitHub Actions', 'Prometheus', 'Grafana', 'OpenTelemetry', 'Linux'],
        },
        fullstack_general: {
          roleTitle: 'Staff Full-Stack Platform Engineer',
          bullets: [
            'Built end-to-end healthcare workflow platforms uniting resilient Node.js/NestJS and Python microservices with Next.js/React diagnostic dashboards for 6+ engineering teams.',
            'Designed type-safe REST and GraphQL APIs using TypeScript, Zod, and PostgreSQL, ensuring zero regression and consistent bidirectional state synchronization.',
            'Containerized full-stack services using Docker and Kubernetes on AWS, automating GitHub Actions CI/CD deployment pipelines with canary releases.',
            'Optimized full-stack response times by implementing Redis distributed caching and client-side TanStack Query, cutting overall roundtrip latency by 40%.',
          ],
          techStack: ['TypeScript', 'Node.js', 'NestJS', 'Python', 'React', 'Next.js', 'PostgreSQL', 'Redis', 'Docker', 'Kubernetes', 'AWS', 'GraphQL'],
        },
        engineering_leadership: {
          roleTitle: 'Engineering Lead & Technical Architecture Director',
          bullets: [
            'Led technical architecture and engineering delivery across 6+ distributed squads (12+ senior engineers), aligning multi-quarter roadmaps with business objectives for healthcare platforms.',
            'Established engineering excellence standards, architecture decision records (ADRs), and formal RFC design review processes, increasing developer delivery velocity by 30% and reducing architectural debt.',
            'Migrated 45+ monolithic services to distributed microservices architecture, meeting strict HIPAA and SOC 2 regulatory compliance.',
            'Mentored and coached 12+ senior backend, frontend, and DevOps engineers, running technical hiring loops, performance reviews, and career growth frameworks.',
            'Improved site reliability and incident response culture, establishing root cause analysis (RCA) reviews and reducing mean time to recovery (MTTR) by 45%.',
          ],
          techStack: ['Engineering Leadership', 'System Architecture', 'Agile Delivery', 'RFC / ADR Governance', 'HIPAA / SOC 2 Compliance', 'Mentorship', 'Cloud Strategy'],
        },
        fullstack_platform: {
          roleTitle: 'Staff Full-Stack Platform Engineer',
          bullets: [
            'Built end-to-end healthcare workflow platforms uniting resilient Node.js/NestJS and Python microservices with Next.js/React diagnostic dashboards for 6+ engineering teams.',
            'Designed type-safe REST and GraphQL APIs using TypeScript, Zod, and PostgreSQL, ensuring zero regression and consistent bidirectional state synchronization.',
            'Containerized full-stack services using Docker and Kubernetes on AWS, automating GitHub Actions CI/CD deployment pipelines with canary releases.',
          ],
          techStack: ['TypeScript', 'Node.js', 'NestJS', 'Python', 'React', 'Next.js', 'PostgreSQL', 'Redis', 'Docker', 'Kubernetes', 'AWS'],
        },
        frontend_web_platform: {
          roleTitle: 'Senior Engineering Lead / Frontend Architecture Lead',
          bullets: [
            'Decoupled a monolithic clinical portal into 6 independent React 18 micro-apps using Webpack Module Federation, enabling parallel deployments across distributed engineering teams.',
            'Optimized client-side performance by shrinking JavaScript bundle sizes by 35%, raising Google Lighthouse performance scores from 62 to 94, and improving Core Web Vitals (LCP reduced by 1.8s) for a 40% faster page load index.',
            'Built interactive clinical diagnostic dashboards and real-time workflow portals using Next.js, React, TypeScript, and Tailwind CSS, supporting complex diagnostic tables with sub-second navigation.',
            'Established a unified Design System and Storybook component library, shipping 50+ reusable, accessible UI components conforming to WCAG 2.1 AA accessibility standards.',
          ],
          techStack: ['React 18', 'Next.js', 'TypeScript', 'Webpack Module Federation', 'Redux Toolkit', 'TanStack Query', 'Tailwind CSS', 'Storybook', 'WCAG 2.1 AA', 'Core Web Vitals'],
        },
      },
    },
    {
      id: 'exp-ltimindtree',
      company: 'LTIMindtree Ltd.',
      client: 'DBS Bank',
      location: 'Singapore Banking Domain (Remote/Onsite Support)',
      period: 'Jul 2022 – Oct 2023',
      personaVariants: {
        backend_distributed_systems: {
          roleTitle: 'Senior Backend Engineer (Financial Systems & Core Banking)',
          bullets: [
            'Built high-volume core banking backend microservices and payment ledger integrations using Go, Java (Spring Boot), Node.js, and PostgreSQL under Monetary Authority of Singapore (MAS) regulatory standards.',
            'Implemented resilient, high-security authentication and authorization services integrating OAuth 2.0 with PKCE, biometric handshake verifications, and JWT session rotation, securing 500k+ daily consumer banking sessions with zero security incidents.',
            'Engineered distributed database transaction pipelines and audit ledgers using PostgreSQL and MongoDB, guaranteeing ACID compliance, read-replica replication, and zero transaction data loss during high-volume international remittance surges.',
            'Designed high-throughput REST and gRPC API endpoints with Protocol Buffers, achieving sub-30ms p99 latency for real-time balance calculations, FX currency conversions, and wire transfer validations.',
            'Conducted rigorous chaos engineering, failover drills, and disaster recovery validations for distributed payment gateways, sustaining 99.999% platform availability.',
          ],
          techStack: ['Go', 'Java', 'Spring Boot', 'Node.js', 'PostgreSQL', 'MongoDB', 'Redis', 'OAuth 2.0 PKCE', 'gRPC', 'RESTful APIs', 'Docker', 'Kubernetes', 'MAS Compliance'],
        },
        ai_llm_architecture: {
          roleTitle: 'Senior AI Engineer (Financial Intelligence & Compliance)',
          bullets: [
            'Developed autonomous financial inquiry AI agents with tool-calling capabilities to execute banking ledger queries and currency conversion workflows securely.',
            'Engineered automated regulatory compliance classifiers for MAS banking transaction rules using sentence embeddings and dense vector retrieval, achieving 96% classification accuracy.',
            'Implemented strict system prompt guardrails and output validation to prevent prompt injection and confidential financial data exfiltration.',
          ],
          techStack: ['Python', 'FastAPI', 'LangChain', 'OpenAI', 'pgvector', 'Pydantic', 'Docker'],
        },
        devops_cloud_infra: {
          roleTitle: 'Senior Cloud Platform & Infrastructure Engineer',
          bullets: [
            'Built resilient Kubernetes and container deployment topologies on enterprise cloud platforms for core banking ledgers under Monetary Authority of Singapore (MAS) regulations.',
            'Automated CI/CD pipelines and deployment guardrails using Docker, Jenkins, and Helm, running automated security vulnerability scans and artifact signing.',
            'Built comprehensive cloud infrastructure monitoring and synthetic transaction tracing using Prometheus and Grafana, sustaining 99.999% availability for consumer banking gateways.',
          ],
          techStack: ['Kubernetes', 'Docker', 'Terraform', 'Jenkins', 'Linux', 'Prometheus', 'Grafana', 'MAS Compliance'],
        },
        fullstack_general: {
          roleTitle: 'Senior Full-Stack Software Engineer (Banking Platform)',
          bullets: [
            'Delivered full-stack consumer banking features across secure Node.js backend services and React/TypeScript web interfaces conforming to MAS banking standards.',
            'Built end-to-end authenticated payment workflows integrating OAuth 2.0 PKCE and multi-factor authentication with automated audit trail logging.',
            'Built responsive financial data visualizations and transaction management tables handling 50k+ daily banking user interactions.',
          ],
          techStack: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Redis', 'OAuth 2.0', 'Docker'],
        },
        engineering_leadership: {
          roleTitle: 'Technical Lead (Core Banking Platform)',
          bullets: [
            'Led a squad of 8 engineers delivering secure payment and transaction workflows under strict MAS regulatory compliance and ISO 20022 banking standards.',
            'Ran sprint planning, architectural reviews, and cross-functional technical coordination between product managers, security auditors, and banking operations.',
            'Standardized API security specifications, zero-trust OAuth 2.0 PKCE authentication, and code review guidelines across the digital banking division.',
          ],
          techStack: ['Technical Leadership', 'Core Banking', 'MAS Regulatory Compliance', 'OAuth 2.0 Security', 'Agile Delivery', 'Mentorship'],
        },
        fullstack_platform: {
          roleTitle: 'Senior Full-Stack Software Engineer (Banking Platform)',
          bullets: [
            'Delivered full-stack consumer banking features across secure Node.js backend services and React/TypeScript web interfaces conforming to MAS banking standards.',
            'Built end-to-end authenticated payment workflows integrating OAuth 2.0 PKCE and multi-factor authentication with automated audit trail logging.',
            'Built responsive financial data visualizations and transaction management tables handling 50k+ daily banking user interactions.',
          ],
          techStack: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Redis', 'OAuth 2.0', 'Docker'],
        },
        frontend_web_platform: {
          roleTitle: 'Senior Software Engineer (Frontend & Financial UI)',
          bullets: [
            'Built high-volume consumer banking web applications using React.js, TypeScript, and Redux, delivering real-time balance dashboards and international transfer workflows under MAS regulatory standards.',
            'Built secure client-side authentication and session management workflows, integrating OAuth 2.0 PKCE and automated timeout guards.',
            'Engineered complex dynamic financial data tables and interactive charts, supporting high-frequency client-side filtering and sorting across 50,000+ transaction rows with virtualized windowing (React Virtual).',
            'Worked closely with UX designers to translate Figma wireframes into accessible, responsive UI components conforming to WCAG standards.',
          ],
          techStack: ['React.js', 'TypeScript', 'Redux', 'Financial UI', 'WCAG', 'Figma', 'Jest', 'React Testing Library'],
        },
      },
    },
    {
      id: 'exp-coforge',
      company: 'Coforge Ltd.',
      client: 'Walmart',
      location: 'Noida, India',
      period: 'Oct 2020 – Jun 2022',
      personaVariants: {
        backend_distributed_systems: {
          roleTitle: 'Senior Software Engineer (Backend & Distributed Data Systems)',
          bullets: [
            'Built high-concurrency order processing and checkout backend microservices on Kubernetes for Walmart’s global e-commerce platform, handling 25M+ daily retail events during peak traffic spikes.',
            'Scaled distributed messaging and caching layers with Apache Kafka, RabbitMQ, and Redis, tuning partition distribution and consumer group rebalancing to sustain sub-millisecond cache hits.',
            'Tuned high-volume SQL and NoSQL database clusters (PostgreSQL, MongoDB, Apache Cassandra), optimizing sharding keys and Elasticsearch indexes to cut peak primary database load by 45%.',
            'Automated continuous delivery pipelines using Jenkins and Kubernetes, running blue/green zero-downtime microservice deployments with automated rollback on health probe failure.',
            'Built distributed tracing and APM observability using Prometheus, Grafana, and Jaeger, isolating and resolving multi-service network latency bottlenecks.',
          ],
          techStack: ['Java', 'Spring Boot', 'Node.js', 'Apache Kafka', 'RabbitMQ', 'Redis', 'PostgreSQL', 'Apache Cassandra', 'MongoDB', 'Kubernetes', 'Docker', 'Jenkins'],
        },
        ai_llm_architecture: {
          roleTitle: 'Machine Learning & Search Intelligence Engineer',
          bullets: [
            'Implemented high-throughput product catalog semantic search pipelines using vector embeddings and dense retrieval across 2M+ retail SKU records.',
            'Built automated inference caching pipelines with Redis, reducing duplicate search latency by 60% during high-traffic retail campaigns.',
            'Trained and evaluated classification models for intent recognition and automated item categorization.',
          ],
          techStack: ['Python', 'PyTorch', 'scikit-learn', 'Redis', 'FastAPI', 'Docker'],
        },
        devops_cloud_infra: {
          roleTitle: 'Senior DevOps / SRE Engineer (E-Commerce Platform)',
          bullets: [
            'Automated continuous delivery and deployment pipelines using Jenkins, Docker, and Kubernetes for Walmart’s e-commerce platform, handling 25M+ daily retail shoppers.',
            'Automated zero-downtime blue/green deployment cutovers and canary rollouts with rollback triggers tied to real-time health metrics.',
            'Configured distributed system telemetry and APM monitoring using Prometheus, Grafana, and Jaeger, identifying cross-service latency hotspots and reducing p99 latency by 35%.',
          ],
          techStack: ['Kubernetes', 'Docker', 'Jenkins', 'Prometheus', 'Grafana', 'Jaeger', 'Linux', 'Terraform'],
        },
        fullstack_general: {
          roleTitle: 'Senior Full-Stack Engineer (Retail Systems)',
          bullets: [
            'Delivered distributed order management features spanning scalable Node.js microservices and Next.js/React storefront applications for 25M+ daily retail shoppers.',
            'Integrated distributed event pipelines with Kafka and Redis to ensure synchronized stock reservation and real-time inventory updates.',
            'Implemented comprehensive automated test coverage with Jest and Cypress, ensuring zero regressions on critical checkout flows.',
          ],
          techStack: ['Node.js', 'React', 'Next.js', 'Apache Kafka', 'Redis', 'PostgreSQL', 'Docker'],
        },
        engineering_leadership: {
          roleTitle: 'Lead Engineer / Scrum Technical Lead',
          bullets: [
            'Steered checkout engineering squads through high-volume retail peaks (Black Friday / Cyber Monday), maintaining 100% platform uptime.',
            'Drove adoption of automated testing and CI/CD quality gates, boosting release frequency from bi-weekly to on-demand daily deployments.',
            'Mentored junior and mid-level engineers on microservices scalability, distributed caching, and resilient system design.',
          ],
          techStack: ['Technical Leadership', 'Peak Traffic Architecture', 'CI/CD Automation', 'Scrum Leadership', 'Mentorship'],
        },
        fullstack_platform: {
          roleTitle: 'Senior Full-Stack Engineer (Retail Systems)',
          bullets: [
            'Delivered distributed order management features spanning scalable Node.js microservices and Next.js/React storefront applications for 25M+ daily retail shoppers.',
            'Integrated distributed event pipelines with Kafka and Redis to ensure synchronized stock reservation and real-time inventory updates.',
            'Implemented comprehensive automated test coverage with Jest and Cypress, ensuring zero regressions on critical checkout flows.',
          ],
          techStack: ['Node.js', 'React', 'Next.js', 'Apache Kafka', 'Redis', 'PostgreSQL', 'Docker'],
        },
        frontend_web_platform: {
          roleTitle: 'Senior Software Engineer (Web & E-Commerce Applications)',
          bullets: [
            'Engineered high-concurrency customer-facing retail web applications and checkout workflows using React, TypeScript, and Next.js during high-traffic retail spikes (25M+ daily shoppers).',
            'Optimized client-side rendering pipelines and asset delivery, implementing route-based code splitting and image optimization, reducing cart abandonment rate by 12%.',
            'Architected shopping cart and checkout state management using Redux Toolkit, ensuring persistent offline cart recovery and multi-item inventory validation.',
            'Integrated web observability tools (DataDog RUM, Sentry) to monitor real-time client-side JavaScript error rates, maintaining a 99.95% error-free user session rate.',
          ],
          techStack: ['React', 'Next.js', 'TypeScript', 'Redux Toolkit', 'Tailwind CSS', 'Sentry', 'Web Performance'],
        },
      },
    },
    {
      id: 'exp-previous-tech',
      company: 'Previous Technology Organizations',
      location: 'India',
      period: 'Jan 2016 – Oct 2020',
      personaVariants: {
        backend_distributed_systems: {
          roleTitle: 'Software Engineer (Backend & Systems)',
          bullets: [
            'Architected and maintained scalable RESTful backend services and APIs using Python (Django, Flask) and Node.js/Express, supporting high-throughput CRUD workflows and third-party integrations.',
            'Administered enterprise Linux server infrastructure (Ubuntu, CentOS), managing filesystem partitions, network sockets, process supervisors, and automated log rotations.',
            'Managed relational database schemas, migrations, and query tuning in PostgreSQL and MySQL, configuring automated backup, point-in-time recovery, and read replicas.',
            'Served in 24/7 on-call production support rotations, diagnosing server deadlocks, network timeouts, and memory leaks with root cause analyses (RCA).',
          ],
          techStack: ['Python', 'Django', 'Flask', 'Node.js', 'Express.js', 'PostgreSQL', 'MySQL', 'Linux', 'Bash', 'Docker', 'REST APIs'],
        },
        ai_llm_architecture: {
          roleTitle: 'Software Engineer (Data & Backend Services)',
          bullets: [
            'Built Python data extraction, transformation, and ETL pipelines processing multi-gigabyte structured and unstructured enterprise datasets.',
            'Developed text preprocessing, tokenization, and named entity recognition (NER) scripts using NLTK and spaCy for document classification.',
            'Integrated automated data pipelines with relational database storage and REST API endpoints.',
          ],
          techStack: ['Python', 'spaCy', 'NLTK', 'PostgreSQL', 'Pandas', 'Flask'],
        },
        devops_cloud_infra: {
          roleTitle: 'Systems & Infrastructure Engineer',
          bullets: [
            'Administered enterprise Linux server environments (CentOS, Ubuntu), configuring firewalls, SSH keys, network routing, and automated system maintenance scripts.',
            'Containerized legacy monolithic services with Docker, standardizing development environments and reducing onboarding setup from days to hours.',
            'Configured automated database backups, log rotations, and monitoring agents to ensure business continuity.',
          ],
          techStack: ['Linux', 'Bash', 'Docker', 'MySQL', 'PostgreSQL', 'Networking', 'Nginx'],
        },
        fullstack_general: {
          roleTitle: 'Software Engineer (Full-Stack Development)',
          bullets: [
            'Developed end-to-end web applications combining Python/Node.js backend APIs with responsive frontend user interfaces.',
            'Implemented secure user authentication, role-based access control (RBAC), and automated database migrations.',
            'Collaborated in Agile teams participating in sprint planning, code reviews, and CI/CD automation.',
          ],
          techStack: ['Python', 'Node.js', 'JavaScript', 'PostgreSQL', 'HTML5', 'CSS3', 'Git'],
        },
        engineering_leadership: {
          roleTitle: 'Senior Developer / Module Lead',
          bullets: [
            'Served as technical point of contact for customer-facing deliverables, estimating engineering effort and translating functional requirements into architecture.',
            'Guided junior engineers on programming idioms, git workflows, and automated testing practices.',
            'Coordinated production releases and patch deployments with zero downtime.',
          ],
          techStack: ['Module Leadership', 'Effort Estimation', 'Client Communication', 'Code Reviews'],
        },
        fullstack_platform: {
          roleTitle: 'Software Engineer (Full-Stack Development)',
          bullets: [
            'Developed end-to-end web applications combining Python/Node.js backend APIs with responsive frontend user interfaces.',
            'Implemented secure user authentication, role-based access control (RBAC), and automated database migrations.',
            'Collaborated in Agile teams participating in sprint planning, code reviews, and CI/CD automation.',
          ],
          techStack: ['Python', 'Node.js', 'JavaScript', 'PostgreSQL', 'HTML5', 'CSS3', 'Git'],
        },
        frontend_web_platform: {
          roleTitle: 'Software Engineer (Full-Stack & Web Development)',
          bullets: [
            'Constructed responsive, cross-browser frontend user interfaces using React, JavaScript (ES6+), HTML5, and CSS3 across healthcare and SaaS domains.',
            'Integrated frontend applications with scalable RESTful API backends built with Node.js and Express.',
            'Designed mobile-first responsive layouts tested across modern desktop and mobile browsers, eliminating visual discrepancies.',
          ],
          techStack: ['React', 'JavaScript', 'HTML5', 'CSS3', 'Node.js', 'Bootstrap'],
        },
      },
    },
  ],

  projects: [
    {
      id: 'proj-distributed-ledger',
      name: 'High-Throughput Distributed Event Processing & Ledger Platform',
      personas: ['backend_distributed_systems', 'devops_cloud_infra', 'fullstack_general', 'fullstack_platform'],
      domains: ['backend_distributed_systems', 'devops_cloud_infra', 'fullstack_general'],
      description:
        'Engineered an event-driven banking transaction and ledger platform handling 150k+ transactions/sec with sub-25ms p99 latency using Go, Python, Apache Kafka, Apache Cassandra, and Redis on Kubernetes.',
      technologies: 'Go, Python, Apache Kafka, Apache Cassandra, Redis, PostgreSQL, Docker, Kubernetes, gRPC',
      bullets: [
        'Architected idempotent event ingestion pipelines with Apache Kafka and RabbitMQ, handling 150k+ transaction messages/sec with zero message loss.',
        'Engineered distributed database topology using Apache Cassandra and PostgreSQL with active-active replication, slashing write latencies by 42%.',
        'Deployed containerized microservices on Kubernetes with automated Canary rollouts and zero-downtime cutovers on GCP and AWS.',
      ],
      achievementBlocks: {
        backend_distributed_systems: [
          'Architected idempotent event ingestion pipelines with Apache Kafka and RabbitMQ, handling 150k+ transaction messages/sec with zero message loss.',
          'Engineered distributed database topology using Apache Cassandra and PostgreSQL with active-active replication, slashing write latencies by 42%.',
          'Designed low-latency gRPC and Go/Python microservice contracts enforcing strict ACID ledger guarantees at sub-25ms p99 latency.',
        ],
        devops_cloud_infra: [
          'Deployed containerized ledger microservices on multi-zone Kubernetes clusters with automated Canary rollouts and zero-downtime cutovers on GCP and AWS.',
          'Automated disaster recovery runbooks and chaos failover validation, guaranteeing 99.999% platform availability.',
        ],
        fullstack_general: [
          'Architected end-to-end event-driven transaction pipelines pairing high-throughput Python/Node.js APIs with live operational observability dashboards.',
        ],
      },
    },
    {
      id: 'proj-kubernetes-cloud',
      name: 'Cloud-Native Kubernetes Infrastructure & Dynamic Environments',
      personas: ['devops_cloud_infra', 'backend_distributed_systems', 'engineering_leadership', 'fullstack_general', 'fullstack_platform'],
      domains: ['devops_cloud_infra', 'backend_distributed_systems', 'engineering_leadership', 'fullstack_general'],
      description:
        'Architected an automated multi-cluster cloud platform on AWS EKS and GCP using Terraform, Helm, and ArgoCD supporting ephemeral preview environments.',
      technologies: 'AWS EKS, GCP, Kubernetes, Terraform, Helm, ArgoCD, Prometheus, Grafana, Loki, Docker',
      bullets: [
        'Engineered self-service cloud infrastructure with Terraform and Helm, provisioning dynamic ephemeral environments for pull requests in <4 minutes.',
        'Integrated Prometheus, Grafana, Loki, and Sentry for unified metrics, distributed tracing, and automated alert deduplication.',
        'Hardened network security policies with zero-trust RBAC and mutual TLS (mTLS) across microservices.',
      ],
      achievementBlocks: {
        devops_cloud_infra: [
          'Engineered self-service cloud infrastructure with Terraform, Helm, and ArgoCD on AWS EKS & GCP, provisioning dynamic ephemeral PR environments in under 4 minutes.',
          'Integrated Prometheus, Grafana, Loki, and OpenTelemetry for unified SRE telemetry, SLO burn alerts, and cutting incident MTTR by 45%.',
          'Hardened cluster security with zero-trust RBAC, network policies, and mutual TLS (mTLS) across 45+ microservices.',
        ],
        backend_distributed_systems: [
          'Designed resilient container networking, automated horizontal pod autoscaling, and connection-pooled PostgreSQL operators on Kubernetes.',
          'Hardened service-to-service communication with mutual TLS (mTLS) and circuit-breaker policies across distributed microservices.',
        ],
        engineering_leadership: [
          'Championed enterprise DevOps transformation and GitOps platform governance across 6+ squads, accelerating developer onboarding and slashing environment provisioning lead times by 85%.',
        ],
        fullstack_general: [
          'Built ephemeral full-stack preview environments automated on every pull request, enabling rapid end-to-end QA across frontend and backend squads.',
        ],
      },
    },
    {
      id: 'proj-ai-agent-mcp',
      name: 'Enterprise Autonomous AI Agent & Model Context Protocol (MCP) Platform',
      personas: ['ai_llm_architecture', 'backend_distributed_systems', 'fullstack_general', 'fullstack_platform'],
      domains: ['ai_llm_architecture', 'backend_distributed_systems', 'fullstack_general'],
      description:
        'Engineered a production-grade agentic workflow platform using Python, FastAPI, LangGraph, and Model Context Protocol (MCP) for autonomous tool execution and clinical retrieval.',
      technologies: 'Python, FastAPI, LangGraph, Model Context Protocol (MCP), pgvector, ChromaDB, Pydantic, Azure OpenAI, Ragas, Docker',
      bullets: [
        'Architected stateful multi-agent workflows using LangGraph and Model Context Protocol (MCP), connecting LLMs safely to microservices and databases.',
        'Integrated pgvector and Chroma for semantic vector search across 5M+ records, using text-embedding-3 embeddings with sub-45ms retrieval latency.',
        'Enforced guaranteed structured output generation via Pydantic and JSON schema validation, eliminating 100% of downstream parsing errors.',
      ],
      achievementBlocks: {
        ai_llm_architecture: [
          'Built stateful multi-agent workflows using LangGraph and Model Context Protocol (MCP) to coordinate safe tool execution across enterprise systems.',
          'Integrated pgvector and ChromaDB for dense semantic search across 5M+ records with sub-45ms retrieval latency and Ragas evaluation suites.',
          'Enforced strict Pydantic structured outputs and tool-calling guardrails, eliminating downstream parsing failures.',
        ],
        backend_distributed_systems: [
          'Built a high-concurrency Python FastAPI gateway and asynchronous Redis task queues handling 15M+ AI inference requests monthly.',
        ],
        fullstack_general: [
          'Delivered end-to-end streaming AI assistant workspace coupling Next.js real-time SSE interfaces with FastAPI and LangGraph workflows.',
        ],
      },
    },
    {
      id: 'proj-rag-pipeline',
      name: 'High-Throughput Distributed RAG Ingestion Pipeline',
      personas: ['ai_llm_architecture', 'backend_distributed_systems', 'devops_cloud_infra'],
      domains: ['ai_llm_architecture', 'backend_distributed_systems', 'devops_cloud_infra'],
      description:
        'Built an event-driven RAG data pipeline on AWS and Azure using Apache Kafka, Redis, and PyTorch for asynchronous semantic indexing and Cohere reranking.',
      technologies: 'Python, PyTorch, Apache Kafka, Redis, PostgreSQL, Cohere Rerank, Docker, Kubernetes',
      bullets: [
        'Implemented hierarchical semantic chunking and reciprocal rank fusion reranking with Cohere, eliminating hallucination edge cases below 1.5%.',
        'Engineered distributed vector indexing pipelines scaling to 10M+ documents with sub-second ingestion latency.',
      ],
      achievementBlocks: {
        ai_llm_architecture: [
          'Implemented hierarchical semantic chunking and reciprocal rank fusion reranking with Cohere, keeping retrieval hallucination rates below 1.5%.',
          'Deployed vLLM continuous batching inference endpoints alongside PyTorch embedding workers.',
        ],
        backend_distributed_systems: [
          'Engineered distributed Kafka and Redis ingestion pipelines processing 10M+ documents asynchronously with idempotent vector upserts.',
        ],
        devops_cloud_infra: [
          'Configured GPU-accelerated inference nodes and autoscaling worker pools on Kubernetes with automated health probes.',
        ],
      },
    },
    {
      id: 'proj-micro-frontends',
      name: 'Enterprise Micro-Frontend Architecture & Webpack Module Federation',
      personas: ['frontend_web_platform', 'fullstack_general', 'fullstack_platform'],
      domains: ['frontend_web_platform', 'fullstack_general'],
      description:
        'Decoupled monolithic clinical portals into independently deployable micro-frontends adopted across 6+ distributed squads using React 18 and Webpack Module Federation.',
      technologies: 'React 18, Next.js, Webpack Module Federation, TypeScript, TanStack Query, Redux Toolkit',
      bullets: [
        'Decoupled a monolithic portal using Webpack Module Federation and React 18, enabling 6+ squads to deploy UI micro-apps independently with zero downtime.',
        'Optimized client-side bundle sizes by 35% and improved Core Web Vitals, raising Lighthouse scores from 62 to 94.',
      ],
      achievementBlocks: {
        frontend_web_platform: [
          'Decoupled legacy clinical views with Webpack Module Federation, React 18, and Next.js, enabling 6+ squads to ship independent UI deployments with zero downtime.',
          'Reduced JavaScript bundle payloads by 35% and improved Core Web Vitals (LCP cut by 1.8s), raising Lighthouse scores from 62 to 94.',
        ],
        fullstack_general: [
          'Connected federated React/Next.js micro-apps to GraphQL/BFF API gateways with TanStack Query caching, improving page responsiveness by 40%.',
        ],
      },
    },
    {
      id: 'proj-design-system',
      name: 'Accessible Enterprise Design System & Component Library',
      personas: ['frontend_web_platform', 'fullstack_general'],
      domains: ['frontend_web_platform', 'fullstack_general'],
      description:
        'Created a unified corporate component library and Storybook documentation conforming strictly to WCAG 2.1 AA accessibility guidelines.',
      technologies: 'React, TypeScript, Storybook, Tailwind CSS, Radix UI, WCAG 2.1 AA, Jest',
      bullets: [
        'Authored 50+ reusable accessible components with full TypeScript typing, comprehensive unit tests, and interactive Storybook documentation.',
        'Guaranteed 100% compliance with WCAG 2.1 AA accessibility standards, implementing keyboard navigation and screen-reader optimizations.',
      ],
      achievementBlocks: {
        frontend_web_platform: [
          'Authored 50+ reusable accessible UI primitives using React, TypeScript, Radix UI, and Storybook with automated visual regression testing.',
          'Guaranteed 100% compliance with WCAG 2.1 AA accessibility guidelines across healthcare and consumer banking applications.',
        ],
        fullstack_general: [
          'Standardized shared TypeScript form validation and API contract types across frontend component libraries and Node.js backend endpoints.',
        ],
      },
    },
    {
      id: 'proj-enterprise-governance',
      name: 'Enterprise Architecture Modernization & Technical Governance Platform',
      personas: ['engineering_leadership', 'backend_distributed_systems', 'devops_cloud_infra'],
      domains: ['engineering_leadership', 'backend_distributed_systems', 'devops_cloud_infra'],
      description:
        'Led cross-organization architecture governance, formal RFC/ADR processes, and domain-driven modernization from monoliths to cloud-native microservices across 6+ squads.',
      technologies: 'RFC/ADR Governance, Domain-Driven Design, Microservices Architecture, HIPAA, MAS, SOC 2, AWS, GCP',
      bullets: [
        'Instituted enterprise ADR/RFC governance and automated CI/CD compliance gates across 6+ squads, elevating deployment velocity by 30% while cutting incident MTTR by 45%.',
        'Directed multi-quarter platform modernization migrating 45+ legacy monolithic modules into resilient cloud microservices under strict HIPAA and SOC 2 compliance.',
      ],
      achievementBlocks: {
        engineering_leadership: [
          'Instituted formal RFC/ADR architecture review boards across 6+ engineering squads (12+ senior engineers), aligning delivery roadmaps and cutting technical debt.',
          'Guided zero-downtime monolith decomposition and regulatory compliance (HIPAA, MAS, SOC 2), cutting production incident MTTR by 45%.',
        ],
        backend_distributed_systems: [
          'Defined canonical Domain-Driven Design bounded contexts, gRPC/Protobuf schemas, and distributed fault-isolation standards across 45+ backend services.',
        ],
        devops_cloud_infra: [
          'Mandated unified SLO/SLI reliability standards, automated canary verification, and FinOps cloud cost budgets across AWS and GCP.',
        ],
      },
    },
  ],

  education: [
    {
      degree: 'Master of Computer Application',
      school: 'Guru Gobind Singh Indraprastha University',
      year: '2016',
      location: 'India',
    },
    {
      degree: 'Bachelor of Computer Applications (BCA)',
      school: 'UPRTO University',
      year: '2009 – 2012',
      location: 'India',
    },
  ],

  certifications: [
    'AWS Certified: Cloud-Native Architecture Specialization',
    'Anthropic / Community: Model Context Protocol (MCP) Architecture & Agentic Systems',
    'DeepLearning.AI: Generative AI with Large Language Models',
    'DeepLearning.AI: LangChain for LLM Application Development',
    'HackerRank: Problem Solving (Advanced), Python (Advanced), SQL (Advanced), JavaScript (Advanced)',
  ],

  languages: ['English (Full Professional Proficiency)', 'Hindi (Native)'],
};

// Validate against Zod schema to guarantee runtime data integrity
export const candidateMasterProfile: CandidateMasterProfile =
  CandidateMasterProfileSchema.parse(rawCandidateMasterProfile);
