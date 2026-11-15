import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyPersona,
  filterCandidateProfile,
  formatProfileForPromptContext,
} from '../personaRouter.ts';
import { candidateMasterProfile } from '../../data/candidateMasterProfile.ts';
import {
  validatePersonaAlignment,
  validateNoOrphanedSkills,
} from '../../validators/atsResumeValidators.ts';

// Realistic Monzo Senior Staff Backend Engineer JD Payload
const MONZO_BACKEND_JD = {
  title: 'Senior Staff Backend Engineer',
  companyName: 'Monzo',
  country: 'UK',
  description: `Monzo is building the best bank in the world. We are looking for a Senior Staff Backend Engineer
to lead our core banking platform and distributed transaction ledger. You will design, build, and scale
fault-tolerant microservices handling millions of financial operations daily. You will partner with infrastructure
teams on Kubernetes across Google Cloud Platform (GCP) and orchestrate high-throughput event streaming with Apache Kafka.
You will architect database topologies on PostgreSQL and Apache Cassandra with strong consistency guarantees.`,
  requiredSkills: [
    'Go',
    'Golang',
    'Distributed Systems',
    'Apache Kafka',
    'Apache Cassandra',
    'Kubernetes',
    'GCP',
    'PostgreSQL',
    'Microservices',
    'gRPC',
    'System Design',
    'REST APIs',
  ],
  preferredSkills: ['Redis', 'Docker', 'Terraform', 'RabbitMQ', 'OAuth 2.0 PKCE', 'High Concurrency'],
};

// Frontend JD for Persona Routing Verification
const STRIPE_FRONTEND_JD = {
  title: 'Staff Frontend & Web Platform Engineer',
  companyName: 'Stripe',
  description: `Lead frontend architecture, design system component libraries, and performance optimization across global merchant dashboards using React 18, Next.js, TypeScript, and Webpack.`,
  requiredSkills: ['React', 'Next.js', 'TypeScript', 'Storybook', 'Core Web Vitals', 'Lighthouse', 'WCAG 2.1 AA', 'Tailwind CSS'],
};

// AI/LLM JD for Persona Routing Verification
const ANTHROPIC_AI_JD = {
  title: 'Senior AI Engineer - Agentic Systems & Model Context Protocol',
  companyName: 'Anthropic',
  description: `Architect stateful agentic workflows, Model Context Protocol (MCP) servers, and scalable retrieval-augmented generation (RAG) pipelines using Python, LangGraph, and vector databases.`,
  requiredSkills: ['Python', 'FastAPI', 'LangGraph', 'Model Context Protocol', 'MCP', 'pgvector', 'RAG', 'Vector Search'],
};

