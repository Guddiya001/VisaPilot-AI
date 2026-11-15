export const AIProviderType = {
  LOCAL: 'local',
  GROQ: 'groq',
  GEMINI: 'gemini',
  AGENTROUTER: 'agentrouter',
} as const;

/* eslint-disable-next-line no-redeclare */
export type AIProviderType = (typeof AIProviderType)[keyof typeof AIProviderType];

export interface CompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
  responseSchema?: Record<string, unknown>;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CompletionResponse {
  response: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface EmbeddingResponse {
  embedding: number[];
  model: string;
  usage?: {
    promptTokens: number;
    totalTokens: number;
  };
}

export interface IProvider {
  readonly name: string;
  readonly type: AIProviderType;

  generateCompletion(
    prompt: string,
    options?: CompletionOptions,
  ): Promise<CompletionResponse>;

  generateChatCompletion(
    messages: ChatMessage[],
    options?: CompletionOptions,
  ): Promise<CompletionResponse>;

  generateEmbedding(text: string, model?: string): Promise<EmbeddingResponse>;

  isAvailable(): Promise<boolean>;

  listModels(): Promise<string[]>;

  healthCheck(): Promise<{
    available: boolean;
    modelLoaded: boolean;
    models: string[];
  }>;
}

