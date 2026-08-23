import { config } from '@visapilot/config';
import { getAIProvider } from '../providers';
import type { CompletionOptions, ChatMessage } from '../providers/base';
import { AIProviderType } from '../providers/base';

// Provider-agnostic client that delegates to the configured AI provider
class AIClient {
  async generateCompletion(
    prompt: string,
    options: CompletionOptions = {},
  ): Promise<string> {
    const provider = getAIProvider();
    // Only default to OLLAMA_MODEL when no model is specified AND using the local provider
    const model = options.model ||
      (provider.type === AIProviderType.LOCAL ? config.OLLAMA_MODEL : undefined);
    const response = await provider.generateCompletion(prompt, {
      ...options,
      model,
    });
    return response.response;
  }

  async generateChat(
    messages: Array<{ role: string; content: string }>,
    options: CompletionOptions = {},
  ): Promise<string> {
    const provider = getAIProvider();
    const chatMessages: ChatMessage[] = messages.map((m) => ({
      role: m.role as ChatMessage['role'],
      content: m.content,
    }));
    // Only default to OLLAMA_MODEL when no model is specified AND using the local provider
    const model = options.model ||
      (provider.type === AIProviderType.LOCAL ? config.OLLAMA_MODEL : undefined);
    const response = await provider.generateChatCompletion(chatMessages, {
      ...options,
      model,
    });
    console.log('Chat response ------------------------:            ', response);
    return response.response;
  }

  async generateEmbedding(text: string, model?: string): Promise<number[]> {
    const provider = getAIProvider();
    const response = await provider.generateEmbedding(text, model || config.OLLAMA_EMBEDDING_MODEL);
    return response.embedding;
  }

  async pullModel(model: string): Promise<void> {
    // Only relevant for Ollama; other providers handle model availability automatically
    try {
      const { OllamaProvider } = await import('../providers/ollama');
      const ollama = new OllamaProvider();
      await ollama.pullModel(model);
    } catch {
      throw new Error('Model pull not supported by the current AI provider');
    }
  }

  async listModels(): Promise<string[]> {
    const provider = getAIProvider();
    return provider.listModels();
  }

  async isAvailable(): Promise<boolean> {
    const provider = getAIProvider();
    return provider.isAvailable();
  }

  async healthCheck(): Promise<{
    available: boolean;
    modelLoaded: boolean;
    models: string[];
  }> {
    const provider = getAIProvider();
    return provider.healthCheck();
  }
}

export const ollamaClient = new AIClient();

