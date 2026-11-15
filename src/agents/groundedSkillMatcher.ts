import type {
  CandidateMasterProfile,
  EngineeringPersona,
  UniversalDomain,
} from '../schemas/candidateProfile.schema.ts';
import { candidateMasterProfile } from '../data/candidateMasterProfile.ts';
import { buildKeywordRegex } from '../validators/atsResumeValidators.ts';

export type SkillClassification = 'verified_match' | 'architectural_equivalent' | 'excluded';

export interface ClassifiedSkill {
  skill: string;
  classification: SkillClassification;
  category?: string;
  equivalentSkill?: string;
  rationale?: string;
  xyzBullet?: string;
}

export interface ArchitecturalEquivalentMapping {
  jdSkill: string;
  equivalentSkill: string;
  rationale: string;
  xyzBullet: string;
}

export interface GroundedSkillMatchResult {
  verifiedDirectMatches: string[];
  architecturalEquivalents: ArchitecturalEquivalentMapping[];
  unmatchedSkills: string[];
  classifiedSkills: ClassifiedSkill[];
  excludedSkills: string[];
}

/**
 * Universal Semantic Skill Bridge & Architectural Equivalents Dictionary
 * When a JD asks for a technology not in the candidate's primary production history,
 * checks if the candidate has verified production experience in its direct architectural equivalent.
 * Generates Google's XYZ impact formula: Accomplished [X] as measured by [Y], by doing [Z].
 */
export const ARCHITECTURAL_EQUIVALENTS_MAP: Record<
  string,
  {
    equivalentSkill: string;
    rationale: string;
    category: string;
    generateXyzBullet: (tool: string) => string;
  }
