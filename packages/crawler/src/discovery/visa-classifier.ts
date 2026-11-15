import {
  NON_TECHNICAL_TITLES,
  buildSafeTermRegex,
  expandRoleSynonyms,
  resolveCountryRegionCodes,
  scoreTokenizedRelevance,
} from './query-expander.ts';
import { KnownSponsorRegistry, knownSponsorRegistry } from './known-sponsors.ts';

export type SponsorshipCategory =
  | 'VISA_SPONSORED'
  | 'RELOCATION_PROVIDED'
  | 'KNOWN_SPONSOR_SILENT'
  | 'NOT_SPONSORED'
  | 'UNCLEAR';

export type ClassificationTier = 'TIER_1_EXPLICIT' | 'TIER_2_REGISTRY' | 'NONE';

export interface VisaClassifiableJob {
  title?: string;
  description?: string;
  requirements?: string;
  location?: string;
  country?: string;
  sourceUrl?: string;
  applyUrl?: string;
  atsSlug?: string;
  companyName?: string;
  visaSponsorshipPolicy?: string;
  company?:
    | {
        name?: string;
        visaSponsorshipPolicy?: string;
      }
    | string;
}

export interface TwoTierVisaClassification {
  category: SponsorshipCategory;
  tier: ClassificationTier;
  sponsorsVisa: boolean;
  relocationSupport: boolean;
  confidence: number;
  matchedSchemes: string[];
  primaryScheme: string | null;
  evidence: string[];
  registryMatch?: {
    canonicalName: string;
    matchedBy: 'company_name' | 'ats_slug' | 'company_policy';
    hubs: string[];
  };
}

export interface ClassifyTwoTierOptions {
  registry?: KnownSponsorRegistry;
}

export interface JobRelevanceInput extends VisaClassifiableJob {
  skills?: string[];
  visaSponsorshipData?: { status?: string };
  visaClassification?: TwoTierVisaClassification;
}

export interface JobRelevanceOptions {
  requiresVisa?: boolean;
  threshold?: number;
}

export interface JobRelevanceResult {
  score: number;
  isRelevant: boolean;
  matchedTokens: string[];
  matchedSynonyms: string[];
  visaBonus: number;
}

const FALSE_POSITIVE_SPONSORSHIP_REGEX =
  /\b(executive|event|events|conference|conferences|corporate|booth|fiscal|commercial|community|brand|media|podcast)\s+sponsorships?\b/gi;

