import { config } from '@visapilot/config';
import type { IProvider } from './base';
import { AIProviderType } from './base';
import { OllamaProvider } from './ollama';
import { GroqProvider } from './groq';
import { GeminiProvider } from './gemini';

let providerInstance: IProvider | null = null;

export function getAIProvider(): IProvider {
  if (providerInstance) {
    return providerInstance;
  }

  const providerType = config.AI_PROVIDER;

  switch (providerType) {
    case AIProviderType.GROQ:
      providerInstance = new GroqProvider();
      break;
    case AIProviderType.GEMINI:
      providerInstance = new GeminiProvider();
      break;
    case AIProviderType.LOCAL:
    default:
      providerInstance = new OllamaProvider();
      break;
  }

  console.log(`[AI Provider] Initialized: ${providerInstance.name} (${providerType})`);
  return providerInstance;
}

export function resetAIProvider(): void {
  providerInstance = null;
}

export type { IProvider } from './base';
export { AIProviderType } from './base';