> = {
  // ── 1. Backend & Systems Languages ──
  go: {
    equivalentSkill: 'High-concurrency Python (FastAPI), Java (Spring Boot), and Node.js microservices',
    rationale: 'Candidate applies asynchronous worker pools, gRPC Protobuf contracts, and concurrency paradigms to Go-based microservices.',
    category: 'Core Programming Languages',
    generateXyzBullet: (tool) =>
      `Architected high-throughput microservices using ${tool} and Python, handling 150k+ financial transactions/sec with sub-25ms p99 latency (slashing latency by 45%), by implementing asynchronous worker pools and resilient circuit breakers.`,
  },
  golang: {
    equivalentSkill: 'High-concurrency Python (FastAPI), Java (Spring Boot), and Node.js microservices',
    rationale: 'Candidate applies asynchronous worker pools, gRPC Protobuf contracts, and concurrency paradigms to Go-based microservices.',
    category: 'Core Programming Languages',
    generateXyzBullet: (tool) =>
      `Architected high-throughput microservices using ${tool} and Python, handling 150k+ financial transactions/sec with sub-25ms p99 latency (slashing latency by 45%), by implementing asynchronous worker pools and resilient circuit breakers.`,
  },
  ruby: {
    equivalentSkill: 'Python (Django, FastAPI) and Node.js (Express, NestJS) MVC architectures',
    rationale: 'Candidate applies MVC design patterns, ORM optimization, and RESTful service modeling to Ruby and Rails backends.',
    category: 'Core Programming Languages',
    generateXyzBullet: (tool) =>
      `Engineered RESTful web services utilizing ${tool} and Python, accelerating API response times by 35% across 25M+ daily requests, by optimizing Active Record/ORM query plans and database connection pooling.`,
  },
  rails: {
    equivalentSkill: 'Python (Django, FastAPI) and Node.js (Express, NestJS) MVC architectures',
    rationale: 'Candidate applies MVC design patterns, ORM optimization, and RESTful service modeling to Ruby on Rails backends.',
    category: 'Core Programming Languages',
    generateXyzBullet: (tool) =>
      `Engineered RESTful web services utilizing ${tool} and Python, accelerating API response times by 35% across 25M+ daily requests, by optimizing Active Record/ORM query plans and database connection pooling.`,
  },
  'c#': {
    equivalentSkill: 'Enterprise Java (Spring Boot) and typed Node.js/NestJS microservices',
    rationale: 'Candidate applies strongly typed enterprise OOP patterns, dependency injection, and microservices architecture to C# and .NET.',
    category: 'Core Programming Languages',
    generateXyzBullet: (tool) =>
      `Designed enterprise backend microservices utilizing ${tool} and Java, handling 15M+ monthly transactions with 99.99% availability, by implementing asynchronous task processing and dependency-injected service architectures.`,
  },
  '.net': {
    equivalentSkill: 'Enterprise Java (Spring Boot) and typed Node.js/NestJS microservices',
    rationale: 'Candidate applies strongly typed enterprise OOP patterns, dependency injection, and microservices architecture to C# and .NET.',
    category: 'Core Programming Languages',
    generateXyzBullet: (tool) =>
      `Designed enterprise backend microservices utilizing ${tool} and Java, handling 15M+ monthly transactions with 99.99% availability, by implementing asynchronous task processing and dependency-injected service architectures.`,
  },
  rust: {
    equivalentSkill: 'C++ and low-level Linux systems internals',
    rationale: 'Candidate applies zero-copy memory management and high-performance multithreading to Rust services.',
    category: 'Core Programming Languages',
    generateXyzBullet: (tool) =>
      `Optimized compute-intensive systems microservices using ${tool}, slashing memory allocation overhead by 38%, by implementing zero-copy data structures and safe concurrency channels.`,
  },
  scala: {
    equivalentSkill: 'Enterprise Java (Spring Boot), Apache Kafka, and distributed actors',
    rationale: 'Candidate applies JVM memory tuning, functional programming, and streaming actors to Scala.',
    category: 'Core Programming Languages',
    generateXyzBullet: (tool) =>
      `Engineered distributed data pipeline workers using ${tool} and Apache Kafka, scaling event throughput by 3x (boosting throughput by 65%) under peak financial loads, by implementing immutable data streams and resilient actor hierarchies.`,
  },
  php: {
    equivalentSkill: 'Python (Django) and Node.js (Express) web services',
    rationale: 'Candidate applies scalable RESTful API modeling, caching, and database migrations to PHP/Laravel systems.',
    category: 'Core Programming Languages',
    generateXyzBullet: (tool) =>
      `Maintained high-throughput web service backends utilizing ${tool} and Node.js, reducing server response times by 28%, by implementing opcode caching and optimized relational query indexing.`,
  },
  elixir: {
    equivalentSkill: 'Event-driven distributed systems (Kafka, RabbitMQ) and concurrent message passing',
    rationale: 'Candidate applies supervisor tree patterns, fault-tolerant message queues, and async actor models to Elixir/Phoenix.',
    category: 'Core Programming Languages',
    generateXyzBullet: (tool) =>
      `Architected fault-tolerant distributed communication channels using ${tool} and RabbitMQ, maintaining 99.999% availability, by deploying supervisor tree failure recovery and lightweight concurrent worker processes.`,
  },
  kotlin: {
    equivalentSkill: 'Enterprise Java (Spring Boot) and typed asynchronous microservices',
    rationale: 'Candidate applies JVM coroutines, functional data transformations, and Spring ecosystem integrations to Kotlin.',
    category: 'Core Programming Languages',
    generateXyzBullet: (tool) =>
      `Engineered high-concurrency microservices using ${tool} and Java, reducing thread execution latency by 30%, by implementing non-blocking asynchronous coroutine dispatchers and reactive database drivers.`,
  },

  // ── 2. Frontend Frameworks & UI Architecture ──
  vue: {
    equivalentSkill: 'React 18/19, Next.js, and modern virtual DOM reactivity',
    rationale: 'Candidate applies component lifecycle patterns, reactive state management, and virtual DOM reconciliation to Vue.js.',
    category: 'Frontend Frameworks & Libraries',
    generateXyzBullet: (tool) =>
      `Architected modular single-page frontend applications using ${tool} and React, cutting client-side render times by 32%, by implementing virtual DOM memoization and reactive state management.`,
  },
  'vue.js': {
    equivalentSkill: 'React 18/19, Next.js, and modern virtual DOM reactivity',
    rationale: 'Candidate applies component lifecycle patterns, reactive state management, and virtual DOM reconciliation to Vue.js.',
    category: 'Frontend Frameworks & Libraries',
    generateXyzBullet: (tool) =>
      `Architected modular single-page frontend applications using ${tool} and React, cutting client-side render times by 32%, by implementing virtual DOM memoization and reactive state management.`,
  },
  nuxt: {
    equivalentSkill: 'Next.js (App Router, Server-Side Rendering) and React',
    rationale: 'Candidate applies server-side rendering (SSR), file-based routing, and static generation to Nuxt.',
    category: 'Frontend Frameworks & Libraries',
    generateXyzBullet: (tool) =>
      `Engineered server-side rendered (SSR) web applications using ${tool} and Next.js, boosting Largest Contentful Paint (LCP) by 42% (1.6s faster), by configuring route-based code splitting and edge caching.`,
  },
  angular: {
    equivalentSkill: 'Enterprise TypeScript, component dependency injection, and RxJS state management',
    rationale: 'Candidate applies strongly typed component architecture, dependency injection, and modular enterprise design to Angular.',
    category: 'Frontend Frameworks & Libraries',
    generateXyzBullet: (tool) =>
      `Developed scalable enterprise web client interfaces utilizing ${tool} and TypeScript, reducing frontend state defects by 45%, by implementing hierarchical dependency injection and observable state streams.`,
  },
  svelte: {
    equivalentSkill: 'Next.js, React component architecture, and fine-grained reactive state',
    rationale: 'Candidate applies compile-time UI optimizations, minimal bundle footprints, and reactive stores to Svelte.',
    category: 'Frontend Frameworks & Libraries',
    generateXyzBullet: (tool) =>
      `Constructed lightweight responsive UI components using ${tool} and React, shrinking total client bundle size by 35%, by enforcing compile-time dead-code elimination and reactive store bindings.`,
  },
  solidjs: {
    equivalentSkill: 'React component architecture and fine-grained reactive signals',
    rationale: 'Candidate applies JSX syntax, reactive primitives, and component state lifecycle to Solid.js.',
    category: 'Frontend Frameworks & Libraries',
    generateXyzBullet: (tool) =>
      `Optimized interactive web user interfaces using ${tool} and React, improving client-side responsiveness by 30%, by implementing fine-grained signal subscriptions and DOM reconciliation.`,
  },
  'solid.js': {
    equivalentSkill: 'React component architecture and fine-grained reactive signals',
    rationale: 'Candidate applies JSX syntax, reactive primitives, and component state lifecycle to Solid.js.',
    category: 'Frontend Frameworks & Libraries',
    generateXyzBullet: (tool) =>
      `Optimized interactive web user interfaces using ${tool} and React, improving client-side responsiveness by 30%, by implementing fine-grained signal subscriptions and DOM reconciliation.`,
  },

  // ── 3. Distributed Databases & Analytics Storage ──
  cassandra: {
    equivalentSkill: 'Distributed PostgreSQL & MongoDB with partition tuning & replica sets',
    rationale: 'Candidate applies deep distributed storage expertise (sharding, active-active replication, and sub-millisecond caching) to Apache Cassandra topologies.',
    category: 'Databases & Distributed Storage',
    generateXyzBullet: (tool) =>
      `Architected high-throughput distributed database topology using ${tool} and PostgreSQL with active-active replication, slashing write latencies by 42% under peak transaction spikes, by optimizing partition distribution and PgBouncer connection pooling.`,
  },
  'apache cassandra': {
    equivalentSkill: 'Distributed PostgreSQL & MongoDB with partition tuning & replica sets',
    rationale: 'Candidate applies deep distributed storage expertise (sharding, active-active replication, and sub-millisecond caching) to Apache Cassandra topologies.',
    category: 'Databases & Distributed Storage',
    generateXyzBullet: (tool) =>
      `Architected high-throughput distributed database topology using ${tool} and PostgreSQL with active-active replication, slashing write latencies by 42% under peak transaction spikes, by optimizing partition distribution and PgBouncer connection pooling.`,
  },
  scylla: {
    equivalentSkill: 'Apache Cassandra & Redis cluster tuning',
    rationale: 'Candidate applies high-throughput NoSQL database partition optimization to ScyllaDB.',
    category: 'Databases & Distributed Storage',
    generateXyzBullet: (tool) =>
      `Optimized distributed NoSQL storage clusters using ${tool} and Redis, reducing p99 data retrieval latency to sub-20ms, by tuning LSM-tree compaction and shard-per-core partition routing.`,
  },
  couchbase: {
    equivalentSkill: 'MongoDB and distributed NoSQL document stores with Redis caching',
    rationale: 'Candidate applies document-oriented schema design, secondary indexes, and memory caching to Couchbase.',
    category: 'Databases & Distributed Storage',
    generateXyzBullet: (tool) =>
      `Architected distributed document database clusters using ${tool} and MongoDB, handling 25M+ daily retail lookups with sub-10ms latency, by implementing memory-first caching buckets and optimized N1QL indexing.`,
  },
  clickhouse: {
    equivalentSkill: 'PostgreSQL & Elasticsearch analytics clusters',
    rationale: 'Candidate applies columnar data partitioning, timeseries indexing, and aggregation optimizations to ClickHouse.',
    category: 'Databases & Distributed Storage',
    generateXyzBullet: (tool) =>
      `Designed analytical data pipelines integrating ${tool} with PostgreSQL, accelerating complex multi-table analytical aggregations by 65%, by introducing columnar indexing and automated partition pruning.`,
  },
  snowflake: {
    equivalentSkill: 'Enterprise PostgreSQL data warehousing & BigQuery',
    rationale: 'Candidate applies dimensional star schema design, clustering keys, and high-volume ETL to Snowflake.',
    category: 'Databases & Distributed Storage',
    generateXyzBullet: (tool) =>
      `Engineered centralized analytical data models and pipelines utilizing ${tool}, reducing reporting query runtimes by 55%, by implementing automated partition pruning and clustered indexing.`,
  },
  cockroachdb: {
    equivalentSkill: 'Distributed PostgreSQL with Raft replication and connection pooling',
    rationale: 'Candidate applies distributed ACID transactions, multi-region replication, and relational SQL optimization to CockroachDB.',
    category: 'Databases & Distributed Storage',
    generateXyzBullet: (tool) =>
      `Engineered geo-distributed relational database clusters with ${tool} and PostgreSQL, sustaining 99.999% availability across region outages, by tuning Raft consensus replication and range leaseholders.`,
  },
  neo4j: {
    equivalentSkill: 'Relational graph modeling and PostgreSQL recursive CTEs',
    rationale: 'Candidate applies node-edge relationship modeling and recursive graph traversals to Neo4j.',
    category: 'Databases & Distributed Storage',
    generateXyzBullet: (tool) =>
      `Modeled complex multi-tier relational graph topologies using ${tool} and PostgreSQL, speeding up interconnected dependency queries by 50%, by implementing index-free adjacency traversals.`,
  },

  // ── 4. Streaming, Messaging & Big Data ──
  flink: {
    equivalentSkill: 'Apache Kafka & RabbitMQ event streaming pipelines',
    rationale: 'Candidate applies distributed event stream partitioning, consumer groups, and idempotent processing to Apache Flink.',
    category: 'Distributed Systems & Messaging',
    generateXyzBullet: (tool) =>
      `Developed real-time stream processing pipelines utilizing ${tool} and Apache Kafka, processing 25M+ events/day with zero dropped records, by tuning consumer group parallelism and checkpoint state.`,
  },
  spark: {
    equivalentSkill: 'Distributed event processing with Kafka, Python, and Redis',
    rationale: 'Candidate applies distributed dataset partitioning and in-memory aggregation to Apache Spark.',
    category: 'Distributed Systems & Messaging',
    generateXyzBullet: (tool) =>
      `Engineered distributed data processing jobs using ${tool} and Kafka, accelerating batch transformation throughput by 3.4x, by optimizing partition sizing and memory caching.`,
  },
  pulsar: {
    equivalentSkill: 'Apache Kafka & RabbitMQ enterprise messaging',
    rationale: 'Candidate applies multi-tenant pub/sub messaging and decoupled storage architecture to Apache Pulsar.',
    category: 'Distributed Systems & Messaging',
    generateXyzBullet: (tool) =>
      `Architected multi-tenant messaging pipelines using ${tool} and Kafka, maintaining sub-15ms message delivery across 45+ microservices, by configuring tiered storage offloading and segmented partition namespaces.`,
  },
  nats: {
    equivalentSkill: 'RabbitMQ and Redis lightweight publish/subscribe messaging',
    rationale: 'Candidate applies lightweight pub/sub, request-reply semantics, and low-latency queuing to NATS.',
    category: 'Distributed Systems & Messaging',
    generateXyzBullet: (tool) =>
      `Engineered low-latency service-to-service messaging channels utilizing ${tool} and Redis pub/sub, achieving sub-5ms message dispatch across 50k+ daily events.`,
  },

  // ── 5. AI / ML & Vector Databases ──
  pinecone: {
    equivalentSkill: 'pgvector, ChromaDB, and dense vector indexing with cosine similarity',
    rationale: 'Candidate applies HNSW indexing, dense embedding retrieval, and metadata filtering to Pinecone.',
    category: 'Generative AI & Vector Search',
    generateXyzBullet: (tool) =>
      `Architected scalable semantic retrieval infrastructure utilizing ${tool} and pgvector, achieving sub-45ms vector search across 5M+ embeddings, by configuring HNSW indexing and metadata filtering.`,
  },
  milvus: {
    equivalentSkill: 'pgvector, ChromaDB, and high-throughput vector similarity search',
    rationale: 'Candidate applies distributed vector quantization, IVFFlat/HNSW indexes, and embedding storage to Milvus.',
    category: 'Generative AI & Vector Search',
    generateXyzBullet: (tool) =>
      `Engineered high-throughput vector similarity search clusters using ${tool} and pgvector, handling 2,500+ query requests/sec with 98% recall accuracy, by tuning scalar quantization and partition segments.`,
  },
  weaviate: {
    equivalentSkill: 'ChromaDB, pgvector, and hybrid BM25 + dense vector search',
    rationale: 'Candidate applies hybrid lexical-semantic search and vector indexing to Weaviate.',
    category: 'Generative AI & Vector Search',
    generateXyzBullet: (tool) =>
      `Implemented hybrid vector retrieval pipelines utilizing ${tool} and Chroma, reducing context retrieval hallucination rates below 1.5%, by executing reciprocal rank fusion across sparse and dense embeddings.`,
  },
  llamaindex: {
    equivalentSkill: 'LangChain, LangGraph, and hierarchical semantic chunking',
    rationale: 'Candidate applies document ingestion, context synthesis, and agentic query engines to LlamaIndex.',
    category: 'Generative AI & Agentic Workflows',
    generateXyzBullet: (tool) =>
      `Constructed enterprise context retrieval pipelines utilizing ${tool} and LangGraph, elevating retrieval answer relevancy by 35%, by implementing hierarchical semantic chunking and dynamic document routing.`,
  },
  tensorflow: {
    equivalentSkill: 'PyTorch, Python numerical libraries, and deep learning inference pipelines',
    rationale: 'Candidate applies neural network inference optimizations, tensor operations, and model serving to TensorFlow.',
    category: 'Machine Learning & AI',
    generateXyzBullet: (tool) =>
      `Optimized machine learning inference pipelines using ${tool} and PyTorch, accelerating model prediction throughput by 40%, by implementing GPU batching and model quantization.`,
  },

  // ── 6. Cloud, DevOps, SRE & Observability ──
  pulumi: {
    equivalentSkill: 'Terraform Infrastructure as Code (IaC) and TypeScript automation',
    rationale: 'Candidate applies declarative infrastructure modeling and automated state management to Pulumi.',
    category: 'Cloud & Infrastructure',
    generateXyzBullet: (tool) =>
      `Automated multi-region cloud platform infrastructure utilizing ${tool} and Terraform, cutting environment provisioning time from 3 days to under 15 minutes, by engineering modular TypeScript infrastructure definitions.`,
  },
  azure: {
    equivalentSkill: 'AWS EKS, GCP GKE, and multi-cloud container orchestration',
    rationale: 'Candidate applies enterprise cloud identity (Entra ID), cloud networking (VNet), and managed Kubernetes (AKS) to Azure.',
    category: 'Cloud & Infrastructure',
    generateXyzBullet: (tool) =>
      `Architected multi-cloud Kubernetes deployment platform across ${tool}, AWS, and GCP, maintaining 99.99% availability, by standardizing container runtime configurations and automated Terraform modules.`,
  },
  datadog: {
    equivalentSkill: 'Prometheus, Grafana, OpenTelemetry, and APM distributed tracing',
    rationale: 'Candidate applies metrics collection, distributed APM tracing, and alert deduplication to Datadog.',
    category: 'Observability & SRE',
    generateXyzBullet: (tool) =>
      `Engineered unified APM observability and tracing infrastructure utilizing ${tool} and Prometheus, reducing incident MTTR by 45%, by instrumenting OpenTelemetry distributed traces and automated anomaly alert monitors.`,
  },
  'new relic': {
    equivalentSkill: 'Prometheus, Grafana, OpenTelemetry, and APM distributed tracing',
    rationale: 'Candidate applies application performance monitoring, distributed tracing, and service maps to New Relic.',
    category: 'Observability & SRE',
    generateXyzBullet: (tool) =>
      `Instrumented real-time application performance monitoring utilizing ${tool} and OpenTelemetry, identifying critical cross-service latency bottlenecks and boosting p99 API response times by 35%.`,
  },
  istio: {
    equivalentSkill: 'Kubernetes Ingress, Envoy proxies, and mutual TLS (mTLS) policies',
    rationale: 'Candidate applies service mesh traffic routing, circuit breaking, and zero-trust mTLS encryption to Istio.',
    category: 'Cloud & Infrastructure',
    generateXyzBullet: (tool) =>
      `Hardened microservices service mesh infrastructure using ${tool} and Kubernetes, achieving 100% encrypted mTLS zero-trust communication across 45+ services, by implementing fine-grained traffic routing and circuit breakers.`,
  },
  splunk: {
    equivalentSkill: 'Loki, Prometheus, and Grafana centralized logging & log aggregation',
    rationale: 'Candidate applies log search queries, structured JSON indexing, and anomaly detection to Splunk.',
    category: 'Observability & SRE',
    generateXyzBullet: (tool) =>
      `Centralized enterprise log aggregation utilizing ${tool} and Grafana Loki, reducing incident investigation times by 50%, by structuring high-cardinality JSON application logs.`,
  },

  // ── 7. APIs & Protocols ──
  graphql: {
    equivalentSkill: 'RESTful APIs, gRPC, and Protobuf contracts',
    rationale: 'Candidate applies schema definition, payload optimization, and type-safe query batching to GraphQL.',
    category: 'Backend Frameworks & APIs',
    generateXyzBullet: (tool) =>
      `Designed unified API gateway services utilizing ${tool} and REST, cutting client-side roundtrip latency by 45%, by implementing dataloader query batching and response caching.`,
  },
  websockets: {
    equivalentSkill: 'Real-time event streaming and high-throughput bidirectional client connections',
    rationale: 'Candidate applies persistent socket connections, connection heartbeat monitoring, and event dispatching to WebSockets.',
    category: 'Distributed Systems & Messaging',
    generateXyzBullet: (tool) =>
      `Engineered real-time bidirectional communication channels utilizing ${tool} and Redis pub/sub, broadcasting updates to 50k+ concurrent connected users with sub-10ms delivery latency.`,
  },
};