const NEGATIVE_REFUSAL_PATTERNS: ReadonlyArray<{ regex: RegExp; reason: string }> = [
  { regex: /\bno\s+(?:visa\s+|work\s+permit\s+|immigration\s+)?sponsorship\b/i, reason: 'Explicit no sponsorship' },
  {
    regex: /\bcannot\s+(?:provide\s+|offer\s+)?(?:visa\s+|work\s+permit\s+|immigration\s+)?sponsor(?:ship)?\b/i,
    reason: 'Cannot provide sponsorship',
  },
  {
    regex: /\bunable\s+to\s+(?:provide\s+|offer\s+)?(?:visa\s+|work\s+permit\s+|immigration\s+)?sponsor(?:ship)?\b/i,
    reason: 'Unable to sponsor',
  },
  {
    regex: /\b(?:do|does|will)\s+not\s+(?:provide\s+|offer\s+)?(?:visa\s+|work\s+permit\s+)?sponsor(?:ship)?\b/i,
    reason: 'Does not sponsor',
  },
  {
    regex: /\bnot\s+(?:offering|providing|able\s+to\s+(?:provide|offer)|eligible\s+for)\s+(?:visa\s+|work\s+permit\s+)?sponsor(?:ship)?\b/i,
    reason: 'Not offering sponsorship',
  },
  {
    regex: /\bwithout\s+(?:visa\s+|work\s+permit\s+)?sponsorship\b/i,
    reason: 'Requires work authorization without sponsorship',
  },
  {
    regex: /\bsponsorship\s+(?:is\s+)?not\s+(?:available|offered|provided|supported)\b/i,
    reason: 'Sponsorship not available',
  },
  { regex: /\bno\s+(?:h-?1b|visa)\s+transfer\b/i, reason: 'No visa transfer' },
  { regex: /\bno\s+immigration\s+support\b/i, reason: 'No immigration support' },
  {
    regex: /\b(?:us|u\.s\.|uk|u\.k\.|eu|australian|canadian|singaporean)\s+citizen(?:s)?\s+only\b/i,
    reason: 'Citizenship restriction',
  },
  { regex: /\bcitizen(?:s)?\s+only\b/i, reason: 'Citizens only' },
  {
    regex: /\bmust\s+be\s+(?:a\s+)?(?:us|u\.s\.|uk|u\.k\.|eu|australian|canadian)\s+citizen\b/i,
    reason: 'Citizenship required',
  },
  {
    regex:
      /\bmust\s+(?:already\s+)?(?:hold|have|possess)\s+(?:valid\s+|current\s+|existing\s+)?(?:work\s+authorization|right\s+to\s+work|permanent\s+residen(?:cy|t))\b/i,
    reason: 'Existing right to work required',
  },
  {
    regex: /\bexisting\s+(?:work\s+authorization|right\s+to\s+work)\s+required\b/i,
    reason: 'Existing right to work required',
  },
  { regex: /\bgreen\s+card\s+(?:holder\s+)?required\b/i, reason: 'Green card required' },
  { regex: /\bmust\s+be\s+(?:a\s+)?permanent\s+resident\b/i, reason: 'Permanent residency required' },
  { regex: /\bsecurity\s+clearance\s+(?:is\s+)?required\b/i, reason: 'Security clearance required' },
  {
    regex:
      /\brequires?\s+(?:an?\s+)?(?:active\s+)?(?:security|top\s+secret|secret|sc|dv|baseline|nv1|nv2)\s+clearance\b/i,
    reason: 'Security clearance required',
  },
  { regex: /\bactive\s+(?:secret|top\s+secret|ts\/sci|sc|dv)\s+clearance\b/i, reason: 'Active clearance required' },
  { regex: /\bclearance\s+eligibility\s+required\b/i, reason: 'Clearance eligibility required' },
];

interface PermitTaxonomyRule {
  scheme: string;
  regex: RegExp;
  confidence: number;
}

