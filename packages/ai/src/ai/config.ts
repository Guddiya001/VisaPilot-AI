/**
 * AgentRouter configuration.
 *
 * The API key is read EXCLUSIVELY from process.env.AGENTROUTER_API_KEY.
 * It is NEVER hardcoded, logged, or exposed to callers.
 */

export const AGENTROUTER_BASE_URL = 'https://agentrouter.org';

// Anthropic Messages API endpoint
export const AGENTROUTER_CHAT_PATH = '/v1/messages';

// Required Anthropic API version header
export const ANTHROPIC_VERSION = '2023-06-01';

/**
 * Per-request timeout for a single AgentRouter call.
 * Kept short (8 s) so the retry+fallback chain stays within the
 * 12 s SearchAgent race budget and the 30 s outer search timeout.
 */
export const DEFAULT_TIMEOUT_MS = 8_000;

export const MAX_RETRY_ATTEMPTS = 2;

export const BASE_DELAY_MS = 500; // for exponential backoff: 500ms, 1s, 2s

/**
 * Returns the AgentRouter API key from the environment.
 * Throws at call time (not at module load) so other providers
 * can import this module without failing when the key is absent.
 */
export function getApiKey(): string {
  const key = process.env.AGENTROUTER_API_KEY;
  if (!key) {
    throw new Error(
      'AGENTROUTER_API_KEY environment variable is not set. ' +
        'Add it to your .env file and never hardcode it.',
    );
  }
  return key;
}