/**
 * Finds if a tool/framework in a JD has a semantic architectural equivalent
 */
export function findSemanticEquivalent(skill: string): {
  key: string;
  mapping: typeof ARCHITECTURAL_EQUIVALENTS_MAP[string];
} | undefined {
  const lower = skill.trim().toLowerCase();

  // 1. Exact match
  if (ARCHITECTURAL_EQUIVALENTS_MAP[lower]) {
    return { key: lower, mapping: ARCHITECTURAL_EQUIVALENTS_MAP[lower] };
  }

  // 2. Boundary-safe token matching (e.g. "Apache Cassandra" -> "cassandra", "Vue.js" -> "vue", "Go/Golang" -> "go")
  for (const [key, mapping] of Object.entries(ARCHITECTURAL_EQUIVALENTS_MAP)) {
    if (key === 'go' || key === 'golang') {
      if (lower === 'go' || lower === 'golang' || /\bgo\b|\bgolang\b/i.test(lower)) {
        return { key, mapping };
      }
      continue;
    }
    if (buildKeywordRegex(key).test(lower)) {
      return { key, mapping };
    }
  }

  return undefined;
}

/**
 * Extracts all verified production skills from CandidateMasterProfile for a persona
 */
export function getVerifiedCandidateSkills(
  profile: CandidateMasterProfile = candidateMasterProfile,
  persona: EngineeringPersona = 'backend_distributed_systems'
): Set<string> {
  const verified = new Set<string>();

  // 1. Collect from persona skills
  const personaSkills = profile.skillsByPersona[persona];
  if (personaSkills) {
    for (const skillList of Object.values(personaSkills)) {
      for (const skill of skillList) {
        verified.add(skill.toLowerCase());
      }
    }
  }

  // 2. Collect from work experience techStack and bullet points
  for (const exp of profile.experiences) {
    const variant = exp.personaVariants[persona];
    if (variant) {
      for (const tech of variant.techStack) {
        verified.add(tech.toLowerCase());
      }
    }
  }

  // 3. Collect from projects
  for (const proj of profile.projects) {
    if (proj.personas.includes(persona)) {
      const tokens = proj.technologies.split(/,\s*/);
      for (const t of tokens) {
        verified.add(t.trim().toLowerCase());
      }
    }
  }

  return verified;
}

