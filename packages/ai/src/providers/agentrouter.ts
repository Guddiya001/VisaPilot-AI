/**
 * AgentRouter provider — implements the existing IProvider interface.
 *
 * This adapter makes AgentRouter a drop-in replacement for the existing
 * Groq/Gemini/Ollama providers. The rest of the application continues using
 * AIService → IProvider without knowing the underlying provider.
 *
 * Note: generateEmbedding() is NOT supported by AgentRouter.
 *       The existing Ollama embedding service is unaffected.
 */

import type {
  IProvider,
  CompletionOptions,
  ChatMessage,
  CompletionResponse,
  EmbeddingResponse,
} from './base';
import { AIProviderType } from './base';
import { llm } from '../ai/llm-service';
import { MODELS, FALLBACK_CHAIN } from '../ai/models';
import { getApiKey, AGENTROUTER_BASE_URL } from '../ai/config';

export class AgentRouterProvider implements IProvider {
  readonly name = 'AgentRouter';
  readonly type = AIProviderType.AGENTROUTER;

  constructor() {
    // Validate key at construction time so misconfiguration is caught early
    // during provider initialization (not buried in a later request).
    getApiKey();
  }

  async generateCompletion(
    prompt: string,
    options: CompletionOptions = {},
  ): Promise<CompletionResponse> {
    return this.generateChatCompletion(
      [{ role: 'user' as const, content: prompt }],
      options,
    );
  }

  async generateChatCompletion(
    messages: ChatMessage[],
    options: CompletionOptions = {},
  ): Promise<CompletionResponse> {
    const result = await llm.generate({
      messages: messages as Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
      model: options.model as typeof MODELS[keyof typeof MODELS] | undefined,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
    });

    return {
      response: result.content,
      model: result.model,
      usage: result.usage
        ? {
            promptTokens: result.usage.inputTokens,
            completionTokens: result.usage.outputTokens,
            totalTokens: result.usage.totalTokens,
          }
        : undefined,
    };
  }

  /**
   * AgentRouter does not provide an embedding API.
   * Embeddings remain handled by the Ollama service.
   */
  async generateEmbedding(_text: string, _model?: string): Promise<EmbeddingResponse> {
    throw new Error(
      '[AgentRouterProvider] Embedding generation is not supported by AgentRouter. ' +
        'Use the Ollama embedding service for RAG/vector operations.',
    );
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Lightweight HEAD request to the AgentRouter base URL
      const response = await fetch(AGENTROUTER_BASE_URL, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000),
      });
      return response.ok || response.status === 405; // 405 = endpoint exists, method not allowed
    } catch {
      return false;
    }
  }

  async listModels(): Promise<string[]> {
    // Return the statically configured AgentRouter models
    return [...FALLBACK_CHAIN];
  }

  async healthCheck(): Promise<{
    available: boolean;
    modelLoaded: boolean;
    models: string[];
  }> {
    const available = await this.isAvailable();
    const models = await this.listModels();
    return {
      available,
      modelLoaded: available, // Models are always "loaded" for cloud APIs
      models,
    };
  }
}
