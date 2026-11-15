import { z } from 'zod';
import {
  classifySponsorshipTwoTier,
  scoreJobTokenizedRelevance,
} from '@visapilot/crawler';
import type { SponsorshipCategory, TwoTierVisaClassification } from '@visapilot/crawler';
import { MODELS } from '../ai/models.ts';
import { llm } from '../ai/llm-service.ts';
import type { GenerateParams, LLMResult } from '../ai/llm-service.ts';

export const VISA_RELOCATION_SIGNALS = [
  'Visa Sponsored',
  'Known Sponsor (Silent)',
  'Relocation Provided',
  'Check JD',
  'No Sponsorship',
] as const;

export type VisaRelocationSignal = (typeof VISA_RELOCATION_SIGNALS)[number];

export const FastVisaTableRowSchema = z.object({
  jobTitle: z.string().min(1),
  company: z.string().min(1),
  locationCountry: z.string().min(1),
  visaRelocationSignal: z.enum(VISA_RELOCATION_SIGNALS),
  matchScore: z.number().min(0).max(100),
  directApplyUrl: z.string(),
});

export const FastVisaTableBatchSchema = z.object({
  rows: z.array(FastVisaTableRowSchema),
});

export type FastVisaTableRow = z.infer<typeof FastVisaTableRowSchema>;

const RawLLMRowSchema = z.object({
  idx: z.number().int().nonnegative(),
  jobTitle: z.string().optional(),
  company: z.string().optional(),
  locationCountry: z.string().optional(),
  visaRelocationSignal: z.enum(VISA_RELOCATION_SIGNALS).optional(),
  matchScore: z.number().min(0).max(100).optional(),
  directApplyUrl: z.string().optional(),
});

const RawLLMBatchSchema = z.object({
  rows: z.array(RawLLMRowSchema),
});

export const FAST_VISA_TABLE_RESPONSE_SCHEMA: Record<string, unknown> = {
  type: 'OBJECT',
  properties: {
    rows: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          idx: { type: 'INTEGER' },
          jobTitle: { type: 'STRING' },
          company: { type: 'STRING' },
          locationCountry: { type: 'STRING' },
          visaRelocationSignal: {
            type: 'STRING',
            enum: [...VISA_RELOCATION_SIGNALS],
          },
          matchScore: { type: 'INTEGER' },
          directApplyUrl: { type: 'STRING' },
        },
        required: [
          'idx',
          'jobTitle',
          'company',
          'locationCountry',
          'visaRelocationSignal',
          'matchScore',
          'directApplyUrl',
        ],
      },
    },
  },
  required: ['rows'],
};

export interface BatchJobInput {
  title?: string;
  companyName?: string;
  company?: { name?: string; visaSponsorshipPolicy?: string } | string;
  location?: string;
  country?: string;
  description?: string;
  requirements?: string;
  skills?: string[];
  applyUrl?: string;
  sourceUrl?: string;
  url?: string;
  atsSlug?: string;
  visaSponsorshipPolicy?: string;
}

export interface BatchQueryContext {
  query?: string;
  skills?: string[];
  targetCountries?: string[];
  requiresVisa?: boolean;
}

export interface BatchLLMClient {
  generate(params: GenerateParams): Promise<Pick<LLMResult, 'content' | 'model' | 'durationMs'>>;
}

export interface FastVisaTableBatchResult {
  rows: FastVisaTableRow[];
  markdownTable: string;
  usedFallback: boolean;
  llmDurationMs: number;
  modelUsed: string;
  restoredUrlsCount: number;
}

interface PrecomputedJobBaseline {
  idx: number;
  row: FastVisaTableRow;
  classification: TwoTierVisaClassification;
  snippet: string;
}

const SIGNAL_PRIORITY: Record<VisaRelocationSignal, number> = {
  'Visa Sponsored': 4,
  'Relocation Provided': 3,
  'Known Sponsor (Silent)': 2,
  'Check JD': 1,
  'No Sponsorship': 0,
};

