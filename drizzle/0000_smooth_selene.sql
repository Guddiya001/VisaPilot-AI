CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "applications_audit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"persona_id" uuid,
	"company_name" text NOT NULL,
	"role_title" text NOT NULL,
	"portal_url" text NOT NULL,
	"domain" text NOT NULL,
	"jd_raw_text" text,
	"resume_version_path" text,
	"submitted_payload" jsonb NOT NULL,
	"resolution_stats" jsonb NOT NULL,
	"status" text DEFAULT 'SUBMITTED',
	"submitted_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "domain_selectors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"domain" text NOT NULL,
	"field_signature" text NOT NULL,
	"css_or_xpath" text NOT NULL,
	"mapped_profile_key" text NOT NULL,
	"field_type" text NOT NULL,
	"format_mask" text,
	"confidence" real DEFAULT 1,
	"hit_count" integer DEFAULT 1
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "personas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT false,
	"contact_info" jsonb NOT NULL,
	"work_history" jsonb NOT NULL,
	"education" jsonb NOT NULL,
	"skills" jsonb NOT NULL,
	"demographics_eeo" jsonb NOT NULL,
	"visa_work_auth" jsonb NOT NULL,
	"locked_facts" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "qa_semantic_memory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"persona_id" uuid,
	"category" text NOT NULL,
	"raw_question" text NOT NULL,
	"normalized_question" text NOT NULL,
	"embedding" vector(768) NOT NULL,
	"answer_template" text NOT NULL,
	"max_char_limit" integer,
	"usage_count" integer DEFAULT 1,
	"last_used_at" timestamp DEFAULT now()
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "applications_audit" ADD CONSTRAINT "applications_audit_persona_id_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."personas"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "qa_semantic_memory" ADD CONSTRAINT "qa_semantic_memory_persona_id_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."personas"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "qa_embedding_hnsw_idx" ON "qa_semantic_memory" USING hnsw ("embedding" vector_cosine_ops);
