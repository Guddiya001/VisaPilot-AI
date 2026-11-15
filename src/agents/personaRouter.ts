import type {
  CandidateMasterProfile,
  EngineeringPersona,
  FilteredCandidateProfile,
} from '../schemas/candidateProfile.schema.ts';
import { candidateMasterProfile } from '../data/candidateMasterProfile.ts';
import { buildKeywordRegex } from '../validators/atsResumeValidators.ts';

export interface ParsedJobDescription {
  title: string;
  description: string;
  requiredSkills?: string[];
  preferredSkills?: string[];
  companyName?: string;
}

export interface PersonaClassificationResult {
  primaryPersona: EngineeringPersona;
  secondaryPersona?: EngineeringPersona;
  confidence: number;
  scores: Record<EngineeringPersona, number>;
  reasoning: string;
}

// Characteristic skill dictionaries per persona
const PERSONA_KEYWORDS: Record<EngineeringPersona, string[]> = {
  backend_distributed_systems: [
    'backend', 'distributed systems', 'microservices', 'kafka', 'apache kafka',
    'rabbitmq', 'cassandra', 'postgresql', 'postgres', 'redis', 'grpc',
    'kubernetes', 'k8s', 'docker', 'aws', 'gcp', 'golang', 'go', 'python',
    'fastapi', 'java', 'spring boot', 'restful', 'rest api', 'sql', 'nosql',
    'event-driven', 'message queue', 'high concurrency', 'scalability',
    'oauth', 'pkce', 'database optimization', 'dynamodb', 'terraform',
  ],

  ai_llm_architecture: [
    'generative ai', 'genai', 'llm', 'large language models', 'rag',
    'retrieval-augmented generation', 'vector search', 'embeddings',
    'model context protocol', 'mcp', 'langgraph', 'langchain', 'ai agents',
    'agentic', 'tool calling', 'vllm', 'pgvector', 'chroma', 'qdrant',
    'ragas', 'trulens', 'pytorch', 'prompt engineering', 'structured output',
  ],

  frontend_web_platform: [
    'frontend', 'front-end', 'web platform', 'react', 'react.js', 'next.js',
    'typescript', 'javascript', 'html5', 'css', 'css3', 'tailwind', 'tailwind css',
    'webpack', 'module federation', 'micro-frontends', 'core web vitals',
    'lighthouse', 'storybook', 'design system', 'wcag', 'a11y', 'accessibility',
    'figma', 'redux', 'tanstack query', 'zustand', 'ui architecture',
  ],

  fullstack_platform: [
    'fullstack', 'full-stack', 'full stack', 'web application', 'end-to-end',
    'node.js', 'typescript', 'react', 'python', 'rest api', 'graphql',
  ],

  devops_cloud_infra: [
    'devops', 'sre', 'site reliability', 'platform engineering', 'cloud infrastructure',
    'kubernetes', 'k8s', 'docker', 'terraform', 'iac', 'helm', 'argocd', 'gitops',
    'aws', 'gcp', 'ci/cd', 'prometheus', 'grafana', 'opentelemetry', 'datadog', 'linux',
  ],

  fullstack_general: [
    'fullstack', 'full-stack', 'full stack', 'generalist', 'web application', 'end-to-end',
    'typescript', 'react', 'node.js', 'nestjs', 'python', 'graphql', 'api', 'saas',
  ],

  engineering_leadership: [
    'engineering manager', 'director of engineering', 'vp of engineering', 'head of engineering',
    'engineering lead', 'technical lead', 'tech lead', 'staff engineer', 'mentoring',
    'technical strategy', 'architecture governance', 'rfc', 'adr', 'agile', 'scrum',
  ],
};

// UI-only keywords that must NEVER appear in backend_distributed_systems context
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

/**
 * Classifies a parsed Job Description into primary and secondary EngineeringPersona
 */
