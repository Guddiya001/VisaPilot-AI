import { JSDOM } from 'jsdom';
import {
  populateRepeaterBlocks,
  type RepeaterConfig,
} from '../extension/dom/repeater.ts';
import { setReactInputValue } from '../extension/dom/filler.ts';

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

describe('Phase 6: Dynamic Repeater Block Automation (+ Add Another)', () => {
  let dom: JSDOM;
  let document: Document;

  interface WorkHistoryEntry {
    company: string;
    role: string;
    start: string;
    end: string;
  }

  const mockWorkHistory: WorkHistoryEntry[] = [
    {
      company: 'UnitedHealth Group',
      role: 'Senior Staff Software Engineer',
      start: '2021-03',
      end: 'Present',
    },
    {
      company: 'DBS Bank',
      role: 'Staff Engineer',
      start: '2018-05',
      end: '2021-02',
    },
    {
      company: 'Walmart Labs',
      role: 'Senior Software Engineer',
      start: '2014-07',
      end: '2018-04',
    },
  ];

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><html><body><div id="app"></div></body></html>', {
      runScripts: 'dangerously',
    });
    document = dom.window.document;
    (globalThis as any).window = dom.window;
    (globalThis as any).document = document;
    (globalThis as any).Event = dom.window.Event;
    (globalThis as any).MutationObserver = dom.window.MutationObserver;
  });

  it('expands repeater blocks for N work history entries in reverse-chronological order', async () => {
    const app = document.getElementById('app')!;

    // Create container
    const container = document.createElement('div');
    container.id = 'work-history-container';
    app.appendChild(container);

    // Initial mounted block (Index 0)
    const initialBlock = createBlockElement(document, 0);
    container.appendChild(initialBlock);

    let addClickCount = 0;

    // "+ Add Another" button
    const addBtn = document.createElement('button');
    addBtn.id = 'add-work-experience-btn';
    addBtn.textContent = '+ Add Another';
    addBtn.addEventListener('click', () => {
      addClickCount++;
      // Simulate async DOM rendering on click
      setTimeout(() => {
        const nextIdx = container.querySelectorAll('.work-history-entry').length;
        const newBlock = createBlockElement(document, nextIdx);
        container.appendChild(newBlock);
      }, 20);
    });
    app.appendChild(addBtn);

    const config: RepeaterConfig<WorkHistoryEntry> = {
      containerElement: container,
      itemBlockSelector: '.work-history-entry',
      addButton: addBtn,
      entries: mockWorkHistory,
      fillEntry: (block, entry) => {
        const companyInput = block.querySelector<HTMLInputElement>('input[name="company"]')!;
        const roleInput = block.querySelector<HTMLInputElement>('input[name="role"]')!;
        setReactInputValue(companyInput, entry.company);
        setReactInputValue(roleInput, entry.role);
      },
      delayBetweenClicksMs: 40,
    };

    await populateRepeaterBlocks(config);

    // 1. Verify button was clicked exactly twice (for 3 entries starting from 1 mounted block)
    expect(addClickCount).toBe(2);

    // 2. Verify container now has exactly 3 blocks
    const blocks = container.querySelectorAll('.work-history-entry');
    expect(blocks.length).toBe(3);

    // 3. Verify reverse-chronological ordering
    const company0 = blocks[0].querySelector<HTMLInputElement>('input[name="company"]')!.value;
    const role0 = blocks[0].querySelector<HTMLInputElement>('input[name="role"]')!.value;
    expect(company0).toBe('UnitedHealth Group');
    expect(role0).toBe('Senior Staff Software Engineer');

    const company1 = blocks[1].querySelector<HTMLInputElement>('input[name="company"]')!.value;
    const role1 = blocks[1].querySelector<HTMLInputElement>('input[name="role"]')!.value;
    expect(company1).toBe('DBS Bank');
    expect(role1).toBe('Staff Engineer');

    const company2 = blocks[2].querySelector<HTMLInputElement>('input[name="company"]')!.value;
    const role2 = blocks[2].querySelector<HTMLInputElement>('input[name="role"]')!.value;
    expect(company2).toBe('Walmart Labs');
    expect(role2).toBe('Senior Software Engineer');
  });

  it('is idempotent on pre-populated repeater blocks', async () => {
    const app = document.getElementById('app')!;

    const container = document.createElement('div');
    container.id = 'work-history-container';
    app.appendChild(container);

    // Pre-populate with 3 already-mounted blocks
    container.appendChild(createBlockElement(document, 0));
    container.appendChild(createBlockElement(document, 1));
    container.appendChild(createBlockElement(document, 2));

    let addClickCount = 0;
    const addBtn = document.createElement('button');
    addBtn.id = 'add-work-experience-btn';
    addBtn.textContent = '+ Add Another';
    addBtn.addEventListener('click', () => {
      addClickCount++;
    });
    app.appendChild(addBtn);

    const config: RepeaterConfig<WorkHistoryEntry> = {
      containerElement: container,
      itemBlockSelector: '.work-history-entry',
      addButton: addBtn,
      entries: mockWorkHistory,
      fillEntry: (block, entry) => {
        const companyInput = block.querySelector<HTMLInputElement>('input[name="company"]')!;
        const roleInput = block.querySelector<HTMLInputElement>('input[name="role"]')!;
        setReactInputValue(companyInput, entry.company);
        setReactInputValue(roleInput, entry.role);
      },
      delayBetweenClicksMs: 20,
    };

    await populateRepeaterBlocks(config);

    // Button should NEVER be clicked when blocks already match entry count
    expect(addClickCount).toBe(0);

    const blocks = container.querySelectorAll('.work-history-entry');
    expect(blocks.length).toBe(3);

    // Entries updated in place
    expect(blocks[0].querySelector<HTMLInputElement>('input[name="company"]')!.value).toBe(
      'UnitedHealth Group'
    );
    expect(blocks[1].querySelector<HTMLInputElement>('input[name="company"]')!.value).toBe(
      'DBS Bank'
    );
    expect(blocks[2].querySelector<HTMLInputElement>('input[name="company"]')!.value).toBe(
      'Walmart Labs'
    );
  });

  function createBlockElement(doc: Document, idx: number): HTMLElement {
    const block = doc.createElement('div');
    block.className = 'work-history-entry';
    block.id = `work-history-entry-${idx}`;

    const companyInput = doc.createElement('input');
    companyInput.name = 'company';
    companyInput.type = 'text';

    const roleInput = doc.createElement('input');
    roleInput.name = 'role';
    roleInput.type = 'text';

    block.appendChild(companyInput);
    block.appendChild(roleInput);
    return block;
  }
});
