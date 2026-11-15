import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  validatePersonaAlignment,
  validateNoOrphanedSkills,
  validateAsciiAtsSafety,
  validateVisaLocationClarity,
} from '../atsResumeValidators.ts';

/**
 * Fixture: Real-world flawed output generated for:
 * Monzo - Senior Staff Backend Engineer (UK, Remote with Visa Sponsorship)
 * Demonstrating the 4 critical production defects:
 * 1. Role-Persona Mismatch (Frontend summary and bullets on Backend role)
 * 2. Orphaned Keyword Dumping ("Additional Skills: Cassandra, Kafka, Kubernetes, GCP" with 0 bullet evidence)
 * 3. Unicode/PDF Glyph Corruption ("62 → 94" stripped to "6294")
 * 4. Ambiguous Visa/Location Headers ("Open to Relocation: Remote" + duplicate line instead of UK relocation)
 */
const FLAWED_MONZO_RESUME_FIXTURE = {
  targetRole: 'Senior Staff Backend Engineer',
  jdCountry: 'UK',
  jdRemotePolicy: 'Remote within the UK (Visa Sponsorship Available)',

  header: `Ashish Kumar Singh
Senior Staff Backend Engineer
Noida, India (Open to Relocation: Remote | Visa Sponsorship Required)
Email: ashish.singh.careers@gmail.com | Phone: +91 7982169443
LinkedIn: linkedin.com/in/ashish-kumar-singh1986 | GitHub: github.com/guddiya001
Open to: Remote Visa Sponsorship Required`,

  summary: `Staff- and Senior-level Frontend & Web Platform Engineer with 10+ years of experience architecting high-performance enterprise user interfaces, micro-frontends, design systems, and responsive web applications across Tier-1 healthcare, consumer banking, and global retail e-commerce. Proven track record leading frontend architecture across 6+ distributed engineering teams, pioneering enterprise Webpack Module Federation with React 18 and Next.js, and driving dramatic performance optimizations: slashing bundle sizes by 35%, elevating Lighthouse scores from 62 to 94, and accelerating page load speeds by 40%. Deep expertise in TypeScript, state management (Redux Toolkit, Zustand, React Query), Core Web Vitals (LCP, INP, CLS), client-side caching, and WCAG 2.1 AA accessibility standards.`,

  skillsSection: {
    'Core Languages': ['TypeScript', 'JavaScript', 'HTML5', 'CSS'],
    'Frontend Frameworks': ['React 18', 'Next.js', 'Webpack Module Federation', 'Redux Toolkit'],
    'Web Performance & UI': ['Core Web Vitals', 'Lighthouse Audits (6294)', 'Storybook', 'WCAG', 'Figma'],
    'Additional Skills': ['Cassandra', 'Kafka', 'Kubernetes', 'GCP'],
  },

  experienceBullets: [
    'Spearheaded enterprise micro-frontend architecture utilizing Webpack Module Federation and React 18, decoupling monolithic portals into independently deployable micro-apps across 6+ squads.',
    'Engineered systematic web performance optimizations, shrinking JavaScript bundle sizes by 35%, elevating Google Lighthouse performance scores from 62 to 94 (Lighthouse Audits 6294), and improving Core Web Vitals.',
    'Architected interactive UI components using Next.js, React, TypeScript, Tailwind CSS, Storybook, and Figma tokens adhering to WCAG 2.1 AA accessibility standards.',
    'Mentored 12+ developers on modern React patterns, design tokens, and frontend build optimization with Vite and Webpack.',
  ],

  projectBullets: [
    'Built Next.js UI component showcase with Storybook and automated visual regression testing.',
    'Implemented client-side caching using TanStack Query, reducing redundant API roundtrips by 45%.',
  ],

  rawResumeText: `# Ashish Kumar Singh
Senior Staff Backend Engineer
Noida, India (Open to Relocation: Remote | Visa Sponsorship Required)
Email: ashish.singh.careers@gmail.com | Phone: +91 7982169443
LinkedIn: linkedin.com/in/ashish-kumar-singh1986 | GitHub: github.com/guddiya001
Open to: Remote Visa Sponsorship Required

---

## PROFESSIONAL SUMMARY
Staff- and Senior-level Frontend & Web Platform Engineer with 10+ years of experience architecting high-performance enterprise user interfaces, micro-frontends, design systems, and responsive web applications. Driving dramatic performance optimizations: elevating Lighthouse scores from 62 → 94. Deep expertise in Core Web Vitals, CSS, and WCAG.

---

## CORE TECHNICAL SKILLS
- **Core Languages:** TypeScript, JavaScript, HTML5, CSS
- **Frontend Frameworks:** React 18, Next.js, Webpack Module Federation
- **Web Performance & UI:** Core Web Vitals, Lighthouse Audits (6294), Storybook, WCAG, Figma
- **Additional Skills:** Cassandra, Kafka, Kubernetes, GCP

---

## WORK EXPERIENCE
### Persistent Systems Ltd. — UnitedHealth Group
Senior Engineering Lead / Frontend Architecture Lead | Oct 2023 – Present
- Spearheaded enterprise micro-frontend architecture utilizing Webpack Module Federation and React 18 across 6+ squads.
- Engineered systematic web performance optimizations, elevating Google Lighthouse scores from 62 → 94 (Lighthouse Audits 6294).
- Architected interactive UI components using Tailwind CSS, Storybook, and Figma tokens adhering to WCAG standards.
`,
};

