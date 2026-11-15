import type {
  CandidateMasterProfile,
  UniversalDomain,
  DomainWeightDistribution,
} from '../schemas/candidateProfile.schema.ts';
import type { ParsedJobDescription } from './jdClassifier.ts';
import { formatVisaLocationHeader } from '../utils/visaHeaderFormatter.ts';
import { sanitizeResumeObject } from '../utils/atsSanitizer.ts';
import { matchGroundedSkills } from './groundedSkillMatcher.ts';

export interface AssembleOptions {
  candidateCity?: string;
  maxExperienceBulletsPerRole?: number;
  maxProjects?: number;
}

export interface AssembledExperience {
  role: string;
  company: string;
  client?: string;
  location: string;
  period: string;
  bullets: string[];
  techStack: string[];
}

export interface AssembledProject {
  name: string;
  description: string;
  technologies: string;
  bullets: string[];
}

export interface AssembledResume {
  basics: {
    name: string;
    title: string;
    summary: string;
    location: string;
    email: string;
    phone: string;
    linkedin: string;
    github: string;
    portfolio: string;
  };
  skillsSection: Record<string, string[]>;
  experience: AssembledExperience[];
  projects: AssembledProject[];
  domainWeightsUsed: DomainWeightDistribution;
  excludedDomains: UniversalDomain[];
}

const UNIVERSAL_DOMAINS: UniversalDomain[] = [
  'backend_distributed_systems',
  'ai_llm_architecture',
  'frontend_web_platform',
  'devops_cloud_infra',
  'fullstack_general',
  'engineering_leadership',
];

// UI keywords that MUST be eliminated when frontend_web_platform weight is 0
const PURE_UI_KEYWORDS = [
  /\b(?:Google\s*)?Lighthouse\b/i,
  /\bCore\s*Web\s*Vitals\b/i,
  /\b(?:Tailwind\s*)?CSS[0-9]?\b/i,
  /\bStorybook\b/i,
  /\bWCAG(?:\s*2\.[01](?:\s*AA)?)?\b/i,
  /\bFigma\b/i,
  /\bWebpack\s*Module\s*Federation\b/i,
  /\bMicro-frontends?\b/i,
];

// Backend/DevOps keywords that MUST be eliminated when applying for pure Frontend
const PURE_BACKEND_INFRA_KEYWORDS = [
  /\bApache\s*Cassandra\b/i,
  /\bApache\s*Kafka\b/i,
  /\bPgBouncer\b/i,
  /\bdead-letter\s*queue\b/i,
  /\bmonolithic\s*services\s*into\s*containerized\b/i,
];

// AI/LLM specialized keywords excluded when ai_llm_architecture weight is 0
const PURE_AI_KEYWORDS = [
  /\bLangGraph\b/i,
  /\bModel\s*Context\s*Protocol\b/i,
  /\bvLLM\b/i,
  /\bRagas\b/i,
  /\bTruLens\b/i,
  /\bpgvector\b/i,
  /\bChromaDB\b/i,
];

/**
 * Dynamic Context Assembler
 * Selects and weights experience bullet points, skills, and modular project achievement blocks
 * based on the JD's domainWeightDistribution.
 * Strictly eliminates cross-contamination across unrelated engineering disciplines.
 */
