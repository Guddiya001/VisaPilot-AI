import { POST as parsePersonaRoute } from '../../apps/web/src/app/api/persona/parse/route.ts';
import {
    CryptoVault,
    type VisaPilotMemorySnapshot,
    type MemoryPersistenceAdapter,
} from '../lib/engine/crypto-vault.ts';

// Universal test runner adapter
let describe: any;
let it: any;
let expect: any;
let vi: any;

if (process.env.VITEST) {
    const vitest = await import('vitest');
    describe = vitest.describe;
    it = vitest.it;
    expect = vitest.expect;
    vi = vitest.vi;
} else {
    const nodeTest = await import('node:test');
    const assert = (await import('node:assert/strict')).default;
    describe = nodeTest.describe;
    it = nodeTest.it;
    vi = {
        fn: () => {
            let calls = 0;
            const fn: any = async (...args: any[]) => {
                calls++;
                return fn._resolvedValue;
            };
            fn._resolvedValue = undefined;
            fn.mockResolvedValue = (val: any) => {
                fn._resolvedValue = val;
                return fn;
            };
            fn.mock = { calls: [] };
            Object.defineProperty(fn, 'callCount', { get: () => calls });
            return fn;
        },
    };
    expect = (actual: any) => ({
        toBe: (exp: any) => assert.strictEqual(actual, exp),
        toBeGreaterThanOrEqual: (exp: number) => assert.ok(actual >= exp),
        toContain: (str: string) => assert.ok(String(actual).includes(str)),
        toHaveLength: (len: number) => assert.strictEqual(actual?.length, len),
        toHaveBeenCalledTimes: (times: number) =>
            assert.strictEqual(actual?.callCount ?? actual?.mock?.calls?.length ?? 0, times),
        toEqual: (exp: any) => {
            if (exp?._arrayContaining) {
                for (const item of exp._arrayContaining) {
                    assert.ok(actual?.includes(item));
                }
            } else {
                assert.deepStrictEqual(actual, exp);
            }
        },
        not: {
            toContain: (str: string) => assert.ok(!String(actual).includes(str)),
        },
        rejects: {
            toThrow: async (pattern: RegExp) => {
                let threw = false;
                try {
                    await actual;
                } catch (err: any) {
                    threw = true;
                    assert.match(err.message, pattern);
                }
                assert.ok(threw, 'Expected promise to reject with an error');
            },
        },
    });
    expect.arrayContaining = (arr: any[]) => ({ _arrayContaining: arr });
}

const SAMPLE_RESUME_TEXT = `
Ashish Kumar Singh
Senior Engineering Lead
Email: ashish.singh@example.com | Phone: +91-9876543210
Location: Noida, Uttar Pradesh, India
LinkedIn: https://www.linkedin.com/in/ashish-kumar-singh
GitHub: https://github.com/ashish-singh

EXPERIENCE
Senior Engineering Lead | Persistent Systems | 2023-10 - Present
- Architected enterprise Generative AI copilot platforms using Python, FastAPI, LangGraph, and pgvector.

Senior Software Engineer | LTIMindtree | 2022-06 - 2023-03
- Built high-throughput enterprise data integrations for DBS Bank using Java, Spring Boot, and PostgreSQL.

Senior Software Engineer | Coforge | 2020-10 - 2022-06
- Developed full-stack retail integration systems using React, Next.js, Node.js, and TypeScript.

EDUCATION
Master of Computer Applications (MCA) | UP Technical University | 2013 - 2016

SKILLS
Python, TypeScript, JavaScript, FastAPI, React, Next.js, Node.js, LangChain, LangGraph, MCP, pgvector, Docker, AWS
`.trim();