const BATCH_TABLE_SYSTEM_PROMPT = `You are a high-speed international job extraction engine for VisaPilot AI.
Evaluate the indexed job snippets in a single pass and classify visa/work-permit sponsorship signals across UK, EU, APAC, Canada, and US hubs.

Rules:
- Recognize UK Skilled Worker / Tier 2, EU Blue Card, NL Highly Skilled Migrant / kennismigrant / IND, Ireland Critical Skills, Sweden Migrationsverket, Canada LMIA / Global Talent Stream, Singapore Employment Pass, Australia Subclass 482 / 186, Japan HSP/Engineer visa, US H-1B/O-1, and international relocation packages as valid sponsorship/relocation signals.
- NEVER invent, shorten, or alter directApplyUrl; copy the exact input applyUrl for each idx or leave empty string if none.
- If a job explicitly states citizenship-only, security clearance required, or cannot sponsor, classify as "No Sponsorship".
- Return ONLY valid JSON matching the schema.`;

function mapCategoryToSignal(category: SponsorshipCategory): VisaRelocationSignal {
  switch (category) {
    case 'VISA_SPONSORED':
      return 'Visa Sponsored';
    case 'KNOWN_SPONSOR_SILENT':
      return 'Known Sponsor (Silent)';
    case 'RELOCATION_PROVIDED':
      return 'Relocation Provided';
    case 'NOT_SPONSORED':
      return 'No Sponsorship';
    case 'UNCLEAR':
    default:
      return 'Check JD';
  }
}

function resolveCompanyName(job: BatchJobInput): string {
  if (job.companyName && job.companyName.trim()) {
    return job.companyName.trim();
  }
  if (typeof job.company === 'object' && job.company?.name) {
    return job.company.name.trim();
  }
  if (typeof job.company === 'string' && job.company.trim()) {
    return job.company.trim();
  }
  return 'Unknown Company';
}

function formatLocationCountry(location?: string, country?: string): string {
  const loc = (location || '').trim();
  const cty = (country || '').trim();
  if (loc && cty && !loc.toLowerCase().includes(cty.toLowerCase()) && cty.toLowerCase() !== 'unknown') {
    return `${loc}, ${cty}`;
  }
  return loc || (cty && cty.toLowerCase() !== 'unknown' ? cty : 'Remote / Unspecified');
}

function computeDeterministicSkillBonus(
  job: BatchJobInput,
  normalizedSkills?: string[],
): number {
  if (!normalizedSkills?.length) return 0;

  const textLower = `${job.title || ''} ${job.description || ''}`.toLowerCase();
  let matched = 0;

  if (job.skills && job.skills.length > 0) {
    const jobSkillSet = new Set(job.skills.map((s) => s.toLowerCase()));
    for (const s of normalizedSkills) {
      if (jobSkillSet.has(s) || textLower.includes(s)) {
        matched++;
      }
    }
  } else {
    for (const s of normalizedSkills) {
      if (textLower.includes(s)) {
        matched++;
      }
    }
  }

  return Math.round((matched / normalizedSkills.length) * 15);
}

function buildBaselines(
  jobs: readonly BatchJobInput[],
  queryContext: BatchQueryContext,
): PrecomputedJobBaseline[] {
  const requiresVisa = queryContext.requiresVisa ?? true;
  const normalizedSkills = queryContext.skills
    ?.map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const len = jobs.length;
  const baselines = new Array<PrecomputedJobBaseline>(len);

  for (let idx = 0; idx < len; idx++) {
    const job = jobs[idx];
    const companyName = resolveCompanyName(job);
    const directApplyUrl = (job.applyUrl || job.sourceUrl || job.url || '').trim();
    const classification = classifySponsorshipTwoTier({
      title: job.title,
      companyName,
      company: job.company,
      location: job.location,
      country: job.country,
      description: job.description,
      requirements: job.requirements,
      sourceUrl: directApplyUrl,
      applyUrl: directApplyUrl,
      atsSlug: job.atsSlug,
      visaSponsorshipPolicy: job.visaSponsorshipPolicy,
    });

    const relevance = scoreJobTokenizedRelevance(
      {
        title: job.title,
        description: job.description,
        skills: job.skills,
        visaClassification: classification,
      },
      queryContext.query,
      { requiresVisa },
    );

    const skillBonus = computeDeterministicSkillBonus(job, normalizedSkills);
    const rawScore =
      classification.category === 'NOT_SPONSORED' && requiresVisa
        ? Math.max(0, Math.min(49, relevance.score))
        : Math.min(100, Math.max(0, relevance.score + skillBonus));

    baselines[idx] = {
      idx,
      classification,
      snippet: (job.description || '').replace(/\s+/g, ' ').trim().slice(0, 260),
      row: {
        jobTitle: (job.title || 'Software Engineer').trim(),
        company: companyName,
        locationCountry: formatLocationCountry(job.location, job.country),
        visaRelocationSignal: mapCategoryToSignal(classification.category),
        matchScore: rawScore,
        directApplyUrl,
      },
    };
  }

  return baselines;
}

