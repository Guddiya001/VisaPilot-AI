/**
 * LLM Service — the public API for the AgentRouter multi-model system.
 *
 * Usage:
 *
 *   import { llm } from '@visapilot/ai';
 *
 *   // Auto-route by task type:
 *   const result = await llm.generate({ task: 'resume-analysis', prompt });
 *
 *   // Explicit model override:
 *   const result = await llm.generate({
 *     task: 'architecture',
 *     model: 'claude-opus-5',
 *     prompt,
 *   });
 *
 *   // Streaming:
 *   await llm.stream({ model: 'claude-opus-5', prompt, onToken: (t) => process.stdout.write(t) });
 *
 * Observability:
 *   Logs: model, duration_ms, success, status_code, input_tokens, output_tokens, request_id.
 *   NEVER logs: API key, Authorization header, prompt content, or sensitive user data.
 */

import { selectModelForTask, type TaskType, type ModelId } from './models';
import { generateWithFallback, streamFromAgentRouter, type ChatMessage, type LLMResult } from './model-router';
import { buildBaseMessages, BASE_SYSTEM_PROMPT } from './prompts/base';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface GenerateParams {
  /** Task type for automatic model selection. Ignored when `model` is provided. */
  task?: TaskType;
  /** Explicit model override. Bypasses automatic task routing. */
  model?: ModelId | string;
  /**
   * The user-facing prompt. Required unless `messages` is provided directly.
   * When both are supplied, `messages` takes priority.
   */
  prompt?: string;
  /** Optional system prompt override. Defaults to BASE_SYSTEM_PROMPT. */
  systemPrompt?: string;
  /** Optional pre-built messages array (overrides prompt + systemPrompt). */
  messages?: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  /** Optional request ID for tracing. Auto-generated if not provided. */
  requestId?: string;
}

export interface StreamParams {
  model?: ModelId | string;
  task?: TaskType;
  prompt: string;
  systemPrompt?: string;
  messages?: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  /** Called for each token as it streams in. */
  onToken: (token: string) => void;
  /** Called when the stream completes. */
  onDone?: (result: { model: string; durationMs: number }) => void;
  /** Called on error. */
  onError?: (err: Error) => void;
}

export type { LLMResult };

// ---------------------------------------------------------------------------
// Observability logger (safe — never logs secrets or prompt content)
// ---------------------------------------------------------------------------

function logRequest(fields: {
  requestId: string;
  model: string;
  task?: string;
  durationMs?: number;
  success: boolean;
  statusCode?: number;
  inputTokens?: number;
  outputTokens?: number;
  error?: string;
}): void {
  const parts: string[] = [
    `[LLM]`,
    `reqId=${fields.requestId}`,
    `model=${fields.model}`,
  ];
  if (fields.task) parts.push(`task=${fields.task}`);
  if (fields.durationMs !== undefined) parts.push(`duration=${fields.durationMs}ms`);
  parts.push(`success=${fields.success}`);
  if (fields.statusCode !== undefined) parts.push(`status=${fields.statusCode}`);
  if (fields.inputTokens !== undefined) parts.push(`inputTokens=${fields.inputTokens}`);
  if (fields.outputTokens !== undefined) parts.push(`outputTokens=${fields.outputTokens}`);
  if (fields.error) parts.push(`error="${fields.error}"`);

  // Use console.info for success, console.error for failure
  if (fields.success) {
    console.info(parts.join(' '));
  } else {
    console.error(parts.join(' '));
  }
}

function generateRequestId(): string {
  return `llm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

// ---------------------------------------------------------------------------
// LLM Service class
// ---------------------------------------------------------------------------

class LLMService {
  /**
   * Generates a completion using AgentRouter.
   *
   * Model selection priority:
   *   1. Explicit `model` param
   *   2. `task`-based auto-selection via selectModelForTask()
   *   3. Falls back to Claude Opus 4.8 (default for general tasks)
   */
  async generate(params: GenerateParams): Promise<LLMResult> {
    const requestId = params.requestId ?? generateRequestId();

    // Resolve model: explicit override > task routing > default
    const resolvedModel = (params.model as ModelId | undefined) ?? (
      params.task ? selectModelForTask(params.task) : undefined
    );

    // Build messages array
    const messages: ChatMessage[] =
      params.messages ??
      (params.prompt
        ? buildBaseMessages(params.prompt, params.systemPrompt ?? BASE_SYSTEM_PROMPT)
        : (() => { throw new Error('[LLMService] Either prompt or messages must be provided.'); })());

    // Log the outgoing request (safe fields only)
    console.info(
      `[LLM] reqId=${requestId} initiating model=${resolvedModel ?? 'auto'} task=${params.task ?? 'none'}`,
    );

    const startMs = Date.now();

    try {
      const result = await generateWithFallback({
        model: resolvedModel,
        messages,
        temperature: params.temperature,
        maxTokens: params.maxTokens,
        requestId,
      });

      logRequest({
        requestId,
        model: result.model,
        task: params.task,
        durationMs: result.durationMs,
        success: true,
        inputTokens: result.usage?.inputTokens,
        outputTokens: result.usage?.outputTokens,
      });

      return result;
    } catch (err) {
      const durationMs = Date.now() - startMs;
      const errorMsg = err instanceof Error ? err.message : String(err);

      logRequest({
        requestId,
        model: resolvedModel ?? 'unknown',
        task: params.task,
        durationMs,
        success: false,
        error: errorMsg,
      });

      throw err;
    }
  }

  /**
   * Streams a completion using AgentRouter SSE.
   *
   * The application can display tokens progressively via the `onToken` callback
   * instead of waiting for the full response.
   */
  async stream(params: StreamParams): Promise<void> {
    const resolvedModel = (params.model as ModelId | undefined) ?? (
      params.task ? selectModelForTask(params.task) : undefined
    );

    const messages: ChatMessage[] =
      params.messages ??
      buildBaseMessages(params.prompt, params.systemPrompt ?? BASE_SYSTEM_PROMPT);

    await streamFromAgentRouter({
      model: resolvedModel,
      messages,
      temperature: params.temperature,
      maxTokens: params.maxTokens,
      onToken: params.onToken,
      onDone: params.onDone,
      onError: params.onError,
    });
  }

  /**
   * Simple convenience wrapper that returns only the text content.
   * Use `generate()` when you need token counts or request IDs.
   */
  async ask(prompt: string, task?: TaskType, model?: ModelId): Promise<string> {
    const result = await this.generate({ prompt, task, model });
    return result.content;
  }
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

export const llm = new LLMService();

// Also export the class for testing / DI scenarios
export { LLMService };
