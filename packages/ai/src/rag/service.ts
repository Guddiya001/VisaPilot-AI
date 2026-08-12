import { embeddingService } from '../ollama/embeddings';
import type { RAGDocument, AgentContext } from '../types';
import { RAG_SIMILARITY_THRESHOLD, RAG_MAX_RESULTS } from '@visapilot/shared';

interface IndexEntry {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
  embedding: number[];
  resourceType: string;
  resourceId: string;
}

export class RAGService {
  private index: Map<string, IndexEntry> = new Map();
  private maxResults: number;

  constructor() {
    this.maxResults = RAG_MAX_RESULTS;
  }

  async indexDocument(
    resourceType: string,
    resourceId: string,
    content: string,
    metadata: Record<string, unknown> = {},
  ): Promise<void> {
    const embedding = await embeddingService.generateEmbedding(content);
    const id = `${resourceType}:${resourceId}`;

    this.index.set(id, {
      id,
      content,
      metadata,
      embedding,
      resourceType,
      resourceId,
    });
  }

  async search(
    query: string,
    options: {
      resourceType?: string;
      maxResults?: number;
      similarityThreshold?: number;
      filters?: Record<string, unknown>;
    } = {},
  ): Promise<RAGDocument[]> {
    const queryEmbedding = await embeddingService.generateEmbedding(query);
    const threshold = options.similarityThreshold ?? 0.75;
    const maxResults = options.maxResults ?? this.maxResults;

    const results: Array<{ entry: IndexEntry; score: number }> = [];

    for (const [, entry] of this.index) {
      // Filter by resource type
      if (options.resourceType && entry.resourceType !== options.resourceType) {
        continue;
      }

      // Apply custom filters
      if (options.filters) {
        let matchesFilter = true;
        for (const [key, value] of Object.entries(options.filters)) {
          if (entry.metadata[key] !== value) {
            matchesFilter = false;
            break;
          }
        }
        if (!matchesFilter) continue;
      }

      const score = embeddingService.cosineSimilarity(queryEmbedding, entry.embedding);

      if (score >= threshold) {
        results.push({ entry, score });
      }
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults)
      .map((r) => ({
        id: r.entry.id,
        content: r.entry.content,
        metadata: r.entry.metadata,
        score: r.score,
      }));
  }

  async deleteIndex(resourceType: string, resourceId: string): Promise<void> {
    const id = `${resourceType}:${resourceId}`;
    this.index.delete(id);
  }

  async reindex(
    resourceType: string,
    resourceId: string,
    content: string,
    metadata: Record<string, unknown> = {},
  ): Promise<void> {
    await this.deleteIndex(resourceType, resourceId);
    await this.indexDocument(resourceType, resourceId, content, metadata);
  }

  async augmentPrompt(
    query: string,
    context: AgentContext,
    maxResults = 5,
  ): Promise<string> {
    const results = await this.search(query, {
      maxResults,
      similarityThreshold: 0.7,
    });

    if (results.length === 0) {
      return '';
    }

    const contextStr = results
      .map(
        (r) =>
          `[${r.metadata.resourceType || 'Unknown'}] (relevance: ${(r.score * 100).toFixed(0)}%): ${r.content}`,
      )
      .join('\n\n---\n\n');

    return `\n\nRelevant context from knowledge base:\n${contextStr}\n`;
  }

  async searchJobs(query: string): Promise<RAGDocument[]> {
    return this.search(query, {
      resourceType: 'JOB',
      maxResults: 10,
    });
  }

  async searchCompanies(query: string): Promise<RAGDocument[]> {
    return this.search(query, {
      resourceType: 'COMPANY',
      maxResults: 10,
    });
  }

  async searchResumes(query: string): Promise<RAGDocument[]> {
    return this.search(query, {
      resourceType: 'RESUME',
      maxResults: 10,
    });
  }

  getIndexStats(): {
    totalDocuments: number;
    byType: Record<string, number>;
  } {
    const byType: Record<string, number> = {};

    for (const [, entry] of this.index) {
      byType[entry.resourceType] = (byType[entry.resourceType] || 0) + 1;
    }

    return {
      totalDocuments: this.index.size,
      byType,
    };
  }

  clearIndex(): void {
    this.index.clear();
  }
}

export const ragService = new RAGService();

