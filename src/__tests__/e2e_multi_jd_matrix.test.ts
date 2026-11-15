import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';

// Core Agents & Pipeline Modules
import { candidateMasterProfile } from '../data/candidateMasterProfile.ts';
import {
  classifyJobDescription,
  type JobDescriptionInput,
  type ParsedJobDescription,
} from '../agents/jdClassifier.ts';
import {
  assembleResumeContext,
  type AssembledResume,
} from '../agents/resumeAssembler.ts';
import {
  critiqueAndReviseResume,
  type ResumeDraft,
  type CriticReviewResult,
} from '../agents/resumeCritic.ts';
import {
  formatVisaLocationHeader,
  type JobLocationPolicy,
} from '../utils/visaHeaderFormatter.ts';
import {
  sanitizeResumeObject,
} from '../utils/atsSanitizer.ts';
import {
  generateResumePdf,
  extractPdfText,
  type ResumePdfData,
} from '../utils/pdfGenerator.ts';

// Deterministic ATS Validators
import {
  validatePersonaAlignment,
  validateNoOrphanedSkills,
  validateAsciiAtsSafety,
  validateVisaLocationClarity,
  validateHumanEngineeringVoice,
} from '../validators/atsResumeValidators.ts';

/**
 * Interface for multi-JD test matrix fixture
 */
interface MultiJdFixture {
  id: string;
  name: string;
  expectedDomain: string;
  outputPdfFilename: string;
  jd: JobDescriptionInput & {
    title: string;
    country: string;
    remotePolicy: string;
    locationPolicy: JobLocationPolicy;
  };
}

/**
 * Diverse test matrix containing 4 completely distinct role archetypes
 */
