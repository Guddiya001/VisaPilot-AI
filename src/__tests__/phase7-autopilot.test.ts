import { JSDOM } from 'jsdom';
import {
  AutopilotStateMachine,
  attachShadowConfidenceBadge,
  SafetyGateBlockedError,
  type AutopilotConfig,
  type FieldResolutionStatus,
} from '../extension/autopilot/state-machine.ts';

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
  });
}

describe('Phase 7: Autopilot State Machine, Shadow UI Badges & Pre-Submit Safety Gate', () => {
  let dom: JSDOM;
  let document: Document;

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><html><body><form id="job-form"></form></body></html>', {
      runScripts: 'dangerously',
    });
    document = dom.window.document;
    (globalThis as any).window = dom.window;
    (globalThis as any).document = document;
    (globalThis as any).Event = dom.window.Event;
    (globalThis as any).HTMLElement = dom.window.HTMLElement;
    (globalThis as any).HTMLInputElement = dom.window.HTMLInputElement;
  });

  it('renders isolated Shadow DOM confidence badges without mutating host styles', () => {
    const form = document.getElementById('job-form')!;
    const input = document.createElement('input');
    input.id = 'first-name-input';
    form.appendChild(input);

    // Initial styles check
    const initialInputClass = input.className;

    // Attach GREEN_EXACT badge
    const badgeContainer = attachShadowConfidenceBadge(input, 'GREEN_EXACT', {
      confidence: 1.0,
      message: 'Exact Selector Match',
    });

    expect(badgeContainer).toBeDefined();
    expect(badgeContainer.shadowRoot).toBeDefined();

    // Verify shadow root contains badge element
    const shadowRoot = badgeContainer.shadowRoot!;
    const badgeEl = shadowRoot.querySelector('.visapilot-badge');
    expect(badgeEl).toBeDefined();
    expect(badgeEl!.textContent).toContain('GREEN_EXACT');

    // Verify host input styles or classes were not polluted
    expect(input.className).toBe(initialInputClass);

    // Verify other badges: BLUE, AMBER, RED
    const blueBadge = attachShadowConfidenceBadge(input, 'BLUE_VECTOR_LEARNED', {
      similarity: 0.94,
    });
    expect(blueBadge.shadowRoot!.textContent).toContain('BLUE_VECTOR_LEARNED');

    const amberBadge = attachShadowConfidenceBadge(input, 'AMBER_LLM_DRAFT');
    expect(amberBadge.shadowRoot!.textContent).toContain('AMBER_LLM_DRAFT');

    const redBadge = attachShadowConfidenceBadge(input, 'RED_MISSING_FACT');
    expect(redBadge.shadowRoot!.textContent).toContain('RED_MISSING_FACT');
  });

  it('halts Autopilot when any required field is RED or AMBER', async () => {
    const form = document.getElementById('job-form')!;

    const input1 = document.createElement('input');
    input1.id = 'name-field';
    form.appendChild(input1);

    const input2 = document.createElement('input');
    input2.id = 'clearance-field';
    form.appendChild(input2);

    const mockFields: FieldResolutionStatus[] = [
      {
        element: input1,
        fieldSignature: '#name-field',
        tier: 1,
        badge: 'GREEN_EXACT',
        value: 'Ashish',
        required: true,
      },
      {
        element: input2,
        fieldSignature: '#clearance-field',
        tier: 3,
        badge: 'RED_MISSING_FACT',
        value: '[MISSING_FACT: security_clearance]',
        required: true,
      },
    ];

    const autopilot = new AutopilotStateMachine({
      mode: 'AUTOPILOT',
      formElement: form as HTMLFormElement,
      mcpClient: {
        async callTool() {
          return { content: [{ type: 'text', text: '{}' }] };
        },
      },
    });

    await autopilot.processResolvedFields(mockFields);

    // 1. Assert state machine halted and transitioned to REVIEW_REQUIRED
    expect(autopilot.state).toBe('REVIEW_REQUIRED');

    // 2. Assert submitForm() is strictly blocked and throws SafetyGateBlockedError
    await expect(autopilot.submitForm()).rejects.toThrow(SafetyGateBlockedError);

    // 3. Assert the red field is flagged/focused for side-panel review
    expect(autopilot.focusedField).toBeDefined();
    expect(autopilot.focusedField?.fieldSignature).toBe('#clearance-field');
    expect(autopilot.focusedField?.badge).toBe('RED_MISSING_FACT');
  });

  it('auto-submits and triggers learn_from_submission when 100% GREEN or BLUE', async () => {
    const form = document.getElementById('job-form')!;

    const input1 = document.createElement('input');
    input1.id = 'name-field';
    form.appendChild(input1);

    const input2 = document.createElement('input');
    input2.id = 'why-us-field';
    form.appendChild(input2);

    let submitDispatched = false;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      submitDispatched = true;
    });

    const submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.id = 'submit-btn';
    submitBtn.addEventListener('click', () => {
      submitDispatched = true;
    });
    form.appendChild(submitBtn);

    let mcpToolCalled = '';
    let mcpToolArgs: any = null;

    const mockMcpClient = {
      async callTool({ name, arguments: args }: { name: string; arguments: any }) {
        mcpToolCalled = name;
        mcpToolArgs = args;
        return { content: [{ type: 'text', text: JSON.stringify({ success: true, auditId: 'audit-123' }) }] };
      },
    };

    const mockFields: FieldResolutionStatus[] = [
      {
        element: input1,
        fieldSignature: '#name-field',
        cssOrXpath: '#name-field',
        fieldType: 'text',
        tier: 1,
        badge: 'GREEN_EXACT',
        value: 'Ashish',
        required: true,
      },
      {
        element: input2,
        fieldSignature: '#why-us-field',
        cssOrXpath: '#why-us-field',
        fieldType: 'text',
        question: 'Why do you want to join our team?',
        tier: 2,
        badge: 'BLUE_VECTOR_LEARNED',
        value: 'I admire Stripe for its distributed payment infrastructure.',
        similarity: 0.95,
        required: true,
      },
    ];

    const autopilot = new AutopilotStateMachine({
      mode: 'AUTOPILOT',
      formElement: form as HTMLFormElement,
      submitButton: submitBtn,
      mcpClient: mockMcpClient,
      applicationContext: {
        personaId: '00000000-0000-0000-0000-000000000001',
        companyName: 'Stripe',
        roleTitle: 'Staff Engineer',
        domain: 'stripe.com',
        portalUrl: 'https://stripe.com/jobs/1',
      },
    });

    await autopilot.processResolvedFields(mockFields);

    // 1. In 100% Green/Blue, canAutoSubmit is true and auto-submits
    await autopilot.submitForm();

    // 2. Assert form submit was triggered
    expect(submitDispatched).toBe(true);

    // 3. Assert learn_from_submission MCP tool was called
    expect(mcpToolCalled).toBe('learn_from_submission');
    expect(mcpToolArgs).toBeDefined();
    expect(mcpToolArgs.companyName).toBe('Stripe');
    expect(mcpToolArgs.resolutionStats.tier1Hits).toBe(1);
    expect(mcpToolArgs.resolutionStats.tier2VectorHits).toBe(1);
    expect(mcpToolArgs.resolutionStats.tier3LlmCalls).toBe(0);

    // 4. Assert final state is SUBMITTED
    expect(autopilot.state).toBe('SUBMITTED');
  });
});
