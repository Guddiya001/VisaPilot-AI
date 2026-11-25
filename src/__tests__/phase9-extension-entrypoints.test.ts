import { initBackgroundServiceWorker } from '../extension/background/index.ts';
import { handleContentScriptMessage } from '../extension/content/index.ts';

// Universal DOM and test runner initialization
if (typeof window === 'undefined') {
  const { JSDOM } = await import('jsdom');
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="test-root"></div></body></html>', {
    runScripts: 'dangerously',
  });
  (globalThis as any).window = dom.window;
  (globalThis as any).document = dom.window.document;
  (globalThis as any).Event = dom.window.Event;
  (globalThis as any).File = dom.window.File;
}

// Universal test runner adapter
let describe: any;
let it: any;
let expect: any;
let beforeEach: any;
let afterEach: any;

if (process.env.VITEST) {
  const vitest = await import('vitest');
  describe = vitest.describe;
  it = vitest.it;
  expect = vitest.expect;
  beforeEach = vitest.beforeEach;
  afterEach = vitest.afterEach;
} else {
  const nodeTest = await import('node:test');
  const assert = (await import('node:assert/strict')).default;
  describe = nodeTest.describe;
  it = nodeTest.it;
  beforeEach = nodeTest.beforeEach;
  afterEach = nodeTest.afterEach;
  expect = (actual: any) => ({
    toBe: (exp: any) => assert.strictEqual(actual, exp),
    toBeDefined: () => assert.notStrictEqual(actual, undefined),
    toBeNull: () => assert.strictEqual(actual, null),
    toBeGreaterThanOrEqual: (exp: number) =>
      assert.ok(actual >= exp, `Expected ${actual} >= ${exp}`),
    toEqual: (exp: any) => assert.deepStrictEqual(actual, exp),
    toContain: (exp: any) =>
      assert.ok(actual?.includes(exp), `Expected ${actual} to contain ${exp}`),
  });
}

describe('Phase 9: MV3 Entrypoints & Side Panel Controller', () => {
  let originalChrome: any;
  let doc: Document;

  beforeEach(() => {
    originalChrome = (globalThis as any).chrome;
    doc = (globalThis as any).document || window.document;
    doc.body.innerHTML = '<div id="test-root"></div>';
  });

  afterEach(() => {
    (globalThis as any).chrome = originalChrome;
  });

  it('background entrypoint registers MCP bridge and sidePanel behavior', () => {
    let listenerRegistered = false;
    let sidePanelBehaviorSet = false;

    (globalThis as any).chrome = {
      runtime: {
        onMessage: {
          addListener: (fn: any) => {
            if (typeof fn === 'function') listenerRegistered = true;
          },
        },
      },
      sidePanel: {
        setPanelBehavior: async (config: { openPanelOnActionClick: boolean }) => {
          if (config.openPanelOnActionClick === true) {
            sidePanelBehaviorSet = true;
          }
        },
      },
    };

    initBackgroundServiceWorker();

    expect(listenerRegistered).toBe(true);
    expect(sidePanelBehaviorSet).toBe(true);
  });

  it('content script orchestrator executes full scan -> resolve -> repeater -> fill -> badge cycle on tab message', async () => {
    const root = doc.getElementById('test-root')!;
    root.innerHTML = `
      <form id="job-application-form">
        <input id="first_name" name="first_name" data-automation-id="legalNameSection_firstName" />
        <input id="last_name" name="last_name" data-automation-id="legalNameSection_lastName" />
        <input id="email" name="email" data-automation-id="email" />

        <div class="work-history-section">
          <div class="work-entry"><input class="company" name="company_0" /></div>
          <button type="button" id="add-work">+ Add Experience</button>
        </div>

        <input type="file" id="resume-file" name="resume" />
        <input id="dod_clearance" name="dod_clearance" data-question="Active DoD Clearance ID" required />

        <button type="submit" id="submit-btn">Submit</button>
      </form>
    `;

    const addBtn = root.querySelector('#add-work')!;
    addBtn.addEventListener('click', () => {
      const container = root.querySelector('.work-history-section')!;
      const count = container.querySelectorAll('.work-entry').length;
      const entry = doc.createElement('div');
      entry.className = 'work-entry';
      entry.innerHTML = `<input class="company" name="company_${count}" />`;
      container.insertBefore(entry, addBtn);
    });

    // Mock chrome.runtime.sendMessage to mock MCP resolve_form_batch tool
    (globalThis as any).chrome = {
      runtime: {
        sendMessage: (message: any, callback: (res: any) => void) => {
          if (message.type === 'MCP_RPC' && message.params?.name === 'resolve_form_batch') {
            const fields = message.params.arguments?.fields || [];
            const resolutions = fields.map((f: any) => {
              if (f.fieldSignature.includes('firstName')) {
                return {
                  fieldSignature: f.fieldSignature,
                  tier: 1,
                  badge: 'GREEN_EXACT',
                  value: 'Ashish',
                };
              }
              if (f.fieldSignature.includes('lastName')) {
                return {
                  fieldSignature: f.fieldSignature,
                  tier: 1,
                  badge: 'GREEN_EXACT',
                  value: 'Singh',
                };
              }
              if (f.fieldSignature.includes('email')) {
                return {
                  fieldSignature: f.fieldSignature,
                  tier: 1,
                  badge: 'GREEN_EXACT',
                  value: 'ashish@example.com',
                };
              }
              if (f.fieldSignature.includes('dod_clearance')) {
                return {
                  fieldSignature: f.fieldSignature,
                  tier: 3,
                  badge: 'RED_MISSING_FACT',
                  value: '[MISSING_FACT: security_clearance]',
                  question: 'Active DoD Clearance ID',
                  required: true,
                };
              }
              return {
                fieldSignature: f.fieldSignature,
                tier: 1,
                badge: 'GREEN_EXACT',
                value: 'Sample',
              };
            });

            callback({
              success: true,
              data: {
                result: {
                  resolutions,
                  stats: { tier1Hits: 3, tier2VectorHits: 0, tier3LlmCalls: 1 },
                },
              },
            });
            return;
          }

          callback({ success: true, data: {} });
        },
      },
    };

    // Execute message on content script
    const result = await handleContentScriptMessage(
      {
        type: 'EXECUTE_AUTOPILOT',
        mode: 'REVIEW',
        company: 'Stripe',
        role: 'Senior Staff Systems Engineer',
      },
      doc
    );

    // Verify scan, fill, badges, and safety gate metrics
    expect(result.success).toBe(true);
    expect(result.scannedCount).toBeGreaterThanOrEqual(4);
    expect(result.tier1Hits).toBeGreaterThanOrEqual(3);
    expect(result.tier3LlmCalls).toBe(1);
    expect(result.gateStatus).toBe('REVIEW_REQUIRED');
    expect(result.blockedField).toBeDefined();
    expect(result.blockedField?.badge).toBe('RED_MISSING_FACT');

    // Verify inputs populated in DOM
    const firstNameInput = root.querySelector('#first_name') as HTMLInputElement;
    expect(firstNameInput.value).toBe('Ashish');

    // Verify Shadow DOM confidence badges attached
    const badges = root.querySelectorAll('.visapilot-shadow-badge-host');
    expect(badges.length).toBeGreaterThanOrEqual(4);
  });
});
