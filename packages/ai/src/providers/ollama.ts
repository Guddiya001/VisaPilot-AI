import { config } from '@visapilot/config';
import type { IProvider, CompletionOptions, ChatMessage, CompletionResponse, EmbeddingResponse } from './base';
import { AIProviderType } from './base';

export class OllamaProvider implements IProvider {
  readonly name = 'Ollama';
  readonly type = AIProviderType.LOCAL;

  private baseUrl: string;
  private defaultModel: string;
  private embeddingModel: string;
  private timeout: number;

  constructor() {
    this.baseUrl = config.OLLAMA_BASE_URL;
    this.defaultModel = config.OLLAMA_MODEL;
    this.embeddingModel = config.OLLAMA_EMBEDDING_MODEL;
    this.timeout = config.OLLAMA_REQUEST_TIMEOUT;
  }

  private async request<T>(
    endpoint: string,
    body: Record<string, unknown>,
  ): Promise<T> {
    const url = `${this.baseUrl}/api/${endpoint}`;
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
        throw new Error(`Ollama API error (${response.status}): ${errorText}`);
      }

      if (endpoint === 'generate') {
        const text = await response.text();
        const lines = text.trim().split('\n');
        const responses = lines.map((line) => JSON.parse(line));
        const fullResponse = responses.reduce(
          (acc: Record<string, unknown>, curr: Record<string, unknown>) => ({
            ...curr,
            response: ((acc.response as string) || '') + ((curr.response as string) || ''),
          }),
          {} as Record<string, unknown>,
        );
        return fullResponse as unknown as T;
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Ollama request timed out after ${this.timeout}ms`);
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
    const response = await this.request<{ response: string; model: string }>('generate', {
      model: options.model || this.defaultModel,
      prompt,
      stream: false,
      options: {
        temperature: options.temperature ?? 0.7,
        num_predict: options.maxTokens ?? 2048,
        top_p: options.topP ?? 0.9,
        frequency_penalty: options.frequencyPenalty ?? 0,
        presence_penalty: options.presencePenalty ?? 0,
        stop: options.stop,
      },
    });

    return {
      response: response.response.trim(),
      model: response.model,
    };
  }

  async generateChatCompletion(
    messages: ChatMessage[],
    options: CompletionOptions = {},
  ): Promise<CompletionResponse> {
    const response = await this.request<{ response: string; model: string }>('chat', {
      model: options.model || this.defaultModel,
      messages,
      stream: false,
      options: {
        temperature: options.temperature ?? 0.7,
        num_predict: options.maxTokens ?? 2048,
        top_p: options.topP ?? 0.9,
        frequency_penalty: options.frequencyPenalty ?? 0,
        presence_penalty: options.presencePenalty ?? 0,
        stop: options.stop,
      },
    });

    return {
      response: response.response.trim(),
      model: response.model,
    };
  }

  async generateEmbedding(text: string, model?: string): Promise<EmbeddingResponse> {
    const response = await this.request<{ embedding: number[] }>('embeddings', {
      model: model || this.embeddingModel,
      prompt: text,
    });

    return {
      embedding: response.embedding,
      model: model || this.embeddingModel,
    };
  }

  async pullModel(model: string): Promise<void> {
    const url = `${this.baseUrl}/api/pull`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: model, stream: false }),
    });

    if (!response.ok) {
      throw new Error(`Failed to pull model ${model}: ${response.statusText}`);
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/api/tags`;
      const response = await fetch(url, {
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<string[]> {
    const url = `${this.baseUrl}/api/tags`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to list models: ${response.statusText}`);
    }
    const data = (await response.json()) as { models: Array<{ name: string }> };
    return data.models.map((m) => m.name);
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
    const modelLoaded = models.some(
      (m) => m.includes(this.defaultModel) || m.includes(this.embeddingModel),
    );

    return { available, modelLoaded, models };
  }
}