const MULTI_JD_MATRIX: MultiJdFixture[] = [
  // =========================================================================
  // FIXTURE A: Monzo Senior Staff Backend Engineer (UK / FinTech / Distributed Systems)
  // =========================================================================
  {
    id: 'fixture-a-monzo-backend',
    name: 'Fixture A: Monzo Senior Staff Backend Engineer (Go/Kafka/Distributed Systems)',
    expectedDomain: 'backend_distributed_systems',
    outputPdfFilename: 'Ashish_Kumar_Singh_Monzo_Senior_Staff_Backend_Engineer.pdf',
    jd: {
      url: 'https://job-boards.greenhouse.io/monzo/jobs/6036797',
      title: 'Senior Staff Backend Engineer',
      companyName: 'Monzo',
      country: 'UK',
      workMode: 'remote',
      remotePolicy: 'Remote within the UK (Visa Sponsorship Available)',
      locationPolicy: {
        country: 'UK',
        workMode: 'remote',
        sponsorsVisa: true,
      },
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
        'REST APIs',
        'System Design',
      ],
      preferredSkills: ['Redis', 'Docker', 'Terraform', 'RabbitMQ', 'OAuth 2.0 PKCE', 'High Concurrency'],
    },
  },

  // =========================================================================
  // FIXTURE B: Senior Frontend Architect (Netherlands / Web Platform / Design Systems)
  // =========================================================================
  {
    id: 'fixture-b-booking-frontend',
    name: 'Fixture B: Booking.com Senior Frontend Architect (React/Design Systems/Performance)',
    expectedDomain: 'frontend_web_platform',
    outputPdfFilename: 'Ashish_Kumar_Singh_Senior_Frontend_Architect_Booking.pdf',
    jd: {
      title: 'Senior Frontend Architect',
      companyName: 'Booking.com',
      country: 'Netherlands',
      workMode: 'hybrid',
      remotePolicy: 'Hybrid in Amsterdam (EU Blue Card Sponsorship Provided)',
      locationPolicy: {
        country: 'Netherlands',
        workMode: 'hybrid',
        sponsorsVisa: true,
      },
      description: `Lead enterprise frontend web architecture, design system component library, and web performance optimization across global consumer travel portals using React 18/19, Next.js, TypeScript, Webpack Module Federation, and Tailwind CSS. Drive dramatic Core Web Vitals improvements (Largest Contentful Paint, INP), elevate Lighthouse scores, and establish WCAG 2.1 AA accessible UI engineering standards.`,
      requiredSkills: [
        'React',
        'React 18',
        'Next.js',
        'TypeScript',
        'Webpack Module Federation',
        'Design Systems',
        'Storybook',
        'Core Web Vitals',
        'Tailwind CSS',
        'Lighthouse',
        'WCAG 2.1 AA',
      ],
      preferredSkills: ['Redux Toolkit', 'TanStack Query', 'Figma Design Tokens', 'Micro-Frontends'],
    },
  },

  // =========================================================================
  // FIXTURE C: Enterprise AI / LLM Systems Engineer (USA / Agentic Systems / MCP)
  // =========================================================================
  {
    id: 'fixture-c-anthropic-ai',
    name: 'Fixture C: Anthropic Senior Staff AI & LLM Systems Engineer (RAG/MCP/Agents)',
    expectedDomain: 'ai_llm_architecture',
    outputPdfFilename: 'Ashish_Kumar_Singh_Enterprise_AI_LLM_Engineer.pdf',
    jd: {
      title: 'Senior Staff AI & LLM Systems Engineer',
      companyName: 'Anthropic',
      country: 'USA',
      workMode: 'remote',
      remotePolicy: 'Remote in the USA (Visa Sponsorship Available)',
      locationPolicy: {
        country: 'USA',
        workMode: 'remote',
        sponsorsVisa: true,
      },
      description: `Architect production-grade Generative AI platforms, stateful multi-agent workflows with LangGraph and Model Context Protocol (MCP), enterprise retrieval-augmented generation (RAG) pipelines, dense vector search with pgvector and ChromaDB, and continuous batching with vLLM. Enforce quantitative evaluation using Ragas and defensive prompt engineering with structured Pydantic outputs.`,
      requiredSkills: [
        'Python',
        'FastAPI',
        'LangGraph',
        'LangChain',
        'Model Context Protocol',
        'MCP',
        'Multi-Agent Orchestration',
        'RAG',
        'pgvector',
        'vLLM',
        'Ragas',
        'Vector Search',
      ],
      preferredSkills: ['PyTorch', 'ChromaDB', 'Qdrant', 'Docker', 'Kubernetes'],
    },
  },

  // =========================================================================
  // FIXTURE D: Staff Full-Stack Tech Lead (Singapore / End-to-End Cloud Platform)
  // =========================================================================
  {
    id: 'fixture-d-grab-fullstack',
    name: 'Fixture D: Grab Staff Full-Stack Tech Lead (Node/React/Cloud/APIs)',
    expectedDomain: 'fullstack_general',
    outputPdfFilename: 'Ashish_Kumar_Singh_FullStack_Tech_Lead_Grab.pdf',
    jd: {
      title: 'Staff Full-Stack Tech Lead',
      companyName: 'Grab',
      country: 'Singapore',
      workMode: 'hybrid',
      remotePolicy: 'Hybrid in Singapore (Employment Pass Sponsorship Provided)',
      locationPolicy: {
        country: 'Singapore',
        workMode: 'hybrid',
        sponsorsVisa: true,
      },
      description: `Lead full-stack engineering delivery across cross-functional squads, architecting end-to-end cloud platforms uniting high-performance TypeScript and React frontends with resilient Node.js/NestJS and Python microservices on AWS and Kubernetes. Design type-safe GraphQL and RESTful APIs with PostgreSQL and Redis distributed caching under high concurrency.`,
      requiredSkills: [
        'TypeScript',
        'React',
        'Node.js',
        'NestJS',
        'Python',
        'PostgreSQL',
        'Redis',
        'GraphQL',
        'RESTful APIs',
        'Docker',
        'Kubernetes',
        'AWS',
      ],
      preferredSkills: ['OAuth 2.0 PKCE', 'System Architecture', 'CI/CD Pipelines', 'Engineering Leadership'],
    },
  },
];

