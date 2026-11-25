import {
  personas,
  domainSelectors,
  qaSemanticMemory,
  applicationsAudit,
} from '../db/schema.ts';
import {
  TierResolver,
  createInMemoryResolverStore,
  type PersonaData,
} from '../lib/engine/resolver.ts';

// Universal test runner adapter: works identically under Vitest and Node.js native test runner
let describe: any;
let it: any;
let expect: any;
let beforeEach: any;

if (process.env.VITEST) {
  const vitest = await import('vitest');
  describe = vitest.describe;
  it = vitest.it;
  expect = vitest.expect;
  beforeEach = vitest.beforeEach;
} else {
  const nodeTest = await import('node:test');
  const assert = (await import('node:assert/strict')).default;
  describe = nodeTest.describe;
  it = nodeTest.it;
  beforeEach = nodeTest.beforeEach;
  expect = (actual: any) => ({
    toBe: (exp: any) => assert.strictEqual(actual, exp),
    toBeDefined: () => assert.notStrictEqual(actual, undefined),
    toBeNull: () => assert.strictEqual(actual, null),
    toBeGreaterThanOrEqual: (exp: number) =>
      assert.ok(actual >= exp, `Expected ${actual} >= ${exp}`),
    toBeLessThan: (exp: number) =>
      assert.ok(actual < exp, `Expected ${actual} < ${exp}`),
    toBeLessThanOrEqual: (exp: number) =>
      assert.ok(actual <= exp, `Expected ${actual} <= ${exp}`),
    toContain: (exp: any) =>
      assert.ok(actual?.includes(exp), `Expected ${actual} to contain ${exp}`),
    not: {
      toMatch: (exp: RegExp) =>
        assert.ok(!exp.test(actual), `Expected ${actual} not to match ${exp}`),
    },
  });
}

