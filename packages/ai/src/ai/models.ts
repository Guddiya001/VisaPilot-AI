/**
 * Centralized model identifiers and task-based routing table.
 *
 * Task routing policy:
 *
 *   Claude Opus 5  — complex reasoning, architecture, resume/JD analysis,
 *                    long-form analysis, difficult coding, agentic workflows,
 *                    multi-step reasoning, interview prep, system design,
 *                    comparing multiple solutions.
 *
 *   Claude Opus 4.8 — general high-quality responses, resume generation,
 *                     cover letters, JD analysis, behavioral interview answers,
 *                     technical explanations, coding assistance,
 *                     normal application requests.
 *
 *   GPT 5.6        — fast classification, simple extraction, structured JSON,
 *                    keyword extraction, job categorization, deduplication,
 *                    lightweight transformations, fallback when Claude fails.
 */

export const MODELS = {
  CLAUDE_OPUS_48: 'claude-opus-4-8',
  CLAUDE_OPUS_5: 'claude-opus-5',
  GPT_56: 'gpt-5.6-sol',
  /** Ultra-fast cloud model — ideal for low-latency intent extraction & search routing */
  MINIMAX_M3: 'minmax-m3:cloud',
  /** Strong at structured JSON, classification, and visa detection */
  NEMOTRON_3_ULTRA: 'nemotron-3-ultra:cloud',
} as const;

export type ModelId = (typeof MODELS)[keyof typeof MODELS];

// ---------------------------------------------------------------------------
// Task types
// ---------------------------------------------------------------------------

export type TaskType =
  // Complex tasks → Claude Opus 5
  | 'architecture'
  | 'system-design'
  | 'resume-analysis'
  | 'jd-analysis'
  | 'long-form-analysis'
  | 'difficult-coding'
  | 'agentic-workflow'
  | 'multi-step-reasoning'
  | 'interview-preparation'
  | 'solution-comparison'
  // Normal tasks → Claude Opus 4.8
  | 'general'
  | 'resume-generation'
  | 'cover-letter'
  | 'behavioral-interview'
  | 'technical-explanation'
  | 'coding-assistance'
  | 'job-search'
  | 'application'
  // Fast tasks → MiniMax M3 (ultra-low latency, ideal for search intent)
  | 'search-intent'
  | 'fast-extraction'
  | 'routing'
  // Lightweight structured tasks → Nemotron 3 Ultra
  | 'classification'
  | 'extraction'
  | 'json-generation'
  | 'keyword-extraction'
  | 'job-categorization'
  | 'deduplication'
  | 'transformation'
  | 'visa-detection';

const COMPLEX_TASKS = new Set<TaskType>([
  'architecture',
  'system-design',
  'resume-analysis',
  'jd-analysis',
  'long-form-analysis',
  'difficult-coding',
  'agentic-workflow',
  'multi-step-reasoning',
  'interview-preparation',
  'solution-comparison',
]);

/** Fast tasks routed to MiniMax M3 for minimum latency in the search path */
const FAST_TASKS = new Set<TaskType>([
  'search-intent',
  'fast-extraction',
  'routing',
]);

/** Structured/classification tasks routed to Nemotron 3 Ultra */
const LIGHTWEIGHT_TASKS = new Set<TaskType>([
  'classification',
  'extraction',
  'json-generation',
  'keyword-extraction',
  'job-categorization',
  'deduplication',
  'transformation',
  'visa-detection',
]);

/**
 * Selects the appropriate model for a given task type.
 * Callers can always override this by passing an explicit `model` parameter.
 */
export function selectModelForTask(task: TaskType): ModelId {
  if (COMPLEX_TASKS.has(task)) {
    return MODELS.CLAUDE_OPUS_5;
  }
  if (FAST_TASKS.has(task)) {
    return MODELS.MINIMAX_M3;
  }
  if (LIGHTWEIGHT_TASKS.has(task)) {
    return MODELS.NEMOTRON_3_ULTRA;
  }
  // Default: normal tasks
  return MODELS.CLAUDE_OPUS_48;
}

/**
 * Fallback chain: try models in this order on failure.
 * Claude Opus 5 → Claude Opus 4.8 → GPT 5.6
 */
/**
 * Fallback chain for generateWithFallback().
 * Order: Claude Opus 5 → Claude Opus 4.8 → MiniMax M3 → Nemotron 3 Ultra → GPT 5.6
 * MiniMax and Nemotron are included as fast/cheap fallbacks before GPT.
 */
export const FALLBACK_CHAIN: ModelId[] = [
  MODELS.CLAUDE_OPUS_5,
  MODELS.CLAUDE_OPUS_48,
  MODELS.MINIMAX_M3,
  MODELS.NEMOTRON_3_ULTRA,
  MODELS.GPT_56,
];