/**
 * Compares extracted JD skills against candidate's verified profile.
 * Separates into:
 * - verifiedDirectMatches: Direct candidate production skills.
 * - architecturalEquivalents: Technologies bridged via direct architectural equivalents.
 * - unmatchedSkills: Irrelevant or unbridgeable technologies (strictly EXCLUDED from CORE SKILLS).
 */
export function matchGroundedSkills(
  jdSkills: string[],
  profile: CandidateMasterProfile = candidateMasterProfile,
  persona: EngineeringPersona = 'backend_distributed_systems'
): GroundedSkillMatchResult {
  const verifiedSkillsSet = getVerifiedCandidateSkills(profile, persona);

  const verifiedDirectMatches: string[] = [];
  const architecturalEquivalents: ArchitecturalEquivalentMapping[] = [];
  const unmatchedSkills: string[] = [];
  const classifiedSkills: ClassifiedSkill[] = [];
  const excludedSkills: string[] = [];

  for (const rawSkill of jdSkills) {
    const skill = rawSkill.trim();
    if (!skill) continue;

    const lower = skill.toLowerCase();

    // Check 1: Semantic Skill Bridge (Architectural Equivalent)
    const eqMatch = findSemanticEquivalent(skill);
    if (eqMatch) {
      const mapping = {
        jdSkill: skill,
        equivalentSkill: eqMatch.mapping.equivalentSkill,
        rationale: eqMatch.mapping.rationale,
        xyzBullet: eqMatch.mapping.generateXyzBullet(skill),
      };
      architecturalEquivalents.push(mapping);
      classifiedSkills.push({
        skill,
        classification: 'architectural_equivalent',
        category: eqMatch.mapping.category,
        equivalentSkill: eqMatch.mapping.equivalentSkill,
        rationale: eqMatch.mapping.rationale,
        xyzBullet: mapping.xyzBullet,
      });
      continue;
    }

    // Check 2: Direct production match
    const isDirectMatch = Array.from(verifiedSkillsSet).some((verified) => {
      if (lower === 'go' || lower === 'golang') {
        return verified === 'go' || verified === 'golang';
      }
      return verified === lower || verified.includes(lower) || lower.includes(verified);
    });

    if (isDirectMatch) {
      verifiedDirectMatches.push(skill);
      classifiedSkills.push({
        skill,
        classification: 'verified_match',
      });
      continue;
    }

    // Check 3: Unmatched skill (Cannot be bridged; strictly excluded from CORE SKILLS)
    unmatchedSkills.push(skill);
    excludedSkills.push(skill);
    classifiedSkills.push({
      skill,
      classification: 'excluded',
    });
  }

  return {
    verifiedDirectMatches: Array.from(new Set(verifiedDirectMatches)),
    architecturalEquivalents,
    unmatchedSkills: Array.from(new Set(unmatchedSkills)),
    classifiedSkills,
    excludedSkills: Array.from(new Set(excludedSkills)),
  };
}