describe('Step 6 (Phase 10): Resume-to-Persona Onboarding & AES-256-GCM CryptoVault', () => {
    it('parses an uploaded PDF/DOCX resume via /api/persona/parse into structured PersonaData', async () => {
        // Construct a mock PDF buffer containing embedded resume text streams
        const mockPdfContent = `%PDF-1.4\nBT (${SAMPLE_RESUME_TEXT.replace(/\n/g, ') Tj T* (')}) Tj ET\n%%EOF`;
        const fileBlob = new Blob([Buffer.from(mockPdfContent, 'utf-8')], {
            type: 'application/pdf',
        });

        const formData = new FormData();
        formData.append('file', fileBlob, 'Ashish_Singh_Resume.pdf');

        const request = new Request('http://localhost:3000/api/persona/parse', {
            method: 'POST',
            body: formData,
        });

        const response = await parsePersonaRoute(request);
        expect(response.status).toBe(200);

        const payload = await response.json();
        expect(payload.ok).toBe(true);

        const persona = payload.personaData;
        expect(persona.contactInfo.firstName).toBe('Ashish');
        expect(persona.contactInfo.lastName).toBe('Singh');
        expect(persona.contactInfo.email).toBe('ashish.singh@example.com');
        expect(persona.contactInfo.phone).toBe('+91-9876543210');
        expect(persona.contactInfo.linkedinUrl).toContain('linkedin.com/in/ashish-kumar-singh');

        // Verify workHistory extraction and reverse-chronological sorting
        expect(persona.workHistory.length).toBeGreaterThanOrEqual(3);
        expect(persona.workHistory[0].company).toBe('Persistent Systems');
        expect(persona.workHistory[0].currentlyWorking).toBe(true);
        expect(persona.workHistory[1].company).toBe('LTIMindtree');

        // Verify skills & lockedFacts extraction
        expect(persona.skills.all).toEqual(
            expect.arrayContaining(['Python', 'TypeScript', 'FastAPI', 'Next.js', 'pgvector'])
        );
        expect(persona.lockedFacts.currentEmployer).toBe('Persistent Systems');
    });

    it('encrypts personas, domainSelectors, and qaSemanticMemory into an opaque .visapilot.enc binary', () => {
        const sampleSnapshot: VisaPilotMemorySnapshot = {
            version: 1,
            exportedAt: new Date().toISOString(),
            personas: [
                {
                    id: 'p-101',
                    name: 'Senior GenAI Engineering Lead',
                    isActive: true,
                    contactInfo: {
                        firstName: 'Ashish',
                        lastName: 'Singh',
                        email: 'ashish.singh@example.com',
                        passportNumber: 'Z9988776',
                    },
                    workHistory: [{ company: 'Persistent Systems', jobTitle: 'Senior Engineering Lead' }],
                    education: [{ degree: 'MCA', institution: 'UPTU' }],
                    skills: { all: ['Python', 'TypeScript', 'pgvector'] },
                    lockedFacts: { currentEmployer: 'Persistent Systems' },
                },
            ],
            domainSelectors: [
                {
                    domain: 'myworkdayjobs.com',
                    fieldSignature: 'workday_first_name',
                    cssOrXpath: 'input[data-automation-id="legalNameSection_firstName"]',
                    mappedProfileKey: 'contactInfo.firstName',
                    fieldType: 'text',
                    confidence: 1.0,
                },
            ],
            qaSemanticMemory: [
                {
                    category: 'motivation',
                    rawQuestion: 'Why do you want to join our engineering team?',
                    normalizedQuestion: 'Why join {{COMPANY_NAME}} as {{ROLE_TITLE}}?',
                    answerTemplate: 'Excited to build GenAI systems at {{COMPANY_NAME}} as {{ROLE_TITLE}}.',
                    embedding: Array.from({ length: 768 }, () => 0.01),
                    maxCharLimit: 500,
                    usageCount: 4,
                },
            ],
        };

        const encryptedBuffer = CryptoVault.exportEncryptedMemory(
            sampleSnapshot,
            'Correct-Horse-Battery-Staple-2026!'
        );

        expect(Buffer.isBuffer(encryptedBuffer)).toBe(true);
        // Verify magic header "VPENC01"
        expect(encryptedBuffer.subarray(0, 7).toString('ascii')).toBe('VPENC01');

        // Ensure no sensitive plaintext leaks in the binary payload
        const rawUtf8 = encryptedBuffer.toString('utf-8');
        expect(rawUtf8).not.toContain('ashish.singh@example.com');
        expect(rawUtf8).not.toContain('Z9988776');
        expect(rawUtf8).not.toContain('Persistent Systems');
    });

    it('rejects wrong passphrases or tampered ciphertext and restores DB records on valid passphrase', async () => {
        const sampleSnapshot: VisaPilotMemorySnapshot = {
            version: 1,
            exportedAt: new Date().toISOString(),
            personas: [
                {
                    id: 'p-101',
                    name: 'Senior GenAI Engineering Lead',
                    isActive: true,
                    contactInfo: { firstName: 'Ashish', email: 'ashish.singh@example.com' },
                    workHistory: [],
                    education: [],
                    skills: { all: ['Python'] },
                    lockedFacts: { currentEmployer: 'Persistent Systems' },
                },
            ],
            domainSelectors: [
                {
                    domain: 'greenhouse.io',
                    fieldSignature: 'gh_first_name',
                    cssOrXpath: 'input#first_name',
                    mappedProfileKey: 'contactInfo.firstName',
                    fieldType: 'text',
                    confidence: 1.0,
                },
            ],
            qaSemanticMemory: [
                {
                    category: 'technical',
                    rawQuestion: 'Describe your RAG architecture experience.',
                    normalizedQuestion: 'Describe RAG architecture experience.',
                    answerTemplate: 'Built hybrid pgvector RAG pipelines.',
                    embedding: Array.from({ length: 768 }, () => 0.02),
                    maxCharLimit: 600,
                    usageCount: 2,
                },
            ],
        };

        const passphrase = 'Vault-Master-Passphrase-#99';
        const encryptedBuffer = CryptoVault.exportEncryptedMemory(
            sampleSnapshot,
            passphrase
        );

        // 1. Wrong password must fail GCM authentication tag verification
        await expect(
            CryptoVault.importEncryptedMemory(encryptedBuffer, 'Wrong-Passphrase-123')
        ).rejects.toThrow(/INVALID_PASSPHRASE_OR_CORRUPTED_ARCHIVE/);

        // 2. Tampered ciphertext byte must fail GCM authentication tag verification
        const tampered = Buffer.from(encryptedBuffer);
        tampered[tampered.length - 1] ^= 0xff;
        await expect(
            CryptoVault.importEncryptedMemory(tampered, passphrase)
        ).rejects.toThrow(/INVALID_PASSPHRASE_OR_CORRUPTED_ARCHIVE/);

        // 3. Valid passphrase decrypts and triggers persistence adapter restoration
        const mockAdapter: MemoryPersistenceAdapter = {
            restoreSnapshot: vi.fn().mockResolvedValue({
                personasRestored: 1,
                selectorsRestored: 1,
                qaMemoriesRestored: 1,
            }),
        };

        const restored = await CryptoVault.importEncryptedMemory(
            encryptedBuffer,
            passphrase,
            mockAdapter
        );

        expect(restored.snapshot.personas).toHaveLength(1);
        expect(restored.snapshot.personas[0].contactInfo.email).toBe(
            'ashish.singh@example.com'
        );
        expect(restored.snapshot.domainSelectors).toHaveLength(1);
        expect(restored.snapshot.qaSemanticMemory).toHaveLength(1);
        expect(mockAdapter.restoreSnapshot).toHaveBeenCalledTimes(1);
        expect(restored.persistenceResult?.personasRestored).toBe(1);
    });
});