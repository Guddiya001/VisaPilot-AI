import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';

// Core Agents and Pipeline Modules
import { candidateMasterProfile } from '../data/candidateMasterProfile.ts';
import {
  classifyPersona,
  filterCandidateProfile,
  formatProfileForPromptContext,
} from '../agents/personaRouter.ts';
import {
  matchGroundedSkills,
  ARCHITECTURAL_EQUIVALENTS_MAP,
} from '../agents/groundedSkillMatcher.ts';
import {
  formatVisaLocationHeader,
} from '../utils/visaHeaderFormatter.ts';
import {
  sanitizeAtsText,
  sanitizeResumeObject,
} from '../utils/atsSanitizer.ts';
import {
  critiqueAndReviseResume,
  type ResumeDraft,
} from '../agents/resumeCritic.ts';
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
} from '../validators/atsResumeValidators.ts';

/**
 * Monzo Senior Staff Backend Engineer Job Description
 * Source: https://job-boards.greenhouse.io/monzo/jobs/6036797
 */
const MONZO_BACKEND_JD = {
  url: 'https://job-boards.greenhouse.io/monzo/jobs/6036797',
  title: 'Senior Staff Backend Engineer',
  companyName: 'Monzo',
  country: 'UK',
  remotePolicy: 'Remote within the UK (Visa Sponsorship Available)',
  locationPolicy: {
    country: 'UK',
    workMode: 'remote' as const,
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
    'System Design',
    'REST APIs',
  ],
  preferredSkills: [
    'Redis',
    'Docker',
    'Terraform',
    'RabbitMQ',
    'OAuth 2.0 PKCE',
    'High Concurrency',
  ],
};

/**
 * Historical Flawed Monzo Resume Output (v1)
 * Used for the Side-by-Side Comparison
 */
const FLAWED_MONZO_RESUME_V1 = {
  header: `Ashish Kumar Singh\nSenior Staff Backend Engineer\nNoida, India (Open to Relocation: Remote | Visa Sponsorship Required)\nOpen to: Remote Visa Sponsorship Required`,
  summary: `Staff- and Senior-level Frontend & Web Platform Engineer with 10+ years of experience architecting high-performance enterprise user interfaces, micro-frontends, design systems, and responsive web applications across Tier-1 healthcare, consumer banking, and global retail e-commerce. Leading enterprise Webpack Module Federation with React 18, Next.js, elevating Lighthouse scores from 62 to 94 (Lighthouse Audits 6294), Core Web Vitals, Tailwind CSS, Storybook, and WCAG.`,
  skills: `Core Languages: TypeScript, JavaScript, HTML5, CSS\nFrontend Frameworks: React 18, Next.js, Webpack Module Federation\nWeb Performance & UI: Core Web Vitals, Lighthouse Audits (6294), Storybook, WCAG, Figma\nAdditional Skills: Cassandra, Kafka, Kubernetes, GCP`,
  experienceSample: `- Spearheaded enterprise micro-frontend architecture utilizing Webpack Module Federation and React 18.\n- Engineered web performance optimizations, elevating Google Lighthouse scores from 62 → 94 (Lighthouse Audits 6294).\n- Architected interactive UI components using Tailwind CSS, Storybook, and Figma tokens adhering to WCAG.`,
};

