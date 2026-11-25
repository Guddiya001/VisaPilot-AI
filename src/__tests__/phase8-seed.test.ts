import {
    SEED_PERSONA,
    SEED_DOMAIN_SELECTORS,
    SEED_QA_TEMPLATES,
    generateEmbedding,
} from '../db/seed.ts';

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
        toBeGreaterThan: (exp: number) =>
            assert.ok(actual > exp, `Expected ${actual} > ${exp}`),
        toBeGreaterThanOrEqual: (exp: number) =>
            assert.ok(actual >= exp, `Expected ${actual} >= ${exp}`),
        toBeLessThanOrEqual: (exp: number) =>
            assert.ok(actual <= exp, `Expected ${actual} <= ${exp}`),
        toMatch: (pattern: RegExp) =>
            assert.ok(pattern.test(actual), `Expected ${actual} to match ${pattern}`),
    });
}

describe('Phase 8: Cold-Start Seed Integrity (Workday, Greenhouse, Lever + 15 Q&As)', () => {
    it('provides 3 reverse-chronological workHistory entries for repeater automation', () => {
        expect(SEED_PERSONA.workHistory).toHaveLength(3);
        expect(SEED_PERSONA.workHistory[0].currentlyWorking).toBe(true);
        expect(SEED_PERSONA.lockedFacts.documents.resumePath).toMatch(/\.pdf$/);
    });

    it('includes repeater_add_btn and file upload selectors across Workday, Greenhouse, and Lever', () => {
        const domains = new Set(SEED_DOMAIN_SELECTORS.map((s) => s.domain));
        expect(domains.has('myworkdayjobs.com')).toBe(true);
        expect(domains.has('greenhouse.io')).toBe(true);
        expect(domains.has('lever.co')).toBe(true);

        const repeaterButtons = SEED_DOMAIN_SELECTORS.filter(
            (s) => s.fieldType === 'repeater_add_btn'
        );
        expect(repeaterButtons.length).toBeGreaterThanOrEqual(2);

        const fileInputs = SEED_DOMAIN_SELECTORS.filter(
            (s) => s.fieldType === 'file'
        );
        expect(fileInputs.length).toBe(3);
    });

    it('contains exactly 15 Q&A templates with valid {{COMPANY_NAME}} / {{ROLE_TITLE}} tokens', () => {
        expect(SEED_QA_TEMPLATES).toHaveLength(15);

        for (const tpl of SEED_QA_TEMPLATES) {
            expect(tpl.answerTemplate.length).toBeLessThanOrEqual(tpl.maxCharLimit);
            expect(tpl.rawQuestion.length).toBeGreaterThan(10);
        }

        const tokenizedCount = SEED_QA_TEMPLATES.filter(
            (t) =>
                t.answerTemplate.includes('{{COMPANY_NAME}}') ||
                t.answerTemplate.includes('{{ROLE_TITLE}}')
        ).length;
        expect(tokenizedCount).toBeGreaterThanOrEqual(6);
    });

    it('generates a valid 768-dimensional embedding vector', async () => {
        const vector = await generateEmbedding(
            SEED_QA_TEMPLATES[0].normalizedQuestion
        );
        expect(vector).toHaveLength(768);
        expect(vector.every((n: any) => typeof n === 'number' && !Number.isNaN(n))).toBe(
            true
        );
    });
});
