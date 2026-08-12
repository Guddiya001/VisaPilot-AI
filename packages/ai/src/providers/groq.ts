import { config } from '@visapilot/config';
import type { IProvider, CompletionOptions, ChatMessage, CompletionResponse, EmbeddingResponse } from './base';
import { AIProviderType } from './base';

const GROQ_API_BASE = 'https://api.groq.com/openai/v1';

export class GroqProvider implements IProvider {
  readonly name = 'Groq';
  readonly type = AIProviderType.GROQ;

  private apiKey: string;
  private defaultModel: string;
  private timeout: number;

  constructor() {
    if (!config.GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY is required when AI_PROVIDER is set to "groq"');
    }
    this.apiKey = config.GROQ_API_KEY;
    this.defaultModel = 'llama-3.3-70b-versatile';
    this.timeout = 30000;
  }

  private async request<T>(
    endpoint: string,
    body: Record<string, unknown>,
  ): Promise<T> {
    const url = `${GROQ_API_BASE}/${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Groq API error (${response.status}): ${errorText}`);
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Groq request timed out after ${this.timeout}ms`);
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
    const messages: ChatMessage[] = [
      { role: 'user' as const, content: prompt },
    ];
    return this.generateChatCompletion(messages, options);
  }

  async generateChatCompletion(
    messages: ChatMessage[],
    options: CompletionOptions = {},
  ): Promise<CompletionResponse> {
    const response = await this.request<{
      id: string;
      model: string;
      choices: Array<{
        message: { content: string };
        finish_reason: string;
      }>;
      usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    }>('chat/completions', {
      model: options.model || this.defaultModel,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2048,
      top_p: options.topP ?? 0.9,
      frequency_penalty: options.frequencyPenalty ?? 0,
      presence_penalty: options.presencePenalty ?? 0,
      stop: options.stop,
    });

    return {
      response: response.choices[0]?.message?.content?.trim() || '',
      model: response.model,
      usage: {
        promptTokens: response.usage?.prompt_tokens ?? 0,
        completionTokens: response.usage?.completion_tokens ?? 0,
        totalTokens: response.usage?.total_tokens ?? 0,
      },
    };
  }

  async generateEmbedding(text: string, model?: string): Promise<EmbeddingResponse> {
    // Groq doesn't support embeddings natively; use a text-embedding-3-small via the OpenAI-compatible endpoint
    const response = await this.request<{
      data: Array<{ embedding: number[] }>;
      model: string;
      usage: { prompt_tokens: number; total_tokens: number };
    }>('embeddings', {
      model: model || 'text-embedding-3-small',
      input: text,
    });

    return {
      embedding: response.data[0]?.embedding || [],
      model: response.model,
      usage: {
        promptTokens: response.usage?.prompt_tokens ?? 0,
        totalTokens: response.usage?.total_tokens ?? 0,
      },
    };
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${GROQ_API_BASE}/models`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<string[]> {
    const response = await fetch(`${GROQ_API_BASE}/models`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    if (!response.ok) {
      throw new Error(`Failed to list Groq models: ${response.statusText}`);
    }
    const data = (await response.json()) as { data: Array<{ id: string }> };
    return data.data.map((m) => m.id);
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
    const modelLoaded = models.some((m) => m.includes('llama'));

    return { available, modelLoaded, models };
  }
}

