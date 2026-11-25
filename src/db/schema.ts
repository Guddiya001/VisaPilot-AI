import {
  pgTable,
  uuid,
  text,
  boolean,
  jsonb,
  real,
  integer,
  timestamp,
  vector,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/**
 * Field type constraint for domain selectors
 */
export type FieldType =
  | 'text'
  | 'select'
  | 'combobox'
  | 'radio'
  | 'checkbox'
  | 'file'
  | 'repeater_add_btn';

/**
 * Personas Table
 * Stores candidate profile details and immutable locked facts.
 */
export const personas = pgTable('personas', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  isActive: boolean('is_active').default(false),
  contactInfo: jsonb('contact_info').notNull(),
  workHistory: jsonb('work_history').notNull(),
  education: jsonb('education').notNull(),
  skills: jsonb('skills').notNull(),
  demographicsEeo: jsonb('demographics_eeo').notNull(),
  visaWorkAuth: jsonb('visa_work_auth').notNull(),
  lockedFacts: jsonb('locked_facts').notNull(),
});

/**
 * Domain Selectors Table
 * Maps ATS domain elements and signatures to candidate profile fields.
 */
export const domainSelectors = pgTable('domain_selectors', {
  id: uuid('id').primaryKey().defaultRandom(),
  domain: text('domain').notNull(),
  fieldSignature: text('field_signature').notNull(),
  cssOrXpath: text('css_or_xpath').notNull(),
  mappedProfileKey: text('mapped_profile_key').notNull(),
  fieldType: text('field_type').$type<FieldType>().notNull(),
  formatMask: text('format_mask'),
  confidence: real('confidence').default(1.0),
  hitCount: integer('hit_count').default(1),
});

/**
 * QA Semantic Memory Table
 * Stores vectorized Q&A patterns and reusable answer templates with HNSW indexing.
 */
export const qaSemanticMemory = pgTable(
  'qa_semantic_memory',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    personaId: uuid('persona_id').references(() => personas.id),
    category: text('category').notNull(),
    rawQuestion: text('raw_question').notNull(),
    normalizedQuestion: text('normalized_question').notNull(),
    embedding: vector('embedding', { dimensions: 768 }).notNull(),
    answerTemplate: text('answer_template').notNull(),
    maxCharLimit: integer('max_char_limit'),
    usageCount: integer('usage_count').default(1),
    lastUsedAt: timestamp('last_used_at').defaultNow(),
  },
  (table) => [
    index('qa_embedding_hnsw_idx').using(
      'hnsw',
      table.embedding.op('vector_cosine_ops')
    ),
  ]
);

/**
 * Applications Audit Table
 * Immutable audit logs of submitted job applications and tier resolution metrics.
 */
export const applicationsAudit = pgTable('applications_audit', {
  id: uuid('id').primaryKey().defaultRandom(),
  personaId: uuid('persona_id').references(() => personas.id),
  companyName: text('company_name').notNull(),
  roleTitle: text('role_title').notNull(),
  portalUrl: text('portal_url').notNull(),
  domain: text('domain').notNull(),
  jdRawText: text('jd_raw_text'),
  resumeVersionPath: text('resume_version_path'),
  submittedPayload: jsonb('submitted_payload').notNull(),
  resolutionStats: jsonb('resolution_stats').notNull(),
  status: text('status').default('SUBMITTED'),
  submittedAt: timestamp('submitted_at').defaultNow(),
});

export type Persona = typeof personas.$inferSelect;
export type NewPersona = typeof personas.$inferInsert;

export type DomainSelector = typeof domainSelectors.$inferSelect;
export type NewDomainSelector = typeof domainSelectors.$inferInsert;

export type QASemanticMemory = typeof qaSemanticMemory.$inferSelect;
export type NewQASemanticMemory = typeof qaSemanticMemory.$inferInsert;

export type ApplicationAudit = typeof applicationsAudit.$inferSelect;
export type NewApplicationAudit = typeof applicationsAudit.$inferInsert;