const PERMIT_TAXONOMY_RULES: readonly PermitTaxonomyRule[] = [
  {
    scheme: 'UK Skilled Worker',
    regex: /\b(?:uk\s+)?skilled\s+worker(?:\s+visa|\s+sponsorship|\s+route)?\b/i,
    confidence: 0.95,
  },
  {
    scheme: 'Tier 2',
    regex: /\btier\s*[-]?\s*2(?:\s+(?:general|visa|sponsorship))?\b/i,
    confidence: 0.94,
  },
  {
    scheme: 'UK Global Talent',
    regex: /\bglobal\s+talent(?:\s+visa)?\b/i,
    confidence: 0.92,
  },
  {
    scheme: 'Certificate of Sponsorship',
    regex: /\bcertificate\s+of\s+sponsorship\b|\bcos\s+sponsorship\b/i,
    confidence: 0.94,
  },
  {
    scheme: 'EU Blue Card',
    regex: /\b(?:eu\s+)?blue\s+card\b|\bblaue\s+karte\b/i,
    confidence: 0.95,
  },
  {
    scheme: 'NL Highly Skilled Migrant (Kennismigrant)',
    regex: /\bhighly\s+skilled\s+migrant\b|\bkennismigrant(?:en)?\b/i,
    confidence: 0.95,
  },
  {
    scheme: 'IND',
    regex:
      /\bkennismigrant\s*\/\s*IND\b|\bIND\s*\/\s*kennismigrant\b|\bIND\s+(?:recogni[sz]ed|sponsor|sponsorship|visa|permit|registration)\b/i,
    confidence: 0.94,
  },
  {
    scheme: 'Critical Skills Employment Permit',
    regex: /\bcritical\s+skills(?:\s+employment\s+permit)?\b|\bcsep\b/i,
    confidence: 0.95,
  },
  {
    scheme: 'Ireland Stamp 4',
    regex: /\bstamp\s*4\b/i,
    confidence: 0.92,
  },
  {
    scheme: 'Sweden Work Permit (Migrationsverket)',
    regex: /\bmigrationsverket\b|\bswedish\s+work\s+permit\b/i,
    confidence: 0.95,
  },
  {
    scheme: 'Canada LMIA',
    regex: /\blmia\b/i,
    confidence: 0.93,
  },
  {
    scheme: 'Canada Global Talent Stream',
    regex: /\bglobal\s+talent\s+stream\b/i,
    confidence: 0.95,
  },
  {
    scheme: 'Australia Subclass 482',
    regex: /\b(?:subclass\s+)?482\b|\btss\s+visa\b|\bskills\s+in\s+demand\s+visa\b/i,
    confidence: 0.94,
  },
  {
    scheme: 'Australia Subclass 186',
    regex: /\b(?:subclass\s+)?186\b/i,
    confidence: 0.93,
  },
  {
    scheme: 'Singapore Employment Pass',
    regex: /\bemployment\s+pass\b|\b(?:ep|one\s+pass)\s+sponsorship\b/i,
    confidence: 0.95,
  },
  {
    scheme: 'Japan Highly Skilled Professional / Engineer Visa',
    regex: /\bhighly\s+skilled\s+professional\b|\bengineer(?:\s*\/\s*specialist\s+in\s+humanities)?\s+visa\b|\bjapan\s+work\s+visa\b/i,
    confidence: 0.94,
  },
  {
    scheme: 'H-1B',
    regex: /\bh-?1b(?:\s+(?:sponsorship|transfer|visa|support))?\b/i,
    confidence: 0.93,
  },
  {
    scheme: 'O-1',
    regex: /\bo-?1a?\s+(?:visa|sponsorship)\b/i,
    confidence: 0.9,
  },
  {
    scheme: 'TN Visa',
    regex: /\btn\s+visa\b/i,
    confidence: 0.9,
  },
  {
    scheme: 'Visa Sponsorship',
    regex:
      /\b(?:visa\s+sponsorship|sponsors?\s+(?:work\s+)?visas?|will\s+sponsor(?:\s+(?:work\s+)?visas?)?|we\s+sponsor(?:\s+(?:work\s+)?visas?)?|provides?\s+(?:visa\s+|work\s+permit\s+)?sponsorship|sponsorship\s+(?:is\s+)?available|visa\s+support\s+(?:provided|available)|work\s+permit\s+sponsorship|work\s+visa\s+sponsorship|immigration\s+(?:sponsorship|support|assistance)|sponsor\s+work\s+(?:visa|permit)s?)\b/i,
    confidence: 0.9,
  },
];

const RELOCATION_SIGNAL_PATTERNS: readonly RegExp[] = [
  /\brelocation\s+(?:assistance|package|support|allowance|offered|provided|bonus|budget|reimbursement)\b/i,
  /\b(?:support|supports|supporting|offer|offers|offering|provide|provides|providing)\s+(?:full\s+|comprehensive\s+|international\s+)?relocation\b/i,
  /\binternational\s+relocation(?:\s+(?:support|package|assistance))?\b/i,
  /\bglobal\s+mobility(?:\s+(?:support|package|assistance|team))?\b/i,
  /\b(?:open\s+to\s+relocation|willing\s+to\s+relocate|full\s+relocation)\b/i,
];

const NEGATIVE_QUICK_SCAN =
  /\b(?:no|cannot|unable|not|without|citizen|citizens|authorization|right to work|green card|permanent resident|clearance)\b/i;
const PERMIT_QUICK_SCAN =
  /\b(?:sponsor|sponsors|sponsored|sponsorship|visa|visas|permit|permits|skilled worker|tier\s*[-]?\s*2|global talent|blue card|blaue karte|kennismigrant|highly skilled|IND|critical skills|csep|stamp\s*4|migrationsverket|lmia|482|186|tss|employment pass|h-?1b|o-?1|tn|immigration)\b/i;
const RELOCATION_QUICK_SCAN = /\b(?:relocat|global\s+mobility)/i;

function resolveCompanyMetadata(job: VisaClassifiableJob): {
  companyName: string;
  policy?: string;
} {
  const companyObj = typeof job.company === 'object' && job.company !== null ? job.company : undefined;
  const companyStr = typeof job.company === 'string' ? job.company : undefined;

  return {
    companyName: (job.companyName || companyObj?.name || companyStr || '').trim(),
    policy: (job.visaSponsorshipPolicy || companyObj?.visaSponsorshipPolicy || '').trim() || undefined,
  };
}

