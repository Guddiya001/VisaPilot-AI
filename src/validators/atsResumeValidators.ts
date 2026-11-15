/**
 * ATS Resume Validation Module
 * 
 * Deterministic validators to guard against critical ATS resume generation defects:
 * 1. Role-Persona Mismatch (Frontend content on Backend/Platform/AI roles)
 * 2. Orphaned Keyword Dumping (Unintegrated "Additional Skills" or missing bullet evidence)
 * 3. Unicode / PDF Glyph Corruption (Stripped non-ASCII arrows, concatenated numbers like 6294)
 * 4. Ambiguous Visa / Location Headers (Generic "Remote" relocation instead of country-specific relocation)
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  metrics?: Record<string, unknown>;
}

// ─── UI-ONLY KEYWORDS FOR PERSONA ALIGNMENT ───
export const UI_ONLY_KEYWORDS = [
  'Lighthouse',
  'Core Web Vitals',
  'CSS',
  'Storybook',
  'WCAG',
  'Figma',
];

// Boundary-safe regex for tech keywords (supports C++, C#, .NET, etc.)
export function buildKeywordRegex(keyword: string): RegExp {
  const esc = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const left = /^[a-zA-Z0-9_]/.test(keyword) ? '(?<![a-zA-Z0-9_])' : '(?<=^|[^a-zA-Z0-9_])';
  const right = /[a-zA-Z0-9_]$/.test(keyword) ? '(?![a-zA-Z0-9_])' : '(?=$|[^a-zA-Z0-9_])';
  return new RegExp(`${left}${esc}${right}`, 'i');
}

// Specific UI-keyword regexes with word boundaries
const UI_KEYWORD_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
  { name: 'Lighthouse', pattern: /\b(?:Google\s*)?Lighthouse\b/i },
  { name: 'Core Web Vitals', pattern: /\bCore\s*Web\s*Vitals\b/i },
  { name: 'CSS', pattern: /\b(?:Tailwind\s*)?CSS[0-9]?\b/i },
  { name: 'Storybook', pattern: /\bStorybook\b/i },
  { name: 'WCAG', pattern: /\bWCAG(?:\s*2\.[01](?:\s*AA)?)?\b/i },
  { name: 'Figma', pattern: /\bFigma\b/i },
];

/**
 * 1. Persona Alignment Validator
 * 
 * Fails if `targetRole` is Backend/Platform/AI, but >30% of the summary/bullets
 * reference UI-only keywords (Lighthouse, Core Web Vitals, CSS, Storybook, WCAG, Figma).
 */
