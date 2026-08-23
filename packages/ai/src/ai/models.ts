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
  // Lightweight tasks → GPT 5.6
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
  if (LIGHTWEIGHT_TASKS.has(task)) {
    return MODELS.GPT_56;
  }
  // Default: normal tasks
  return MODELS.CLAUDE_OPUS_48;
}

/**
 * Fallback chain: try models in this order on failure.
 * Claude Opus 5 → Claude Opus 4.8 → GPT 5.6
 */
export const FALLBACK_CHAIN: ModelId[] = [
  MODELS.CLAUDE_OPUS_5,
  MODELS.CLAUDE_OPUS_48,
  MODELS.GPT_56,
];