export function classifyPersona(jd: ParsedJobDescription): PersonaClassificationResult {
  const scores: Record<EngineeringPersona, number> = {
    backend_distributed_systems: 0,
    ai_llm_architecture: 0,
    fullstack_platform: 0,
    frontend_web_platform: 0,
    devops_cloud_infra: 0,
    fullstack_general: 0,
    engineering_leadership: 0,
  };

  const titleLower = (jd.title || '').toLowerCase();
  const descLower = (jd.description || '').toLowerCase();
  const allSkills = [
    ...(jd.requiredSkills || []),
    ...(jd.preferredSkills || []),
  ].map((s) => s.toLowerCase());

  // 1. High-weight scoring on Job Title (10 points per clear title match)
  if (/\b(backend|distributed|systems?|server|api|database|infra(?:structure)?|platform|sre|reliability|cloud|data\s*engineer)\b/i.test(titleLower)) {
    scores.backend_distributed_systems += 10;
  }
  if (/\b(ai\b|artificial\s*intelligence|machine\s*learning|ml\b|llm|genai|generative\s*ai|nlp|rag|agentic)\b/i.test(titleLower)) {
    scores.ai_llm_architecture += 10;
  }
  if (/\b(frontend|front-end|web\s*platform|ui\b|ux|client-side|react|angular|vue)\b/i.test(titleLower)) {
    scores.frontend_web_platform += 10;
  }
  if (/\b(fullstack|full-stack|full\s*stack|generalist)\b/i.test(titleLower)) {
    scores.fullstack_platform += 10;
  }

  // 2. Medium-weight scoring on Required & Preferred Skills (3 points per match)
  for (const [persona, keywords] of Object.entries(PERSONA_KEYWORDS) as Array<[EngineeringPersona, string[]]>) {
    for (const kw of keywords) {
      if (allSkills.some((s) => s.includes(kw) || kw.includes(s))) {
        scores[persona] += 3;
      }
    }
  }

  // 3. Low-weight scoring on Description text (1 point per keyword match)
  for (const [persona, keywords] of Object.entries(PERSONA_KEYWORDS) as Array<[EngineeringPersona, string[]]>) {
    for (const kw of keywords) {
      const regex = buildKeywordRegex(kw);
      if (regex.test(descLower)) {
        scores[persona] += 1;
      }
    }
  }

  // Sort personas by score descending
  const sortedPersonas = (Object.keys(scores) as EngineeringPersona[]).sort(
    (a, b) => scores[b] - scores[a]
  );

  const primaryPersona = sortedPersonas[0];
  const secondaryPersona = scores[sortedPersonas[1]] > 3 ? sortedPersonas[1] : undefined;

  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
  const confidence = totalScore > 0 ? Math.min(1, Number((scores[primaryPersona] / totalScore).toFixed(2))) : 0.5;

  const reasoning = `Classified as ${primaryPersona} (score: ${scores[primaryPersona]}, confidence: ${(confidence * 100).toFixed(0)}%) based on title "${jd.title}" and matching technical requirements.`;

  return {
    primaryPersona,
    secondaryPersona,
    confidence,
    scores,
    reasoning,
  };
}

/**
 * Filters the candidate master profile by EngineeringPersona
 * Eliminates all cross-persona contamination before LLM prompt injection.
 */