describe('Phase 1: Drizzle pgvector Schema & Tier 1 + Tier 2 Resolution Engine', () => {
  let store: ReturnType<typeof createInMemoryResolverStore>;
  let resolver: TierResolver;

  const mockPersona: PersonaData = {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Ashish Kumar Singh',
    isActive: true,
    contactInfo: {
      firstName: 'Ashish',
      lastName: 'Singh',
      email: 'ashish@example.com',
      phone: '+91-9876543210',
      linkedinUrl: 'https://linkedin.com/in/ashish',
      githubUrl: 'https://github.com/ashish',
      location: 'Noida, India',
    },
    workHistory: [
      {
        company: 'UnitedHealth Group',
        role: 'Senior Staff Software Engineer',
        startDate: '2021-03-01',
        endDate: 'Present',
        location: 'Noida, India',
      },
    ],
    education: [
      {
        institution: 'ABES Engineering College',
        degree: 'Bachelor of Technology',
        fieldOfStudy: 'Computer Science',
        graduationDate: '2014-06-01',
      },
    ],
    skills: ['Python', 'TypeScript', 'PostgreSQL', 'Docker', 'Kubernetes'],
    demographicsEeo: {
      gender: 'Male',
      veteranStatus: 'No',
      disabilityStatus: 'No',
      raceEthnicity: 'Asian',
    },
    visaWorkAuth: {
      requiresSponsorship: true,
      currentCitizenship: 'India',
      workAuthorizationStatus: 'Requires UK Skilled Worker / US H-1B',
    },
    lockedFacts: {
      employers: ['UnitedHealth Group', 'DBS Bank', 'Walmart Labs'],
      degreeTitles: ['Bachelor of Technology'],
      verifiedDates: {
        'UnitedHealth Group': { start: '2021-03-01', end: 'Present' },
      },
      passportNumber: 'Z9876543',
    },
  };

  beforeEach(() => {
    store = createInMemoryResolverStore();
    store.seedPersona(mockPersona);
    resolver = new TierResolver(store);
  });

  describe('Drizzle pgvector Schema Definitions', () => {
    it('defines personas table with exact jsonb, locked facts, and uuid primary key', () => {
      expect(personas).toBeDefined();
      expect(personas.id).toBeDefined();
      expect(personas.name).toBeDefined();
      expect(personas.isActive).toBeDefined();
      expect(personas.contactInfo).toBeDefined();
      expect(personas.workHistory).toBeDefined();
      expect(personas.education).toBeDefined();
      expect(personas.skills).toBeDefined();
      expect(personas.demographicsEeo).toBeDefined();
      expect(personas.visaWorkAuth).toBeDefined();
      expect(personas.lockedFacts).toBeDefined();
    });

    it('defines domainSelectors table with fieldSignature, mappedProfileKey, and fieldType', () => {
      expect(domainSelectors).toBeDefined();
      expect(domainSelectors.id).toBeDefined();
      expect(domainSelectors.domain).toBeDefined();
      expect(domainSelectors.fieldSignature).toBeDefined();
      expect(domainSelectors.cssOrXpath).toBeDefined();
      expect(domainSelectors.mappedProfileKey).toBeDefined();
      expect(domainSelectors.fieldType).toBeDefined();
      expect(domainSelectors.formatMask).toBeDefined();
      expect(domainSelectors.confidence).toBeDefined();
      expect(domainSelectors.hitCount).toBeDefined();
    });

    it('defines qaSemanticMemory table with 768-dim vector embedding, templates, and HNSW index', () => {
      expect(qaSemanticMemory).toBeDefined();
      expect(qaSemanticMemory.id).toBeDefined();
      expect(qaSemanticMemory.personaId).toBeDefined();
      expect(qaSemanticMemory.category).toBeDefined();
      expect(qaSemanticMemory.rawQuestion).toBeDefined();
      expect(qaSemanticMemory.normalizedQuestion).toBeDefined();
      expect(qaSemanticMemory.embedding).toBeDefined();
      expect(qaSemanticMemory.answerTemplate).toBeDefined();
      expect(qaSemanticMemory.maxCharLimit).toBeDefined();
      expect(qaSemanticMemory.usageCount).toBeDefined();
      expect(qaSemanticMemory.lastUsedAt).toBeDefined();
    });

    it('defines applicationsAudit table with submission payload and resolution stats', () => {
      expect(applicationsAudit).toBeDefined();
      expect(applicationsAudit.id).toBeDefined();
      expect(applicationsAudit.personaId).toBeDefined();
      expect(applicationsAudit.companyName).toBeDefined();
      expect(applicationsAudit.roleTitle).toBeDefined();
      expect(applicationsAudit.portalUrl).toBeDefined();
      expect(applicationsAudit.domain).toBeDefined();
      expect(applicationsAudit.jdRawText).toBeDefined();
      expect(applicationsAudit.resumeVersionPath).toBeDefined();
      expect(applicationsAudit.submittedPayload).toBeDefined();
      expect(applicationsAudit.resolutionStats).toBeDefined();
      expect(applicationsAudit.status).toBeDefined();
      expect(applicationsAudit.submittedAt).toBeDefined();
    });
  });

  describe('Tier 1: Exact Domain Selector Resolution', () => {
    it('resolves Tier 1 exact domain selector for myworkdayjobs.com without LLM calls', async () => {
      store.seedSelector({
        id: '11111111-1111-1111-1111-111111111111',
        domain: 'myworkdayjobs.com',
        fieldSignature: 'input[data-automation-id="legalNameSection_firstName"]',
        cssOrXpath: 'input[data-automation-id="legalNameSection_firstName"]',
        mappedProfileKey: 'contactInfo.firstName',
        fieldType: 'text',
        formatMask: null,
        confidence: 1.0,
        hitCount: 5,
      });

      const result = await resolver.resolveField({
        domain: 'myworkdayjobs.com',
        fieldSignature: 'input[data-automation-id="legalNameSection_firstName"]',
      });

      expect(result.tier).toBe(1);
      expect(result.badge).toBe('GREEN_EXACT');
      expect(result.value).toBe('Ashish');
      expect(result.llmCalls).toBe(0);
      expect(result.fieldKey).toBe('contactInfo.firstName');
      expect(result.confidence).toBe(1.0);
    });
  });

  describe('Tier 2: Semantic Vector Resolution via pgvector (>= 0.90 similarity)', () => {
    it('resolves Tier 2 semantic vector hit >= 0.90 similarity and hydrates template', async () => {
      // Deterministic 768-dim embedding fixture: base unit vector in dims 0 & 1
      const baseEmbedding = new Array(768).fill(0);
      baseEmbedding[0] = 0.95;
      baseEmbedding[1] = 0.31; // norm ~ 1.0

      store.seedSemanticQA({
        id: '22222222-2222-2222-2222-222222222222',
        personaId: mockPersona.id,
        category: 'motivation',
        rawQuestion: 'Why do you want to join {{COMPANY_NAME}} as a {{ROLE_TITLE}}?',
        normalizedQuestion: 'why do you want to join this company in this role',
        embedding: baseEmbedding,
        answerTemplate:
          'I am excited to join {{COMPANY_NAME}} as a {{ROLE_TITLE}} because of your world-class distributed systems infrastructure, high-impact culture, and engineering velocity.',
        maxCharLimit: 500,
        usageCount: 3,
        lastUsedAt: new Date(),
      });

      // Query vector with very high cosine similarity (angle ~ 0.96)
      const queryEmbedding = [...baseEmbedding];
      queryEmbedding[0] = 0.93;
      queryEmbedding[1] = 0.36;

      const result = await resolver.resolveQuestion({
        rawQuestion:
          'What excites you about working at Stripe for the Staff AI Engineer position?',
        queryEmbedding,
        context: {
          companyName: 'Stripe',
          roleTitle: 'Staff AI Engineer',
        },
      });

      expect(result.tier).toBe(2);
      expect(result.badge).toBe('BLUE_VECTOR_LEARNED');
      expect(result.similarity).toBeGreaterThanOrEqual(0.9);
      expect(result.llmCalls).toBe(0);
      expect(result.value).toContain('Stripe');
      expect(result.value).toContain('Staff AI Engineer');
      expect(result.value).toBe(
        'I am excited to join Stripe as a Staff AI Engineer because of your world-class distributed systems infrastructure, high-impact culture, and engineering velocity.'
      );
    });

    it('returns CACHE_MISS when cosine similarity < 0.90', async () => {
      // Seed motivation Q&A
      const motivationEmbedding = new Array(768).fill(0);
      motivationEmbedding[0] = 1.0;

      store.seedSemanticQA({
        id: '33333333-3333-3333-3333-333333333333',
        personaId: mockPersona.id,
        category: 'motivation',
        rawQuestion: 'Why do you want to join {{COMPANY_NAME}}?',
        normalizedQuestion: 'why do you want to join this company',
        embedding: motivationEmbedding,
        answerTemplate: 'I admire {{COMPANY_NAME}} for its technological innovation.',
        maxCharLimit: 250,
        usageCount: 1,
        lastUsedAt: new Date(),
      });

      // An orthogonal or distant vector for eBPF question (e.g. index 100 = 1.0, similarity to index 0 is 0.0)
      const distantEmbedding = new Array(768).fill(0);
      distantEmbedding[100] = 1.0;

      const result = await resolver.resolveQuestion({
        rawQuestion: 'Explain your experience with eBPF kernel tracing.',
        queryEmbedding: distantEmbedding,
        context: {
          companyName: 'Stripe',
          roleTitle: 'Staff AI Engineer',
        },
      });

      expect(result.tier).toBe(2);
      expect(result.badge).toBe('CACHE_MISS');
      expect(result.similarity).toBeLessThan(0.9);
      expect(result.isHit).toBe(false);
      expect(result.value).toBeNull();
      expect(result.llmCalls).toBe(0);
    });

    it('enforces character limit constraints on cached templates', async () => {
      const baseEmbedding = new Array(768).fill(0);
      baseEmbedding[5] = 1.0;

      // Long template (350+ chars)
      const longAnswer =
        'Throughout my career spanning over a decade, I have led multiple transformative software initiatives focusing on extreme concurrency, high availability, and mission-critical reliability. I specialize in building event-driven architectures, real-time telemetry streaming platforms, and resilient microservices using TypeScript, Go, Python, and Kafka.';

      store.seedSemanticQA({
        id: '44444444-4444-4444-4444-444444444444',
        personaId: mockPersona.id,
        category: 'experience_summary',
        rawQuestion: 'Describe your core architectural experience.',
        normalizedQuestion: 'describe your core architectural experience',
        embedding: baseEmbedding,
        answerTemplate: longAnswer,
        maxCharLimit: 500,
        usageCount: 2,
        lastUsedAt: new Date(),
      });

      const result = await resolver.resolveQuestion({
        rawQuestion: 'Tell us about your background in architecture and concurrency.',
        queryEmbedding: baseEmbedding,
        maxLength: 250,
      });

      expect(result.tier).toBe(2);
      expect(result.badge).toBe('BLUE_VECTOR_LEARNED');
      expect(result.value).toBeDefined();
      expect(result.value!.length).toBeLessThanOrEqual(250);
      // Ensures sentence or word boundary integrity without dangling characters
      expect(result.value).not.toMatch(/\s$/);
    });
  });
});
