import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { classifyJobDescription, type JobDescriptionInput } from '../jdClassifier.ts';
import { assembleResumeContext } from '../resumeAssembler.ts';
import { candidateMasterProfile } from '../../data/candidateMasterProfile.ts';
import { validatePersonaAlignment } from '../../validators/atsResumeValidators.ts';

describe('Universal Persona Engine & JD Classifier', () => {
  // =========================================================================
  // Archetype 1: Backend & Distributed Systems (Monzo Senior Staff Backend)
  // =========================================================================
  describe('Archetype 1: Monzo Senior Staff Backend Engineer', () => {
    const monzoJd: JobDescriptionInput = {
      url: 'https://job-boards.greenhouse.io/monzo/jobs/6036797',
      title: 'Senior Staff Backend Engineer',
      companyName: 'Monzo',
      country: 'UK',
      workMode: 'remote',
      description: `Monzo is building the best bank in the world. We are looking for a Senior Staff Backend Engineer
to lead our core banking platform and distributed transaction ledger. You will design, build, and scale
fault-tolerant microservices handling millions of financial operations daily. You will partner with infrastructure
teams on Kubernetes across Google Cloud Platform (GCP) and orchestrate high-throughput event streaming with Apache Kafka.
You will architect database topologies on PostgreSQL and Apache Cassandra with strong consistency guarantees.`,
      requiredSkills: [
        'Go',
        'Distributed Systems',
        'Apache Kafka',
        'Apache Cassandra',
        'Kubernetes',
        'PostgreSQL',
        'Microservices',
        'gRPC',
      ],
      preferredSkills: ['Redis', 'Docker', 'Terraform', 'System Design'],
    };

    it('classifies correctly as backend_distributed_systems with 0% frontend weight', () => {
      const parsed = classifyJobDescription(monzoJd);

      assert.equal(parsed.primaryDomain, 'backend_distributed_systems');
      assert.ok(
        parsed.domainWeightDistribution.backend_distributed_systems >= 0.80,
        `Backend weight should be >= 0.80, received ${parsed.domainWeightDistribution.backend_distributed_systems}`
      );
      assert.equal(
        parsed.domainWeightDistribution.frontend_web_platform,
        0,
        'Frontend weight must be strictly 0.00 for pure backend roles'
      );
      assert.equal(parsed.companyName, 'Monzo');
    });

    it('parses a raw Monzo Greenhouse URL directly into backend_distributed_systems', () => {
      const parsedUrlOnly = classifyJobDescription(
        'https://job-boards.greenhouse.io/monzo/jobs/6036797'
      );

      assert.equal(parsedUrlOnly.companyName, 'Monzo');
      assert.equal(parsedUrlOnly.jobTitle, 'Senior Staff Backend Engineer');
      assert.equal(parsedUrlOnly.primaryDomain, 'backend_distributed_systems');
      assert.equal(parsedUrlOnly.domainWeightDistribution.frontend_web_platform, 0);
      assert.ok(parsedUrlOnly.coreRequiredSkills.includes('Go'));
    });

    it('assembles resume with 0% UI keywords and weaves architectural equivalents', () => {
      const parsed = classifyJobDescription(monzoJd);
      const resume = assembleResumeContext(candidateMasterProfile, parsed);

      const allBullets = resume.experience.flatMap((e) => e.bullets);
      const personaValidation = validatePersonaAlignment(
        parsed.jobTitle,
        resume.basics.summary,
        allBullets
      );

      assert.equal(personaValidation.isValid, true);
      assert.equal(personaValidation.metrics?.uiRatio, 0);

      const fullText = JSON.stringify(resume);
      assert.ok(!fullText.includes('Webpack Module Federation'));
      assert.ok(!fullText.includes('Storybook'));
      assert.ok(!fullText.includes('Lighthouse'));

      assert.ok(fullText.includes('Cassandra'));
      assert.ok(fullText.includes('Apache Kafka'));
      assert.ok(fullText.includes('Kubernetes'));
    });
  });

  // =========================================================================
  // Archetype 2: React / Next.js Frontend Role (Raw JD Text Extraction)
  // =========================================================================
  describe('Archetype 2: React / Next.js Staff Frontend Engineer (Raw Text)', () => {
    const rawFrontendJd = `
# Staff Frontend & Web Platform Engineer
Company: Stripe
Location: San Francisco, USA (Remote)

About the role:
Lead frontend web architecture, enterprise Design System component library, and web performance optimization across global merchant dashboards using React, Next.js, TypeScript, Webpack Module Federation, and Tailwind CSS.
Drive dramatic Core Web Vitals (LCP, INP, CLS) improvements, optimize Lighthouse scores, and enforce WCAG 2.1 AA accessibility with Storybook and Figma design tokens.
    `;

    it('extracts metadata from raw text and enforces 0% backend/devops weight', () => {
      const parsed = classifyJobDescription(rawFrontendJd);

      assert.equal(parsed.jobTitle, 'Staff Frontend & Web Platform Engineer');
      assert.equal(parsed.companyName, 'Stripe');
      assert.equal(parsed.country, 'USA');
      assert.equal(parsed.workMode, 'remote');
      assert.equal(parsed.primaryDomain, 'frontend_web_platform');
      assert.ok(
        parsed.domainWeightDistribution.frontend_web_platform >= 0.80,
        `Frontend weight should be >= 0.80, received ${parsed.domainWeightDistribution.frontend_web_platform}`
      );
      assert.equal(parsed.domainWeightDistribution.backend_distributed_systems, 0);
      assert.equal(parsed.domainWeightDistribution.devops_cloud_infra, 0);
      assert.ok(parsed.coreRequiredSkills.includes('React'));
      assert.ok(parsed.coreRequiredSkills.includes('Next.js'));
    });

    it('assembles resume focusing on React/Next.js/Design Systems with zero backend/AI contamination', () => {
      const parsed = classifyJobDescription(rawFrontendJd);
      const resume = assembleResumeContext(candidateMasterProfile, parsed);

      const allBullets = resume.experience.flatMap((e) => e.bullets);
      assert.ok(allBullets.some((b) => b.includes('React 18') || b.includes('React.js')));
      assert.ok(allBullets.some((b) => b.includes('Next.js')));
      assert.ok(allBullets.some((b) => b.includes('Design System') || b.includes('Storybook')));

      const fullText = JSON.stringify(resume);
      assert.ok(!fullText.includes('PgBouncer'));
      assert.ok(!fullText.includes('dead-letter queue'));
      assert.ok(!fullText.includes('LangGraph'));
      assert.ok(!fullText.includes('Model Context Protocol'));
    });
  });

  // =========================================================================
  // Archetype 3: AI & LLM Systems (Anthropic Senior AI Engineer)
  // =========================================================================
  describe('Archetype 3: Anthropic Senior AI & LLM Systems Engineer', () => {
    const aiJd: JobDescriptionInput = {
      title: 'Senior AI Engineer - Agentic Systems & Model Context Protocol',
      companyName: 'Anthropic',
      country: 'USA',
      workMode: 'remote',
      description: `Architect stateful agentic workflows, Model Context Protocol (MCP) servers, and scalable retrieval-augmented generation (RAG) pipelines using Python, FastAPI, LangGraph, pgvector, and vector databases. Enforce quantitative evaluation using Ragas and continuous batching with vLLM.`,
      requiredSkills: [
        'Python',
        'FastAPI',
        'LangGraph',
        'Model Context Protocol',
        'MCP',
        'pgvector',
        'RAG',
        'Vector Search',
        'vLLM',
        'Ragas',
      ],
      preferredSkills: ['PyTorch', 'ChromaDB', 'Docker'],
    };

    it('classifies correctly as ai_llm_architecture with 0% frontend weight', () => {
      const parsed = classifyJobDescription(aiJd);

      assert.equal(parsed.primaryDomain, 'ai_llm_architecture');
      assert.ok(
        parsed.domainWeightDistribution.ai_llm_architecture >= 0.70,
        `AI weight should be >= 0.70, received ${parsed.domainWeightDistribution.ai_llm_architecture}`
      );
      assert.equal(parsed.domainWeightDistribution.frontend_web_platform, 0);
    });

    it('assembles resume focusing on Model Context Protocol, LangGraph, and RAG pipelines with zero UI contamination', () => {
      const parsed = classifyJobDescription(aiJd);
      const resume = assembleResumeContext(candidateMasterProfile, parsed);

      const allBullets = resume.experience.flatMap((e) => e.bullets);
      assert.ok(allBullets.some((b) => b.includes('Model Context Protocol') || b.includes('LangGraph')));
      assert.ok(allBullets.some((b) => b.includes('RAG') || b.includes('pgvector')));

      const fullText = JSON.stringify(resume);
      assert.ok(!fullText.includes('Webpack Module Federation'));
      assert.ok(!fullText.includes('Storybook'));
      assert.ok(!fullText.includes('Tailwind CSS'));
    });
  });

  // =========================================================================
  // Archetype 4: DevOps & SRE Platform Engineer (80% DevOps / 20% Backend)
  // =========================================================================
  describe('Archetype 4: Datadog Staff DevOps & SRE Platform Engineer', () => {
    const devopsJd: JobDescriptionInput = {
      title: 'Staff DevOps & SRE Platform Engineer',
      companyName: 'Datadog',
      country: 'Germany',
      workMode: 'remote',
      description: `Architect multi-region Kubernetes platform clusters, automated Terraform IaC modules, Helm charts, and GitOps pipelines with ArgoCD on AWS and GCP. Maintain 99.999% reliability and observability with Prometheus, Grafana, and Datadog.`,
      requiredSkills: [
        'Kubernetes',
        'Docker',
        'Terraform',
        'Helm',
        'ArgoCD',
        'AWS',
        'GCP',
        'Prometheus',
        'Grafana',
        'CI/CD',
        'GitOps',
      ],
      preferredSkills: ['Linux', 'OpenTelemetry', 'Python', 'Datadog'],
    };

    it('classifies correctly as devops_cloud_infra (80% DevOps / 20% Backend) with 0% frontend weight', () => {
      const parsed = classifyJobDescription(devopsJd);

      assert.equal(parsed.primaryDomain, 'devops_cloud_infra');
      assert.equal(parsed.domainWeightDistribution.devops_cloud_infra, 0.80);
      assert.equal(parsed.domainWeightDistribution.backend_distributed_systems, 0.20);
      assert.equal(parsed.domainWeightDistribution.frontend_web_platform, 0);
    });

    it('assembles resume emphasizing Kubernetes, Terraform IaC, ArgoCD, and SRE telemetry with 0% UI contamination', () => {
      const parsed = classifyJobDescription(devopsJd);
      const resume = assembleResumeContext(candidateMasterProfile, parsed);

      const allBullets = resume.experience.flatMap((e) => e.bullets);
      assert.ok(allBullets.some((b) => b.includes('Kubernetes') && b.includes('AWS')));
      assert.ok(allBullets.some((b) => b.includes('Terraform') || b.includes('ArgoCD')));
      assert.ok(allBullets.some((b) => b.includes('Prometheus') || b.includes('Grafana')));
      // Proportional 80/20 distribution weaves backend microservices into SRE profile
      assert.ok(
        allBullets.some((b) => /microservices|PostgreSQL|Kafka|FastAPI|backend/i.test(b)),
        'SRE profile with 20% backend weight must weave supporting backend microservices'
      );

      const fullText = JSON.stringify(resume);
      assert.ok(!fullText.includes('Webpack Module Federation'));
      assert.ok(!fullText.includes('Storybook'));
      assert.ok(!fullText.includes('Tailwind CSS'));
    });
  });

  // =========================================================================
  // Archetype 5: Full-Stack Generalist (50% Frontend / 50% Backend)
  // =========================================================================
  describe('Archetype 5: Staff Full-Stack Product Engineer (Balanced 50/50)', () => {
    const fullstackJd: JobDescriptionInput = {
      title: 'Staff Full-Stack Engineer',
      companyName: 'Figma',
      country: 'UK',
      workMode: 'hybrid',
      description: `Build end-to-end web applications uniting responsive React and Next.js client interfaces with resilient Node.js, Python, and PostgreSQL backend APIs. Design type-safe GraphQL endpoints and collaborate across product engineering squads.`,
      requiredSkills: [
        'TypeScript',
        'React',
        'Next.js',
        'Node.js',
        'PostgreSQL',
        'GraphQL',
        'Python',
      ],
      preferredSkills: ['Redis', 'Tailwind CSS'],
    };

    it('classifies as fullstack_general and assigns 50% backend / 50% frontend weights', () => {
      const parsed = classifyJobDescription(fullstackJd);

      assert.equal(parsed.primaryDomain, 'fullstack_general');
      assert.equal(parsed.domainWeightDistribution.backend_distributed_systems, 0.50);
      assert.equal(parsed.domainWeightDistribution.frontend_web_platform, 0.50);
    });

    it('assembles a proportionally balanced full-stack resume featuring both React/Next.js and Node.js/PostgreSQL bullets', () => {
      const parsed = classifyJobDescription(fullstackJd);
      const resume = assembleResumeContext(candidateMasterProfile, parsed);

      const allBullets = resume.experience.flatMap((e) => e.bullets);
      assert.ok(
        allBullets.some((b) => /React|Next\.js|Design System|micro-frontend/i.test(b)),
        'Full-Stack resume must contain frontend achievements'
      );
      assert.ok(
        allBullets.some((b) => /Python|Node\.js|PostgreSQL|microservices|FastAPI/i.test(b)),
        'Full-Stack resume must contain backend achievements'
      );
    });
  });

  // =========================================================================
  // Archetype 6: Engineering Leadership & Technical Architecture
  // =========================================================================
  describe('Archetype 6: Engineering Lead & Technical Delivery Director', () => {
    const leadershipJd: JobDescriptionInput = {
      title: 'Engineering Lead / Director of Platform Architecture',
      companyName: 'Fintech Global',
      country: 'Singapore',
      workMode: 'hybrid',
      description: `Lead distributed engineering squads (12+ senior engineers), establishing architecture decision records (ADRs), RFC processes, technical strategy, and agile delivery under strict MAS banking and SOC 2 regulatory compliance. Partner with executive stakeholders and reduce incident MTTR.`,
      requiredSkills: [
        'Engineering Leadership',
        'System Architecture',
        'Agile Delivery',
        'RFC & ADR Governance',
        'MAS Compliance',
        'Mentorship',
        'Cloud Strategy',
      ],
      preferredSkills: ['Microservices', 'Disaster Recovery', 'FinOps'],
    };

    it('classifies correctly as engineering_leadership with leadership weight >= 0.50', () => {
      const parsed = classifyJobDescription(leadershipJd);

      assert.equal(parsed.primaryDomain, 'engineering_leadership');
      assert.ok(
        parsed.domainWeightDistribution.engineering_leadership >= 0.50,
        `Leadership weight should be >= 0.50, received ${parsed.domainWeightDistribution.engineering_leadership}`
      );
    });

    it('assembles resume highlighting squad mentorship, ADR/RFC governance, and compliance', () => {
      const parsed = classifyJobDescription(leadershipJd);
      const resume = assembleResumeContext(candidateMasterProfile, parsed);

      const allBullets = resume.experience.flatMap((e) => e.bullets);
      assert.ok(allBullets.some((b) => b.includes('squads') || b.includes('engineers')));
      assert.ok(allBullets.some((b) => b.includes('ADR') || b.includes('RFC')));
      assert.ok(allBullets.some((b) => b.includes('MAS') || b.includes('HIPAA') || b.includes('SOC 2')));

      // Verify engineering_leadership modular project block is selected
      assert.ok(
        resume.projects.some((p) => p.name.includes('Governance') || p.name.includes('Kubernetes'))
      );
    });
  });

  // =========================================================================
  // Archetype 7: Mobile & Client-Platform Engineering (React Native / iOS / Android)
  // =========================================================================
  describe('Archetype 7: Staff Mobile Platform Engineer', () => {
    const mobileJd: JobDescriptionInput = {
      title: 'Staff Mobile Engineer (React Native / iOS / Android)',
      companyName: 'Revolut',
      country: 'UK',
      workMode: 'remote',
      description: `Architect high-performance cross-platform mobile applications using React Native, TypeScript, iOS, and Android. Optimize 60 FPS mobile render performance, design client-side caching, and integrate with financial backend APIs.`,
      requiredSkills: ['React Native', 'TypeScript', 'iOS', 'Android', 'RESTful APIs'],
      preferredSkills: ['Redux', 'Tailwind CSS'],
    };

    it('classifies mobile role into frontend_web_platform with zero backend/infra weight', () => {
      const parsed = classifyJobDescription(mobileJd);

      assert.equal(parsed.primaryDomain, 'frontend_web_platform');
      assert.equal(parsed.domainWeightDistribution.frontend_web_platform, 1.00);
      assert.equal(parsed.domainWeightDistribution.backend_distributed_systems, 0.00);
    });
  });
});