export function filterCandidateProfile(
  profile: CandidateMasterProfile = candidateMasterProfile,
  primaryPersona: EngineeringPersona,
  secondaryPersona?: EngineeringPersona
): FilteredCandidateProfile {
  // 1. Extract persona-aligned professional summary
  const summary = profile.summaries[primaryPersona] || profile.summaries.backend_distributed_systems;

  // 2. Extract persona-aligned skills section
  const skillsSection = profile.skillsByPersona[primaryPersona] || {};

  // 3. Extract persona-aligned work experience entries
  const experience = profile.experiences.map((exp) => {
    const variant =
      exp.personaVariants[primaryPersona] ||
      exp.personaVariants.backend_distributed_systems ||
      Object.values(exp.personaVariants)[0]!;
    let bullets = [...variant.bullets];

    // CRITICAL: If Backend persona, strictly eliminate any pure UI bullets
    if (primaryPersona === 'backend_distributed_systems') {
      bullets = bullets.filter((bullet) => !PURE_UI_KEYWORDS.some((regex) => regex.test(bullet)));
    }

    return {
      role: variant.roleTitle,
      company: exp.company,
      client: exp.client,
      location: exp.location,
      period: exp.period,
      bullets,
      techStack: variant.techStack,
    };
  });

  // 4. Extract persona-aligned projects (Strictly exclude Frontend-only projects from Backend track)
  const projects = profile.projects
    .filter((proj) => {
      // Must explicitly support the primary persona
      if (!proj.personas.includes(primaryPersona)) {
        return false;
      }
      // If backend, exclude frontend design systems or micro-frontend projects
      if (primaryPersona === 'backend_distributed_systems') {
        const isFrontendProject =
          /design system|micro-frontend|storybook|ui component/i.test(proj.name) ||
          /design system|micro-frontend|storybook|ui component/i.test(proj.description);
        if (isFrontendProject) return false;
      }
      return true;
    })
    .map((proj) => {
      let bullets = [...proj.bullets];
      if (primaryPersona === 'backend_distributed_systems') {
        bullets = bullets.filter((b) => !PURE_UI_KEYWORDS.some((regex) => regex.test(b)));
      }
      return {
        name: proj.name,
        description: proj.description,
        technologies: proj.technologies,
        bullets,
      };
    });

  // Derive title based on primary persona
  const titlesByPersona: Record<EngineeringPersona, string> = {
    backend_distributed_systems: 'Senior Staff Backend Engineer | Distributed Systems & Cloud Platforms',
    ai_llm_architecture: 'Senior Staff AI Engineer | Agentic Systems & LLM Architecture',
    fullstack_platform: 'Staff Full-Stack & Platform Engineer | Cloud Distributed Systems',
    frontend_web_platform: 'Senior / Staff Frontend Engineer | Web Platform & UI Architecture',
    devops_cloud_infra: 'Staff DevOps & SRE Platform Engineer | Cloud Infrastructure',
    fullstack_general: 'Staff Full-Stack Engineer | Distributed Systems & Web Platforms',
    engineering_leadership: 'Engineering Lead & Technical Delivery Director',
  };

  return {
    persona: primaryPersona,
    secondaryPersona,
    basics: {
      name: profile.basics.name,
      title: titlesByPersona[primaryPersona],
      email: profile.basics.email,
      phone: profile.basics.phone,
      location: profile.basics.location,
      linkedin: profile.basics.linkedin,
      github: profile.basics.github,
      portfolio: profile.basics.portfolio,
      summary: summary || profile.summaries.backend_distributed_systems || '',
      openTo: profile.basics.openTo,
    },
    skillsSection,
    experience,
    projects,
    education: profile.education,
    certifications: profile.certifications,
    languages: profile.languages,
  };
}

/**
 * Formats filtered candidate profile into clean, high-density text for LLM prompt context
 */
export function formatProfileForPromptContext(filtered: FilteredCandidateProfile): string {
  const lines: string[] = [];

  lines.push(`CANDIDATE MASTER PROFILE (Persona Track: ${filtered.persona.toUpperCase()}):`);
  lines.push(`Name: ${filtered.basics.name}`);
  lines.push(`Title: ${filtered.basics.title}`);
  lines.push(`Location: ${filtered.basics.location}`);
  lines.push(`Email: ${filtered.basics.email} | Phone: ${filtered.basics.phone}`);
  if (filtered.basics.openTo) {
    lines.push(`Mobility / Relocation: ${filtered.basics.openTo}`);
  }

  lines.push(`\nPROFESSIONAL SUMMARY:`);
  lines.push(filtered.basics.summary);

  lines.push(`\nCORE TECHNICAL SKILLS:`);
  for (const [category, skills] of Object.entries(filtered.skillsSection)) {
    lines.push(`- ${category}: ${skills.join(', ')}`);
  }

  lines.push(`\nWORK EXPERIENCE:`);
  for (const exp of filtered.experience) {
    const clientStr = exp.client ? ` (${exp.client})` : '';
    lines.push(`### ${exp.role} | ${exp.company}${clientStr}`);
    lines.push(`*${exp.location} | ${exp.period}*`);
    for (const bullet of exp.bullets) {
      lines.push(`- ${bullet}`);
    }
    lines.push(`Technologies: ${exp.techStack.join(', ')}\n`);
  }

  lines.push(`SELECTED PROJECTS:`);
  for (const proj of filtered.projects) {
    lines.push(`### ${proj.name}`);
    lines.push(`${proj.description}`);
    for (const bullet of proj.bullets) {
      lines.push(`- ${bullet}`);
    }
    lines.push(`Technologies: ${proj.technologies}\n`);
  }

  return lines.join('\n');
}