function sortRows(rows: FastVisaTableRow[]): FastVisaTableRow[] {
  return [...rows].sort((a, b) => {
    const scoreDiff = b.matchScore - a.matchScore;
    if (scoreDiff !== 0) return scoreDiff;
    return SIGNAL_PRIORITY[b.visaRelocationSignal] - SIGNAL_PRIORITY[a.visaRelocationSignal];
  });
}

function parseJsonPayload(rawContent: string): unknown {
  const trimmed = rawContent.trim();
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const jsonCandidate = codeBlockMatch ? codeBlockMatch[1].trim() : trimmed;
  const parsed = JSON.parse(jsonCandidate);
  return Array.isArray(parsed) ? { rows: parsed } : parsed;
}

function sanitizeMarkdownCell(value: string | number): string {
  const str = String(value ?? '');
  if (!str.includes('|') && !str.includes('\n') && !str.includes('\r')) {
    return str.trim();
  }
  return str.replace(/\|/g, '\\|').replace(/[\r\n]+/g, ' ').trim();
}

/**
 * Renders validated structured visa rows as a Markdown table.
 */
export function renderVisaMarkdownTable(rows: readonly FastVisaTableRow[]): string {
  const header =
    '| Job Title | Company | Location/Country | Visa/Relocation Signal | Match Score | Direct Apply URL |\n| --- | --- | --- | --- | --- | --- |';
  if (rows.length === 0) return header;

  const lines = new Array(rows.length);
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    lines[i] = `| ${sanitizeMarkdownCell(row.jobTitle)} | ${sanitizeMarkdownCell(row.company)} | ${sanitizeMarkdownCell(row.locationCountry)} | ${sanitizeMarkdownCell(row.visaRelocationSignal)} | ${Math.round(row.matchScore)} | ${sanitizeMarkdownCell(row.directApplyUrl)} |`;
  }

  return header + '\n' + lines.join('\n');
}

/**
 * Per-call timeout for the LLM extraction in the search hot path.
 * If the LLM does not respond within this budget, the deterministic
 * fallback runs in <2ms, keeping total search latency well under 60s.
 */
const LLM_EXTRACTION_TIMEOUT_MS = 12_000;

/**
 * Extracts and ranks a structured visa table across a batch of jobs in a single LLM call,
 * enforcing Zod validation, anti-hallucination URL restoration by `idx`, and a <5ms deterministic fallback.
 */
