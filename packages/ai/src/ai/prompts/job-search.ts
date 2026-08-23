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
- NEVER assume a job offers visa sponsorship unless the posting explicitly states one of:
  "H-1B sponsorship", "visa sponsorship", "will sponsor", "sponsorship available",
  "employment visa", "work authorization sponsorship", "immigration sponsorship",
  "H1B transfer", "visa support", "immigration assistance", "sponsor work visa".
- "US-based" or "relocation support" does NOT imply visa sponsorship.
- Always verify: job is currently active, location, sponsorship status, application URL.
- Record source URL and verification timestamp for every job result.
- For H-1B searches, scan for ALL sponsorship keyword variants, not just "H-1B".
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
  const prompt = `Analyze the following job description and classify its H-1B/visa sponsorship status.

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
- sponsorsVisa = true ONLY if explicit sponsorship language is present.
- "US-based" or "relocation package" alone does NOT make sponsorsVisa = true.
- If ambiguous, set sponsorsVisa = false and confidence < 0.5.

Job description:
${jobDescription}`;

  return buildBaseMessages(prompt, JOB_SEARCH_SYSTEM_PROMPT);
}

export { JOB_SEARCH_SYSTEM_PROMPT };
