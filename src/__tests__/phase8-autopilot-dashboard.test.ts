import {
  computeTelemetrySummary,
  extractHaltedFields,
  applyFactResolutionToPayload,
  type AuditRecordDTO,
  type SubmittedFieldSnapshot,
} from '../../apps/web/src/app/autopilot/actions.ts';

// Universal test runner adapter
let describe: any;
let it: any;
let expect: any;

if (process.env.VITEST) {
  const vitest = await import('vitest');
  describe = vitest.describe;
  it = vitest.it;
  expect = vitest.expect;
} else {
  const nodeTest = await import('node:test');
  const assert = (await import('node:assert/strict')).default;
  describe = nodeTest.describe;
  it = nodeTest.it;
  expect = (actual: any) => ({
    toBe: (exp: any) => assert.strictEqual(actual, exp),
    toBeDefined: () => assert.notStrictEqual(actual, undefined),
    toHaveLength: (len: number) => assert.strictEqual(actual?.length, len),
    toEqual: (exp: any) => assert.deepStrictEqual(actual, exp),
  });
}

describe('Phase 8: Autopilot Dashboard Telemetry & RED_MISSING_FACT Resolver', () => {
  it('calculates Zero-LLM resolution percentage accurately across Tier 1, 2, and 3', async () => {
    const mockAudits = [
      {
        status: 'SUBMITTED',
        resolutionStats: { tier1Hits: 14, tier2VectorHits: 5, tier3LlmCalls: 1 },
      },
      {
        status: 'HALTED_GATE',
        resolutionStats: { tier1Hits: 16, tier2VectorHits: 3, tier3LlmCalls: 1 },
      },
    ];

    const summary = await computeTelemetrySummary(mockAudits);

    expect(summary.totalApplications).toBe(2);
    expect(summary.tier1Hits).toBe(30);
    expect(summary.tier2VectorHits).toBe(8);
    expect(summary.tier3LlmCalls).toBe(2);
    expect(summary.totalFieldsResolved).toBe(40);
    // (30 + 8) / 40 = 95%
    expect(summary.zeroLlmResolutionRate).toBe(95);
    expect(summary.haltedGatesCount).toBe(1);
  });

  it('extracts RED_MISSING_FACT keys from halted application payloads', async () => {
    const audits: AuditRecordDTO[] = [
      {
        id: 'audit-101',
        personaId: 'persona-1',
        companyName: 'Stripe',
        roleTitle: 'Staff AI Engineer',
        portalUrl: 'https://stripe.greenhouse.io/jobs/123',
        domain: 'greenhouse.io',
        status: 'HALTED_GATE',
        submittedAt: new Date().toISOString(),
        resolutionStats: { tier1Hits: 10, tier2VectorHits: 4, tier3LlmCalls: 1 },
        submittedPayload: [
          {
            fieldSignature: 'gh_first_name',
            label: 'First Name',
            value: 'Ashish',
            badge: 'GREEN_EXACT',
          },
          {
            fieldSignature: 'gh_clearance_id',
            label: 'Active DoD Security Clearance Number',
            questionText: 'Please provide your active security clearance ID',
            value: '[MISSING_FACT: security_clearance_id]',
            badge: 'RED_MISSING_FACT',
          },
        ],
      },
    ];

    const halted = await extractHaltedFields(audits);

    expect(halted).toHaveLength(1);
    expect(halted[0].auditId).toBe('audit-101');
    expect(halted[0].missingFactKey).toBe('security_clearance_id');
    expect(halted[0].badge).toBe('RED_MISSING_FACT');
  });

  it('locks a verified fact into lockedFacts, replaces [MISSING_FACT], and promotes status to READY_TO_SUBMIT', async () => {
    const initialLockedFacts = {
      currentEmployer: 'Persistent Systems',
    };

    const payload: SubmittedFieldSnapshot[] = [
      {
        fieldSignature: 'gh_first_name',
        label: 'First Name',
        value: 'Ashish',
        badge: 'GREEN_EXACT',
      },
      {
        fieldSignature: 'gh_security_clearance',
        label: 'Security Clearance Status',
        value: 'Clearance status: [MISSING_FACT: security_clearance_id]',
        badge: 'RED_MISSING_FACT',
      },
    ];

    const result = await applyFactResolutionToPayload({
      currentLockedFacts: initialLockedFacts,
      submittedPayload: payload,
      fieldSignature: 'gh_security_clearance',
      missingFactKey: 'security_clearance_id',
      verifiedValue: 'Not Applicable (Citizen / Standard Background Check)',
    });

    expect(result.updatedLockedFacts.security_clearance_id).toBe(
      'Not Applicable (Citizen / Standard Background Check)'
    );
    expect(result.updatedPayload[1].value).toBe(
      'Clearance status: Not Applicable (Citizen / Standard Background Check)'
    );
    expect(result.updatedPayload[1].badge).toBe('GREEN_EXACT');
    expect(result.newAuditStatus).toBe('READY_TO_SUBMIT');
  });
});