export async function extractFastVisaTableBatch(
  jobs: readonly BatchJobInput[],
  queryContext: BatchQueryContext = {},
  llmClient: BatchLLMClient = llm,
): Promise<FastVisaTableBatchResult> {
  if (jobs.length === 0) {
    return {
      rows: [],
      markdownTable: renderVisaMarkdownTable([]),
      usedFallback: false,
      llmDurationMs: 0,
      modelUsed: 'none',
      restoredUrlsCount: 0,
    };
  }

  const baselines = buildBaselines(jobs, queryContext);
  const allowedInputUrls = new Set(
    baselines.map((b) => b.row.directApplyUrl).filter((url) => url.length > 0),
  );

  const compactPayload = baselines.map((b) => ({
    idx: b.idx,
    title: b.row.jobTitle,
    company: b.row.company,
    location: b.row.locationCountry,
    applyUrl: b.row.directApplyUrl,
    preSignal: b.row.visaRelocationSignal,
    snippet: b.snippet,
  }));

  const prompt = [
    `Target Role Query: "${queryContext.query || 'Software Engineer'}"`,
    queryContext.skills?.length ? `Candidate Skills: ${queryContext.skills.join(', ')}` : '',
    queryContext.targetCountries?.length
      ? `Target Countries: ${queryContext.targetCountries.join(', ')}`
      : '',
    `Evaluate all ${compactPayload.length} jobs in ONE JSON object {"rows": [...]} preserving exact idx and directApplyUrl:`,
    JSON.stringify(compactPayload),
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const llmPromise = llmClient.generate({
      task: 'fast-extraction',
      model: MODELS.MINIMAX_M3,
      prompt,
      systemPrompt: BATCH_TABLE_SYSTEM_PROMPT,
      temperature: 0.1,
      maxTokens: 4096,
      responseSchema: FAST_VISA_TABLE_RESPONSE_SCHEMA,
    });

    let timeoutId: NodeJS.Timeout | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(
        () => reject(new Error(`LLM extraction timed out after ${LLM_EXTRACTION_TIMEOUT_MS}ms`)),
        LLM_EXTRACTION_TIMEOUT_MS,
      );
    });

    let response: Pick<LLMResult, 'content' | 'model' | 'durationMs'>;
    try {
      response = await Promise.race([llmPromise, timeoutPromise]);
    } finally {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
    }

    const parsedJson = parseJsonPayload(response.content);
    const validatedRaw = RawLLMBatchSchema.parse(parsedJson);

    const byIdx = new Map<number, FastVisaTableRow>();
    let restoredUrlsCount = 0;

    for (const item of validatedRaw.rows) {
      const baseline = baselines[item.idx];
      if (!baseline) continue;

      const candidateUrl = (item.directApplyUrl || '').trim();
      const canonicalUrl = baseline.row.directApplyUrl;

      let safeUrl = canonicalUrl;
      if (candidateUrl) {
        if (allowedInputUrls.has(candidateUrl) && candidateUrl === canonicalUrl) {
          safeUrl = candidateUrl;
        } else if (candidateUrl !== canonicalUrl) {
          restoredUrlsCount++;
        }
      } else if (canonicalUrl) {
        restoredUrlsCount++;
      }

      // Preserve deterministic refusal and Tier 1 explicit signals against LLM drift
      let safeSignal: VisaRelocationSignal =
        item.visaRelocationSignal ?? baseline.row.visaRelocationSignal;

      if (baseline.classification.category === 'NOT_SPONSORED') {
        safeSignal = 'No Sponsorship';
      } else if (
        (baseline.classification.category === 'VISA_SPONSORED' ||
          baseline.classification.category === 'RELOCATION_PROVIDED') &&
        safeSignal === 'Check JD'
      ) {
        safeSignal = baseline.row.visaRelocationSignal;
      }

      byIdx.set(item.idx, {
        jobTitle: (item.jobTitle || baseline.row.jobTitle).trim(),
        company: (item.company || baseline.row.company).trim(),
        locationCountry: (item.locationCountry || baseline.row.locationCountry).trim(),
        visaRelocationSignal: safeSignal,
        matchScore:
          item.matchScore !== undefined
            ? Math.round(Math.min(100, Math.max(0, item.matchScore)))
            : baseline.row.matchScore,
        directApplyUrl: safeUrl,
      });
    }

    // Backfill any rows omitted by the LLM
    for (const baseline of baselines) {
      if (!byIdx.has(baseline.idx)) {
        byIdx.set(baseline.idx, baseline.row);
      }
    }

    const mergedRows = sortRows(Array.from(byIdx.values()));
    const validatedBatch = FastVisaTableBatchSchema.parse({ rows: mergedRows });

    return {
      rows: validatedBatch.rows,
      markdownTable: renderVisaMarkdownTable(validatedBatch.rows),
      usedFallback: false,
      llmDurationMs: response.durationMs,
      modelUsed: response.model,
      restoredUrlsCount,
    };
  } catch {
    const fallbackRows = sortRows(baselines.map((b) => b.row));

    return {
      rows: fallbackRows,
      markdownTable: renderVisaMarkdownTable(fallbackRows),
      usedFallback: true,
      llmDurationMs: 0,
      modelUsed: 'deterministic-fallback',
      restoredUrlsCount: 0,
    };
  }
}

