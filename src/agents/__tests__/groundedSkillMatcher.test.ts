import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  matchGroundedSkills,
  findSemanticEquivalent,
  buildGroundedSkillsSection,
  generateGroundedExperienceBullets,
} from '../groundedSkillMatcher.ts';
import {
  critiqueAndReviseResume,
  type ResumeDraft,
} from '../resumeCritic.ts';
import { classifyJobDescription } from '../jdClassifier.ts';
import { assembleResumeContext } from '../resumeAssembler.ts';
import { candidateMasterProfile } from '../../data/candidateMasterProfile.ts';
import {
  validateNoOrphanedSkills,
  validatePersonaAlignment,
  isSkillEvidencedInText,
} from '../../validators/atsResumeValidators.ts';

describe('Universal Grounded Skill Matcher & Semantic Bridge', () => {
  describe('Semantic Skill Bridge & Architectural Equivalents', () => {
    it('bridges requested backend languages (Go, Ruby, Rust, C#, Scala, Elixir, Kotlin) to candidate equivalents', () => {
      const skills = ['Go', 'Ruby', 'Rust', 'C#', 'Scala', 'Elixir', 'Kotlin'];
      for (const skill of skills) {
        const bridge = findSemanticEquivalent(skill);
        assert.ok(bridge, `Must find semantic bridge for ${skill}`);
        assert.ok(bridge!.mapping.equivalentSkill.length > 10);
        assert.ok(bridge!.mapping.rationale.length > 10);

        const bullet = bridge!.mapping.generateXyzBullet(skill);
        assert.match(bullet, /Architected|Engineered|Optimized|Designed|Maintained/i);
        assert.match(bullet, /%/i, 'Must contain quantifiable metric [Y]');
        assert.match(bullet, /by\s+/i, 'Must contain concrete action [Z]');
      }
    });

    it('bridges requested frontend frameworks (Vue.js, Angular, Svelte, Nuxt, Solid.js) to candidate equivalents', () => {
      const skills = ['Vue.js', 'Angular', 'Svelte', 'Nuxt', 'Solid.js'];
      for (const skill of skills) {
        const bridge = findSemanticEquivalent(skill);
        assert.ok(bridge, `Must find semantic bridge for ${skill}`);
        assert.equal(bridge!.mapping.category, 'Frontend Frameworks & Libraries');

        const bullet = bridge!.mapping.generateXyzBullet(skill);
        assert.match(bullet, /Architected|Constructed|Developed|Engineered|Optimized/i);
        assert.match(bullet, /%/i);
        assert.match(bullet, /by\s+/i);
      }
    });

    it('bridges requested databases & streaming tools (Cassandra, ClickHouse, Snowflake, Flink, Spark)', () => {
      const skills = ['Cassandra', 'ClickHouse', 'Snowflake', 'Flink', 'Spark', 'CockroachDB', 'Couchbase'];
      for (const skill of skills) {
        const bridge = findSemanticEquivalent(skill);
        assert.ok(bridge, `Must find semantic bridge for ${skill}`);
        const bullet = bridge!.mapping.generateXyzBullet(skill);
        assert.match(bullet, /Architected|Engineered|Designed|Developed|Optimized/i);
        assert.match(bullet, /by\s+/i);
      }
    });

    it('bridges requested AI/Vector tools (Pinecone, Milvus, Weaviate, LlamaIndex, TensorFlow)', () => {
      const skills = ['Pinecone', 'Milvus', 'Weaviate', 'LlamaIndex', 'TensorFlow'];
      for (const skill of skills) {
        const bridge = findSemanticEquivalent(skill);
        assert.ok(bridge, `Must find semantic bridge for ${skill}`);
        const bullet = bridge!.mapping.generateXyzBullet(skill);
        assert.match(bullet, /Architected|Engineered|Implemented|Constructed|Optimized/i);
        assert.match(bullet, /by\s+/i);
      }
    });

    it('bridges requested DevOps & Cloud tools (Pulumi, Azure, Datadog, Istio, Splunk)', () => {
      const skills = ['Pulumi', 'Azure', 'Datadog', 'Istio', 'Splunk'];
      for (const skill of skills) {
        const bridge = findSemanticEquivalent(skill);
        assert.ok(bridge, `Must find semantic bridge for ${skill}`);
        const bullet = bridge!.mapping.generateXyzBullet(skill);
        assert.match(bullet, /Automated|Architected|Engineered|Hardened|Centralized/i);
        assert.match(bullet, /by\s+/i);
      }
    });
  });

  describe('Skill Classifications & Unbridgeable Skills Isolation', () => {
    it('classifies skills explicitly into verified_match, architectural_equivalent, or excluded and omits Additional Skills', () => {
      const mixedJdSkills = [
        'Python', // verified_match
        'PostgreSQL', // verified_match
        'Go', // architectural_equivalent
        'Ruby', // architectural_equivalent
        'Vue.js', // architectural_equivalent
        'COBOL', // excluded
        'Solidity', // excluded
        'Fortran', // excluded
        'SAP ABAP', // excluded
        'Embedded RTOS Firmware', // excluded
      ];

      const matchResult = matchGroundedSkills(
        mixedJdSkills,
        candidateMasterProfile,
        'backend_distributed_systems'
      );

      // Verify exact classification breakdown
      assert.equal(
        matchResult.classifiedSkills.find((c) => c.skill === 'Python')?.classification,
        'verified_match'
      );
      assert.equal(
        matchResult.classifiedSkills.find((c) => c.skill === 'PostgreSQL')?.classification,
        'verified_match'
      );
      assert.equal(
        matchResult.classifiedSkills.find((c) => c.skill === 'Go')?.classification,
        'architectural_equivalent'
      );
      assert.equal(
        matchResult.classifiedSkills.find((c) => c.skill === 'Ruby')?.classification,
        'architectural_equivalent'
      );
      assert.equal(
        matchResult.classifiedSkills.find((c) => c.skill === 'Vue.js')?.classification,
        'architectural_equivalent'
      );
      assert.equal(
        matchResult.classifiedSkills.find((c) => c.skill === 'COBOL')?.classification,
        'excluded'
      );
      assert.equal(
        matchResult.classifiedSkills.find((c) => c.skill === 'Solidity')?.classification,
        'excluded'
      );
      assert.equal(
        matchResult.classifiedSkills.find((c) => c.skill === 'SAP ABAP')?.classification,
        'excluded'
      );

      // Verify unmatchedSkills / excludedSkills list
      assert.ok(matchResult.excludedSkills.includes('COBOL'));
      assert.ok(matchResult.excludedSkills.includes('Solidity'));
      assert.ok(matchResult.excludedSkills.includes('SAP ABAP'));

      // Build CORE SKILLS
      const skillsSection = buildGroundedSkillsSection(
        matchResult,
        candidateMasterProfile,
        'backend_distributed_systems'
      );

      // Strictly ZERO "Additional Skills" line or catch-all category
      assert.ok(
        !Object.keys(skillsSection).some((cat) => /additional\s*skills|other\s*skills|misc/i.test(cat)),
        'No Additional Skills or catch-all category may ever exist'
      );

      // Completely exclude unbridgeable skills from CORE SKILLS
      const allIncludedSkills = Object.values(skillsSection).flat().join(' ');
      assert.ok(!allIncludedSkills.includes('COBOL'));
      assert.ok(!allIncludedSkills.includes('Solidity'));
      assert.ok(!allIncludedSkills.includes('Fortran'));
      assert.ok(!allIncludedSkills.includes('SAP ABAP'));
      assert.ok(!allIncludedSkills.includes('Embedded RTOS'));
    });

    it('weaves all bridged and matched skills into experience bullets using Google XYZ formula', () => {
      const jdSkills = ['Go', 'Ruby', 'Apache Cassandra'];
      const matchResult = matchGroundedSkills(
        jdSkills,
        candidateMasterProfile,
        'backend_distributed_systems'
      );
      const baseBullets =
        candidateMasterProfile.experiences[0]?.personaVariants.backend_distributed_systems?.bullets || [];
      const wovenBullets = generateGroundedExperienceBullets(matchResult, baseBullets);
      const bodyText = wovenBullets.join(' ');

      for (const eq of matchResult.architecturalEquivalents) {
        assert.ok(isSkillEvidencedInText(eq.jdSkill, bodyText), `Bridged skill ${eq.jdSkill} must appear in bullets`);
        assert.match(eq.xyzBullet, /by\s+/i, 'XYZ bullet must include concrete [Z] action');
        assert.match(eq.xyzBullet, /%/, 'XYZ bullet must include quantifiable [Y] metric');
      }
    });
  });

  describe('100% Skill-to-Bullet Backing Guarantee Across ALL Domains', () => {
    const universalFixtures = [
      {
        name: 'Backend (Monzo Go/Kafka/Cassandra)',
        jd: {
          title: 'Senior Staff Backend Engineer',
          companyName: 'Monzo',
          description: 'Distributed backend systems with Go, Kafka, Cassandra, Kubernetes, PostgreSQL.',
          requiredSkills: ['Go', 'Apache Kafka', 'Apache Cassandra', 'Kubernetes', 'PostgreSQL'],
        },
        domain: 'backend_distributed_systems' as const,
      },
      {
        name: 'Frontend (Stripe React/Next.js/Vue Bridge)',
        jd: {
          title: 'Staff Frontend & Web Platform Engineer',
          companyName: 'Stripe',
          description: 'Frontend web architecture with React, Next.js, TypeScript, Storybook, Vue.js.',
          requiredSkills: ['React', 'Next.js', 'TypeScript', 'Storybook', 'Vue.js'],
        },
        domain: 'frontend_web_platform' as const,
      },
      {
        name: 'AI/LLM (Anthropic MCP/LangGraph/Pinecone)',
        jd: {
          title: 'Senior AI & LLM Engineer',
          companyName: 'Anthropic',
          description: 'Agentic workflows using LangGraph, Model Context Protocol (MCP), RAG, pgvector, Pinecone.',
          requiredSkills: ['Python', 'LangGraph', 'MCP', 'RAG', 'pgvector', 'Pinecone'],
        },
        domain: 'ai_llm_architecture' as const,
      },
      {
        name: 'DevOps/SRE (Datadog K8s/Terraform/Pulumi)',
        jd: {
          title: 'Staff DevOps & SRE Platform Engineer',
          companyName: 'Datadog',
          description: 'Multi-region Kubernetes, Terraform, ArgoCD, Prometheus, Grafana, Pulumi.',
          requiredSkills: ['Kubernetes', 'Docker', 'Terraform', 'ArgoCD', 'Prometheus', 'Pulumi'],
        },
        domain: 'devops_cloud_infra' as const,
      },
      {
        name: 'Full-Stack (Figma Node.js/React/GraphQL)',
        jd: {
          title: 'Staff Full-Stack Engineer',
          companyName: 'Figma',
          description: 'End-to-end applications using React, Next.js, Node.js, PostgreSQL, GraphQL.',
          requiredSkills: ['TypeScript', 'React', 'Next.js', 'Node.js', 'PostgreSQL', 'GraphQL'],
        },
        domain: 'fullstack_general' as const,
      },
      {
        name: 'Engineering Leadership (Architecture & Compliance)',
        jd: {
          title: 'Engineering Lead / Technical Director',
          companyName: 'FinTech Corp',
          description: 'Squad leadership, RFC & ADR governance, HIPAA, MAS banking compliance, Agile.',
          requiredSkills: ['Engineering Leadership', 'System Architecture', 'HIPAA', 'MAS'],
        },
        domain: 'engineering_leadership' as const,
      },
    ];

    it('guarantees 100% of skills in CORE SKILLS have explicit production backing in the bullet body across all 6 domains', () => {
      for (const fixture of universalFixtures) {
        const parsedJd = classifyJobDescription(fixture.jd);
        const assembled = assembleResumeContext(candidateMasterProfile, parsedJd);

        const draft: ResumeDraft = {
          basics: assembled.basics,
          skillsSection: assembled.skillsSection,
          experience: assembled.experience,
          projects: assembled.projects,
        };

        // Run universal Critic Loop which invokes validateNoOrphanedSkills strictly
        const criticReview = critiqueAndReviseResume(draft, parsedJd.jobTitle, fixture.domain);

        assert.equal(
          criticReview.approved,
          true,
          `[${fixture.name}] Critic loop must approve with 0 errors. Remaining: ${criticReview.remainingErrors.join('; ')}`
        );

        const revised = criticReview.revisedDraft;
        const allExpBullets = revised.experience.flatMap((e) => e.bullets);
        const allProjBullets = revised.projects.flatMap((p) => p.bullets || []);
        const combinedBody = [...allExpBullets, ...allProjBullets].join(' ');

        // Assert zero Additional Skills catch-all line
        assert.ok(
          !Object.keys(revised.skillsSection).some((c) => /additional\s*skills/i.test(c)),
          `[${fixture.name}] Must have zero Additional Skills category`
        );

        // Assert strict validateNoOrphanedSkills passes with checkAllSkills: true
        const strictValidation = validateNoOrphanedSkills(
          revised.skillsSection,
          allExpBullets,
          allProjBullets,
          { checkAllSkills: true }
        );
        assert.equal(
          strictValidation.isValid,
          true,
          `[${fixture.name}] Strict skill validation failed: ${strictValidation.errors.join('; ')}`
        );

        // Verify EVERY SINGLE SKILL listed in CORE SKILLS is backed in the body text
        for (const [category, skills] of Object.entries(revised.skillsSection)) {
          for (const skill of skills) {
            assert.equal(
              isSkillEvidencedInText(skill, combinedBody),
              true,
              `[${fixture.name}] Skill '${skill}' in '${category}' MUST have production backing in experience/project bullets`
            );
          }
        }
      }
    });
  });

  describe('Universal Resume Critic Loop Across Domains', () => {
    it('detects orphaned skills, eliminates Additional Skills, weaves bridged skills, and drops ungrounded tools', () => {
      const flawedDraft: ResumeDraft = {
        basics: {
          name: 'Ashish Kumar Singh',
          title: 'Senior Staff Backend Engineer',
          summary:
            'Staff- and Senior-level Frontend & Web Platform Engineer with 10+ years experience in React 18, Storybook, and Lighthouse 62 -> 94.',
          location: 'Noida, India',
        },
        skillsSection: {
          'Core Languages': ['TypeScript', 'JavaScript'],
          'Additional Skills': ['Cassandra', 'Kafka', 'Ruby', 'Vue.js', 'SolidityObscureTool'],
        },
        experience: [
          {
            role: 'Senior Engineering Lead',
            company: 'Persistent Systems Ltd.',
            bullets: [
              'Spearheaded enterprise micro-frontend architecture using Webpack Module Federation across 6+ squads.',
              'Engineered web performance optimizations elevating Lighthouse scores from 62 to 94.',
            ],
          },
        ],
        projects: [],
      };

      const initialExpBullets = flawedDraft.experience.flatMap((e) => e.bullets);
      assert.equal(
        validateNoOrphanedSkills(flawedDraft.skillsSection, initialExpBullets, []).isValid,
        false
      );
      assert.equal(
        validatePersonaAlignment('Senior Staff Backend Engineer', flawedDraft.basics.summary, initialExpBullets).isValid,
        false
      );

      const reviewResult = critiqueAndReviseResume(
        flawedDraft,
        'Senior Staff Backend Engineer',
        'backend_distributed_systems'
      );

      assert.equal(reviewResult.approved, true);
      assert.equal(reviewResult.remainingErrors.length, 0);

      const revisedCategories = Object.keys(reviewResult.revisedDraft.skillsSection);
      assert.ok(!revisedCategories.some((cat) => /additional\s*skills/i.test(cat)));

      const allSkills = Object.values(reviewResult.revisedDraft.skillsSection).flat().join(' ');
      assert.ok(!allSkills.includes('SolidityObscureTool'));

      const revisedBullets = reviewResult.revisedDraft.experience.flatMap((e) => e.bullets).join(' ');
      assert.match(revisedBullets, /Cassandra/i);
      assert.match(revisedBullets, /Ruby/i);
      assert.match(revisedBullets, /Vue/i);

      const postSkillValidation = validateNoOrphanedSkills(
        reviewResult.revisedDraft.skillsSection,
        reviewResult.revisedDraft.experience.flatMap((e) => e.bullets),
        [],
        { checkAllSkills: true }
      );
      assert.equal(postSkillValidation.isValid, true);
      assert.equal(((postSkillValidation.metrics?.orphanedSkills as string[]) || []).length, 0);
    });
  });
});
