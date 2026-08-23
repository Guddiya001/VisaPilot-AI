/**
 * Retry utilities with exponential backoff.
 *
 * Policy (per spec):
 *   - Retry ONLY on transient errors: 429, 500, 502, 503, 504, network timeout.
 *   - NEVER retry hard errors: 400, 401, 403, content-blocked, model-not-allowed.
 *   - Use exponential backoff: baseDelay * 2^attempt (jittered ±10%).
 */

import { BASE_DELAY_MS, MAX_RETRY_ATTEMPTS } from './config';

// ---------------------------------------------------------------------------
// Error classification
// ---------------------------------------------------------------------------

/** HTTP status codes that are safe to retry (transient failures). */
const TRANSIENT_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

/** HTTP status codes that should never be retried. */
const HARD_ERROR_STATUS_CODES = new Set([400, 401, 403]);

export class AgentRouterError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly isTransient: boolean,
    public readonly body?: string,
  ) {
    super(message);
    this.name = 'AgentRouterError';
  }
}

export function isTransientError(err: unknown): boolean {
  if (err instanceof AgentRouterError) {
    return err.isTransient;
  }
  // Network errors (fetch throws TypeError on connectivity issues)
  if (err instanceof TypeError) {
    return true;
  }
  // AbortError from timeout
  if (err instanceof Error && err.name === 'AbortError') {
    return true;
  }
  return false;
}

export function isHardError(err: unknown): boolean {
  if (err instanceof AgentRouterError) {
    return !err.isTransient;
  }
  return false;
}

/**
 * Classifies an HTTP status code and throws the appropriate error.
 * Call this after receiving a non-2xx response from AgentRouter.
 */
export function throwForStatus(status: number, body: string, model: string): never {
  const isTransient = TRANSIENT_STATUS_CODES.has(status);
  const isHard = HARD_ERROR_STATUS_CODES.has(status);

  if (status === 401) {
    // Distinguish auth failure types from body hints
    const lower = body.toLowerCase();
    let reason = 'Invalid API key';
    if (lower.includes('unauthorized client')) reason = 'Unauthorized client';
    else if (lower.includes('incorrect endpoint')) reason = 'Incorrect endpoint';
    else if (lower.includes('unsupported client')) reason = 'Unsupported client';
    throw new AgentRouterError(
      `[AgentRouter] Authentication failed (401) for model "${model}": ${reason}. ` +
        'Check AGENTROUTER_API_KEY and endpoint configuration.',
      status,
      false, // 401 is never transient
      body,
    );
  }

  if (status === 403) {
    const lower = body.toLowerCase();
    const isContentBlock =
      lower.includes('content-blocked') || lower.includes('content_blocked');
    const isModelNotAllowed =
      lower.includes('model-not-allowed') || lower.includes('model_not_allowed');
    const reason = isContentBlock
      ? 'content-blocked'
      : isModelNotAllowed
        ? 'model-not-allowed (check AgentRouter token permissions)'
        : 'Forbidden';
    throw new AgentRouterError(
      `[AgentRouter] Access denied (403) for model "${model}": ${reason}.`,
      status,
      false,
      body,
    );
  }

  if (isHard) {
    throw new AgentRouterError(
      `[AgentRouter] Hard error (${status}) for model "${model}": ${body}`,
      status,
      false,
      body,
    );
  }

  if (isTransient) {
    throw new AgentRouterError(
      `[AgentRouter] Transient error (${status}) for model "${model}": ${body}`,
      status,
      true,
      body,
    );
  }

  // Unknown status — treat as transient to allow fallback
  throw new AgentRouterError(
    `[AgentRouter] Unexpected status (${status}) for model "${model}": ${body}`,
    status,
    true,
    body,
  );
}

// ---------------------------------------------------------------------------
// Retry with exponential backoff
// ---------------------------------------------------------------------------

function jitter(ms: number): number {
  // ±10% jitter to avoid thundering-herd
  return ms * (0.9 + Math.random() * 0.2);
}

/**
 * Wraps an async function with retry logic using exponential backoff.
 * Stops immediately on hard (non-transient) errors.
 *
 * @param fn           - The async function to retry.
 * @param maxAttempts  - Maximum number of total attempts (default: MAX_RETRY_ATTEMPTS).
 * @param baseDelayMs  - Base delay in ms before first retry (default: BASE_DELAY_MS).
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = MAX_RETRY_ATTEMPTS,
  baseDelayMs: number = BASE_DELAY_MS,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      // Hard errors must not be retried
      if (!isTransientError(err)) {
        throw err;
      }

      const isLastAttempt = attempt === maxAttempts - 1;
      if (isLastAttempt) {
        break;
      }

      const delay = jitter(baseDelayMs * Math.pow(2, attempt));
      await sleep(delay);
    }
  }

  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
