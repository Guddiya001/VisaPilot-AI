import {
  ApplicationLearner,
  generalizeAnswerTemplate,
  type SubmissionPayload,
} from '../lib/engine/learner.ts';
import {
  TierResolver,
  createInMemoryResolverStore,
  type PersonaData,
} from '../lib/engine/resolver.ts';

// Universal test runner adapter
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
    toContain: (exp: any) =>
      assert.ok(actual?.includes(exp), `Expected ${actual} to contain ${exp}`),
    toEqual: (exp: any) => assert.deepStrictEqual(actual, exp),
    not: {
      toContain: (exp: any) =>
        assert.ok(!actual?.includes(exp), `Expected ${actual} NOT to contain ${exp}`),
    },
  });
}

describe('Phase 3: Self-Learning "Commit-on-Submit" Loop', () => {
  let store: any;
  let learner: ApplicationLearner;
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
    workHistory: [],
    education: [],
    skills: ['TypeScript', 'Next.js'],
    demographicsEeo: {},
    visaWorkAuth: {},
    lockedFacts: {
      employers: ['UnitedHealth Group'],
      passportNumber: 'Z9876543',
    },
  };

  // Mock deterministic embedding service for tests: creates unit vector seeded by string
  const mockEmbeddingService = {
    async generateEmbedding(text: string): Promise<number[]> {
      const vec = new Array(768).fill(0);
      let hash = 0;
      for (let i = 0; i < text.length; i++) {
        hash = (hash << 5) - hash + text.charCodeAt(i);
        hash |= 0;
      }
      const idx = Math.abs(hash) % 768;
      vec[idx] = 1.0;
      return vec;
    },
  };

  beforeEach(() => {
    store = createInMemoryResolverStore();
    store.seedPersona(mockPersona);
    learner = new ApplicationLearner(store, mockEmbeddingService);
    resolver = new TierResolver(store);
  });

  it('generalizes company and role names into template tokens on save', async () => {
    const rawAnswer =
      'I have closely followed Vercel and would love to contribute as a Senior Platform Engineer to Next.js and Turborepo.';

    const generalized = generalizeAnswerTemplate(rawAnswer, {
      companyName: 'Vercel',
      roleTitle: 'Senior Platform Engineer',
    });

    expect(generalized).toBe(
      'I have closely followed {{COMPANY_NAME}} and would love to contribute as a {{ROLE_TITLE}} to Next.js and Turborepo.'
    );
    expect(generalized).not.toContain('Vercel');
    expect(generalized).not.toContain('Senior Platform Engineer');
  });

  it('human edits overwrite LLM drafts and boost usageCount', async () => {
    // 1. Submit an application with a human-refined answer that replaced an AMBER_LLM_DRAFT
    const submission: SubmissionPayload = {
      personaId: mockPersona.id,
      companyName: 'Vercel',
      roleTitle: 'Senior Platform Engineer',
      domain: 'vercel.com',
      portalUrl: 'https://vercel.com/careers/senior-platform-engineer',
      fields: [
        {
          fieldSignature: 'textarea[name="why_us"]',
          cssOrXpath: 'textarea[name="why_us"]',
          fieldType: 'text',
          question: 'Why do you want to join our engineering team?',
          value:
            'At Vercel, as a Senior Platform Engineer, my focus will be on low-latency edge caching and build acceleration.',
          originalBadge: 'AMBER_LLM_DRAFT',
          wasEditedByHuman: true,
          category: 'motivation',
        },
      ],
      resolutionStats: {
        tier1Hits: 0,
        tier2VectorHits: 0,
        tier3LlmCalls: 1,
      },
    };

    await learner.commitOnSubmit(submission);

    // 2. Query for a new company ("Cloudflare") with the same question
    // Query embedding matches because normalized question is identical
    const queryEmbedding = await mockEmbeddingService.generateEmbedding(
      'Why do you want to join our engineering team?'
    );

    const result = await resolver.resolveQuestion({
      rawQuestion: 'Why do you want to join our engineering team?',
      queryEmbedding,
      context: {
        companyName: 'Cloudflare',
        roleTitle: 'Senior Platform Engineer',
      },
    });

    // 3. Assert Tier 2 vector hit resolves immediately with ZERO LLM calls!
    expect(result.tier).toBe(2);
    expect(result.badge).toBe('BLUE_VECTOR_LEARNED');
    expect(result.llmCalls).toBe(0);
    expect(result.value).toContain('Cloudflare');
    expect(result.value).toContain('Senior Platform Engineer');
    expect(result.value).toBe(
      'At Cloudflare, as a Senior Platform Engineer, my focus will be on low-latency edge caching and build acceleration.'
    );
  });

  it('learns new domain selectors from manual field mappings', async () => {
    // 1. Submit an application on jobs.lever.co where an unmapped input was manually filled with LinkedIn URL
    const submission: SubmissionPayload = {
      personaId: mockPersona.id,
      companyName: 'Stripe',
      roleTitle: 'Staff Engineer',
      domain: 'jobs.lever.co',
      portalUrl: 'https://jobs.lever.co/stripe/12345',
      fields: [
        {
          fieldSignature: 'input[name="urls[LinkedIn]"]',
          cssOrXpath: 'input[name="urls[LinkedIn]"]',
          fieldType: 'text',
          value: 'https://linkedin.com/in/ashish',
          originalBadge: 'CACHE_MISS',
          wasEditedByHuman: true,
        },
      ],
      resolutionStats: {
        tier1Hits: 0,
        tier2VectorHits: 0,
        tier3LlmCalls: 0,
      },
    };

    await learner.commitOnSubmit(submission);

    // 2. Now resolve the exact same selector on jobs.lever.co
    const result = await resolver.resolveField({
      domain: 'jobs.lever.co',
      fieldSignature: 'input[name="urls[LinkedIn]"]',
    });

    // 3. Assert it now resolves via Tier 1 GREEN_EXACT with ZERO LLM calls!
    expect(result.tier).toBe(1);
    expect(result.badge).toBe('GREEN_EXACT');
    expect(result.value).toBe('https://linkedin.com/in/ashish');
    expect(result.fieldKey).toBe('contactInfo.linkedinUrl');
    expect(result.llmCalls).toBe(0);
  });

  it('writes immutable audit record with tier hit metrics', async () => {
    const submission: SubmissionPayload = {
      personaId: mockPersona.id,
      companyName: 'Monzo',
      roleTitle: 'Senior Staff Backend Engineer',
      domain: 'job-boards.greenhouse.io',
      portalUrl: 'https://job-boards.greenhouse.io/monzo/jobs/6036797',
      jdRawText: 'Senior Staff Backend Engineer distributed systems Monzo UK',
      resumeVersionPath: '/resumes/monzo_v2.pdf',
      fields: [
        {
          fieldSignature: 'input[name="first_name"]',
          cssOrXpath: '#first_name',
          fieldType: 'text',
          value: 'Ashish',
          originalBadge: 'GREEN_EXACT',
        },
      ],
      resolutionStats: {
        tier1Hits: 8,
        tier2VectorHits: 4,
        tier3LlmCalls: 1,
      },
    };

    const auditId = await learner.commitOnSubmit(submission);

    expect(auditId).toBeDefined();

    const auditRecord = await store.getAuditRecord(auditId);
    expect(auditRecord).toBeDefined();
    expect(auditRecord.companyName).toBe('Monzo');
    expect(auditRecord.roleTitle).toBe('Senior Staff Backend Engineer');
    expect(auditRecord.domain).toBe('job-boards.greenhouse.io');
    expect(auditRecord.portalUrl).toBe(
      'https://job-boards.greenhouse.io/monzo/jobs/6036797'
    );
    expect(auditRecord.status).toBe('SUBMITTED');
    expect(auditRecord.resolutionStats).toEqual({
      tier1Hits: 8,
      tier2VectorHits: 4,
      tier3LlmCalls: 1,
    });
  });
});