describe('TDD Step 2: Multi-Persona Schema & Router (Fixing Defect #1)', () => {

  describe('Persona Classifier', () => {
    it('classifies Monzo Senior Staff Backend Engineer JD as backend_distributed_systems', () => {
      const result = classifyPersona(MONZO_BACKEND_JD);

      assert.equal(
        result.primaryPersona,
        'backend_distributed_systems',
        'Monzo Backend JD must be classified as backend_distributed_systems'
      );
      assert.ok(result.confidence > 0.5, 'Classification confidence should exceed 50%');
      assert.ok(
        result.scores.backend_distributed_systems > result.scores.frontend_web_platform,
        'Backend score must significantly exceed frontend score'
      );
      assert.match(
        result.reasoning,
        /backend_distributed_systems/i,
        'Reasoning should cite the backend persona'
      );
    });

    it('classifies Frontend JD as frontend_web_platform', () => {
      const result = classifyPersona(STRIPE_FRONTEND_JD);
      assert.equal(result.primaryPersona, 'frontend_web_platform');
    });

    it('classifies AI JD as ai_llm_architecture', () => {
      const result = classifyPersona(ANTHROPIC_AI_JD);
      assert.equal(result.primaryPersona, 'ai_llm_architecture');
    });
  });

  describe('Candidate Profile Filtering for Backend Persona', () => {
    it('filters candidate profile strictly for backend_distributed_systems with 0% UI keywords', () => {
      const filtered = filterCandidateProfile(
        candidateMasterProfile,
        'backend_distributed_systems'
      );

      // Verify basics
      assert.match(filtered.basics.title, /Backend Engineer/i);
      assert.match(filtered.basics.summary, /distributed systems/i);
      assert.match(filtered.basics.summary, /Kafka|Cassandra|PostgreSQL/i);

      // Verify summary does NOT contain frontend keywords
      assert.doesNotMatch(filtered.basics.summary, /Lighthouse/i);
      assert.doesNotMatch(filtered.basics.summary, /Core Web Vitals/i);
      assert.doesNotMatch(filtered.basics.summary, /Storybook/i);
      assert.doesNotMatch(filtered.basics.summary, /Webpack Module Federation/i);

      // Verify experiences have backend-aligned bullets
      const allExperienceBullets = filtered.experience.flatMap((e) => e.bullets);
      assert.ok(allExperienceBullets.length >= 10, 'Must have comprehensive backend bullets');

      // Verify specific backend accomplishments are present
      const combinedBulletsText = allExperienceBullets.join(' ');
      assert.match(combinedBulletsText, /Apache Kafka/i);
      assert.match(combinedBulletsText, /PostgreSQL/i);
      assert.match(combinedBulletsText, /Kubernetes/i);
      assert.match(combinedBulletsText, /FastAPI|Spring Boot|NestJS/i);
      assert.match(combinedBulletsText, /OAuth 2\.0 PKCE|MAS/i);
      assert.match(combinedBulletsText, /25M\+ daily/i);

      // CRITICAL CHECK: 0% pure UI/CSS/Lighthouse/Storybook/WCAG bullets
      for (const bullet of allExperienceBullets) {
        assert.doesNotMatch(bullet, /\bLighthouse\b/i);
        assert.doesNotMatch(bullet, /\bCore Web Vitals\b/i);
        assert.doesNotMatch(bullet, /\bStorybook\b/i);
        assert.doesNotMatch(bullet, /\bWCAG\b/i);
        assert.doesNotMatch(bullet, /\bFigma\b/i);
      }

      // Verify Frontend-only projects are excluded
      const projectNames = filtered.projects.map((p) => p.name);
      assert.ok(
        !projectNames.some((name) => /Design System/i.test(name)),
        'Frontend Design System project must be excluded from backend persona'
      );
      assert.ok(
        !projectNames.some((name) => /Micro-Frontend/i.test(name)),
        'Micro-Frontend project must be excluded from backend persona'
      );

      // Verify Backend projects are included
      assert.ok(
        projectNames.some((name) => /Distributed Event Processing|Ledger/i.test(name)),
        'Distributed ledger project must be included'
      );
      assert.ok(
        projectNames.some((name) => /Kubernetes/i.test(name)),
        'Kubernetes platform project must be included'
      );
    });
  });

  describe('Integration with atsResumeValidators (Defect #1 Resolution)', () => {
    it('CONFIRMS validatePersonaAlignment PASSES with 0% UI ratio for Monzo Backend role', () => {
      // 1. Route the Monzo JD
      const routing = classifyPersona(MONZO_BACKEND_JD);
      assert.equal(routing.primaryPersona, 'backend_distributed_systems');

      // 2. Filter profile by persona
      const filtered = filterCandidateProfile(candidateMasterProfile, routing.primaryPersona);

      // 3. Validate persona alignment
      const alignmentResult = validatePersonaAlignment(
        MONZO_BACKEND_JD.title,
        filtered.basics.summary,
        filtered.experience.flatMap((e) => e.bullets)
      );

      // MUST PASS!
      assert.equal(
        alignmentResult.isValid,
        true,
        `validatePersonaAlignment must pass when profile is properly persona-filtered. Errors: ${alignmentResult.errors.join('; ')}`
      );
      assert.equal(alignmentResult.errors.length, 0);
      assert.equal(alignmentResult.metrics?.uiRatio, 0, 'UI ratio must be strictly 0%');
    });

    it('CONFIRMS validateNoOrphanedSkills PASSES for filtered Monzo backend profile', () => {
      const routing = classifyPersona(MONZO_BACKEND_JD);
      const filtered = filterCandidateProfile(candidateMasterProfile, routing.primaryPersona);

      const allExpBullets = filtered.experience.flatMap((e) => e.bullets);
      const allProjBullets = filtered.projects.flatMap((p) => p.bullets);

      const skillsResult = validateNoOrphanedSkills(
        filtered.skillsSection,
        allExpBullets,
        allProjBullets
      );

      assert.equal(
        skillsResult.isValid,
        true,
        `validateNoOrphanedSkills must pass. Errors: ${skillsResult.errors.join('; ')}`
      );
      assert.equal(skillsResult.errors.length, 0);
      assert.equal(skillsResult.metrics?.hasAdditionalSkillsCategory, false);
      assert.equal(((skillsResult.metrics?.orphanedSkills as string[]) || []).length, 0);
    });

    it('formats clean prompt context ready for LLM generation', () => {
      const routing = classifyPersona(MONZO_BACKEND_JD);
      const filtered = filterCandidateProfile(candidateMasterProfile, routing.primaryPersona);
      const promptContext = formatProfileForPromptContext(filtered);

      assert.ok(promptContext.includes('Persona Track: BACKEND_DISTRIBUTED_SYSTEMS'));
      assert.ok(promptContext.includes('Apache Kafka'));
      assert.ok(promptContext.includes('Persistent Systems Ltd.'));
      assert.ok(!promptContext.includes('Lighthouse (6294)'));
      assert.ok(!promptContext.includes('Accessible Enterprise Design System'));
    });
  });
});

