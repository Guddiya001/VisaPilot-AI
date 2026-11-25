import { cosineDistance, desc, sql, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  personas,
  domainSelectors,
  qaSemanticMemory,
  applicationsAudit,
  type FieldType,
} from '../../db/schema.ts';

export type ResolutionBadge =
  | 'GREEN_EXACT'
  | 'BLUE_VECTOR_LEARNED'
  | 'AMBER_LLM_DRAFT'
  | 'RED_MISSING_FACT'
  | 'CACHE_MISS';

export type ResolutionTier = 1 | 2 | 3;

export interface PersonaData {
  id: string;
  name: string;
  isActive: boolean;
  contactInfo: Record<string, any>;
  workHistory: any[];
  education: any[];
  skills: string[];
  demographicsEeo: Record<string, any>;
  visaWorkAuth: Record<string, any>;
  lockedFacts: Record<string, any>;
}

export interface DomainSelectorData {
  id: string;
  domain: string;
  fieldSignature: string;
  cssOrXpath: string;
  mappedProfileKey: string;
  fieldType: FieldType;
  formatMask?: string | null;
  confidence?: number;
  hitCount?: number;
}

export interface SemanticQAData {
  id: string;
  personaId?: string | null;
  category: string;
  rawQuestion: string;
  normalizedQuestion: string;
  embedding: number[];
  answerTemplate: string;
  maxCharLimit?: number | null;
  usageCount?: number;
  lastUsedAt?: Date;
}

export interface SemanticMemoryMatch extends SemanticQAData {
  similarity: number;
}

export interface ResolveFieldParams {
  domain: string;
  fieldSignature: string;
  cssOrXpath?: string;
  personaId?: string;
}

export interface ResolveQuestionParams {
  rawQuestion: string;
  queryEmbedding?: number[];
  context?: {
    companyName?: string;
    roleTitle?: string;
    yearsExp?: string | number;
    [key: string]: any;
  };
  maxLength?: number;
  personaId?: string;
}

export interface ResolutionResult {
  tier: ResolutionTier;
  badge: ResolutionBadge;
  value: string | null;
  llmCalls: number;
  fieldKey?: string;
  confidence?: number;
  similarity?: number;
  isHit?: boolean;
  source: string;
  templateId?: string;
}

/**
 * Calculates cosine similarity between two numeric vectors.
 */
export function calculateCosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Converts camelCase to UPPER_SNAKE_CASE
 */
function toUpperSnakeCase(str: string): string {
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toUpperCase();
}

/**
 * Hydrates template tokens like {{COMPANY_NAME}}, {{ROLE_TITLE}}, {{YEARS_EXP}}
 * Supports both camelCase and UPPER_SNAKE_CASE context keys.
 */
export function hydrateTemplate(
  template: string,
  context: Record<string, any> = {}
): string {
  let result = template;
  for (const [key, value] of Object.entries(context)) {
    if (value !== undefined && value !== null) {
      const snakeKey = toUpperSnakeCase(key);
      const valStr = String(value);

      // Replace {{key}}, {{KEY}}, {{snakeKey}}
      const regexExact = new RegExp(`{{\\s*${key}\\s*}}`, 'gi');
      const regexSnake = new RegExp(`{{\\s*${snakeKey}\\s*}}`, 'gi');

      result = result.replace(regexExact, valStr).replace(regexSnake, valStr);
    }
  }
  return result;
}

/**
 * Traverses nested object path e.g. "contactInfo.firstName"
 */
export function getNestedProperty(obj: any, path: string): any {
  if (!obj || !path) return undefined;
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current === undefined || current === null) return undefined;
    current = current[part];
  }
  return current;
}

/**
 * Enforces character limit on text without abruptly truncating mid-word when possible.
 */
export function enforceCharacterLimit(text: string, maxLength?: number): string {
  if (!maxLength || text.length <= maxLength) {
    return text.trim();
  }
  const slice = text.slice(0, maxLength);
  const lastSpace = slice.lastIndexOf(' ');
  if (lastSpace > maxLength * 0.7) {
    return slice.slice(0, lastSpace).trim();
  }
  return slice.trim();
}