export function validatePersonaAlignment(
  targetRole: string,
  summary: string,
  experienceBullets: string[]
): ValidationResult {
  const errors: string[] = [];
  const isFrontendOrFullstack = /\b(frontend|front-end|ui\b|ux\b|web\s+platform|fullstack|full-stack|full\s*stack)\b/i.test(targetRole);
  const isBackendPlatformAI =
    !isFrontendOrFullstack &&
    /\b(backend|platform|infra(?:structure)?|systems?|sre|reliability|ai\b|machine\s*learning|ml\b|data\s*engineer(?:ing)?)\b/i.test(targetRole);

  if (!isBackendPlatformAI) {
    return { isValid: true, errors: [] };
  }

  const itemsToCheck: string[] = [];
  if (summary && summary.trim().length > 0) {
    itemsToCheck.push(summary.trim());
  }
  for (const bullet of experienceBullets) {
    if (bullet && bullet.trim().length > 0) {
      itemsToCheck.push(bullet.trim());
    }
  }

  if (itemsToCheck.length === 0) {
    return { isValid: true, errors: [] };
  }

  let uiMatchedItemsCount = 0;
  const foundKeywords = new Set<string>();

  for (const item of itemsToCheck) {
    let itemHasUiKeyword = false;
    for (const { name, pattern } of UI_KEYWORD_PATTERNS) {
      if (pattern.test(item)) {
        itemHasUiKeyword = true;
        foundKeywords.add(name);
      }
    }
    if (itemHasUiKeyword) {
      uiMatchedItemsCount++;
    }
  }

  const uiRatio = uiMatchedItemsCount / itemsToCheck.length;
  const threshold = 0.30;

  if (uiRatio > threshold) {
    errors.push(
      `Role-Persona Mismatch: Target role "${targetRole}" is a Backend/Platform/AI role, but ${(uiRatio * 100).toFixed(1)}% ` +
      `(threshold: 30%) of the summary/experience bullets reference UI-only keywords (${Array.from(foundKeywords).join(', ')}). ` +
      `${uiMatchedItemsCount} of ${itemsToCheck.length} items contained UI keywords.`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    metrics: {
      isBackendPlatformAI,
      totalItems: itemsToCheck.length,
      uiMatchedItemsCount,
      uiRatio,
      foundKeywords: Array.from(foundKeywords),
    },
  };
}

// Critical backend JD tech terms to audit against bullet integration
const CRITICAL_BACKEND_JD_TECHS = [
  'cassandra', 'kafka', 'kubernetes', 'k8s', 'gcp', 'google cloud',
  'aws', 'postgresql', 'postgres', 'redis', 'rabbitmq', 'grpc',
  'distributed systems', 'dynamodb', 'elasticsearch', 'terraform',
];

// Helper to check if a skill (or its core aliases without modifiers) is evidenced in bullets
export function isSkillEvidencedInText(skill: string, text: string): boolean {
  const stripped = skill.replace(/\s*\(Architectural Equivalent\)/i, '').trim();
  if (!stripped) return true;

  if (buildKeywordRegex(stripped).test(text)) {
    return true;
  }

  // Handle parenthetical abbreviations e.g. "Google Cloud Platform (GCP)" or "GitOps (ArgoCD)"
  const parenMatch = stripped.match(/^(.*?)\s*\(([^)]+)\)$/);
  if (parenMatch) {
    const base = parenMatch[1]?.trim();
    const inside = parenMatch[2]?.trim();
    if (base && buildKeywordRegex(base).test(text)) return true;
    if (inside) {
      for (const part of inside.split(/,\s*/)) {
        if (part.trim().length >= 2 && buildKeywordRegex(part.trim()).test(text)) {
          return true;
        }
      }
    }
  }

  // Handle slash variants e.g. "React 18/19" or "Agile/Scrum"
  if (stripped.includes('/')) {
    for (const part of stripped.split('/')) {
      const p = part.trim();
      if (p.length >= 3 && buildKeywordRegex(p).test(text)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * 2. No Orphaned Skills Validator
 * 
 * Fails if an `Additional Skills` category exists OR if core JD skills
 * (or ALL skills when `checkAllSkills: true`) listed in the skills section
 * have 0 matches in experience/project bullets.
 */
export function validateNoOrphanedSkills(
  skillsSection: Record<string, string[]>,
  experienceBullets: string[],
  projectBullets: string[],
  options?: { checkAllSkills?: boolean }
): ValidationResult {
  const errors: string[] = [];

  // Check 1: Existence of "Additional Skills" category
  const categories = Object.keys(skillsSection);
  const additionalSkillsKey = categories.find((cat) => /^additional\s*skills/i.test(cat.trim()));

  if (additionalSkillsKey) {
    errors.push(
      `Orphaned Keyword Dumping: Found orphaned '${additionalSkillsKey}' category. Missing skills must be properly ` +
      `categorized and integrated into experience/project bullets rather than appended to a generic 'Additional Skills' bucket.`
    );
  }

  // Combine all experience and project bullet text
  const allBulletsText = [...experienceBullets, ...projectBullets].join(' ');
  const orphanedSkills: string[] = [];

  // Check 2a: Skills specifically dumped into Additional Skills must have evidence in bullets
  if (additionalSkillsKey && Array.isArray(skillsSection[additionalSkillsKey])) {
    for (const skill of skillsSection[additionalSkillsKey]) {
      const trimmedSkill = skill.trim();
      if (!trimmedSkill) continue;
      if (!isSkillEvidencedInText(trimmedSkill, allBulletsText)) {
        orphanedSkills.push(trimmedSkill);
      }
    }
  }

  // Check 2b: Core JD skills (or all skills in strict mode) must have at least 1 match in bullets
  for (const [category, skillsList] of Object.entries(skillsSection)) {
    if (/^additional\s*skills/i.test(category.trim())) continue;
    if (!Array.isArray(skillsList)) continue;

    for (const skill of skillsList) {
      const trimmedSkill = skill.trim();
      if (!trimmedSkill) continue;

      const lowerSkill = trimmedSkill.toLowerCase();
      const isCriticalBackendSkill = CRITICAL_BACKEND_JD_TECHS.some((tech) => lowerSkill.includes(tech));

      if (options?.checkAllSkills || isCriticalBackendSkill) {
        if (!isSkillEvidencedInText(trimmedSkill, allBulletsText)) {
          orphanedSkills.push(trimmedSkill);
        }
      }
    }
  }

  if (orphanedSkills.length > 0) {
    const uniqueOrphaned = Array.from(new Set(orphanedSkills));
    errors.push(
      `Orphaned Keyword Dumping: Core JD skills listed in the skills section (${uniqueOrphaned.join(', ')}) ` +
      `have 0 matches in experience or project bullets. Every claimed core skill must be woven into concrete achievements.`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    metrics: {
      hasAdditionalSkillsCategory: Boolean(additionalSkillsKey),
      orphanedSkills: Array.from(new Set(orphanedSkills)),
    },
  };
}

/**
 * 3. ASCII & ATS Safety Validator
 * 
 * Fails if non-ASCII arrows (`→`, `➔`), concatenated number ranges (`6294`),
 * or duplicate header strings exist.
 */
export function validateAsciiAtsSafety(rawResumeText: string): ValidationResult {
  const errors: string[] = [];

  // Check 1: Non-ASCII arrows
  const nonAsciiArrowRegex = /[→➔➜➝➞➡🡒⟶⇒⇨►▶]/g;
  const arrowMatches = rawResumeText.match(nonAsciiArrowRegex);
  if (arrowMatches) {
    const uniqueArrows = Array.from(new Set(arrowMatches));
    errors.push(
      `Unicode/PDF Glyph Corruption: Found non-ASCII arrow glyphs (${uniqueArrows.join(', ')}) in resume text. ` +
      `These glyphs corrupt during PDF rendering and ATS parsing. Use standard ASCII '->' or 'to'.`
    );
  }

  // Check 2: Concatenated number ranges like "6294" (from stripped "62 -> 94")
  const concatenatedRangeRegex = /\b6294\b|\(6294\)/i;
  if (concatenatedRangeRegex.test(rawResumeText)) {
    errors.push(
      `Unicode/PDF Glyph Corruption: Detected concatenated number range "6294". ` +
      `This indicates a stripped arrow/separator glyph (e.g., '62 -> 94' corrupted into '6294') during PDF rendering.`
    );
  }

  // Check 3: Duplicate header strings in the contact/header block
  // Extract lines before the first major section (e.g. PROFESSIONAL SUMMARY, SUMMARY, CORE SKILLS)
  const headerBlockMatch = rawResumeText.split(/(?:##\s*|---|\b)(?:PROFESSIONAL\s+SUMMARY|SUMMARY|CORE\s+TECHNICAL\s+SKILLS|WORK\s+EXPERIENCE)\b/i);
  const headerBlock = headerBlockMatch[0] || '';
  const headerLines = headerBlock
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !/^#+\s*/.test(l) && l !== '---');

  // Check for duplicate lines in header
  const seenLines = new Map<string, number>();
  for (const line of headerLines) {
    const normalized = line.toLowerCase().replace(/[*_#|]/g, '').trim();
    if (normalized.length > 5) {
      seenLines.set(normalized, (seenLines.get(normalized) || 0) + 1);
    }
  }

  const duplicateLines = Array.from(seenLines.entries())
    .filter(([, count]) => count > 1)
    .map(([line]) => line);

  // Also check for duplicate visa/open-to phrases in header
  const visaPhrases = headerBlock.match(/visa\s*sponsorship\s*required/gi) || [];
  const openToPhrases = headerBlock.match(/open\s*to\s*(?:relocation)?/gi) || [];

  if (duplicateLines.length > 0) {
    errors.push(
      `Duplicate Header Strings: Found duplicate header lines: "${duplicateLines.join('", "')}".`
    );
  } else if (visaPhrases.length > 1 || openToPhrases.length > 1) {
    errors.push(
      `Duplicate Header Strings: Detected repeated visa/relocation statements in header ` +
      `(${visaPhrases.length} 'Visa Sponsorship Required', ${openToPhrases.length} 'Open to' occurrences).`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    metrics: {
      arrowCount: arrowMatches ? arrowMatches.length : 0,
      hasConcatenatedRange: concatenatedRangeRegex.test(rawResumeText),
      duplicateHeaderLines: duplicateLines,
    },
  };
}

/**
 * Country aliases mapping for flexible country matching
 */
const COUNTRY_ALIASES: Record<string, string[]> = {
  uk: ['uk', 'united kingdom', 'great britain', 'england', 'scotland', 'wales', 'london'],
  'united kingdom': ['uk', 'united kingdom', 'great britain', 'england', 'scotland', 'wales', 'london'],
  'great britain': ['uk', 'united kingdom', 'great britain', 'england', 'scotland', 'wales', 'london'],
  england: ['uk', 'united kingdom', 'great britain', 'england', 'scotland', 'wales', 'london'],
  scotland: ['uk', 'united kingdom', 'great britain', 'england', 'scotland', 'wales', 'london'],
  wales: ['uk', 'united kingdom', 'great britain', 'england', 'scotland', 'wales', 'london'],
  germany: ['germany', 'deutschland', 'berlin', 'munich'],
  netherlands: ['netherlands', 'holland', 'amsterdam'],
  ireland: ['ireland', 'dublin'],
  usa: ['usa', 'us', 'united states', 'united states of america'],
  'united states': ['usa', 'us', 'united states', 'united states of america'],
  singapore: ['singapore'],
  canada: ['canada', 'toronto', 'vancouver'],
  australia: ['australia', 'sydney', 'melbourne'],
};

/**
 * 4. Visa & Location Clarity Validator
 * 
 * Validates that country-specific remote roles explicitly state
 * `Open to [Country] Relocation (Visa Sponsorship Required)`.
 * Fails if ambiguous like "Open to Relocation: Remote | Visa Sponsorship Required".
 */
export function validateVisaLocationClarity(
  jdCountry: string,
  jdRemotePolicy: string,
  resumeHeader: string
): ValidationResult {
  const errors: string[] = [];
  const normalizedCountry = jdCountry.trim().toLowerCase();

  // If no specific country or worldwide, skip
  if (!normalizedCountry || normalizedCountry === 'worldwide' || normalizedCountry === 'global') {
    return { isValid: true, errors: [] };
  }

  const aliases = COUNTRY_ALIASES[normalizedCountry] || [normalizedCountry];

  // Check 1: Ambiguous "Remote" relocation without country
  const hasAmbiguousRemoteRelocation =
    /open\s*to\s*(?:relocation:?\s*)?remote\b/i.test(resumeHeader) &&
    !aliases.some((alias) => new RegExp(`\\b${alias}\\b`, 'i').test(resumeHeader));

  if (hasAmbiguousRemoteRelocation) {
    errors.push(
      `Ambiguous Visa/Location Header: The resume outputs "Open to Relocation: Remote" without specifying the target country (${jdCountry}). ` +
      `For country-specific remote/hybrid roles, recruiters require explicit in-country relocation willingness: ` +
      `"Open to ${jdCountry} Relocation (Visa Sponsorship Required)".`
    );
  }

  // Check 2: Explicit country relocation and visa sponsorship statement
  // Formats accepted:
  // "Open to UK Relocation (Visa Sponsorship Required)"
  // "Open to Relocation: UK (Visa Sponsorship Required)"
  // "Open to Relocation: UK | Visa Sponsorship Required"
  // "Open to UK Relocation | Visa Sponsorship Required"
  const hasTargetCountry = aliases.some((alias) =>
    new RegExp(`\\b${alias}\\b`, 'i').test(resumeHeader)
  );

  const hasRelocationKeyword = /relocation/i.test(resumeHeader);
  const hasVisaKeyword = /visa\s*sponsorship\s*required/i.test(resumeHeader);

  // US and Canada roles commonly accept standard relocation without stating country name
  const isUsOrCanada = ['usa', 'us', 'united states', 'united states of america', 'canada'].includes(normalizedCountry);
  const hasGeneralRelocation = /open\s*to\s*(?:[a-z\s]+)?relocation\s*\|\s*visa\s*sponsorship\s*required/i.test(resumeHeader);
  const matchedCountryOrGeneral = hasTargetCountry || (isUsOrCanada && hasGeneralRelocation);

  if (!matchedCountryOrGeneral || !hasRelocationKeyword || !hasVisaKeyword) {
    if (!hasAmbiguousRemoteRelocation) {
      errors.push(
        `Ambiguous Visa/Location Header: Country-specific role in ${jdCountry} (${jdRemotePolicy}) requires explicit statement: ` +
        `"Open to ${jdCountry} Relocation (Visa Sponsorship Required)". ` +
        `Missing: ${[!hasTargetCountry ? `target country '${jdCountry}'` : '', !hasRelocationKeyword ? 'relocation' : '', !hasVisaKeyword ? 'visa sponsorship required' : ''].filter(Boolean).join(', ')}.`
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    metrics: {
      targetCountry: jdCountry,
      matchedCountryInHeader: hasTargetCountry,
      hasAmbiguousRemoteRelocation,
      hasVisaKeyword,
    },
  };
}

/**
 * 5. Human Engineering Voice & Anti-Buzzword Validator
 *
 * Scans resume summaries and bullets for robotic AI clichés & fluff
 * (spearheaded, pioneered, orchestrated, delved into, testaments to,
 * dynamic landscape, robustly, seamlessly, cutting-edge, synergy,
 * revolutionized, mission-critical) and weak passive starters.
 */
export const BANNED_AI_BUZZWORDS: Array<{ label: string; pattern: RegExp }> = [
  { label: 'spearheaded', pattern: /\bspearhead(?:ed|ing|s)?\b/i },
  { label: 'pioneered', pattern: /\bpioneer(?:ed|ing|s)?\b/i },
  { label: 'orchestrated', pattern: /\borchestrat(?:ed|es|ing|e)\b/i },
  { label: 'delved into', pattern: /\bdelv(?:e|ed|ing|es)\s+into\b/i },
  { label: 'testaments to', pattern: /\btestaments?\s+to\b/i },
  { label: 'dynamic landscape', pattern: /\bdynamic\s+landscape\b/i },
  { label: 'robustly', pattern: /\brobustly\b/i },
  { label: 'seamlessly', pattern: /\bseamlessly\b/i },
  { label: 'leveraging cutting-edge', pattern: /\b(?:leverag(?:e|ed|ing|es)\s+)?cutting[- ]edge\b/i },
  { label: 'synergy', pattern: /\bsynerg(?:y|ies|ize|ized|izing|istic)\b/i },
  { label: 'revolutionized', pattern: /\brevolutioniz(?:e|ed|ing|es)\b/i },
  { label: 'mission-critical', pattern: /\bmission[- ]critical\b/i },
];

const WEAK_BULLET_STARTERS = /^(?:worked\s+on|responsible\s+for|helped\s+with|participated\s+in|assisted\s+with)\b/i;

export function validateHumanEngineeringVoice(
  summary: string,
  experienceBullets: string[],
  projectBullets: string[] = []
): ValidationResult {
  const errors: string[] = [];
  const bannedBuzzwordsFound: string[] = [];
  const passiveStarters: string[] = [];

  const textsToCheck: Array<{ label: string; text: string }> = [
    ...(summary ? [{ label: 'Summary', text: summary }] : []),
    ...experienceBullets.map((b, i) => ({ label: `Experience bullet #${i + 1}`, text: b })),
    ...projectBullets.map((b, i) => ({ label: `Project bullet #${i + 1}`, text: b })),
  ];

  for (const item of textsToCheck) {
    for (const buzz of BANNED_AI_BUZZWORDS) {
      if (buzz.pattern.test(item.text)) {
        if (!bannedBuzzwordsFound.includes(buzz.label)) {
          bannedBuzzwordsFound.push(buzz.label);
        }
        errors.push(
          `AI Buzzword Violation in ${item.label}: Found banned AI cliché '${buzz.label}'. Replace with natural senior engineering language (e.g., Built, Scaled, Migrated, Optimized, Refactored, Decoupled).`
        );
      }
    }
  }

  for (const bullet of [...experienceBullets, ...projectBullets]) {
    if (WEAK_BULLET_STARTERS.test(bullet.trim())) {
      passiveStarters.push(bullet);
      errors.push(
        `Passive Bullet Starter: Bullet starts with weak phrasing ("${bullet.slice(0, 35)}..."). Start with a concrete engineering verb (Built, Scaled, Migrated, Optimized, Designed).`
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    metrics: {
      bannedBuzzwordsFound,
      passiveStarters,
    },
  };
}