describe('E2E Integration Test: Monzo Senior Staff Backend Engineer Resume Generation', () => {
  it('runs the Monzo Backend JD through the full VisaPilot-AI pipeline, creates v2 PDF, and passes all 4 ATS validators', async () => {
    // =========================================================================
    // STEP 1: Persona Classification & Profile Filtering
    // =========================================================================
    const { primaryPersona, secondaryPersona } = classifyPersona(MONZO_BACKEND_JD);
    assert.equal(
      primaryPersona,
      'backend_distributed_systems',
      'Monzo Senior Staff Backend Engineer must classify as backend_distributed_systems'
    );

    const filteredProfile = filterCandidateProfile(candidateMasterProfile, primaryPersona);

    // =========================================================================
    // STEP 2: Grounded Skill Matching & Architectural Equivalents
    // =========================================================================
    const allJdSkills = [
      ...MONZO_BACKEND_JD.requiredSkills,
      ...MONZO_BACKEND_JD.preferredSkills,
    ];
    const skillMatchReport = matchGroundedSkills(
      allJdSkills,
      candidateMasterProfile,
      primaryPersona
    );

    assert.ok(
      skillMatchReport.architecturalEquivalents.some((eq) => eq.jdSkill.toLowerCase().includes('cassandra')),
      'Cassandra must be matched as an architectural equivalent'
    );
    assert.ok(
      skillMatchReport.architecturalEquivalents.some((eq) => eq.jdSkill.toLowerCase().includes('go') || eq.jdSkill.toLowerCase().includes('golang')),
      'Go/Golang must be matched as an architectural equivalent'
    );

    // =========================================================================
    // STEP 3: Visa & Location Header Formatting
    // =========================================================================
    const candidateCity = candidateMasterProfile.basics.location.split('(')[0].trim() || 'Noida, India';
    const visaLocationHeader = formatVisaLocationHeader(
      candidateCity,
      MONZO_BACKEND_JD.locationPolicy
    );

    assert.equal(
      visaLocationHeader,
      'Noida, India (Open to UK Relocation | Skilled Worker Visa Sponsorship Required)',
      'Header must explicitly specify UK relocation and Skilled Worker Visa Sponsorship'
    );

    // =========================================================================
    // STEP 4: Resume Draft Assembly & Google XYZ Bullet Integration
    // =========================================================================
    // Map experiences and weave architectural equivalent bullets
    const experienceDraft = filteredProfile.experience.map((exp, index) => {
      const bullets = [...exp.bullets];

      // Weave Cassandra & Go impact bullets into the primary leadership experience (UnitedHealth Group)
      if (index === 0) {
        for (const eq of skillMatchReport.architecturalEquivalents) {
          if (!bullets.some((b) => b.includes(eq.jdSkill))) {
            bullets.push(eq.xyzBullet);
          }
        }
      }

      return {
        role: exp.role,
        company: exp.company,
        client: exp.client,
        period: exp.period,
        location: exp.location,
        bullets,
        techStack: exp.techStack,
      };
    });

    // Clean categorized skills (strictly NO "Additional Skills" line)
    const skillsSectionDraft: Record<string, string[]> = {
      'Core Programming Languages': ['Python', 'Java', 'Go (Architectural Equivalent)', 'Node.js', 'SQL'],
      'Distributed Systems & APIs': ['Microservices Architecture', 'gRPC', 'REST APIs', 'High-Concurrency APIs', 'System Design'],
      'Messaging & Streaming': ['Apache Kafka', 'RabbitMQ', 'Event-Driven Architecture'],
      'Databases & Storage': ['PostgreSQL', 'Apache Cassandra', 'Redis', 'MongoDB'],
      'Cloud & Infrastructure': ['Kubernetes', 'Docker', 'Google Cloud Platform (GCP)', 'AWS', 'Terraform', 'CI/CD Pipelines'],
    };

    // Selected Backend Projects
    const projectsDraft = filteredProfile.projects.map((proj) => ({
      name: proj.name,
      description: proj.description,
      technologies: proj.technologies,
      bullets: proj.bullets,
    }));

    const rawDraft: ResumeDraft = {
      basics: {
        name: candidateMasterProfile.basics.name,
        title: 'Senior Staff Backend Engineer',
        summary: filteredProfile.basics.summary,
        location: visaLocationHeader,
        email: candidateMasterProfile.basics.email,
        phone: candidateMasterProfile.basics.phone,
        linkedin: candidateMasterProfile.basics.linkedin,
        github: candidateMasterProfile.basics.github,
        portfolio: candidateMasterProfile.basics.portfolio,
      },
      skillsSection: skillsSectionDraft,
      experience: experienceDraft,
      projects: projectsDraft,
    };

    // =========================================================================
    // STEP 5: ATS Pre-Render Sanitization
    // =========================================================================
    const sanitizedDraft = sanitizeResumeObject(rawDraft);

    // =========================================================================
    // STEP 6: Reflection / Critic Loop Verification
    // =========================================================================
    const criticResult = critiqueAndReviseResume(
      sanitizedDraft,
      'Senior Staff Backend Engineer',
      'backend_distributed_systems'
    );

    assert.equal(
      criticResult.approved,
      true,
      `Critic loop must approve resume draft. Remaining errors: ${criticResult.remainingErrors.join('; ')}`
    );

    const finalDraft = criticResult.revisedDraft;

    // =========================================================================
    // STEP 7: PDF Generation (output/Ashish_Kumar_Singh_Senior_Staff_Backend_Engineer_Monzo_v2.pdf)
    // =========================================================================
    const outputDir = path.resolve(process.cwd(), 'output');
    const outputPdfPath = path.join(
      outputDir,
      'Ashish_Kumar_Singh_Senior_Staff_Backend_Engineer_Monzo_v2.pdf'
    );

    const resumePdfData: ResumePdfData = {
      basics: {
        name: finalDraft.basics.name,
        title: finalDraft.basics.title,
        summary: finalDraft.basics.summary,
        location: finalDraft.basics.location,
        email: finalDraft.basics.email,
        phone: finalDraft.basics.phone,
        linkedin: finalDraft.basics.linkedin,
        github: finalDraft.basics.github,
        portfolio: finalDraft.basics.portfolio,
      },
      skills: finalDraft.skillsSection,
      experience: finalDraft.experience.map((e) => ({
        role: e.role,
        company: e.company,
        client: e.client,
        location: e.location,
        period: e.period,
        bullets: e.bullets,
      })),
      projects: finalDraft.projects.map((p) => ({
        title: p.name,
        technologies: p.technologies,
        bullets: p.bullets || [],
      })),
    };

    const pdfBuffer = generateResumePdf(resumePdfData, outputPdfPath);

    assert.ok(fs.existsSync(outputPdfPath), `PDF file must exist at ${outputPdfPath}`);
    assert.ok(pdfBuffer.length > 1000, `Generated PDF buffer must be substantial (>1000 bytes). Received ${pdfBuffer.length} bytes.`);

    // =========================================================================
    // STEP 8: PDF Text Extraction & 4 Deterministic Validators
    // =========================================================================
    const extractedPdfText = extractPdfText(pdfBuffer);
    const allExpBullets = finalDraft.experience.flatMap((e) => e.bullets);
    const allProjBullets = finalDraft.projects.flatMap((p) => p.bullets || []);

    // 1. Validator: validatePersonaAlignment
    const personaValidation = validatePersonaAlignment(
      'Senior Staff Backend Engineer',
      finalDraft.basics.summary,
      allExpBullets
    );
    assert.equal(
      personaValidation.isValid,
      true,
      `Persona alignment failed: ${personaValidation.errors.join('; ')}`
    );
    assert.equal(
      personaValidation.metrics?.uiRatio,
      0,
      `Expected 0% UI keywords for Senior Staff Backend Engineer, got ${((personaValidation.metrics?.uiRatio as number || 0) * 100).toFixed(1)}%`
    );

    // Verify zero mention of UI keywords in summary or bullets
    const forbiddenUiTerms = [
      'Webpack Module Federation',
      'Lighthouse',
      'Tailwind CSS',
      'Storybook',
      'Core Web Vitals',
      'WCAG',
      'Figma',
    ];
    for (const term of forbiddenUiTerms) {
      assert.ok(
        !extractedPdfText.toLowerCase().includes(term.toLowerCase()),
        `Extracted PDF text must not contain forbidden UI term: "${term}"`
      );
    }

    // Verify presence of backend and enterprise distributed systems terms
    const requiredBackendTerms = [
      'microservices',
      'distributed',
      'high-throughput',
      'PostgreSQL',
      'Kafka',
      'Kubernetes',
      'Docker',
      'UnitedHealth Group',
      'DBS Bank',
      'Walmart',
    ];
    for (const term of requiredBackendTerms) {
      assert.ok(
        extractedPdfText.toLowerCase().includes(term.toLowerCase()),
        `Extracted PDF text must highlight backend term: "${term}"`
      );
    }

    // 2. Validator: validateNoOrphanedSkills
    const orphanedSkillsValidation = validateNoOrphanedSkills(
      finalDraft.skillsSection,
      allExpBullets,
      allProjBullets
    );
    assert.equal(
      orphanedSkillsValidation.isValid,
      true,
      `Orphaned skills check failed: ${orphanedSkillsValidation.errors.join('; ')}`
    );
    assert.equal(
      orphanedSkillsValidation.metrics?.hasAdditionalSkillsCategory,
      false,
      'Must NOT contain "Additional Skills" category'
    );
    assert.equal(
      ((orphanedSkillsValidation.metrics?.orphanedSkills as string[]) || []).length,
      0,
      `Must have 0 orphaned skills, found: ${((orphanedSkillsValidation.metrics?.orphanedSkills as string[]) || []).join(', ')}`
    );

    // 3. Validator: validateAsciiAtsSafety
    const asciiSafetyValidation = validateAsciiAtsSafety(extractedPdfText);
    assert.equal(
      asciiSafetyValidation.isValid,
      true,
      `ASCII / ATS safety check failed on extracted PDF text: ${asciiSafetyValidation.errors.join('; ')}`
    );
    assert.equal(
      asciiSafetyValidation.metrics?.hasConcatenatedRange,
      false,
      'Extracted PDF text must not contain corrupted concatenated number ranges like "6294"'
    );
    assert.equal(
      asciiSafetyValidation.metrics?.arrowCount,
      0,
      'Extracted PDF text must not contain stripped non-ASCII arrows'
    );

    // 4. Validator: validateVisaLocationClarity
    const visaClarityValidation = validateVisaLocationClarity(
      'UK',
      'Remote within UK',
      extractedPdfText
    );
    assert.equal(
      visaClarityValidation.isValid,
      true,
      `Visa location clarity check failed: ${visaClarityValidation.errors.join('; ')}`
    );

    // Verify clean header without duplicate sub-header line
    const headerOccurrences = extractedPdfText.match(/visa\s*sponsorship\s*required/gi) || [];
    assert.equal(
      headerOccurrences.length,
      1,
      `Expected exactly 1 visa sponsorship statement in header, found ${headerOccurrences.length}`
    );

    // =========================================================================
    // STEP 9: Print Side-by-Side Comparison Summary
    // =========================================================================
    console.log('\n' + '='.repeat(80));
    console.log('  SIDE-BY-SIDE SUMMARY: MONZO BACKEND RESUME V1 (OLD) vs V2 (NEW GENERATED)');
    console.log('='.repeat(80));

    console.log('\n--- 1. HEADER & VISA SPONSORSHIP ---');
    console.log('❌ OLD V1:');
    console.log('   Noida, India (Open to Relocation: Remote | Visa Sponsorship Required)');
    console.log('   Open to: Remote Visa Sponsorship Required  <-- [DUPLICATE CONFUSING LINE]');
    console.log('✅ NEW V2:');
    console.log(`   ${finalDraft.basics.location}`);
    console.log('   [Clean single line explicitly stating UK Relocation & Skilled Worker Visa]');

    console.log('\n--- 2. ROLE PERSONA & PROFESSIONAL SUMMARY ---');
    console.log('❌ OLD V1 (Frontend Persona Mismatch):');
    console.log(`   "${FLAWED_MONZO_RESUME_V1.summary.slice(0, 160)}..."`);
    console.log('   [Focus: Webpack Module Federation, React 18, Lighthouse 6294, Storybook, CSS]');
    console.log('✅ NEW V2 (Senior/Staff Backend & Distributed Systems Persona):');
    console.log(`   "${finalDraft.basics.summary.slice(0, 180)}..."`);
    console.log('   [Focus: High-throughput distributed systems, banking platforms, Kafka, Cassandra, Kubernetes, UHG, DBS Bank, Walmart]');

    console.log('\n--- 3. SKILLS ARCHITECTURE & GROUNDING ---');
    console.log('❌ OLD V1 (Orphaned Keyword Dumping):');
    console.log('   Core Languages: TypeScript, JavaScript, HTML5, CSS');
    console.log('   Additional Skills: Cassandra, Kafka, Kubernetes, GCP  <-- [ORPHANED DUMP]');
    console.log('✅ NEW V2 (Categorized & Verified Grounded Skills):');
    for (const [cat, skills] of Object.entries(finalDraft.skillsSection)) {
      console.log(`   ${cat}: ${skills.join(', ')}`);
    }

    console.log('\n--- 4. WORK EXPERIENCE BULLETS & XYZ FORMULA ---');
    console.log('❌ OLD V1 (UI Bullets on Backend Role):');
    console.log('   - Spearheaded enterprise micro-frontend architecture utilizing Webpack Module Federation');
    console.log('   - Engineered web performance optimizations, elevating Google Lighthouse scores (6294)');
    console.log('✅ NEW V2 (High-Concurrency Backend & Distributed Storage Bullets):');
    for (const b of finalDraft.experience[0].bullets.slice(0, 3)) {
      console.log(`   - ${b.slice(0, 120)}...`);
    }

    console.log('\n--- 5. ATS & PDF GLYPH SAFETY ---');
    console.log('❌ OLD V1: Special characters corrupted during PDF rendering (62 → 94 became 6294).');
    console.log('✅ NEW V2: All ranges converted to explicit words ("62 to 94"); 100% ATS ASCII compliant.');
    console.log(`\n📄 Generated PDF: ${outputPdfPath}`);
    console.log('='.repeat(80) + '\n');
  });
});