/**
 * Fixture: Clean, correctly tailored Monzo Senior Staff Backend Engineer resume
 */
const CLEAN_MONZO_BACKEND_RESUME = {
  targetRole: 'Senior Staff Backend Engineer',
  jdCountry: 'UK',
  jdRemotePolicy: 'Remote within UK',

  header: `Ashish Kumar Singh
Senior Staff Backend Engineer
Noida, India (Open to UK Relocation (Visa Sponsorship Required))
Email: ashish.singh.careers@gmail.com | Phone: +91 7982169443
LinkedIn: linkedin.com/in/ashish-kumar-singh1986 | GitHub: github.com/guddiya001`,

  summary: `Senior Staff Backend Engineer with 10+ years of experience architecting high-throughput distributed systems, event-driven banking platforms, and fault-tolerant cloud backends. Led distributed data platforms across 6+ teams utilizing Go, Python, Apache Kafka, Apache Cassandra, and Kubernetes, sustaining 99.999% availability under peak financial workloads.`,

  skillsSection: {
    'Core Languages': ['Go', 'Python', 'SQL'],
    'Distributed Systems & Streaming': ['Apache Kafka', 'RabbitMQ', 'gRPC'],
    'Databases & Storage': ['PostgreSQL', 'Apache Cassandra', 'Redis'],
    'Cloud & Infrastructure': ['Kubernetes', 'GCP', 'AWS', 'Terraform', 'Docker'],
  },

  experienceBullets: [
    'Architected high-throughput event streaming pipelines using Apache Kafka, RabbitMQ, and Go, handling 150k+ financial transactions/sec with sub-25ms p99 latency.',
    'Engineered distributed database topology using Apache Cassandra, PostgreSQL, and Redis with active-active replication, slashing write latencies by 42%.',
    'Spearheaded containerized platform orchestration on Kubernetes and Docker across GCP and AWS, establishing automated Canary rollouts and zero-downtime cutovers.',
    'Automated cloud infrastructure provisioning using Terraform and Python, eliminating manual toil and ensuring 100% compliant IaC environments.',
  ],

  projectBullets: [
    'Designed distributed ledger microservice using Go, SQL, gRPC, and Apache Cassandra for immutable transaction logging.',
    'Implemented multi-region Kubernetes cluster failover on GCP using Terraform and ArgoCD.',
  ],

  rawResumeText: `# Ashish Kumar Singh
Senior Staff Backend Engineer
Noida, India (Open to UK Relocation (Visa Sponsorship Required))
Email: ashish.singh.careers@gmail.com | Phone: +91 7982169443
LinkedIn: linkedin.com/in/ashish-kumar-singh1986 | GitHub: github.com/guddiya001

---

## PROFESSIONAL SUMMARY
Senior Staff Backend Engineer with 10+ years of experience architecting high-throughput distributed systems, event-driven platforms, and cloud infrastructure.

---

## CORE TECHNICAL SKILLS
- **Core Languages:** Go, Python, SQL
- **Distributed Systems:** Apache Kafka, RabbitMQ, gRPC
- **Databases:** PostgreSQL, Apache Cassandra, Redis
- **Cloud & DevOps:** Kubernetes, GCP, AWS, Terraform, Docker

---

## WORK EXPERIENCE
### Persistent Systems Ltd.
Senior Staff Backend Engineer | Oct 2023 – Present
- Architected high-throughput event streaming pipelines using Apache Kafka, RabbitMQ, and Go.
- Engineered distributed database topology using Apache Cassandra, PostgreSQL, and Redis.
- Spearheaded containerized platform orchestration on Kubernetes and Docker across GCP and AWS.
`,
};

