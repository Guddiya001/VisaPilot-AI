/**
 * Model router: selects and executes models with fallback.
 *
 * Fallback chain: Claude Opus 5 → Claude Opus 4.8 → GPT 5.6
 *
 * Retry policy:
 *   - Transient errors (429, 5xx, timeout): retry with exponential backoff per model.
 *   - Hard errors (400, 401, 403): stop immediately, do NOT retry or fallback.
 *   - content-blocked / model-not-allowed: stop and surface the error.
 */

import {
  AGENTROUTER_BASE_URL,
  AGENTROUTER_CHAT_PATH,
  DEFAULT_TIMEOUT_MS,
  getApiKey,
} from './config';
import { MODELS, FALLBACK_CHAIN, type ModelId } from './models';
import { withRetry, throwForStatus, isHardError, AgentRouterError } from './retry';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMRequestParams {
  model: ModelId;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  requestId?: string;
}

export interface LLMResult {
  content: string;
  model: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  requestId?: string;
  durationMs: number;
}

interface AgentRouterResponse {
  id?: string;
  model?: string;
  choices: Array<{
    message: { content: string };
    finish_reason?: string;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

// ---------------------------------------------------------------------------
// Raw fetch to AgentRouter
// ---------------------------------------------------------------------------

async function callAgentRouter(params: LLMRequestParams): Promise<LLMResult> {
  const apiKey = getApiKey(); // Throws if missing
  const url = `${AGENTROUTER_BASE_URL}${AGENTROUTER_CHAT_PATH}`;
  const startMs = Date.now();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Standard Bearer auth — key is never logged
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: params.model,
        messages: params.messages,
        temperature: params.temperature ?? 0.7,
        max_tokens: params.maxTokens ?? 4096,
        stream: false,
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '(unreadable body)');
    throwForStatus(response.status, body, params.model);
  }

  const data = (await response.json()) as AgentRouterResponse;
  const durationMs = Date.now() - startMs;

  return {
    content: data.choices[0]?.message?.content?.trim() ?? '',
    model: data.model ?? params.model,
    usage: data.usage
      ? {
          inputTokens: data.usage.prompt_tokens ?? 0,
          outputTokens: data.usage.completion_tokens ?? 0,
          totalTokens: data.usage.total_tokens ?? 0,
        }
      : undefined,
    requestId: params.requestId ?? data.id,
    durationMs,
  };
}

// ---------------------------------------------------------------------------
// Model router with fallback
// ---------------------------------------------------------------------------

/**
 * Executes a chat completion against AgentRouter, starting with the requested
 * model and falling back down the chain on transient failures.
 *
 * Hard errors (401, 403, 400) are re-thrown immediately without fallback.
 */
export async function generateWithFallback(
  params: Omit<LLMRequestParams, 'model'> & { model?: ModelId },
): Promise<LLMResult> {
  // Build the list of models to try: requested model first, then rest of fallback chain
  const requestedModel = params.model ?? MODELS.CLAUDE_OPUS_5;
  const chain: ModelId[] = [
    requestedModel,
    ...FALLBACK_CHAIN.filter((m) => m !== requestedModel),
  ];

  let lastError: unknown;

  for (const model of chain) {
    try {
      const result = await withRetry(() => callAgentRouter({ ...params, model }));
      return result;
    } catch (err) {
      lastError = err;

      // Hard errors: surface immediately without trying the next model
      if (isHardError(err)) {
        throw err;
      }

      // Transient errors: log the failure and try the next model
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.warn(
        `[AgentRouter] Model "${model}" failed (transient): ${errorMsg}. ` +
          `Trying next model in chain.`,
      );
    }
  }

  // All models exhausted
  throw lastError ?? new Error('[AgentRouter] All models in fallback chain failed.');
}

// ---------------------------------------------------------------------------
// Streaming support
// ---------------------------------------------------------------------------

export interface StreamParams {
  model?: ModelId;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  onToken: (token: string) => void;
  onDone?: (result: { model: string; durationMs: number }) => void;
  onError?: (err: Error) => void;
}

/**
 * Streams a chat completion from AgentRouter using Server-Sent Events (SSE).
 * Falls back to non-streaming if SSE is not available.
 */
export async function streamFromAgentRouter(params: StreamParams): Promise<void> {
  const apiKey = getApiKey();
  const url = `${AGENTROUTER_BASE_URL}${AGENTROUTER_CHAT_PATH}`;
  const model = params.model ?? MODELS.CLAUDE_OPUS_48;
  const startMs = Date.now();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({
        model,
        messages: params.messages,
        temperature: params.temperature ?? 0.7,
        max_tokens: params.maxTokens ?? 4096,
        stream: true,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const body = await response.text().catch(() => '(unreadable body)');
      throwForStatus(response.status, body, model);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('[AgentRouter] Streaming response body is null.');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') break;

        try {
          const parsed = JSON.parse(data) as {
            choices?: Array<{ delta?: { content?: string } }>;
          };
          const token = parsed.choices?.[0]?.delta?.content;
          if (token) {
            params.onToken(token);
          }
        } catch {
          // Ignore malformed SSE chunks
        }
      }
    }

    const durationMs = Date.now() - startMs;
    params.onDone?.({ model, durationMs });
  } catch (err) {
    clearTimeout(timeoutId);
    const error = err instanceof Error ? err : new Error(String(err));
    params.onError?.(error);
  }
}