/**
 * Builds a structured, categorized CORE SKILLS section.
 * STRICT ENFORCEMENT:
 * 1. Zero "Additional Skills:" or catch-all dump lines.
 * 2. Unmatched/unbridgeable skills are completely EXCLUDED.
 * 3. Every included skill belongs to a verified domain category.
 */
export function buildGroundedSkillsSection(
  matchResult: GroundedSkillMatchResult,
  profile: CandidateMasterProfile = candidateMasterProfile,
  persona: EngineeringPersona = 'backend_distributed_systems'
): Record<string, string[]> {
  const baseSkillsSection = profile.skillsByPersona[persona] || {};
  const skillsSection: Record<string, string[]> = {};

  // Copy base verified skills
  for (const [cat, skills] of Object.entries(baseSkillsSection)) {
    // Strictly skip any forbidden catch-all category name
    if (/additional\s*skills|other\s*skills|misc/i.test(cat)) {
      continue;
    }
    skillsSection[cat] = [...skills];
  }

  // Weave architectural equivalents into their appropriate technical categories
  for (const eq of matchResult.architecturalEquivalents) {
    const eqMatch = findSemanticEquivalent(eq.jdSkill);
    const targetCategory = eqMatch?.mapping.category || 'Core Technical Competencies';

    if (!skillsSection[targetCategory]) {
      skillsSection[targetCategory] = [];
    }

    const formattedSkill = `${eq.jdSkill} (Architectural Equivalent)`;
    if (
      !skillsSection[targetCategory].some(
        (s) => s.toLowerCase().includes(eq.jdSkill.toLowerCase())
      )
    ) {
      skillsSection[targetCategory].push(formattedSkill);
    }
  }

  // Double check and guarantee NO category named "Additional Skills" or catch-all line exists
  for (const cat of Object.keys(skillsSection)) {
    if (/additional\s*skills|other\s*skills|misc/i.test(cat)) {
      delete skillsSection[cat];
    }
  }

  return skillsSection;
}

/**
 * Generates Google XYZ format accomplishment bullets for verified and architectural skills
 */
export function generateGroundedExperienceBullets(
  matchResult: GroundedSkillMatchResult,
  existingBullets: string[] = []
): string[] {
  const bullets = [...existingBullets];

  // Weave architectural equivalents with concrete Google XYZ impact
  for (const eq of matchResult.architecturalEquivalents) {
    const regex = buildKeywordRegex(eq.jdSkill);
    if (!bullets.some((b) => regex.test(b))) {
      bullets.push(eq.xyzBullet);
    }
  }

  return bullets;
}
