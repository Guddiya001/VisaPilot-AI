import {
  validatePersonaAlignment,
  validateNoOrphanedSkills,
  validateHumanEngineeringVoice,
  isSkillEvidencedInText,
} from '../validators/atsResumeValidators.ts';

/**
 * Rewrites robotic AI clichés into direct, human engineering prose.
 */
export function rewriteToHumanEngineeringVoice(text: string): string {
  if (!text) return text;
  return text
    .replace(/^\s*spearheaded\b/i, 'Built')
    .replace(/\bspearhead(?:ed|ing|s)?\b/gi, 'led')
    .replace(/^\s*pioneered\b/i, 'Designed')
    .replace(/\bpioneer(?:ed|ing|s)?\b/gi, 'built')
    .replace(/^\s*orchestrated\b/i, 'Automated')
    .replace(/\borchestrat(?:ed|es|e)\b/gi, 'coordinated')
    .replace(/\borchestrating\b/gi, 'coordinating')
    .replace(/\bdelv(?:e|ed|ing|es)\s+into\b/gi, 'investigated')
    .replace(/\btestaments?\s+to\b/gi, 'demonstrating')
    .replace(/\bdynamic\s+landscape\b/gi, 'production environment')
    .replace(/\bmission[- ]critical\b/gi, 'high-volume')
    .replace(/\brobustly\b/gi, 'reliably')
    .replace(/\bseamlessly\s+/gi, '')
    .replace(/\bseamlessly\b/gi, 'cleanly')
    .replace(/\bleverag(?:e|ed|ing|es)\s+cutting[- ]edge\b/gi, 'using modern')
    .replace(/\bcutting[- ]edge\b/gi, 'modern')
    .replace(/\brevolutioniz(?:e|ed|ing|es)\b/gi, 'redesigned')
    .replace(/\bsynerg(?:y|ies|ize|ized|izing|istic)\b/gi, 'alignment')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
import {
  ARCHITECTURAL_EQUIVALENTS_MAP,
  findSemanticEquivalent,
  matchGroundedSkills,
} from './groundedSkillMatcher.ts';
import { candidateMasterProfile } from '../data/candidateMasterProfile.ts';
import type { EngineeringPersona } from '../schemas/candidateProfile.schema.ts';

export interface ResumeDraftBasics {
  name: string;
  title: string;
  summary: string;
  location: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
  openTo?: string;
}

export interface ResumeDraftExperience {
  role: string;
  company: string;
  client?: string;
  location?: string;
  period?: string;
  bullets: string[];
  techStack?: string[];
}

export interface ResumeDraftProject {
  name: string;
  description: string;
  technologies?: string;
  bullets?: string[];
}

export interface ResumeDraft {
  basics: ResumeDraftBasics;
  skillsSection: Record<string, string[]>;
  experience: ResumeDraftExperience[];
  projects: ResumeDraftProject[];
}

export interface CriticReviewResult {
  approved: boolean;
  revisionCount: number;
  initialErrors: string[];
  remainingErrors: string[];
  criticNotes: string[];
  revisedDraft: ResumeDraft;
}

/**
 * Deep clones a ResumeDraft object
 */
function cloneDraft(draft: ResumeDraft): ResumeDraft {
  return JSON.parse(JSON.stringify(draft));
}

/**
 * Maps a skill to an appropriate technical category rather than "Additional Skills"
 */
function categorizeSkill(skill: string): string {
  const eqMatch = findSemanticEquivalent(skill);
  if (eqMatch) {
    return eqMatch.mapping.category;
  }

  const lower = skill.toLowerCase();
  if (/kafka|rabbitmq|message|queue|streaming|event|grpc|distributed/i.test(lower)) {
    return 'Distributed Systems & Messaging';
  }
  if (/cassandra|postgres|mysql|redis|mongodb|database|dynamo|storage|sql|nosql/i.test(lower)) {
    return 'Databases & Storage';
  }
  if (/kubernetes|docker|k8s|cloud|aws|gcp|azure|terraform|helm|ansible|devops|sre|ci\/cd/i.test(lower)) {
    return 'Cloud & Infrastructure';
  }
  if (/python|go|golang|java|spring|c\+\+|rust|typescript|javascript|ruby|php/i.test(lower)) {
    return 'Core Programming Languages';
  }
  if (/react|next|vue|angular|svelte|tailwind|css|ui|storybook|wcag/i.test(lower)) {
    return 'Frontend Frameworks & Libraries';
  }
  if (/mcp|langgraph|langchain|rag|vector|embedding|llm|ai|machine learning/i.test(lower)) {
    return 'Generative AI & LLM Architecture';
  }
  return 'Core Technical Competencies';
}

function findVerifiedBulletForSkill(
  skill: string,
  persona: EngineeringPersona
): string | null {
  // 1. Search experiences for this persona first
  for (const exp of candidateMasterProfile.experiences) {
    const variant = exp.personaVariants[persona] || exp.personaVariants.backend_distributed_systems;
    if (variant) {
      for (const bullet of variant.bullets) {
        if (isSkillEvidencedInText(skill, bullet)) {
          return bullet;
        }
      }
    }
  }

  // 2. Search projects matching this persona
  for (const proj of candidateMasterProfile.projects) {
    if (proj.personas.includes(persona)) {
      const blocks = proj.achievementBlocks?.[persona] || proj.bullets;
      for (const bullet of blocks) {
        if (isSkillEvidencedInText(skill, bullet)) {
          return bullet;
        }
      }
    }
  }

  // 3. Search other personas across experiences/projects as fallback (respecting UI isolation if needed)
  const isNonUiPersona =
    persona === 'backend_distributed_systems' ||
    persona === 'devops_cloud_infra' ||
    persona === 'ai_llm_architecture';

  for (const exp of candidateMasterProfile.experiences) {
    for (const [varPersona, variant] of Object.entries(exp.personaVariants)) {
      if (isNonUiPersona && varPersona === 'frontend_web_platform') continue;
      for (const bullet of variant.bullets) {
        if (isSkillEvidencedInText(skill, bullet)) {
          return bullet;
        }
      }
    }
  }

  return null;
}

/**
 * Reflection / Critic loop in the resume generation workflow
 * Evaluates the resume draft with deterministic validators across ALL universal domains,
 * runs validateNoOrphanedSkills strictly on every skill in CORE SKILLS, identifies orphaned
 * skills or persona mismatches, and performs a targeted revision pass to weave evidence
 * using Google XYZ formulas or purge ungrounded keywords.
 */
export function critiqueAndReviseResume(
  draft: ResumeDraft,
  targetRole: string,
  persona: EngineeringPersona = 'backend_distributed_systems'
): CriticReviewResult {
  const initialDraft = cloneDraft(draft);
  const criticNotes: string[] = [];

  // Step 1: Run initial deterministic validators across all domains
  const allExpBullets = initialDraft.experience.flatMap((e) => e.bullets);
  const allProjBullets = initialDraft.projects.flatMap((p) => p.bullets || []);

  const personaCheck = validatePersonaAlignment(
    targetRole,
    initialDraft.basics.summary,
    allExpBullets
  );
  const skillsCheck = validateNoOrphanedSkills(
    initialDraft.skillsSection,
    allExpBullets,
    allProjBullets,
    { checkAllSkills: true }
  );
  const voiceCheck = validateHumanEngineeringVoice(
    initialDraft.basics.summary,
    allExpBullets,
    allProjBullets
  );

  const initialErrors = [...personaCheck.errors, ...skillsCheck.errors, ...voiceCheck.errors];

  // If already passing all checks (0 persona issues, 0 orphaned skills, and 0 AI buzzwords), approve immediately
  if (personaCheck.isValid && skillsCheck.isValid && voiceCheck.isValid) {
    return {
      approved: true,
      revisionCount: 0,
      initialErrors: [],
      remainingErrors: [],
      criticNotes: [
        `Draft passes 100% of persona alignment, anti-orphaning, and human-voice validation for domain '${persona}'.`,
      ],
      revisedDraft: initialDraft,
    };
  }

  // Step 2: Targeted Revision Pass
  const revised = cloneDraft(initialDraft);
  const revisionCount = 1;

  // ── FIX 1: Resolve Role-Persona Mismatch for Any Domain ──
  if (!personaCheck.isValid) {
    criticNotes.push(
      `Critic Revision: Restored '${persona}' persona summary and purged cross-domain contaminants.`
    );
    revised.basics.summary =
      candidateMasterProfile.summaries[persona] ||
      candidateMasterProfile.summaries.backend_distributed_systems ||
      '';

    const isNonUiRole =
      persona === 'backend_distributed_systems' ||
      persona === 'devops_cloud_infra' ||
      persona === 'ai_llm_architecture';

    const isNonBackendRole = persona === 'frontend_web_platform';

    for (const exp of revised.experience) {
      if (isNonUiRole) {
        exp.bullets = exp.bullets.filter(
          (b) =>
            !/\b(Lighthouse|Core Web Vitals|Storybook|WCAG|Figma|Webpack Module Federation)\b/i.test(
              b
            )
        );
      } else if (isNonBackendRole) {
        exp.bullets = exp.bullets.filter(
          (b) => !/\b(Apache Cassandra|PgBouncer|dead-letter queue)\b/i.test(b)
        );
      }

      if (exp.bullets.length < 3) {
        const matchingExp = candidateMasterProfile.experiences.find(
          (e) =>
            e.company.toLowerCase().includes(exp.company.toLowerCase()) ||
            exp.company.toLowerCase().includes(e.company.toLowerCase())
        );
        if (matchingExp && matchingExp.personaVariants[persona]) {
          exp.bullets = [...matchingExp.personaVariants[persona].bullets];
        } else if (matchingExp && matchingExp.personaVariants.backend_distributed_systems) {
          exp.bullets = [...matchingExp.personaVariants.backend_distributed_systems.bullets];
        }
      }
    }
  }

  // ── FIX 2: Completely Eliminate "Additional Skills" Category ──
  const categories = Object.keys(revised.skillsSection);
  const additionalSkillsKeys = categories.filter((cat) =>
    /^additional\s*skills|^other\s*skills|^misc/i.test(cat.trim())
  );

  const skillsToReassign: string[] = [];
  for (const key of additionalSkillsKeys) {
    criticNotes.push(`Critic Revision: Eliminated forbidden orphaned '${key}' category.`);
    skillsToReassign.push(...(revised.skillsSection[key] || []));
    delete revised.skillsSection[key];
  }

  for (const skill of skillsToReassign) {
    const eqMatch = findSemanticEquivalent(skill);
    if (eqMatch) {
      const targetCat = eqMatch.mapping.category;
      if (!revised.skillsSection[targetCat]) {
        revised.skillsSection[targetCat] = [];
      }
      if (!revised.skillsSection[targetCat].some((s) => s.toLowerCase() === skill.toLowerCase())) {
        revised.skillsSection[targetCat].push(skill);
      }
    } else if (findVerifiedBulletForSkill(skill, persona)) {
      const targetCat = categorizeSkill(skill);
      if (!revised.skillsSection[targetCat]) {
        revised.skillsSection[targetCat] = [];
      }
      if (!revised.skillsSection[targetCat].some((s) => s.toLowerCase() === skill.toLowerCase())) {
        revised.skillsSection[targetCat].push(skill);
      }
    } else {
      criticNotes.push(
        `Critic Revision: Excluded ungrounded tool '${skill}' from eliminated '${additionalSkillsKeys[0] || 'Additional Skills'}'.`
      );
    }
  }

  // ── FIX 3: Resolve Every Orphaned Skill Missing from Experience/Project Bullets ──
  let currentBulletsText = [
    ...revised.experience.flatMap((e) => e.bullets),
    ...revised.projects.flatMap((p) => p.bullets || []),
  ].join(' ');

  for (const [category, skillsList] of Object.entries(revised.skillsSection)) {
    const retainedSkills: string[] = [];

    for (const skill of skillsList) {
      const cleanSkill = skill.replace(/\s*\(Architectural Equivalent\)/i, '').trim();
      const isEvidenced = isSkillEvidencedInText(cleanSkill, currentBulletsText);

      if (isEvidenced) {
        retainedSkills.push(skill);
      } else {
        // Missing from bullets: Check if architectural equivalent exists to weave XYZ impact bullet
        const eqMatch = findSemanticEquivalent(cleanSkill);

        if (eqMatch && revised.experience.length > 0) {
          const newBullet = eqMatch.mapping.generateXyzBullet(cleanSkill);
          revised.experience[0].bullets.push(newBullet);
          currentBulletsText += ' ' + newBullet;
          retainedSkills.push(skill);
          criticNotes.push(
            `Critic Revision: Wove '${cleanSkill}' into experience bullets using Google XYZ formula.`
          );
        } else {
          // Check if it is a verified candidate skill in candidateMasterProfile
          const verifiedBullet = findVerifiedBulletForSkill(cleanSkill, persona);
          if (verifiedBullet && revised.experience.length > 0) {
            if (!revised.experience[0].bullets.includes(verifiedBullet)) {
              revised.experience[0].bullets.push(verifiedBullet);
              currentBulletsText += ' ' + verifiedBullet;
            }
            retainedSkills.push(skill);
            criticNotes.push(
              `Critic Revision: Restored verified production bullet for '${cleanSkill}'.`
            );
          } else {
            // Unrelated / ungrounded: drop rather than hallucinate or orphan
            criticNotes.push(
              `Critic Revision: Excluded ungrounded/unbacked skill '${skill}' from '${category}'.`
            );
          }
        }
      }
    }

    revised.skillsSection[category] = retainedSkills;
  }

  // Remove empty skill categories
  for (const [category, list] of Object.entries(revised.skillsSection)) {
    if (list.length === 0) {
      delete revised.skillsSection[category];
    }
  }

  // ── FIX 4: Enforce Human Engineering Voice & Eliminate AI Buzzwords ──
  const rewrittenSummary = rewriteToHumanEngineeringVoice(revised.basics.summary);
  if (rewrittenSummary !== revised.basics.summary) {
    revised.basics.summary = rewrittenSummary;
    criticNotes.push('Critic Revision: Removed robotic AI buzzwords from professional summary.');
  }
  for (const exp of revised.experience) {
    exp.bullets = exp.bullets.map((b) => rewriteToHumanEngineeringVoice(b));
  }
  for (const proj of revised.projects) {
    if (proj.bullets) {
      proj.bullets = proj.bullets.map((b) => rewriteToHumanEngineeringVoice(b));
    }
  }

  // Step 3: Post-Revision Deterministic Validation across all domains
  const finalExpBullets = revised.experience.flatMap((e) => e.bullets);
  const finalProjBullets = revised.projects.flatMap((p) => p.bullets || []);

  const rePersonaCheck = validatePersonaAlignment(
    targetRole,
    revised.basics.summary,
    finalExpBullets
  );
  const reSkillsCheck = validateNoOrphanedSkills(
    revised.skillsSection,
    finalExpBullets,
    finalProjBullets,
    { checkAllSkills: true }
  );
  const reVoiceCheck = validateHumanEngineeringVoice(
    revised.basics.summary,
    finalExpBullets,
    finalProjBullets
  );

  const remainingErrors = [
    ...rePersonaCheck.errors,
    ...reSkillsCheck.errors,
    ...reVoiceCheck.errors,
  ];
  const approved = remainingErrors.length === 0;

  return {
    approved,
    revisionCount,
    initialErrors,
    remainingErrors,
    criticNotes,
    revisedDraft: revised,
  };
}