function classifyPolicyString(policy: string): 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' {
  const normalized = policy.trim().toLowerCase().replace(/[_-]+/g, ' ');
  if (!normalized || normalized === 'unknown' || normalized === 'unspecified') {
    return 'NEUTRAL';
  }
  if (
    /\b(does not sponsor|do not sponsor|cannot sponsor|unable to sponsor|no sponsorship|not supported|never|false|none|denied|citizens only)\b/i.test(
      normalized,
    ) ||
    /^no$/i.test(normalized)
  ) {
    return 'NEGATIVE';
  }
  if (
    /\b(sponsors?|sponsorship|yes|true|active|verified|skilled worker|blue card|kennismigrant|critical skills|employment pass|relocation|work permit|immigration)\b/i.test(
      normalized,
    )
  ) {
    return 'POSITIVE';
  }
  return 'NEUTRAL';
}

/**
 * Classifies a job using Two-Tier Sponsorship Verification:
 * - Scoped negative refusal check (beats all positive tiers, including registry)
 * - Tier 1: Explicit global work permit taxonomy & international relocation signals
 * - Tier 2: KnownSponsorRegistry (company alias + ATS slug) & Prisma company.visaSponsorshipPolicy
 */
export function classifySponsorshipTwoTier(
  job: VisaClassifiableJob,
  options: ClassifyTwoTierOptions = {},
): TwoTierVisaClassification {
  const registry = options.registry ?? knownSponsorRegistry;
  const { companyName, policy } = resolveCompanyMetadata(job);

  const rawText = [job.title || '', job.description || '', job.requirements || '']
    .filter(Boolean)
    .join('\n');
  const cleanedText = /sponsorship/i.test(rawText)
    ? rawText.replace(FALSE_POSITIVE_SPONSORSHIP_REGEX, ' ')
    : rawText;

  // ── Step 1: Scoped Negative Refusal Check (highest precedence) ───────────
  if (NEGATIVE_QUICK_SCAN.test(cleanedText)) {
    for (const { regex, reason } of NEGATIVE_REFUSAL_PATTERNS) {
      const match = cleanedText.match(regex);
      if (match) {
        return {
          category: 'NOT_SPONSORED',
          tier: 'TIER_1_EXPLICIT',
          sponsorsVisa: false,
          relocationSupport: false,
          confidence: 0.92,
          matchedSchemes: [],
          primaryScheme: null,
          evidence: [`${reason}: "${match[0]}"`],
        };
      }
    }
  }

  // Detect relocation mentions once (used across Tier 1 & Tier 2)
  const relocationMatches: string[] = [];
  if (RELOCATION_QUICK_SCAN.test(cleanedText)) {
    for (const relRegex of RELOCATION_SIGNAL_PATTERNS) {
      const match = cleanedText.match(relRegex);
      if (match) {
        relocationMatches.push(match[0]);
      }
    }
  }
  const hasRelocation = relocationMatches.length > 0;

  // ── Step 2: Tier 1 Explicit Permit Taxonomy ──────────────────────────────
  const matchedSchemes: string[] = [];
  const permitEvidence: string[] = [];
  let maxPermitConfidence = 0;

  if (PERMIT_QUICK_SCAN.test(cleanedText)) {
    for (const rule of PERMIT_TAXONOMY_RULES) {
      const match = cleanedText.match(rule.regex);
      if (match) {
        matchedSchemes.push(rule.scheme);
        permitEvidence.push(`Tier 1 permit match (${rule.scheme}): "${match[0]}"`);
        if (rule.confidence > maxPermitConfidence) {
          maxPermitConfidence = rule.confidence;
        }
      }
    }
  }

  if (matchedSchemes.length > 0) {
    return {
      category: 'VISA_SPONSORED',
      tier: 'TIER_1_EXPLICIT',
      sponsorsVisa: true,
      relocationSupport: hasRelocation,
      confidence: maxPermitConfidence,
      matchedSchemes,
      primaryScheme: matchedSchemes[0],
      evidence: [
        ...permitEvidence,
        ...relocationMatches.map((m) => `Relocation match: "${m}"`),
      ],
    };
  }

  // ── Step 3: Tier 1 Relocation Signal ─────────────────────────────────────
  if (hasRelocation) {
    return {
      category: 'RELOCATION_PROVIDED',
      tier: 'TIER_1_EXPLICIT',
      sponsorsVisa: true,
      relocationSupport: true,
      confidence: 0.85,
      matchedSchemes: ['International Relocation'],
      primaryScheme: 'International Relocation',
      evidence: relocationMatches.map((m) => `Tier 1 relocation match: "${m}"`),
    };
  }

  // ── Step 4: Tier 2 Prisma company.visaSponsorshipPolicy & KnownSponsorRegistry ──
  if (policy) {
    const policySentiment = classifyPolicyString(policy);
    if (policySentiment === 'NEGATIVE') {
      return {
        category: 'NOT_SPONSORED',
        tier: 'TIER_2_REGISTRY',
        sponsorsVisa: false,
        relocationSupport: false,
        confidence: 0.88,
        matchedSchemes: [],
        primaryScheme: null,
        evidence: [`Company sponsorship policy indicates no sponsorship: "${policy}"`],
      };
    }
    if (policySentiment === 'POSITIVE') {
      const hubs = [
        ...(job.country ? resolveCountryRegionCodes(job.country, false) : []),
        ...(job.location ? resolveCountryRegionCodes(job.location, true) : []),
      ];
      return {
        category: 'KNOWN_SPONSOR_SILENT',
        tier: 'TIER_2_REGISTRY',
        sponsorsVisa: true,
        relocationSupport: false,
        confidence: 0.86,
        matchedSchemes: [policy],
        primaryScheme: policy,
        evidence: [`Prisma company.visaSponsorshipPolicy match: "${policy}"`],
        registryMatch: {
          canonicalName: companyName || 'Verified Sponsor Company',
          matchedBy: 'company_policy',
          hubs: Array.from(new Set(hubs)),
        },
      };
    }
  }

  const registryMatch = registry.lookup({
    companyName,
    sourceUrl: job.sourceUrl,
    applyUrl: job.applyUrl,
    atsSlug: job.atsSlug,
    location: job.location,
    country: job.country,
  });

  if (registryMatch) {
    return {
      category: 'KNOWN_SPONSOR_SILENT',
      tier: 'TIER_2_REGISTRY',
      sponsorsVisa: true,
      relocationSupport: false,
      confidence: registryMatch.confidence,
      matchedSchemes: [...registryMatch.entry.primarySchemes],
      primaryScheme: registryMatch.entry.primarySchemes[0] || null,
      evidence: [
        `KnownSponsorRegistry (${registryMatch.matchedBy}): "${registryMatch.canonicalName}"`,
      ],
      registryMatch: {
        canonicalName: registryMatch.canonicalName,
        matchedBy: registryMatch.matchedBy,
        hubs: [...registryMatch.entry.hubs],
      },
    };
  }

  // ── Step 5: Unclear Fallback ─────────────────────────────────────────────
  return {
    category: 'UNCLEAR',
    tier: 'NONE',
    sponsorsVisa: false,
    relocationSupport: false,
    confidence: 0.25,
    matchedSchemes: [],
    primaryScheme: null,
    evidence: ['No explicit visa, relocation, or known sponsor signal found'],
  };
}

