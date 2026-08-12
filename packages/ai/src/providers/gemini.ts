import { config } from '@visapilot/config';
import type { IProvider, CompletionOptions, ChatMessage, CompletionResponse, EmbeddingResponse } from './base';
import { AIProviderType } from './base';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

export class GeminiProvider implements IProvider {
  readonly name = 'Gemini';
  readonly type = AIProviderType.GEMINI;

  private apiKey: string;
  private defaultModel: string;
  private embeddingModel: string;
  private timeout: number;

  constructor() {
    if (!config.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is required when AI_PROVIDER is set to "gemini"');
    }
    this.apiKey = config.GEMINI_API_KEY;
    this.defaultModel = 'gemini-2.0-flash';
    this.embeddingModel = 'text-embedding-004';
    this.timeout = 30000;
  }

  private async request<T>(
    endpoint: string,
    body: Record<string, unknown>,
  ): Promise<T> {
    const url = `${GEMINI_API_BASE}/${endpoint}?key=${this.apiKey}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error (${response.status}): ${errorText}`);
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Gemini request timed out after ${this.timeout}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async generateCompletion(
    prompt: string,
    options: CompletionOptions = {},
  ): Promise<CompletionResponse> {
    const model = options.model || this.defaultModel;
    const response = await this.request<{
      candidates: Array<{
        content: { parts: Array<{ text: string }> };
        finishReason: string;
      }>;
      usageMetadata?: {
        promptTokenCount: number;
        candidatesTokenCount: number;
        totalTokenCount: number;
      };
    }>(`models/${model}:generateContent`, {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens ?? 2048,
        topP: options.topP ?? 0.9,
        frequencyPenalty: options.frequencyPenalty ?? 0,
        presencePenalty: options.presencePenalty ?? 0,
        stopSequences: options.stop,
      },
    });

    return {
      response: response.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '',
      model,
      usage: response.usageMetadata
        ? {
            promptTokens: response.usageMetadata.promptTokenCount,
            completionTokens: response.usageMetadata.candidatesTokenCount,
            totalTokens: response.usageMetadata.totalTokenCount,
          }
        : undefined,
    };
  }

  async generateChatCompletion(
    messages: ChatMessage[],
    options: CompletionOptions = {},
  ): Promise<CompletionResponse> {
    const model = options.model || this.defaultModel;

    // Convert ChatMessage format to Gemini's format
    const contents = messages.map((msg) => ({
      role: msg.role === 'assistant' ? 'model' as const : 'user' as const,
      parts: [{ text: msg.content }],
    }));

    const response = await this.request<{
      candidates: Array<{
        content: { parts: Array<{ text: string }> };
        finishReason: string;
      }>;
      usageMetadata?: {
        promptTokenCount: number;
        candidatesTokenCount: number;
        totalTokenCount: number;
      };
    }>(`models/${model}:generateContent`, {
      contents,
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens ?? 2048,
        topP: options.topP ?? 0.9,
        frequencyPenalty: options.frequencyPenalty ?? 0,
        presencePenalty: options.presencePenalty ?? 0,
        stopSequences: options.stop,
      },
    });

    return {
      response: response.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '',
      model,
      usage: response.usageMetadata
        ? {
            promptTokens: response.usageMetadata.promptTokenCount,
            completionTokens: response.usageMetadata.candidatesTokenCount,
            totalTokens: response.usageMetadata.totalTokenCount,
          }
        : undefined,
    };
  }

  async generateEmbedding(text: string, model?: string): Promise<EmbeddingResponse> {
    const embeddingModel = model || this.embeddingModel;
    const response = await this.request<{
      embedding: {
        values: number[];
      };
    }>(`models/${embeddingModel}:embedContent`, {
      content: { parts: [{ text }] },
    });

    return {
      embedding: response.embedding?.values || [],
      model: embeddingModel,
    };
  }

  async isAvailable(): Promise<boolean> {
    try {
      const url = `${GEMINI_API_BASE}/models?key=${this.apiKey}`;
      const response = await fetch(url, {
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<string[]> {
    const url = `${GEMINI_API_BASE}/models?key=${this.apiKey}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to list Gemini models: ${response.statusText}`);
    }
    const data = (await response.json()) as { models: Array<{ name: string }> };
    return data.models.map((m) => m.name.replace('models/', ''));
  }

  async healthCheck(): Promise<{
    available: boolean;
    modelLoaded: boolean;
    models: string[];
  }> {
    const available = await this.isAvailable();
    if (!available) {
      return { available: false, modelLoaded: false, models: [] };
    }

    const models = await this.listModels();
    const modelLoaded = models.some((m) => m.includes('gemini'));

    return { available, modelLoaded, models };
  }
}

