import {
  PiiScrubber,
  scrubPii,
  rehydratePii,
} from '../lib/engine/pii-scrubber.ts';
import {
  Tier3LlmFallback,
  FactLockViolationError,
  type LlmProvider,
} from '../lib/engine/tier3-llm.ts';
import type { PersonaData } from '../lib/engine/resolver.ts';

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
    toThrow: (expErrorClassOrMsg?: any) => {
      let threw = false;
      try {
        if (typeof actual === 'function') actual();
      } catch (err: any) {
        threw = true;
        if (typeof expErrorClassOrMsg === 'function') {
          assert.ok(err instanceof expErrorClassOrMsg, `Expected error instanceof ${expErrorClassOrMsg.name}`);
        } else if (typeof expErrorClassOrMsg === 'string') {
          assert.ok(err.message.includes(expErrorClassOrMsg), `Expected message to include ${expErrorClassOrMsg}`);
        }
      }
      assert.ok(threw, 'Expected function to throw');
    },
    rejects: {
      toThrow: async (expErrorClassOrMsg?: any) => {
        let threw = false;
        try {
          await actual;
        } catch (err: any) {
          threw = true;
          if (typeof expErrorClassOrMsg === 'function') {
            assert.ok(err instanceof expErrorClassOrMsg, `Expected error instanceof ${expErrorClassOrMsg.name}`);
          } else if (typeof expErrorClassOrMsg === 'string') {
            assert.ok(err.message.includes(expErrorClassOrMsg), `Expected message to include ${expErrorClassOrMsg}`);
          }
        }
        assert.ok(threw, 'Expected promise to reject');
      },
    },
    not: {
      toContain: (exp: any) =>
        assert.ok(!actual?.includes(exp), `Expected ${actual} NOT to contain ${exp}`),
    },
  });
}

describe('Phase 2: PII Scrubber, Fact-Locking & Tier 3 Guarded LLM Fallback', () => {
  const mockPersona: PersonaData = {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Ashish Kumar Singh',
    isActive: true,
    contactInfo: {
      firstName: 'Ashish',
      lastName: 'Singh',
      email: 'ashish@example.com',
      phone: '+91-9876543210',
      passport: 'Z9876543',
    },
    workHistory: [
      {
        company: 'UnitedHealth Group',
        role: 'Senior Staff Software Engineer',
        startDate: '2021-03-01',
        endDate: 'Present',
      },
    ],
    education: [
      {
        institution: 'ABES Engineering College',
        degree: 'Bachelor of Technology',
      },
    ],
    skills: ['Python', 'TypeScript'],
    demographicsEeo: {},
    visaWorkAuth: {},
    lockedFacts: {
      employers: ['UnitedHealth Group', 'DBS Bank', 'Walmart Labs'],
      degreeTitles: ['Bachelor of Technology'],
      verifiedDates: {
        'UnitedHealth Group': { start: '2021-03-01', end: 'Present' },
      },
      passportNumber: 'Z9876543',
    },
  };

  it('scrubs and rehydrates PII around LLM calls', async () => {
    let capturedOutboundPrompt = '';

    const mockLlm: LlmProvider = {
      async generate(prompt: string) {
        capturedOutboundPrompt = prompt;
        // The LLM operates only on scrubbed tokens
        return 'Please contact me at {{PII_EMAIL_1}} or call {{PII_PHONE_1}}. Verified passport: {{PII_PASSPORT_1}}.';
      },
    };

    const tier3 = new Tier3LlmFallback(mockLlm);

    const promptContext =
      'Candidate Ashish Kumar Singh (email: ashish@example.com, phone: +91-9876543210, passport: Z9876543). Write a short intro confirmation.';

    const result = await tier3.generateGuardedResponse({
      rawPrompt: promptContext,
      persona: mockPersona,
      question: 'Provide your verified contact details and passport number.',
    });

    // 1. Verify outbound LLM prompt strictly scrubbed PII
    expect(capturedOutboundPrompt).toContain('{{PII_PHONE_1}}');
    expect(capturedOutboundPrompt).toContain('{{PII_PASSPORT_1}}');
    expect(capturedOutboundPrompt).toContain('{{PII_EMAIL_1}}');
    expect(capturedOutboundPrompt).not.toContain('+91-9876543210');
    expect(capturedOutboundPrompt).not.toContain('Z9876543');
    expect(capturedOutboundPrompt).not.toContain('ashish@example.com');

    // 2. Verify returned response rehydrated the exact PII values
    expect(result.tier).toBe(3);
    expect(result.badge).toBe('AMBER_LLM_DRAFT');
    expect(result.llmCalls).toBe(1);
    expect(result.value).toContain('ashish@example.com');
    expect(result.value).toContain('+91-9876543210');
    expect(result.value).toContain('Z9876543');
    expect(result.value).toBe(
      'Please contact me at ashish@example.com or call +91-9876543210. Verified passport: Z9876543.'
    );
  });

  it('emits RED_MISSING_FACT instead of hallucinating', async () => {
    let llmCallCount = 0;
    const mockLlm: LlmProvider = {
      async generate() {
        llmCallCount++;
        return 'My clearance number is 123456789.';
      },
    };

    const tier3 = new Tier3LlmFallback(mockLlm);

    const result = await tier3.generateGuardedResponse({
      rawPrompt: 'Provide your Active US DoD Secret Clearance Number.',
      persona: mockPersona,
      question: 'What is your Active US DoD Secret Clearance Number?',
      requiredFactKeys: ['security_clearance'],
    });

    expect(result.tier).toBe(3);
    expect(result.badge).toBe('RED_MISSING_FACT');
    expect(result.value).toBe('[MISSING_FACT: security_clearance]');
    expect(result.missingFactKey).toBe('security_clearance');
    expect(llmCallCount).toBe(0); // Zero LLM calls when required fact is missing!
  });

  it('rejects LLM drafts that mutate locked facts', async () => {
    // LLM attempts to alter UnitedHealth Group to United Health Corporation and alter start date
    const mockLlmWithMutations: LlmProvider = {
      async generate() {
        return 'I worked as Senior Staff Software Engineer at United Health Corporation from 2018-01-01 to Present.';
      },
    };

    const tier3 = new Tier3LlmFallback(mockLlmWithMutations);

    await expect(
      tier3.generateGuardedResponse({
        rawPrompt: 'Describe your recent employment dates and company name.',
        persona: mockPersona,
        question: 'Where did you work and during what dates?',
      })
    ).rejects.toThrow(FactLockViolationError);
  });
});