/**
 * Store interface for TierResolver supporting both Drizzle ORM and In-Memory modes.
 */
export interface ResolverStore {
  getActivePersona(personaId?: string): Promise<PersonaData | null>;
  findDomainSelector(
    domain: string,
    fieldSignature: string
  ): Promise<DomainSelectorData | null>;
  searchSemanticMemory(
    queryEmbedding: number[],
    personaId?: string,
    threshold?: number
  ): Promise<SemanticMemoryMatch[]>;
  upsertDomainSelector(selector: DomainSelectorData): Promise<void>;
  upsertSemanticQA(qa: SemanticQAData): Promise<void>;
  insertAuditRecord(audit: any): Promise<string>;
  getAuditRecord(id: string): Promise<any>;
  findMatchingProfileKey(persona: PersonaData, value: string): string | null;
  seedPersona(persona: PersonaData): void;
  seedSelector(selector: DomainSelectorData): void;
  seedSemanticQA(qa: SemanticQAData): void;
}

/**
 * Searches a candidate profile for a value matching an input value.
 */
export function findMatchingProfileKeyInPersona(
  persona: PersonaData,
  value: string
): string | null {
  if (!persona || !value) return null;
  const target = value.trim().toLowerCase();
  if (target.length === 0) return null;

  // Search contactInfo
  if (persona.contactInfo) {
    for (const [key, val] of Object.entries(persona.contactInfo)) {
      if (typeof val === 'string' && val.trim().toLowerCase() === target) {
        return `contactInfo.${key}`;
      }
    }
  }

  // Search demographicsEeo
  if (persona.demographicsEeo) {
    for (const [key, val] of Object.entries(persona.demographicsEeo)) {
      if (typeof val === 'string' && val.trim().toLowerCase() === target) {
        return `demographicsEeo.${key}`;
      }
    }
  }

  // Search visaWorkAuth
  if (persona.visaWorkAuth) {
    for (const [key, val] of Object.entries(persona.visaWorkAuth)) {
      if (typeof val === 'string' && val.trim().toLowerCase() === target) {
        return `visaWorkAuth.${key}`;
      }
    }
  }

  return null;
}

/**
 * In-memory resolver store for fast, deterministic unit & integration tests.
 */
