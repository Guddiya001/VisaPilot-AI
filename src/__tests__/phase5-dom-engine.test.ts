import { JSDOM } from 'jsdom';
import {
  scanFormFields,
  setReactInputValue,
  selectAriaCombobox,
  normalizeFieldValue,
  type ScannedFormField,
} from '../extension/dom/index.ts';

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
  });
}

describe('Phase 5: Resilient DOM Scanner, Shadow DOM & React Synthetic Events', () => {
  let dom: JSDOM;
  let document: Document;
  let window: any;

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>', {
      runScripts: 'dangerously',
    });
    document = dom.window.document;
    window = dom.window;
    // Bind globals for helper compatibility in Node/Vitest
    (globalThis as any).window = window;
    (globalThis as any).document = document;
    (globalThis as any).Event = window.Event;
    (globalThis as any).HTMLInputElement = window.HTMLInputElement;
    (globalThis as any).HTMLTextAreaElement = window.HTMLTextAreaElement;
    (globalThis as any).MutationObserver = window.MutationObserver;
  });

  it('traverses nested open Shadow DOM roots and iframes', () => {
    const root = document.getElementById('root')!;

    // 1. Host element with open shadow root (Level 1)
    const hostEl = document.createElement('div');
    hostEl.id = 'shadow-host-level-1';
    root.appendChild(hostEl);
    const shadowRoot1 = hostEl.attachShadow({ mode: 'open' });

    const label1 = document.createElement('label');
    label1.textContent = 'Workday Email Address';
    label1.htmlFor = 'email-input';
    const input1 = document.createElement('input');
    input1.id = 'email-input';
    input1.setAttribute('data-automation-id', 'legalNameSection_email');
    shadowRoot1.appendChild(label1);
    shadowRoot1.appendChild(input1);

    // 2. Nested host element with open shadow root (Level 2)
    const nestedHost = document.createElement('div');
    nestedHost.id = 'shadow-host-level-2';
    shadowRoot1.appendChild(nestedHost);
    const shadowRoot2 = nestedHost.attachShadow({ mode: 'open' });

    const label2 = document.createElement('label');
    label2.textContent = 'Phone Number';
    label2.htmlFor = 'phone-input';
    const input2 = document.createElement('input');
    input2.id = 'phone-input';
    input2.setAttribute('data-automation-id', 'phone_number');
    shadowRoot2.appendChild(label2);
    shadowRoot2.appendChild(input2);

    // Scan the document
    const fields = scanFormFields(document);

    expect(fields.length).toBe(2);

    // Verify first field (Level 1)
    const emailField = fields.find((f) =>
      f.fieldSignature.includes('legalNameSection_email')
    );
    expect(emailField).toBeDefined();
    expect(emailField!.label).toContain('Email Address');
    expect(emailField!.shadowPath).toEqual(['#shadow-host-level-1']);

    // Verify nested field (Level 2)
    const phoneField = fields.find((f) =>
      f.fieldSignature.includes('phone_number')
    );
    expect(phoneField).toBeDefined();
    expect(phoneField!.label).toContain('Phone Number');
    expect(phoneField!.shadowPath).toEqual([
      '#shadow-host-level-1',
      '#shadow-host-level-2',
    ]);
  });

  it('updates React 18/19 controlled inputs via native prototype value setter', () => {
    const input = document.createElement('input');
    input.type = 'text';
    document.body.appendChild(input);

    // Simulate React 18/19 value tracker: overrides instance value setter
    let reactTrackerVal = '';
    let eventDispatched: string[] = [];

    input.addEventListener('input', (e) => {
      eventDispatched.push('input');
      expect((e as Event).bubbles).toBe(true);
    });
    input.addEventListener('change', (e) => {
      eventDispatched.push('change');
      expect((e as Event).bubbles).toBe(true);
    });
    input.addEventListener('blur', (e) => {
      eventDispatched.push('blur');
    });

    // React's internal value tracker setter hook
    Object.defineProperty(input, '_valueTracker', {
      value: {
        getValue: () => reactTrackerVal,
        setValue: (v: string) => {
          reactTrackerVal = v;
        },
      },
      writable: true,
    });

    setReactInputValue(input, 'Ashish Kumar Singh');

    expect(input.value).toBe('Ashish Kumar Singh');
    expect(eventDispatched).toContain('input');
    expect(eventDispatched).toContain('change');
    expect(eventDispatched).toContain('blur');
  });

  it('handles async ARIA combobox dropdowns', async () => {
    const container = document.createElement('div');
    container.id = 'combobox-container';

    const combobox = document.createElement('input');
    combobox.setAttribute('role', 'combobox');
    combobox.setAttribute('aria-expanded', 'false');
    container.appendChild(combobox);
    document.body.appendChild(container);

    let clickedOption = '';

    // When combobox is clicked or typed into, simulate async portal rendering
    combobox.addEventListener('click', () => {
      combobox.setAttribute('aria-expanded', 'true');
      setTimeout(() => {
        const listbox = document.createElement('div');
        listbox.setAttribute('role', 'listbox');

        const opt1 = document.createElement('div');
        opt1.setAttribute('role', 'option');
        opt1.textContent = 'United Kingdom';
        opt1.addEventListener('click', () => {
          clickedOption = 'United Kingdom';
        });

        const opt2 = document.createElement('div');
        opt2.setAttribute('role', 'option');
        opt2.textContent = 'United States';
        opt2.addEventListener('click', () => {
          clickedOption = 'United States';
        });

        listbox.appendChild(opt1);
        listbox.appendChild(opt2);
        document.body.appendChild(listbox);
      }, 50);
    });

    const success = await selectAriaCombobox(combobox, 'United States');

    expect(success).toBe(true);
    expect(clickedOption).toBe('United States');
  });

  it('normalizes ISO dates and international phone numbers per field mask', () => {
    // 1. Date normalization: MM/YYYY
    const dateMonthYear = normalizeFieldValue('2023-10-01', {
      fieldType: 'text',
      formatMask: 'MM/YYYY',
    });
    expect(dateMonthYear).toBe('10/2023');

    // 2. Date normalization: DD/MM/YYYY
    const dateDayMonthYear = normalizeFieldValue('2023-10-01', {
      fieldType: 'text',
      formatMask: 'DD/MM/YYYY',
    });
    expect(dateDayMonthYear).toBe('01/10/2023');

    // 3. Date normalization: Split Month and Year
    const dateSplit = normalizeFieldValue('2023-10-01', {
      fieldType: 'text',
      formatMask: 'MONTH_NAME_AND_YEAR',
    });
    expect(dateSplit).toBe('October 2023');

    // 4. Phone normalization: E.164 without symbols
    const phoneClean = normalizeFieldValue('+91-9876543210', {
      fieldType: 'text',
      formatMask: 'E.164_CLEAN',
    });
    expect(phoneClean).toBe('+919876543210');
  });
});
