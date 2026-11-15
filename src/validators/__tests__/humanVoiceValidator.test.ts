import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';

import {
  validateHumanEngineeringVoice,
  BANNED_AI_BUZZWORDS,
} from '../atsResumeValidators.ts';
import {
  critiqueAndReviseResume,
  rewriteToHumanEngineeringVoice,
  type ResumeDraft,
} from '../../agents/resumeCritic.ts';
import { classifyJobDescription } from '../../agents/jdClassifier.ts';
import { assembleResumeContext } from '../../agents/resumeAssembler.ts';
import { candidateMasterProfile } from '../../data/candidateMasterProfile.ts';

describe('Human Engineering Voice & Anti-Buzzword Guardrails', () => {
  describe('Banned AI Buzzword Detection', () => {
    it('flags every banned AI cliché/buzzword and fails validation', () => {
      const roboticPhrases = [
        'Spearheaded the seamless orchestration of enterprise micro-frontends.',
        'Pioneered next-gen distributed ledgers across banking teams.',
        'Orchestrated zero-downtime deployments across Kubernetes clusters.',
        'Delved into microservices bottlenecks to improve uptime.',
        'Testaments to resilient backend engineering practices.',
        'Navigated a dynamic landscape of cloud-native tooling.',
        'Robustly scaled event pipelines across multiple availability zones.',
        'Seamlessly integrated third-party payment APIs with zero lag.',
        'Leveraging cutting-edge Generative AI capabilities for triage.',
        'Built cross-team synergy between product and DevOps engineers.',
        'Revolutionized the checkout experience for global e-commerce shoppers.',
        'Operated mission-critical banking databases at high throughput.',
      ];

      assert.equal(
        roboticPhrases.length,
        BANNED_AI_BUZZWORDS.length,
        'Each banned buzzword category must be explicitly tested'
      );

      for (const phrase of roboticPhrases) {
        const res = validateHumanEngineeringVoice('', [phrase]);
        assert.equal(res.isValid, false, `Must reject AI cliché: "${phrase}"`);
        assert.ok(
          (res.metrics?.bannedBuzzwordsFound as string[])?.length >= 1,
          `Must report buzzword match for: "${phrase}"`
        );
      }
    });

    it('rejects weak passive bullet starters', () => {
      const weakBullets = [
        'Worked on React dashboards for hospital administrators.',
        'Responsible for maintaining Kubernetes deployments.',
        'Helped with database query tuning in PostgreSQL.',
      ];

      const res = validateHumanEngineeringVoice('', weakBullets);
      assert.equal(res.isValid, false);
      assert.equal((res.metrics?.passiveStarters as string[])?.length, 3);
    });

    it('passes direct, human engineering bullets following the natural XYZ formula', () => {
      const humanSummary =
        'Senior Backend Engineer with 10+ years of experience building and scaling distributed microservices using Go, Python, PostgreSQL, and Kubernetes.';
      const humanBullets = [
        'Decoupled a monolithic clinical portal into 6 independent React micro-apps using Webpack Module Federation, enabling parallel deployments across teams.',
        'Built high-throughput healthcare backend microservices using Python (FastAPI) and Node.js, handling 15M+ monthly API requests with 99.99% availability.',
        'Migrated 45+ monolithic services to containerized microservices on AWS EKS using Terraform and Helm, cutting provisioning time from 3 days to 15 minutes.',
        'Optimized PostgreSQL query plans and PgBouncer connection pooling, reducing p99 latency from 180ms to 28ms.',
      ];

      const res = validateHumanEngineeringVoice(humanSummary, humanBullets);
      assert.equal(res.isValid, true, `Human bullets should pass. Errors: ${res.errors.join('; ')}`);
      assert.deepEqual(res.errors, []);
    });
  });

  describe('LLM System Prompts Compliance Check', () => {
    it('enforces banned-buzzword and human-voice rules in resume writer LLM prompts', () => {
      const repoRoot = process.cwd();
      const promptFiles = [
        path.join(repoRoot, 'packages/ai/src/ai/prompts/resume.ts'),
        path.join(repoRoot, 'packages/ai/src/agents/ats-optimizer.ts'),
        path.join(repoRoot, 'apps/api/src/ai/ai.service.ts'),
      ];

      for (const filePath of promptFiles) {
        assert.ok(fs.existsSync(filePath), `Prompt file must exist: ${filePath}`);
        const content = fs.readFileSync(filePath, 'utf-8');

        assert.match(content, /spearheaded/i, `${path.basename(filePath)} must explicitly list spearheaded as banned`);
        assert.match(content, /seamlessly/i, `${path.basename(filePath)} must explicitly mention seamlessly ban`);
        assert.match(content, /Decoupled a monolithic clinical portal|Built.*Scaled.*Migrated/i, `${path.basename(filePath)} must include concrete human verbs`);
      }
    });
  });

  describe('Generated Resume Bullet Scan Across All Universal Domains', () => {
    it('scans all generated summary and experience bullets across Backend, Frontend, AI, DevOps, Full-Stack, and Leadership for ZERO banned AI buzzwords', () => {
      const domainJds = [
        {
          title: 'Senior Staff Backend Engineer',
          companyName: 'Monzo',
          country: 'UK',
          workMode: 'remote' as const,
          description: 'Distributed backend systems using Go, Kafka, Cassandra, Kubernetes, PostgreSQL.',
          requiredSkills: ['Go', 'Apache Kafka', 'Apache Cassandra', 'Kubernetes', 'PostgreSQL'],
        },
        {
          title: 'Staff Frontend & Web Platform Engineer',
          companyName: 'Stripe',
          country: 'USA',
          workMode: 'remote' as const,
          description: 'React, Next.js, TypeScript, Webpack Module Federation, Design Systems, Storybook.',
          requiredSkills: ['React', 'Next.js', 'TypeScript', 'Storybook', 'Webpack Module Federation'],
        },
        {
          title: 'Senior AI & LLM Engineer',
          companyName: 'Anthropic',
          country: 'USA',
          workMode: 'remote' as const,
          description: 'LangGraph, Model Context Protocol (MCP), RAG, pgvector, Ragas, vLLM.',
          requiredSkills: ['Python', 'LangGraph', 'MCP', 'RAG', 'pgvector'],
        },
        {
          title: 'Staff DevOps & SRE Platform Engineer',
          companyName: 'Datadog',
          country: 'Germany',
          workMode: 'remote' as const,
          description: 'Kubernetes, Terraform, ArgoCD, Prometheus, Grafana, AWS, GCP.',
          requiredSkills: ['Kubernetes', 'Terraform', 'ArgoCD', 'Prometheus', 'AWS'],
        },
        {
          title: 'Staff Full-Stack Engineer',
          companyName: 'Grab',
          country: 'Singapore',
          workMode: 'hybrid' as const,
          description: 'React, Next.js, Node.js, PostgreSQL, Redis, GraphQL, AWS.',
          requiredSkills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Redis'],
        },
        {
          title: 'Engineering Lead / Technical Director',
          companyName: 'FinTech Global',
          country: 'Singapore',
          workMode: 'hybrid' as const,
          description: 'Squad leadership, RFC & ADR governance, HIPAA, MAS compliance.',
          requiredSkills: ['Engineering Leadership', 'System Architecture', 'HIPAA', 'MAS'],
        },
      ];

      for (const jd of domainJds) {
        const parsedJd = classifyJobDescription(jd);
        const assembled = assembleResumeContext(candidateMasterProfile, parsedJd);
        const draft: ResumeDraft = {
          basics: assembled.basics,
          skillsSection: assembled.skillsSection,
          experience: assembled.experience,
          projects: assembled.projects,
        };

        const reviewed = critiqueAndReviseResume(draft, parsedJd.jobTitle, parsedJd.primaryDomain);
        assert.equal(reviewed.approved, true);

        const expBullets = reviewed.revisedDraft.experience.flatMap((e) => e.bullets);
        const projBullets = reviewed.revisedDraft.projects.flatMap((p) => p.bullets || []);

        const voiceValidation = validateHumanEngineeringVoice(
          reviewed.revisedDraft.basics.summary,
          expBullets,
          projBullets
        );

        assert.equal(
          voiceValidation.isValid,
          true,
          `[${jd.title}] Generated resume contains banned AI buzzwords: ${voiceValidation.errors.join('; ')}`
        );
      }
    });

    it('automatically rewrites robotic AI buzzwords injected into a draft inside critiqueAndReviseResume', () => {
      const roboticDraft: ResumeDraft = {
        basics: {
          name: 'Ashish Kumar Singh',
          title: 'Senior Staff Backend Engineer',
          summary:
            'Engineer operating mission-critical banking services and seamlessly orchestrating distributed workflows in a dynamic landscape.',
          location: 'Noida, India (Open to UK Relocation | Skilled Worker Visa Sponsorship Required)',
        },
        skillsSection: {
          'Backend & Distributed Systems': ['Python', 'PostgreSQL'],
        },
        experience: [
          {
            role: 'Senior Backend Engineer',
            company: 'Persistent Systems Ltd.',
            bullets: [
              'Spearheaded high-throughput microservices using Python and PostgreSQL, seamlessly cutting API latency.',
              'Pioneered cutting-edge caching layers for mission-critical healthcare queries.',
              'Orchestrated automated failovers robustly across distributed clusters.',
            ],
          },
        ],
        projects: [],
      };

      const review = critiqueAndReviseResume(
        roboticDraft,
        'Senior Staff Backend Engineer',
        'backend_distributed_systems'
      );

      assert.equal(review.approved, true, `Critic must clean buzzwords. Remaining: ${review.remainingErrors.join('; ')}`);
      const revisedExp = review.revisedDraft.experience.flatMap((e) => e.bullets);
      const voiceCheck = validateHumanEngineeringVoice(review.revisedDraft.basics.summary, revisedExp);

      assert.equal(voiceCheck.isValid, true);
      assert.equal((voiceCheck.metrics?.bannedBuzzwordsFound as string[])?.length, 0);
      assert.ok(revisedExp.every((b) => !/\bspearheaded\b|\bpioneered\b|\borchestrated\b|\bseamlessly\b/i.test(b)));
    });
  });
});

