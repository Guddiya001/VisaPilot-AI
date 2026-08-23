/**
 * Model router: selects and executes models with fallback.
 *
 * Uses the Anthropic Messages API format as exposed by AgentRouter:
 *   POST /v1/messages
 *   x-api-key: <key>
 *   anthropic-version: 2023-06-01
 *
 * Fallback chain: Claude Opus 5 → Claude Opus 4.8 → GPT 5.6
 *
 * Retry policy:
 *   - Transient errors (429, 5xx, timeout): retry with exponential backoff per model.
 *   - Hard errors (400, 401, 403): stop immediately, do NOT retry or fallback.
 */

import {
  AGENTROUTER_BASE_URL,
  AGENTROUTER_CHAT_PATH,
  ANTHROPIC_VERSION,
  DEFAULT_TIMEOUT_MS,
  getApiKey,
} from './config';
import { MODELS, FALLBACK_CHAIN, type ModelId } from './models';
import { withRetry, throwForStatus, isHardError } from './retry';

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

// Anthropic Messages API response shape
interface AnthropicResponse {
  id?: string;
  type?: string;
  model?: string;
  role?: string;
  content: Array<{ type: string; text: string }>;
  stop_reason?: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
}

// ---------------------------------------------------------------------------
// Helpers — convert messages to Anthropic format
// ---------------------------------------------------------------------------

interface AnthropicRequest {
  model: string;
  max_tokens: number;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  system?: string;
  temperature?: number;
}

/**
 * Splits the messages array into an optional system prompt and the
 * user/assistant conversation turns required by the Anthropic Messages API.
 */
function buildAnthropicBody(params: LLMRequestParams): AnthropicRequest {
  const systemMsg = params.messages.find((m) => m.role === 'system');
  const turns = params.messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

  // Anthropic requires the conversation to start with a user turn
  const finalTurns =
    turns.length > 0 && turns[0].role === 'user'
      ? turns
      : [{ role: 'user' as const, content: 'Hello' }, ...turns];

  const body: AnthropicRequest = {
    model: params.model,
    max_tokens: params.maxTokens ?? 4096,
    messages: finalTurns,
  };

  if (systemMsg) body.system = systemMsg.content;
  if (params.temperature !== undefined) body.temperature = params.temperature;

  return body;
}

// ---------------------------------------------------------------------------
// Raw fetch to AgentRouter (Anthropic Messages API)
// ---------------------------------------------------------------------------

async function callAgentRouter(params: LLMRequestParams): Promise<LLMResult> {
  const apiKey = getApiKey(); // throws if missing
  const url = `${AGENTROUTER_BASE_URL}${AGENTROUTER_CHAT_PATH}`;
  const startMs = Date.now();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        // Anthropic-style auth — key is NEVER logged
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
        'user-agent': 'claude-cli/2.1.114 (external, cli)',
        'x-app': 'cli',
      },
      body: JSON.stringify(buildAnthropicBody(params)),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '(unreadable body)');
    throwForStatus(response.status, body, params.model);
  }

  const data = (await response.json()) as AnthropicResponse;
  const durationMs = Date.now() - startMs;

  // Anthropic response: content is an array of blocks
  const text = data.content?.find((c) => c.type === 'text')?.text?.trim() ?? '';

  return {
    content: text,
    model: data.model ?? params.model,
    usage: data.usage
      ? {
          inputTokens: data.usage.input_tokens ?? 0,
          outputTokens: data.usage.output_tokens ?? 0,
          totalTokens: (data.usage.input_tokens ?? 0) + (data.usage.output_tokens ?? 0),
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

      // Hard errors: surface immediately — wrong key, bad request, etc.
      if (isHardError(err)) {
        const isModelSpecific = (err as any).statusCode === 403 || (err as any).statusCode === 404;
        if (!isModelSpecific) {
          throw err;
        }
      }

      const errorMsg = err instanceof Error ? err.message : String(err);
      console.warn(
        `[AgentRouter] Model "${model}" failed (${isHardError(err) ? 'hard' : 'transient'}): ${errorMsg}. Trying next model.`,
      );
    }
  }

  throw lastError ?? new Error('[AgentRouter] All models in fallback chain failed.');
}

// ---------------------------------------------------------------------------
// Streaming support (Anthropic SSE format)
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
 * Streams a chat completion using Anthropic's Server-Sent Event format.
 * Anthropic delta events: content_block_delta → delta.text
 */
export async function streamFromAgentRouter(params: StreamParams): Promise<void> {
  const apiKey = getApiKey();
  const url = `${AGENTROUTER_BASE_URL}${AGENTROUTER_CHAT_PATH}`;
  const model = params.model ?? MODELS.CLAUDE_OPUS_48;
  const startMs = Date.now();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const body = buildAnthropicBody({ model, messages: params.messages, temperature: params.temperature, maxTokens: params.maxTokens });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
        'user-agent': 'claude-cli/2.1.114 (external, cli)',
        'x-app': 'cli',
        accept: 'text/event-stream',
      },
      body: JSON.stringify({ ...body, stream: true }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errBody = await response.text().catch(() => '(unreadable body)');
      throwForStatus(response.status, errBody, model);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('[AgentRouter] Streaming response body is null.');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        // Anthropic SSE: lines are "event: ..." or "data: ..."
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]' || data === 'message_stop') break;

        try {
          const parsed = JSON.parse(data) as {
            type?: string;
            delta?: { type?: string; text?: string };
          };
          // Anthropic streaming delta: type=content_block_delta, delta.type=text_delta
          if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
            const token = parsed.delta.text;
            if (token) params.onToken(token);
          }
        } catch {
          // Ignore malformed SSE chunks
        }
      }
    }

    params.onDone?.({ model, durationMs: Date.now() - startMs });
  } catch (err) {
    clearTimeout(timeoutId);
    const error = err instanceof Error ? err : new Error(String(err));
    params.onError?.(error);
  }
}
