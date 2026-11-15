/**
 * Job-search specific prompts.
 *
 * Enforces strict anti-hallucination rules for visa/sponsorship data.
 * Recommended model: GPT 5.6 for classification/extraction,
 *                    Claude Opus 4.8 for JD analysis,
 *                    Claude Opus 5 for complex multi-step job analysis.
 */

import { extendSystemPrompt, buildBaseMessages } from './base';

const JOB_SEARCH_SYSTEM_PROMPT = extendSystemPrompt(`
You are a specialized job-search assistant for international professionals seeking visa sponsorship.

Job-search specific rules:
- NEVER assume a job offers visa sponsorship unless the posting explicitly states visa/work-permit sponsorship or international relocation support, such as:
  "visa sponsorship", "will sponsor", "sponsorship available", "work permit", "employment visa",
  "work authorization sponsorship", "immigration sponsorship", "visa support", "immigration assistance",
  "Skilled Worker", "EU Blue Card", "Highly Skilled Migrant", "kennismigrant", "IND",
  "Critical Skills", "Migrationsverket", "LMIA", "Global Talent Stream", "Employment Pass",
  "Subclass 482", "H-1B sponsorship", "H1B transfer", "international relocation", "relocation package", "global mobility".
- Domestic-only location statements (such as "US-based", "UK-based", or "EU-based") alone do NOT imply visa sponsorship; explicit regional work permits and international relocation packages ARE valid visa signals.
- Always verify: job is currently active, location, sponsorship status, application URL.
- Record source URL and verification timestamp for every job result.
- For international searches, scan for ALL regional work permit, visa sponsorship, and relocation keyword variants across UK, EU, APAC, and North America — not only US "H-1B".
- If sponsorship status cannot be confirmed: state "Sponsorship: Not verified."
- Prefer current web search data over cached/internal job databases when real-time results are requested.
- Never invent application URLs. Link only to verified, active URLs.
`);

export interface JobSearchContext {
  query: string;
  location?: string;
  visaType?: string;
  skills?: string[];
  experienceLevel?: string;
}

export function buildJobSearchMessages(context: JobSearchContext) {
  const parts: string[] = [`Job search request:`];
  parts.push(`Query: ${context.query}`);
  if (context.location) parts.push(`Location: ${context.location}`);
  if (context.visaType) parts.push(`Visa type required: ${context.visaType}`);
  if (context.skills?.length) parts.push(`Key skills: ${context.skills.join(', ')}`);
  if (context.experienceLevel) parts.push(`Experience level: ${context.experienceLevel}`);

  parts.push(`
For each job result, provide:
- Company name (verified)
- Job title (verified)
- Location (verified)
- Visa/sponsorship status (verified from posting text, or "Not verified")
- Sponsorship keywords found (list exact phrases)
- Application URL (verified and active, or "Not available")
- Source URL
- Verification timestamp`);

  return buildBaseMessages(parts.join('\n'), JOB_SEARCH_SYSTEM_PROMPT);
}

export function buildVisaClassificationMessages(jobDescription: string) {
  const prompt = `Analyze the following job description and classify its global visa sponsorship, regional work permit, and international relocation support status.

Return ONLY valid JSON in this exact format:
{
  "sponsorsVisa": boolean,
  "confidence": number (0.0–1.0),
  "evidence": string[] (exact quotes from the text that support the classification),
  "visaTypes": string[] (specific visa types mentioned),
  "relocationSupport": boolean,
  "notes": string
}

Rules:
- sponsorsVisa = true if explicit visa sponsorship, UK/EU/APAC/North American work permit support (e.g. Skilled Worker, EU Blue Card, Highly Skilled Migrant / kennismigrant / IND, Critical Skills, Migrationsverket, LMIA / Global Talent Stream, Employment Pass, Subclass 482 / 186, Japan HSP/Engineer visa, or H-1B/O-1), OR an international relocation package / global mobility support is present.
- Domestic-only location labels alone (e.g., "US-based", "London-based", "must have existing right to work without sponsorship") do NOT make sponsorsVisa = true; international relocation packages and regional work permit programs ARE valid visa signals.
- If no sponsorship or international relocation signal is present or status is ambiguous, set sponsorsVisa = false and confidence < 0.5.

Job description:
${jobDescription}`;

  return buildBaseMessages(prompt, JOB_SEARCH_SYSTEM_PROMPT);
}

export { JOB_SEARCH_SYSTEM_PROMPT };