export function createInMemoryResolverStore(): ResolverStore {
  const personasMap = new Map<string, PersonaData>();
  const selectors: DomainSelectorData[] = [];
  const semanticQAItems: SemanticQAData[] = [];
  const auditRecords = new Map<string, any>();

  return {
    async getActivePersona(personaId?: string): Promise<PersonaData | null> {
      if (personaId && personasMap.has(personaId)) {
        return personasMap.get(personaId)!;
      }
      for (const p of personasMap.values()) {
        if (p.isActive) return p;
      }
      return personasMap.values().next().value ?? null;
    },

    async findDomainSelector(
      domain: string,
      fieldSignature: string
    ): Promise<DomainSelectorData | null> {
      const found = selectors.find(
        (s) =>
          (s.domain === domain || s.domain === '*') &&
          (s.fieldSignature === fieldSignature || s.cssOrXpath === fieldSignature)
      );
      return found ?? null;
    },

    async searchSemanticMemory(
      queryEmbedding: number[],
      personaId?: string,
      threshold: number = 0.9
    ): Promise<SemanticMemoryMatch[]> {
      const matches: SemanticMemoryMatch[] = [];

      for (const item of semanticQAItems) {
        if (personaId && item.personaId && item.personaId !== personaId) {
          continue;
        }
        const similarity = calculateCosineSimilarity(queryEmbedding, item.embedding);
        matches.push({
          ...item,
          similarity,
        });
      }

      matches.sort((a, b) => b.similarity - a.similarity);
      return matches;
    },

    async upsertDomainSelector(selector: DomainSelectorData): Promise<void> {
      const existingIdx = selectors.findIndex(
        (s) =>
          s.domain === selector.domain &&
          (s.fieldSignature === selector.fieldSignature ||
            s.cssOrXpath === selector.cssOrXpath)
      );
      if (existingIdx >= 0) {
        selectors[existingIdx] = {
          ...selectors[existingIdx],
          ...selector,
          hitCount: (selectors[existingIdx].hitCount ?? 1) + 1,
        };
      } else {
        selectors.push({
          ...selector,
          confidence: selector.confidence ?? 1.0,
          hitCount: selector.hitCount ?? 1,
        });
      }
    },

    async upsertSemanticQA(qa: SemanticQAData): Promise<void> {
      const existingIdx = semanticQAItems.findIndex(
        (item) =>
          item.normalizedQuestion === qa.normalizedQuestion ||
          item.rawQuestion.toLowerCase() === qa.rawQuestion.toLowerCase()
      );
      if (existingIdx >= 0) {
        semanticQAItems[existingIdx] = {
          ...semanticQAItems[existingIdx],
          ...qa,
          usageCount: (semanticQAItems[existingIdx].usageCount ?? 1) + 1,
          lastUsedAt: new Date(),
        };
      } else {
        semanticQAItems.push({
          ...qa,
          usageCount: qa.usageCount ?? 1,
          lastUsedAt: qa.lastUsedAt ?? new Date(),
        });
      }
    },

    async insertAuditRecord(audit: any): Promise<string> {
      const id = audit.id ?? `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const record = {
        ...audit,
        id,
        submittedAt: audit.submittedAt ?? new Date(),
      };
      auditRecords.set(id, record);
      return id;
    },

    async getAuditRecord(id: string): Promise<any> {
      return auditRecords.get(id) ?? null;
    },

    findMatchingProfileKey(persona: PersonaData, value: string): string | null {
      return findMatchingProfileKeyInPersona(persona, value);
    },

    seedPersona(persona: PersonaData) {
      personasMap.set(persona.id, persona);
    },

    seedSelector(selector: DomainSelectorData) {
      selectors.push(selector);
    },

    seedSemanticQA(qa: SemanticQAData) {
      semanticQAItems.push(qa);
    },
  };
}

/**
 * Creates Drizzle ORM backed ResolverStore using PostgreSQL + pgvector.
 */
export function createDrizzleResolverStore(db: NodePgDatabase<any>): ResolverStore {
  return {
    async getActivePersona(personaId?: string): Promise<PersonaData | null> {
      if (personaId) {
        const rows = await db
          .select()
          .from(personas)
          .where(eq(personas.id, personaId))
          .limit(1);
        return (rows[0] as unknown as PersonaData) ?? null;
      }
      const rows = await db
        .select()
        .from(personas)
        .where(eq(personas.isActive, true))
        .limit(1);
      return (rows[0] as unknown as PersonaData) ?? null;
    },

    async findDomainSelector(
      domain: string,
      fieldSignature: string
    ): Promise<DomainSelectorData | null> {
      const rows = await db
        .select()
        .from(domainSelectors)
        .where(
          sql`(${domainSelectors.domain} = ${domain} OR ${domainSelectors.domain} = '*') AND (${domainSelectors.fieldSignature} = ${fieldSignature} OR ${domainSelectors.cssOrXpath} = ${fieldSignature})`
        )
        .limit(1);
      return (rows[0] as unknown as DomainSelectorData) ?? null;
    },

    async searchSemanticMemory(
      queryEmbedding: number[],
      personaId?: string,
      threshold: number = 0.9
    ): Promise<SemanticMemoryMatch[]> {
      const distance = cosineDistance(qaSemanticMemory.embedding, queryEmbedding);
      const similaritySql = sql<number>`1 - (${distance})`;

      const query = db
        .select({
          id: qaSemanticMemory.id,
          personaId: qaSemanticMemory.personaId,
          category: qaSemanticMemory.category,
          rawQuestion: qaSemanticMemory.rawQuestion,
          normalizedQuestion: qaSemanticMemory.normalizedQuestion,
          embedding: qaSemanticMemory.embedding,
          answerTemplate: qaSemanticMemory.answerTemplate,
          maxCharLimit: qaSemanticMemory.maxCharLimit,
          usageCount: qaSemanticMemory.usageCount,
          lastUsedAt: qaSemanticMemory.lastUsedAt,
          similarity: similaritySql,
        })
        .from(qaSemanticMemory)
        .orderBy(desc(similaritySql))
        .limit(5);

      const rows = await query;
      return rows.map((r) => ({
        ...r,
        lastUsedAt: r.lastUsedAt ?? undefined,
        similarity: Number(r.similarity),
        usageCount: r.usageCount ?? undefined,
        maxCharLimit: r.maxCharLimit ?? undefined,
      }));
    },

    async upsertDomainSelector(selector: DomainSelectorData): Promise<void> {
      await db
        .insert(domainSelectors)
        .values({
          domain: selector.domain,
          fieldSignature: selector.fieldSignature,
          cssOrXpath: selector.cssOrXpath,
          mappedProfileKey: selector.mappedProfileKey,
          fieldType: (selector.fieldType as any) || 'text',
          formatMask: selector.formatMask ?? null,
          confidence: selector.confidence ?? 1.0,
          hitCount: selector.hitCount ?? 1,
        })
        .onConflictDoUpdate({
          target: [domainSelectors.domain, domainSelectors.fieldSignature],
          set: {
            cssOrXpath: selector.cssOrXpath,
            mappedProfileKey: selector.mappedProfileKey,
            fieldType: (selector.fieldType as any) || 'text',
            hitCount: sql`${domainSelectors.hitCount} + 1`,
          },
        });
    },

    async upsertSemanticQA(qa: SemanticQAData): Promise<void> {
      await db
        .insert(qaSemanticMemory)
        .values({
          personaId: qa.personaId,
          category: qa.category,
          rawQuestion: qa.rawQuestion,
          normalizedQuestion: qa.normalizedQuestion,
          answerTemplate: qa.answerTemplate,
          embedding: qa.embedding,
          maxCharLimit: qa.maxCharLimit ?? 600,
          usageCount: qa.usageCount ?? 1,
        });
    },

    async insertAuditRecord(audit: any): Promise<string> {
      const id = audit.id ?? crypto.randomUUID();
      await db.insert(applicationsAudit).values({
        id,
        personaId: audit.personaId,
        companyName: audit.companyName,
        roleTitle: audit.roleTitle,
        portalUrl: audit.portalUrl,
        domain: audit.domain,
        status: audit.status ?? 'SUBMITTED',
        resolutionStats: audit.resolutionStats,
        submittedPayload: audit.submittedPayload,
      });
      return id;
    },

    async getAuditRecord(id: string): Promise<any> {
      const rows = await db
        .select()
        .from(applicationsAudit)
        .where(eq(applicationsAudit.id, id))
        .limit(1);
      return rows[0] ?? null;
    },

    findMatchingProfileKey(persona: PersonaData, value: string): string | null {
      return findMatchingProfileKeyInPersona(persona, value);
    },

    seedPersona() {
      throw new Error('Direct seeding not supported on production Drizzle store; use DB migrations/seed scripts');
    },
    seedSelector() {
      throw new Error('Direct seeding not supported on production Drizzle store; use DB migrations/seed scripts');
    },
    seedSemanticQA() {
      throw new Error('Direct seeding not supported on production Drizzle store; use DB migrations/seed scripts');
    },
  };
}

/**
 * TierResolver: Core Zero-LLM-First Resolution Engine
 * Resolves Tier 1 (Exact Domain Selectors) and Tier 2 (Semantic Vector Memory)
 */
export class TierResolver {
  private store: ResolverStore;

  constructor(store: ResolverStore) {
    this.store = store;
  }

  /**
   * Resolves a field via Tier 1 exact domain selector mapping.
   */
  async resolveField(params: ResolveFieldParams): Promise<ResolutionResult> {
    let selector = await this.store.findDomainSelector(
      params.domain,
      params.fieldSignature
    );

    if (!selector) {
      // Heuristic fallback matching for standard ATS field patterns
      const sig = (params.fieldSignature || '').toLowerCase();
      const css = (params.cssOrXpath || '').toLowerCase();
      let matchedKey: string | null = null;

      if (sig.includes('linkedin') || css.includes('linkedin')) {
        matchedKey = 'contactInfo.linkedinUrl';
      } else if (sig.includes('github') || css.includes('github')) {
        matchedKey = 'contactInfo.githubUrl';
      } else if (
        sig.includes('first_name') ||
        sig.includes('firstname') ||
        css.includes('first_name') ||
        css.includes('firstname')
      ) {
        matchedKey = 'contactInfo.firstName';
      } else if (
        sig.includes('last_name') ||
        sig.includes('lastname') ||
        css.includes('last_name') ||
        css.includes('lastname')
      ) {
        matchedKey = 'contactInfo.lastName';
      } else if (sig.includes('email') || css.includes('email')) {
        matchedKey = 'contactInfo.email';
      } else if (sig.includes('phone') || css.includes('phone')) {
        matchedKey = 'contactInfo.phone';
      }

      if (matchedKey) {
        selector = {
          id: `heuristic-${Date.now()}`,
          domain: params.domain,
          fieldSignature: params.fieldSignature,
          cssOrXpath: params.cssOrXpath || params.fieldSignature,
          mappedProfileKey: matchedKey,
          fieldType: 'text',
          confidence: 1.0,
          hitCount: 1,
        };
      }
    }

    if (!selector) {
      return {
        tier: 1,
        badge: 'CACHE_MISS',
        value: null,
        llmCalls: 0,
        isHit: false,
        source: 'selector_rule',
      };
    }

    const persona = await this.store.getActivePersona(params.personaId);
    if (!persona) {
      return {
        tier: 1,
        badge: 'CACHE_MISS',
        value: null,
        llmCalls: 0,
        isHit: false,
        source: 'selector_rule',
      };
    }

    const resolvedVal = getNestedProperty(persona, selector.mappedProfileKey);
    if (resolvedVal === undefined || resolvedVal === null) {
      return {
        tier: 1,
        badge: 'CACHE_MISS',
        value: null,
        fieldKey: selector.mappedProfileKey,
        llmCalls: 0,
        isHit: false,
        source: 'selector_rule',
      };
    }

    return {
      tier: 1,
      badge: 'GREEN_EXACT',
      value: String(resolvedVal),
      fieldKey: selector.mappedProfileKey,
      confidence: selector.confidence ?? 1.0,
      llmCalls: 0,
      isHit: true,
      source: 'selector_rule',
    };
  }

  /**
   * Resolves a question via Tier 2 semantic vector memory (threshold >= 0.90 similarity).
   */
  async resolveQuestion(
    params: ResolveQuestionParams
  ): Promise<ResolutionResult> {
    if (!params.queryEmbedding || params.queryEmbedding.length === 0) {
      return {
        tier: 2,
        badge: 'CACHE_MISS',
        value: null,
        similarity: 0,
        llmCalls: 0,
        isHit: false,
        source: 'qa_semantic_memory',
      };
    }

    const matches = await this.store.searchSemanticMemory(
      params.queryEmbedding,
      params.personaId,
      0.9
    );

    const topMatch = matches[0];
    if (!topMatch || topMatch.similarity < 0.9) {
      return {
        tier: 2,
        badge: 'CACHE_MISS',
        value: null,
        similarity: topMatch ? topMatch.similarity : 0,
        llmCalls: 0,
        isHit: false,
        source: 'qa_semantic_memory',
      };
    }

    // Hydrate template tokens
    const context = params.context ?? {};
    let hydrated = hydrateTemplate(topMatch.answerTemplate, context);

    // Apply max length constraints
    const effectiveMax = params.maxLength ?? topMatch.maxCharLimit ?? undefined;
    hydrated = enforceCharacterLimit(hydrated, effectiveMax);

    return {
      tier: 2,
      badge: 'BLUE_VECTOR_LEARNED',
      value: hydrated,
      similarity: topMatch.similarity,
      llmCalls: 0,
      isHit: true,
      source: 'qa_semantic_memory',
      templateId: topMatch.id,
    };
  }
}
