import { ollamaClient } from './ollama/client';
import { embeddingService } from './ollama/embeddings';
import type { IAIService, AICompletionOptions } from '@visapilot/shared';
import type { CompletionOptions } from './providers/base';
import { config } from '@visapilot/config';

export class AIService implements IAIService {
  async generateEmbedding(text: string): Promise<number[]> {
    return embeddingService.generateEmbedding(text);
  }

  async generateCompletion(
    prompt: string,
    options: AICompletionOptions = {},
  ): Promise<string> {
    return ollamaClient.generateCompletion(prompt, {
      model: options.model || config.OLLAMA_MODEL,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      topP: options.topP,
      frequencyPenalty: options.frequencyPenalty,
      presencePenalty: options.presencePenalty,
      stop: options.stop,
    });
  }

  async generateChatCompletion(
    messages: Array<{ role: string; content: string }>,
    options: AICompletionOptions = {},
  ): Promise<string> {
    return ollamaClient.generateChat(messages, {
      model: options.model || config.OLLAMA_MODEL,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      topP: options.topP,
      frequencyPenalty: options.frequencyPenalty,
      presencePenalty: options.presencePenalty,
      stop: options.stop,
    });
  }

  async analyzeSentiment(text: string): Promise<number> {
    const prompt = `Analyze the sentiment of the following text. Return ONLY a number between -1 (extremely negative) and 1 (extremely positive). Do not include any explanation or additional text.

Text: ${text}

Sentiment score:`;

    const response = await this.generateCompletion(prompt, {
      temperature: 0.1,
      maxTokens: 10,
    });

    try {
      const score = parseFloat(response.trim());
      return Math.max(-1, Math.min(1, isNaN(score) ? 0 : score));
    } catch {
      return 0;
    }
  }

  async extractEntities(text: string): Promise<Record<string, unknown>> {
    const prompt = `Extract the following entities from the text below and return them as a JSON object:
- skills: array of technical and soft skills mentioned
- locations: array of locations mentioned
- companies: array of company names mentioned
- jobTitles: array of job titles mentioned
- education: array of education mentions (degrees, institutions)
- certifications: array of certifications mentioned
- languages: array of languages mentioned
- experience_years: number of years of experience (if mentioned)

Text: ${text}

Return ONLY valid JSON without any additional text:`;

    const response = await this.generateCompletion(prompt, {
      temperature: 0.1,
      maxTokens: 1000,
    });

    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as Record<string, unknown>;
      }
      return JSON.parse(response) as Record<string, unknown>;
    } catch {
      return {
        skills: [],
        locations: [],
        companies: [],
        jobTitles: [],
        education: [],
        certifications: [],
        languages: [],
      };
    }
  }

  async healthCheck(): Promise<{
    available: boolean;
    modelLoaded: boolean;
    models: string[];
  }> {
    return ollamaClient.healthCheck();
  }
}

export const aiService = new AIService();