function resolveVisaScoreBonus(job: JobRelevanceInput, requiresVisa: boolean): number {
  if (job.visaClassification) {
    switch (job.visaClassification.category) {
      case 'VISA_SPONSORED':
        return 15;
      case 'RELOCATION_PROVIDED':
        return 12;
      case 'KNOWN_SPONSOR_SILENT':
        return 10;
      case 'NOT_SPONSORED':
        return requiresVisa ? -30 : 0;
      case 'UNCLEAR':
      default:
        return 0;
    }
  }

  const status = job.visaSponsorshipData?.status;
  if (status === 'CONFIRMED') return 15;
  if (status === 'UNCLEAR') return 0;
  if (status === 'NOT_SUPPORTED') return requiresVisa ? -30 : 0;
  return 0;
}

/**
 * Tokenized job relevance scorer (0–100 scale) replacing the legacy contiguous regex check.
 * Handles separated role tokens (e.g. "Backend Engineer" vs "Staff Software Engineer, Core Backend")
 * and semantic role synonyms (e.g. "Backend Engineer" vs "Senior Distributed Systems Engineer").
 */
export function scoreJobTokenizedRelevance(
  job: JobRelevanceInput,
  query?: string,
  options: JobRelevanceOptions = {},
): JobRelevanceResult {
  const threshold = options.threshold ?? 50;
  const requiresVisa = options.requiresVisa ?? false;

  const title = job.title || '';
  const description = job.description || '';
  const skills = job.skills || [];

  if (/\b(stub|mock data)\b/i.test(title) || /\b(mock data)\b/i.test(description)) {
    return {
      score: 0,
      isRelevant: false,
      matchedTokens: [],
      matchedSynonyms: [],
      visaBonus: 0,
    };
  }

  const visaBonus = resolveVisaScoreBonus(job, requiresVisa);
  const rawQuery = (query || '').trim();

  if (!rawQuery) {
    const score = Math.min(100, Math.max(0, 70 + visaBonus));
    return {
      score,
      isRelevant: true,
      matchedTokens: [],
      matchedSynonyms: [],
      visaBonus,
    };
  }

  const orGroups = rawQuery
    .split(/\s+or\s+|,/i)
    .map((g) => g.replace(/[()"']/g, ' ').replace(/\s+/g, ' ').trim())
    .filter((g) => g.length > 0);

  if (orGroups.length === 0) {
    const score = Math.min(100, Math.max(0, 70 + visaBonus));
    return {
      score,
      isRelevant: true,
      matchedTokens: [],
      matchedSynonyms: [],
      visaBonus,
    };
  }

  const titleLower = title.toLowerCase();
  const skillsText = skills.join(' ');
  const isNonTechTitle = NON_TECHNICAL_TITLES.some((nt) => titleLower.includes(nt));

  let bestBaseScore = 0;
  let bestMatchedTokens: string[] = [];
  let bestMatchedSynonyms: string[] = [];

  for (const group of orGroups) {
    let groupScore = 0;
    const matchedTokensSet = new Set<string>();
    const matchedSynonymsSet = new Set<string>();
    let hasTitleHit = false;

    // 1. Direct exact phrase match in title
    const directGroupReg = buildSafeTermRegex(group);
    if (directGroupReg.test(title)) {
      groupScore = 95;
      hasTitleHit = true;
      matchedTokensSet.add(group.toLowerCase());
    } else {
      // 2. Tokenized weighted overlap via Phase 1 scorer
      const tokenized = scoreTokenizedRelevance(
        group,
        { title, description, skills },
        { threshold: 0.3 },
      );

      for (const token of tokenized.matchedTokens) {
        matchedTokensSet.add(token);
      }

      if (tokenized.titleHitCount > 0) {
        hasTitleHit = true;
        const tokenTitleScore = Math.round(70 + tokenized.score * 20);
        groupScore = Math.max(groupScore, tokenTitleScore);
      } else if (tokenized.matched) {
        const tokenBodyScore = Math.round(40 + tokenized.score * 35);
        groupScore = Math.max(groupScore, tokenBodyScore);
      }

      // 3. Semantic role synonym expansion (e.g. "Backend Engineer" -> "Distributed Systems")
      const synonyms = expandRoleSynonyms(group);
      for (const synonym of synonyms) {
        if (synonym.toLowerCase() === group.toLowerCase()) {
          continue;
        }
        const synReg = buildSafeTermRegex(synonym);
        if (synReg.test(title)) {
          hasTitleHit = true;
          matchedSynonymsSet.add(synonym);
          groupScore = Math.max(groupScore, 80);
          break;
        } else if (synReg.test(skillsText) || synReg.test(description)) {
          matchedSynonymsSet.add(synonym);
          groupScore = Math.max(groupScore, 60);
        }
      }
    }

    if (isNonTechTitle && !hasTitleHit) {
      groupScore = 0;
    }

    if (groupScore > bestBaseScore) {
      bestBaseScore = groupScore;
      bestMatchedTokens = Array.from(matchedTokensSet);
      bestMatchedSynonyms = Array.from(matchedSynonymsSet);
    }
  }

  const finalScore =
    bestBaseScore > 0 ? Math.min(100, Math.max(0, bestBaseScore + visaBonus)) : 0;
  const isRelevant = bestBaseScore >= threshold && finalScore >= threshold;

  return {
    score: finalScore,
    isRelevant,
    matchedTokens: bestMatchedTokens,
    matchedSynonyms: bestMatchedSynonyms,
    visaBonus: bestBaseScore > 0 ? visaBonus : 0,
  };
}
