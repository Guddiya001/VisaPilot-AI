import {
  type ResolverStore,
  type PersonaData,
  type DomainSelectorData,
  type SemanticQAData,
  type ResolutionBadge,
} from './resolver.ts';
import { type FieldType } from '../../db/schema.ts';

export interface SubmittedField {
  fieldSignature: string;
  cssOrXpath: string;
  fieldType: FieldType;
  value: string;
  label?: string;
  question?: string;
  originalBadge?: ResolutionBadge;
  wasEditedByHuman?: boolean;
  mappedProfileKey?: string;
  category?: string;
}

export interface SubmissionPayload {
  personaId: string;
  companyName: string;
  roleTitle: string;
  domain: string;
  portalUrl: string;
  fields: SubmittedField[];
  jdRawText?: string;
  resumeVersionPath?: string;
  resolutionStats: {
    tier1Hits: number;
    tier2VectorHits: number;
    tier3LlmCalls: number;
  };
}

export interface EmbeddingService {
  generateEmbedding(text: string): Promise<number[]>;
}

/**
 * Normalizes question string for stable vector search indexing.
 */
export function normalizeQuestion(question: string): string {
  return question
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Replaces company, role, and years of experience literals with generalized tokens.
 */
export function generalizeAnswerTemplate(
  answerText: string,
  context: {
    companyName?: string;
    roleTitle?: string;
    yearsExp?: string | number;
    [key: string]: any;
  }
): string {
  let template = answerText;

  if (context.companyName) {
    const escaped = context.companyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
    template = template.replace(regex, '{{COMPANY_NAME}}');
  }

  if (context.roleTitle) {
    const escaped = context.roleTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
    template = template.replace(regex, '{{ROLE_TITLE}}');
  }

  if (context.yearsExp !== undefined && context.yearsExp !== null) {
    const expStr = String(context.yearsExp);
    const regex = new RegExp(`\\b${expStr}\\b`, 'gi');
    template = template.replace(regex, '{{YEARS_EXP}}');
  }

  return template;
}

/**
 * Default local Ollama embedding service (nomic-embed-text)
 */
export class OllamaEmbeddingService implements EmbeddingService {
  private baseUrl: string;
  private model: string;

  constructor(
    baseUrl: string = process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    model: string = process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text'
  ) {
    this.baseUrl = baseUrl;
    this.model = model;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: this.model, prompt: text }),
      });
      if (!response.ok) {
        throw new Error(`Ollama embedding error: ${response.statusText}`);
      }
      const data = (await response.json()) as { embedding: number[] };
      return data.embedding;
    } catch {
      // Deterministic fallback if Ollama server is unreachable
      const vec = new Array(768).fill(0);
      let hash = 0;
      for (let i = 0; i < text.length; i++) {
        hash = (hash << 5) - hash + text.charCodeAt(i);
        hash |= 0;
      }
      const idx = Math.abs(hash) % 768;
      vec[idx] = 1.0;
      return vec;
    }
  }
}

/**
 * ApplicationLearner: Self-Learning "Commit-on-Submit" Engine
 * Learns new DOM selectors and generalized Q&A semantic templates upon form submission.
 */
export class ApplicationLearner {
  private store: ResolverStore;
  private embeddingService: EmbeddingService;

  constructor(
    store: ResolverStore,
    embeddingService: EmbeddingService = new OllamaEmbeddingService()
  ) {
    this.store = store;
    this.embeddingService = embeddingService;
  }

  /**
   * Commits an application submission:
   * 1. Generalizes and embeds human Q&A edits into qaSemanticMemory.
   * 2. Learns and upserts newly mapped DOM selectors into domainSelectors.
   * 3. Writes an immutable audit record with tier metrics to applicationsAudit.
   */
  async commitOnSubmit(submission: SubmissionPayload): Promise<string> {
    const persona = await this.store.getActivePersona(submission.personaId);

    for (const field of submission.fields) {
      // 1. Learn Q&A semantic templates
      if (
        field.question &&
        field.value &&
        (field.wasEditedByHuman ||
          field.originalBadge === 'AMBER_LLM_DRAFT' ||
          field.originalBadge === 'CACHE_MISS' ||
          field.value.length > 20)
      ) {
        const generalizedTemplate = generalizeAnswerTemplate(field.value, {
          companyName: submission.companyName,
          roleTitle: submission.roleTitle,
        });

        const normQ = normalizeQuestion(field.question);
        const embedding = await this.embeddingService.generateEmbedding(
          field.question
        );

        const qaRecord: SemanticQAData = {
          id: `qa-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          personaId: submission.personaId,
          category: field.category ?? 'general',
          rawQuestion: field.question,
          normalizedQuestion: normQ,
          embedding,
          answerTemplate: generalizedTemplate,
          maxCharLimit: 1000,
          usageCount: 1,
          lastUsedAt: new Date(),
        };

        await this.store.upsertSemanticQA(qaRecord);
      }

      // 2. Learn new DOM selectors
      if (persona) {
        let mappedKey = field.mappedProfileKey;
        if (!mappedKey && field.value) {
          mappedKey = this.store.findMatchingProfileKey(persona, field.value) ?? undefined;
        }

        if (mappedKey) {
          const selectorData: DomainSelectorData = {
            id: `sel-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            domain: submission.domain,
            fieldSignature: field.fieldSignature,
            cssOrXpath: field.cssOrXpath,
            mappedProfileKey: mappedKey,
            fieldType: field.fieldType ?? 'text',
            confidence: 1.0,
            hitCount: 1,
          };

          await this.store.upsertDomainSelector(selectorData);
        }
      }
    }

    // 3. Insert immutable applicationsAudit record
    const auditRecord = {
      personaId: submission.personaId,
      companyName: submission.companyName,
      roleTitle: submission.roleTitle,
      portalUrl: submission.portalUrl,
      domain: submission.domain,
      jdRawText: submission.jdRawText ?? null,
      resumeVersionPath: submission.resumeVersionPath ?? null,
      submittedPayload: submission.fields,
      resolutionStats: submission.resolutionStats,
      status: 'SUBMITTED',
      submittedAt: new Date(),
    };

    const auditId = await this.store.insertAuditRecord(auditRecord);
    return auditId;
  }
}