describe('Multi-JD Integration Test Matrix: VisaPilot-AI Universal Verification', () => {
  const summaryReport: Array<{
    id: string;
    name: string;
    role: string;
    company: string;
    country: string;
    primaryDomain: string;
    header: string;
    scores: {
      persona: boolean;
      noOrphanedSkills: boolean;
      asciiAtsSafety: boolean;
      visaClarity: boolean;
      totalPassed: number;
    };
    pdfPath: string;
    pdfBytes: number;
  }> = [];

  for (const fixture of MULTI_JD_MATRIX) {
    it(`executes full pipeline for ${fixture.name} and passes all 4 universal ATS validators`, async () => {
      // =======================================================================
      // STEP 1: Universal JD Classification
      // =======================================================================
      const parsedJd: ParsedJobDescription = classifyJobDescription(fixture.jd);
      assert.equal(
        parsedJd.primaryDomain,
        fixture.expectedDomain,
        `Expected ${fixture.id} to classify as ${fixture.expectedDomain}, received ${parsedJd.primaryDomain}`
      );

      // =======================================================================
      // STEP 2: Context Assembly & Dynamic Weighting
      // =======================================================================
      const assembled: AssembledResume = assembleResumeContext(candidateMasterProfile, parsedJd);

      // Convert to ResumeDraft structure for critic loop
      const draft: ResumeDraft = {
        basics: {
          name: assembled.basics.name,
          title: assembled.basics.title,
          summary: assembled.basics.summary,
          location: assembled.basics.location,
          email: assembled.basics.email,
          phone: assembled.basics.phone,
          linkedin: assembled.basics.linkedin,
          github: assembled.basics.github,
          portfolio: assembled.basics.portfolio,
        },
        skillsSection: assembled.skillsSection,
        experience: assembled.experience.map((e) => ({
          role: e.role,
          company: e.company,
          client: e.client,
          location: e.location,
          period: e.period,
          bullets: e.bullets,
        })),
        projects: assembled.projects.map((p) => ({
          name: p.name,
          description: p.description,
          technologies: p.technologies,
          bullets: p.bullets,
        })),
      };

      // =======================================================================
      // STEP 3: Universal Critic Loop Verification
      // =======================================================================
      const criticReview: CriticReviewResult = critiqueAndReviseResume(
        draft,
        parsedJd.jobTitle,
        parsedJd.primaryDomain
      );

      assert.equal(
        criticReview.approved,
        true,
        `Critic loop must approve draft for ${fixture.id}. Errors: ${criticReview.remainingErrors.join('; ')}`
      );
      assert.equal(
        criticReview.remainingErrors.length,
        0,
        `Remaining errors must be 0, received ${criticReview.remainingErrors.length}`
      );

      const finalDraft = criticReview.revisedDraft;

      // =======================================================================
      // STEP 4: ATS Pre-Render Sanitization & PDF Generation
      // =======================================================================
      const sanitizedDraft = sanitizeResumeObject(finalDraft);
      const outputDir = path.resolve(process.cwd(), 'output');
      const outputPdfPath = path.join(outputDir, fixture.outputPdfFilename);

      const pdfData: ResumePdfData = {
        basics: {
          name: sanitizedDraft.basics.name,
          title: sanitizedDraft.basics.title,
          summary: sanitizedDraft.basics.summary,
          location: sanitizedDraft.basics.location,
          email: sanitizedDraft.basics.email,
          phone: sanitizedDraft.basics.phone,
          linkedin: sanitizedDraft.basics.linkedin,
          github: sanitizedDraft.basics.github,
          portfolio: sanitizedDraft.basics.portfolio,
        },
        skills: sanitizedDraft.skillsSection,
        experience: sanitizedDraft.experience.map((e) => ({
          role: e.role,
          company: e.company,
          client: e.client,
          location: e.location,
          period: e.period,
          bullets: e.bullets,
        })),
        projects: sanitizedDraft.projects.map((p) => ({
          title: p.name,
          technologies: typeof p.technologies === 'string' ? p.technologies : Array.isArray(p.technologies) ? (p.technologies as string[]).join(', ') : '',
          bullets: p.bullets || [],
        })),
      };

      const pdfBuffer = generateResumePdf(pdfData, outputPdfPath);

      assert.ok(fs.existsSync(outputPdfPath), `Generated PDF file must exist at ${outputPdfPath}`);
      assert.ok(pdfBuffer.length > 1000, `PDF size must be substantial (>1000 bytes). Got ${pdfBuffer.length}`);

      // =======================================================================
      // STEP 5: PDF Text Extraction & Universal ATS Validator Suite
      // =======================================================================
      const pdfText = extractPdfText(pdfBuffer);
      const allExpBullets = sanitizedDraft.experience.flatMap((e) => e.bullets);
      const allProjBullets = sanitizedDraft.projects.flatMap((p) => p.bullets || []);

      // ── Validator 1: Persona Alignment ──
      const personaValidation = validatePersonaAlignment(
        fixture.jd.title,
        sanitizedDraft.basics.summary,
        allExpBullets
      );
      assert.equal(
        personaValidation.isValid,
        true,
        `Persona alignment failed for ${fixture.id}: ${personaValidation.errors.join('; ')}`
      );

      // Domain-specific persona checks
      if (fixture.expectedDomain === 'backend_distributed_systems') {
        assert.equal(
          personaValidation.metrics?.uiRatio,
          0,
          'Monzo Backend resume must have exactly 0% UI keywords'
        );
      } else if (fixture.expectedDomain === 'frontend_web_platform') {
        assert.ok(
          allExpBullets.some((b) => b.includes('React 18') || b.includes('React')),
          'Frontend resume must feature React'
        );
        assert.ok(
          allExpBullets.some((b) => b.includes('Design System') || b.includes('Storybook')),
          'Frontend resume must feature Design System / Storybook'
        );
      } else if (fixture.expectedDomain === 'ai_llm_architecture') {
        assert.equal(
          personaValidation.metrics?.uiRatio,
          0,
          'AI resume must have 0% UI keywords'
        );
        assert.match(sanitizedDraft.basics.summary, /AI|LLM|MCP|LangGraph|RAG/i);
      } else if (fixture.expectedDomain === 'fullstack_general') {
        assert.ok(
          allExpBullets.some((b) => /React|Next\.js|Design System|micro-frontend/i.test(b)),
          'Full-Stack resume must contain frontend achievements'
        );
        assert.ok(
          allExpBullets.some((b) => /Node\.js|Python|PostgreSQL|microservices|FastAPI/i.test(b)),
          'Full-Stack resume must contain backend achievements'
        );
      }

      // Verify clean visa location header is rendered inside extracted PDF text
      assert.ok(
        pdfText.includes(sanitizedDraft.basics.location),
        `Extracted PDF text must render clean header line for ${fixture.id}`
      );

      // ── Validator 2: No Orphaned Skills (Strict 100% All-Domain Check) ──
      const skillsValidation = validateNoOrphanedSkills(
        sanitizedDraft.skillsSection,
        allExpBullets,
        allProjBullets,
        { checkAllSkills: true }
      );
      assert.equal(
        skillsValidation.isValid,
        true,
        `No orphaned skills failed for ${fixture.id}: ${skillsValidation.errors.join('; ')}`
      );
      assert.equal(
        skillsValidation.metrics?.hasAdditionalSkillsCategory,
        false,
        'No Additional Skills category may exist'
      );
      assert.equal(
        (skillsValidation.metrics?.orphanedSkills as string[])?.length || 0,
        0,
        `Orphaned skills detected: ${(skillsValidation.metrics?.orphanedSkills as string[])?.join(', ')}`
      );

      // ── Validator 3: ASCII & ATS Safety ──
      const asciiValidation = validateAsciiAtsSafety(pdfText);
      assert.equal(
        asciiValidation.isValid,
        true,
        `ASCII ATS safety check failed for ${fixture.id}: ${asciiValidation.errors.join('; ')}`
      );
      assert.equal(
        asciiValidation.metrics?.hasConcatenatedRange,
        false,
        'PDF text must not contain concatenated number ranges like 6294'
      );
      assert.equal(
        asciiValidation.metrics?.arrowCount,
        0,
        'PDF text must not contain non-ASCII arrows'
      );

      // ── Validator 4: Visa & Location Clarity ──
      const visaValidation = validateVisaLocationClarity(
        fixture.jd.country,
        fixture.jd.remotePolicy,
        sanitizedDraft.basics.location
      );
      assert.equal(
        visaValidation.isValid,
        true,
        `Visa location clarity failed for ${fixture.id}: ${visaValidation.errors.join('; ')}`
      );

      // Verify specific jurisdiction formatting
      if (fixture.jd.country === 'UK') {
        assert.match(sanitizedDraft.basics.location, /UK Relocation \| Skilled Worker Visa Sponsorship Required/i);
      } else if (fixture.jd.country === 'Netherlands') {
        assert.match(sanitizedDraft.basics.location, /Netherlands Relocation \| EU Blue Card \/ Visa Sponsorship Required/i);
      } else if (fixture.jd.country === 'USA') {
        assert.match(sanitizedDraft.basics.location, /Open to Relocation \| Visa Sponsorship Required/i);
      } else if (fixture.jd.country === 'Singapore') {
        assert.match(sanitizedDraft.basics.location, /Singapore Relocation \| Employment Pass \/ Visa Sponsorship Required/i);
      }

      // ── Validator 5: Human Engineering Voice & Zero Banned AI Buzzwords ──
      const humanVoiceValidation = validateHumanEngineeringVoice(
        sanitizedDraft.basics.summary,
        allExpBullets,
        allProjBullets
      );
      assert.equal(
        humanVoiceValidation.isValid,
        true,
        `Human voice / anti-buzzword check failed for ${fixture.id}: ${humanVoiceValidation.errors.join('; ')}`
      );

      // Record metrics for summary table
      summaryReport.push({
        id: fixture.id,
        name: fixture.name,
        role: fixture.jd.title,
        company: fixture.jd.companyName || 'N/A',
        country: fixture.jd.country,
        primaryDomain: parsedJd.primaryDomain,
        header: sanitizedDraft.basics.location,
        scores: {
          persona: personaValidation.isValid,
          noOrphanedSkills: skillsValidation.isValid,
          asciiAtsSafety: asciiValidation.isValid,
          visaClarity: visaValidation.isValid,
          totalPassed: 4,
        },
        pdfPath: outputPdfPath,
        pdfBytes: pdfBuffer.length,
      });
    });
  }

  // After all matrix fixtures run, print comprehensive validation summary
  it('prints a consolidated multi-JD matrix validation summary report', () => {
    assert.equal(summaryReport.length, 4, 'Must have evaluated all 4 fixtures');

    console.log('\n' + '='.repeat(90));
    console.log('       VISAPILOT-AI MULTI-JD TEST MATRIX: UNIVERSAL E2E VERIFICATION REPORT');
    console.log('='.repeat(90));

    for (const item of summaryReport) {
      console.log(`\n📌 [${item.id.toUpperCase()}]`);
      console.log(`   Role:           ${item.role} @ ${item.company} (${item.country})`);
      console.log(`   Domain:         ${item.primaryDomain}`);
      console.log(`   Location/Visa:  ${item.header}`);
      console.log(`   ATS Validators: ✅ Persona (${item.scores.persona ? 'PASS' : 'FAIL'}) | ` +
        `✅ No Orphans (${item.scores.noOrphanedSkills ? 'PASS' : 'FAIL'}) | ` +
        `✅ ASCII Safety (${item.scores.asciiAtsSafety ? 'PASS' : 'FAIL'}) | ` +
        `✅ Visa Clarity (${item.scores.visaClarity ? 'PASS' : 'FAIL'})`);
      console.log(`   Score:          ${item.scores.totalPassed} / 4 PASSED (100%)`);
      console.log(`   Generated PDF:  ${item.pdfPath} (${(item.pdfBytes / 1024).toFixed(1)} KB)`);
    }

    console.log('\n' + '='.repeat(90));
    console.log('🎉 4/4 ROLE ARCHETYPES VERIFIED: 100% PRODUCTION-READY ACROSS ALL JURISDICTIONS');
    console.log('='.repeat(90) + '\n');
  });
});