describe('TDD Red Phase: ATS Resume Generation Defect Validators', () => {

  describe('Defect 1: Role-Persona Mismatch', () => {
    it('catches Role-Persona Mismatch on flawed Monzo backend resume with >30% UI keywords', () => {
      const result = validatePersonaAlignment(
        FLAWED_MONZO_RESUME_FIXTURE.targetRole,
        FLAWED_MONZO_RESUME_FIXTURE.summary,
        FLAWED_MONZO_RESUME_FIXTURE.experienceBullets
      );

      assert.equal(result.isValid, false, 'Validator must fail when a Backend role has >30% UI keywords');
      assert.ok(result.errors.length > 0, 'Must provide descriptive error messages');
      assert.match(
        result.errors[0],
        /Role-Persona Mismatch/i,
        'Error should explicitly identify Role-Persona Mismatch'
      );
      assert.ok(
        result.errors[0].includes('Senior Staff Backend Engineer'),
        'Error should mention the target role'
      );
    });

    it('passes clean Monzo backend resume with 0% UI keywords', () => {
      const result = validatePersonaAlignment(
        CLEAN_MONZO_BACKEND_RESUME.targetRole,
        CLEAN_MONZO_BACKEND_RESUME.summary,
        CLEAN_MONZO_BACKEND_RESUME.experienceBullets
      );

      assert.equal(result.isValid, true, 'Clean backend resume must pass persona alignment');
      assert.equal(result.errors.length, 0);
    });

    it('allows UI keywords when target role is actually Frontend', () => {
      const result = validatePersonaAlignment(
        'Staff Frontend Engineer',
        FLAWED_MONZO_RESUME_FIXTURE.summary,
        FLAWED_MONZO_RESUME_FIXTURE.experienceBullets
      );

      assert.equal(result.isValid, true, 'Frontend role is permitted to have UI keywords');
      assert.equal(result.errors.length, 0);
    });
  });

  describe('Defect 2: Orphaned Keyword Dumping', () => {
    it('catches Orphaned Keyword Dumping when "Additional Skills" category exists and skills lack bullet evidence', () => {
      const result = validateNoOrphanedSkills(
        FLAWED_MONZO_RESUME_FIXTURE.skillsSection,
        FLAWED_MONZO_RESUME_FIXTURE.experienceBullets,
        FLAWED_MONZO_RESUME_FIXTURE.projectBullets
      );

      assert.equal(result.isValid, false, 'Validator must fail when skills are dumped without bullet integration');
      assert.ok(result.errors.length >= 1, 'Must report at least one defect error');
      
      const combinedErrors = result.errors.join(' ');
      assert.match(combinedErrors, /Additional Skills/i, 'Must flag the Additional Skills category');
      assert.match(combinedErrors, /Cassandra|Kafka|Kubernetes|GCP/i, 'Must identify orphaned backend skills');
    });

    it('passes clean Monzo resume where all claimed skills are integrated into experience/project bullets', () => {
      const result = validateNoOrphanedSkills(
        CLEAN_MONZO_BACKEND_RESUME.skillsSection,
        CLEAN_MONZO_BACKEND_RESUME.experienceBullets,
        CLEAN_MONZO_BACKEND_RESUME.projectBullets
      );

      assert.equal(result.isValid, true, 'Properly integrated skills must pass validation');
      assert.equal(result.errors.length, 0);
    });
  });

  describe('Defect 3: Unicode & PDF Glyph Corruption', () => {
    it('catches non-ASCII arrows, concatenated "6294" ranges, and duplicate headers in raw text', () => {
      const result = validateAsciiAtsSafety(FLAWED_MONZO_RESUME_FIXTURE.rawResumeText);

      assert.equal(result.isValid, false, 'Validator must fail on raw text containing non-ASCII arrows, 6294, or duplicate headers');
      
      const combinedErrors = result.errors.join(' ');
      assert.match(combinedErrors, /non-ASCII arrow/i, 'Must flag non-ASCII arrow character');
      assert.match(combinedErrors, /6294/i, 'Must flag concatenated number range 6294');
      assert.match(combinedErrors, /Duplicate/i, 'Must flag duplicate header lines');
    });

    it('passes clean resume text containing only ASCII characters, no 6294, and no duplicate headers', () => {
      const result = validateAsciiAtsSafety(CLEAN_MONZO_BACKEND_RESUME.rawResumeText);

      assert.equal(result.isValid, true, 'Clean ASCII resume text must pass safety check');
      assert.equal(result.errors.length, 0);
    });
  });

  describe('Defect 4: Ambiguous Visa / Location Headers', () => {
    it('catches ambiguous "Open to Relocation: Remote" on UK-based role', () => {
      const result = validateVisaLocationClarity(
        FLAWED_MONZO_RESUME_FIXTURE.jdCountry,
        FLAWED_MONZO_RESUME_FIXTURE.jdRemotePolicy,
        FLAWED_MONZO_RESUME_FIXTURE.header
      );

      assert.equal(result.isValid, false, 'Validator must fail when country-specific role has ambiguous Remote header');
      assert.ok(result.errors.length > 0);
      assert.match(
        result.errors[0],
        /Ambiguous Visa\/Location Header/i,
        'Error should explicitly flag ambiguous visa/location header'
      );
      assert.match(result.errors[0], /UK|United Kingdom/i, 'Error should mention the target country');
    });

    it('passes when header explicitly states in-country relocation: "Open to UK Relocation (Visa Sponsorship Required)"', () => {
      const result = validateVisaLocationClarity(
        CLEAN_MONZO_BACKEND_RESUME.jdCountry,
        CLEAN_MONZO_BACKEND_RESUME.jdRemotePolicy,
        CLEAN_MONZO_BACKEND_RESUME.header
      );

      assert.equal(result.isValid, true, 'Explicit country relocation header must pass');
      assert.equal(result.errors.length, 0);
    });

    it('passes for worldwide roles without requiring country-specific relocation', () => {
      const result = validateVisaLocationClarity(
        'Worldwide',
        'Remote',
        'Noida, India (Open to Relocation | Visa Sponsorship Required)'
      );

      assert.equal(result.isValid, true, 'Worldwide roles do not require specific country relocation');
      assert.equal(result.errors.length, 0);
    });
  });

  describe('Integrated Monzo Flawed Resume Defect Catch Verification', () => {
    it('confirms all 4 production defects are caught on the Monzo Senior Staff Backend Engineer output', () => {
      const defect1 = validatePersonaAlignment(
        FLAWED_MONZO_RESUME_FIXTURE.targetRole,
        FLAWED_MONZO_RESUME_FIXTURE.summary,
        FLAWED_MONZO_RESUME_FIXTURE.experienceBullets
      );
      const defect2 = validateNoOrphanedSkills(
        FLAWED_MONZO_RESUME_FIXTURE.skillsSection,
        FLAWED_MONZO_RESUME_FIXTURE.experienceBullets,
        FLAWED_MONZO_RESUME_FIXTURE.projectBullets
      );
      const defect3 = validateAsciiAtsSafety(FLAWED_MONZO_RESUME_FIXTURE.rawResumeText);
      const defect4 = validateVisaLocationClarity(
        FLAWED_MONZO_RESUME_FIXTURE.jdCountry,
        FLAWED_MONZO_RESUME_FIXTURE.jdRemotePolicy,
        FLAWED_MONZO_RESUME_FIXTURE.header
      );

      // Confirm all 4 validators caught their respective defects
      assert.equal(defect1.isValid, false, 'Defect 1 (Role-Persona Mismatch) MUST be caught');
      assert.equal(defect2.isValid, false, 'Defect 2 (Orphaned Keyword Dumping) MUST be caught');
      assert.equal(defect3.isValid, false, 'Defect 3 (Unicode/PDF Glyph Corruption) MUST be caught');
      assert.equal(defect4.isValid, false, 'Defect 4 (Ambiguous Visa/Location) MUST be caught');

      const allDefectErrors = [
        ...defect1.errors,
        ...defect2.errors,
        ...defect3.errors,
        ...defect4.errors,
      ];

      assert.ok(allDefectErrors.length >= 4, 'Must have at least 4 defect error diagnostics');
    });
  });
});