export function assembleResumeContext(
  profile: CandidateMasterProfile,
  parsedJd: ParsedJobDescription,
  options: AssembleOptions = {}
): AssembledResume {
  const city = options.candidateCity || 'Noida, India';
  const maxBulletsPerRole = options.maxExperienceBulletsPerRole || 4;
  const maxProjects = options.maxProjects || 2;

  const weights = parsedJd.domainWeightDistribution;
  const primaryDomain = parsedJd.primaryDomain;

  // 1. Identify active domains and excluded domains strictly from UNIVERSAL_DOMAINS
  const activeDomains = UNIVERSAL_DOMAINS.filter((d) => (weights[d] || 0) > 0);
  const excludedDomains = UNIVERSAL_DOMAINS.filter((d) => (weights[d] || 0) === 0);

  const isUiExcluded = (weights.frontend_web_platform || 0) === 0;
  const isBackendInfraExcluded =
    primaryDomain === 'frontend_web_platform' &&
    (weights.backend_distributed_systems || 0) === 0 &&
    (weights.devops_cloud_infra || 0) === 0;
  const isAiExcluded = (weights.ai_llm_architecture || 0) === 0;

  // 2. Visa & Location Header
  const locationHeader = parsedJd.country
    ? formatVisaLocationHeader(city, {
        country: parsedJd.country,
        workMode: parsedJd.workMode || 'remote',
        sponsorsVisa: true,
      })
    : `${city} (Open to Global Remote | UTC+5:30)`;

  // 3. Professional Summary
  const summary =
    profile.summaries[primaryDomain] ||
    profile.summaries.backend_distributed_systems ||
    '';

  // 4. Grounded Skills Matching (zero "Additional Skills" catch-all line)
  const skillMatchReport = matchGroundedSkills(
    [...parsedJd.coreRequiredSkills, ...parsedJd.preferredSkills],
    profile,
    primaryDomain
  );

  const baseSkillsSection = profile.skillsByPersona[primaryDomain] || {};
  const skillsSection: Record<string, string[]> = {};

  for (const [cat, skills] of Object.entries(baseSkillsSection)) {
    if (isUiExcluded && /ui architecture|design systems|web performance/i.test(cat)) {
      continue;
    }
    if (isBackendInfraExcluded && /distributed systems|databases & storage/i.test(cat)) {
      continue;
    }
    skillsSection[cat] = [...skills];
  }

  // Merge secondary domain skills cleanly when secondary weight is meaningful
  if (parsedJd.secondaryDomain && (weights[parsedJd.secondaryDomain] || 0) >= 0.20) {
    const secSkills = profile.skillsByPersona[parsedJd.secondaryDomain] || {};
    for (const [cat, skills] of Object.entries(secSkills)) {
      if (isUiExcluded && /ui architecture|design systems|web performance/i.test(cat)) {
        continue;
      }
      if (isBackendInfraExcluded && /distributed systems|databases & storage/i.test(cat)) {
        continue;
      }
      if (!skillsSection[cat] && Object.keys(skillsSection).length < 5) {
        skillsSection[cat] = skills.slice(0, 5);
      }
    }
  }

  // 5. Work Experience Bullets Selection & Proportional Weighting
  const experience: AssembledExperience[] = profile.experiences.map((exp, expIndex) => {
    const candidateBullets: Array<{ bullet: string; domain: UniversalDomain; priority: number }> = [];

    for (const domain of activeDomains) {
      const variant = exp.personaVariants[domain];
      if (variant) {
        const domainWeight = weights[domain] || 0;
        variant.bullets.forEach((bullet, bIdx) => {
          if (isUiExcluded && PURE_UI_KEYWORDS.some((re) => re.test(bullet))) {
            return;
          }
          if (isBackendInfraExcluded && PURE_BACKEND_INFRA_KEYWORDS.some((re) => re.test(bullet))) {
            return;
          }
          if (isAiExcluded && PURE_AI_KEYWORDS.some((re) => re.test(bullet))) {
            return;
          }

          // Proportional priority decay balances multi-domain resumes (e.g. 50/50 vs 80/20 vs 100/0)
          const priority = domainWeight * 10 - bIdx * 2.2;
          candidateBullets.push({ bullet, domain, priority });
        });
      }
    }

    candidateBullets.sort((a, b) => b.priority - a.priority);

    const selectedBullets: string[] = [];
    const seenBullets = new Set<string>();

    for (const item of candidateBullets) {
      if (selectedBullets.length >= maxBulletsPerRole) break;
      if (!seenBullets.has(item.bullet)) {
        seenBullets.add(item.bullet);
        selectedBullets.push(item.bullet);
      }
    }

    // Weave architectural equivalents (e.g. Go, Cassandra) into primary experience using XYZ formula
    if (expIndex === 0 && skillMatchReport.architecturalEquivalents.length > 0) {
      for (const eq of skillMatchReport.architecturalEquivalents) {
        if (!selectedBullets.some((b) => b.toLowerCase().includes(eq.jdSkill.toLowerCase()))) {
          selectedBullets.push(eq.xyzBullet);
        }
      }
    }

    const primaryVariant =
      exp.personaVariants[primaryDomain] ||
      exp.personaVariants.backend_distributed_systems;

    return {
      role: primaryVariant?.roleTitle || 'Senior Software Engineer',
      company: exp.company,
      client: exp.client,
      location: exp.location,
      period: exp.period,
      bullets: selectedBullets,
      techStack: primaryVariant?.techStack || [],
    };
  });

  // 6. Selected Projects Ranking & Modular Achievement Block Selection
  const rankedProjects = profile.projects
    .map((proj) => {
      const projDomains = (proj.domains || proj.personas) as UniversalDomain[];
      const matchesActive = projDomains.some((d) => activeDomains.includes(d));
      if (!matchesActive) return null;

      if (isUiExcluded) {
        const isFrontendProj =
          /design system|micro-frontend|storybook|ui component/i.test(proj.name) ||
          /design system|micro-frontend|storybook|ui component/i.test(proj.description);
        if (isFrontendProj) return null;
      }

      if (isBackendInfraExcluded) {
        const isBackendProj =
          /distributed event|cassandra|ledger|kubernetes infrastructure|governance/i.test(proj.name);
        if (isBackendProj) return null;
      }

      let score = projDomains.reduce((sum, d) => sum + (weights[d] || 0), 0);
      if (projDomains.includes(primaryDomain)) {
        score += 5;
      }

      return { proj, score };
    })
    .filter((item): item is { proj: CandidateMasterProfile['projects'][number]; score: number } => item !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxProjects);

  const projects: AssembledProject[] = rankedProjects.map(({ proj }) => {
    let bullets: string[] = [];

    if (proj.achievementBlocks) {
      const sortedActive = [...activeDomains].sort(
        (a, b) => (weights[b] || 0) - (weights[a] || 0)
      );
      const seen = new Set<string>();
      for (const dom of sortedActive) {
        const domBullets = proj.achievementBlocks[dom] || [];
        for (const b of domBullets) {
          if (!seen.has(b)) {
            seen.add(b);
            bullets.push(b);
          }
        }
      }
    }

    if (bullets.length === 0) {
      bullets = [...proj.bullets];
    }

    if (isUiExcluded) {
      bullets = bullets.filter((b) => !PURE_UI_KEYWORDS.some((re) => re.test(b)));
    }
    if (isBackendInfraExcluded) {
      bullets = bullets.filter((b) => !PURE_BACKEND_INFRA_KEYWORDS.some((re) => re.test(b)));
    }
    if (isAiExcluded) {
      bullets = bullets.filter((b) => !PURE_AI_KEYWORDS.some((re) => re.test(b)));
    }

    return {
      name: proj.name,
      description: proj.description,
      technologies: proj.technologies,
      bullets: bullets.slice(0, 3),
    };
  });

  const rawAssembled: AssembledResume = {
    basics: {
      name: profile.basics.name,
      title: parsedJd.jobTitle,
      summary,
      location: locationHeader,
      email: profile.basics.email,
      phone: profile.basics.phone,
      linkedin: profile.basics.linkedin,
      github: profile.basics.github,
      portfolio: profile.basics.portfolio,
    },
    skillsSection,
    experience,
    projects,
    domainWeightsUsed: weights,
    excludedDomains,
  };

  // 7. Sanitize ATS text, glyphs, and deduplicate headers
  return sanitizeResumeObject(rawAssembled);
}
