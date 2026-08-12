import { config } from '@visapilot/config';
import { ollamaClient } from './client';

export class EmbeddingService {
  private model: string;
  private dimension: number;

  constructor() {
    this.model = config.OLLAMA_EMBEDDING_MODEL;
    this.dimension = 768; // nomic-embed-text outputs 768-dim vectors
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const embedding = await ollamaClient.generateEmbedding(text, this.model);
    return embedding;
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const embeddings = await Promise.all(
      texts.map((text) => this.generateEmbedding(text)),
    );
    return embeddings;
  }

  async generateJobEmbedding(job: {
    title: string;
    description: string;
    requirements: string;
    skills: string[];
    location: string;
  }): Promise<number[]> {
    const text = [
      `Job Title: ${job.title}`,
      `Description: ${job.description}`,
      `Requirements: ${job.requirements}`,
      `Skills: ${job.skills.join(', ')}`,
      `Location: ${job.location}`,
    ].join('\n');

    return this.generateEmbedding(text);
  }

  async generateResumeEmbedding(resumeContent: string): Promise<number[]> {
    return this.generateEmbedding(resumeContent);
  }

  async generateSearchQueryEmbedding(query: string): Promise<number[]> {
    return this.generateEmbedding(`search query: ${query}`);
  }

  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have same dimension');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    if (magnitude === 0) return 0;

    return dotProduct / magnitude;
  }

  async findSimilar(
    queryEmbedding: number[],
    embeddings: Array<{ id: string; vector: number[] }>,
    topK = 10,
    threshold = 0.75,
  ): Promise<Array<{ id: string; score: number }>> {
    const scored = embeddings.map((item) => ({
      id: item.id,
      score: this.cosineSimilarity(queryEmbedding, item.vector),
    }));

    return scored
      .filter((item) => item.score >= threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  async batchSimilaritySearch(
    query: string,
    embeddings: Array<{ id: string; vector: number[] }>,
    topK = 10,
    threshold = 0.75,
  ): Promise<Array<{ id: string; score: number }>> {
    const queryEmbedding = await this.generateEmbedding(query);
    return this.findSimilar(queryEmbedding, embeddings, topK, threshold);
  }

  getDimension(): number {
    return this.dimension;
  }

  getModel(): string {
    return this.model;
  }
}

export const embeddingService = new EmbeddingService();

