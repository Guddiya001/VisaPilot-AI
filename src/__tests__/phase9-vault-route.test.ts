import * as fs from 'node:fs';
import * as path from 'node:path';
import { GET } from '../../apps/web/src/app/api/vault/resume/route.ts';

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
    toBeGreaterThan: (exp: number) =>
      assert.ok(actual > exp, `Expected ${actual} > ${exp}`),
    toContain: (exp: any) =>
      assert.ok(actual?.includes(exp), `Expected ${actual} to contain ${exp}`),
    toEqual: (exp: any) => assert.deepStrictEqual(actual, exp),
    toMatch: (regex: RegExp) =>
      assert.ok(regex.test(String(actual)), `Expected "${actual}" to match ${regex}`),
  });
}

describe('Phase 9: Local Resume Vault Route Handler (/api/vault/resume)', () => {
  const vaultDir = path.resolve(process.cwd(), 'vault/resumes');
  const testFileName = 'Ashish_Singh_GenAI_Engineering_Lead.pdf';
  const testFilePath = path.join(vaultDir, testFileName);
  const testPdfContent = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');

  beforeEach(() => {
    fs.mkdirSync(vaultDir, { recursive: true });
    fs.writeFileSync(testFilePath, testPdfContent);
  });

  afterEach(() => {
    try {
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
    } catch { }
  });

  it('returns base64 PDF payload for valid vault path', async () => {
    const req = new Request(
      `http://localhost:3000/api/vault/resume?path=vault/resumes/${testFileName}`
    );
    const res = await GET(req);

    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.mimeType).toBe('application/pdf');
    expect(data.fileName).toBe(testFileName);
    expect(data.base64).toBeDefined();

    const decodedBuffer = Buffer.from(data.base64, 'base64');
    expect(decodedBuffer.toString('utf-8')).toContain('%PDF-1.4');
  });

  it('blocks directory traversal attacks', async () => {
    const maliciousPaths = [
      '../../.env',
      'vault/resumes/../../.env',
      '..\\..\\.env',
      'src/db/schema.ts',
      '/etc/passwd',
      'C:\\Windows\\System32\\drivers\\etc\\hosts',
    ];

    for (const malPath of maliciousPaths) {
      const req = new Request(
        `http://localhost:3000/api/vault/resume?path=${encodeURIComponent(malPath)}`
      );
      const res = await GET(req);

      expect(res.status === 400 || res.status === 403).toBe(true);
      const data = await res.json();
      expect(data.error).toBeDefined();
    }
  });

  it('returns deterministic fallback PDF buffer if file is missing in dev mode', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    try {
      const missingFile = 'Ashish_Singh_Missing_File_Test.pdf';
      const req = new Request(
        `http://localhost:3000/api/vault/resume?path=vault/resumes/${missingFile}`
      );
      const res = await GET(req);

      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.mimeType).toBe('application/pdf');
      expect(data.fileName).toBe(missingFile);
      expect(data.base64).toBeDefined();

      const decodedBuffer = Buffer.from(data.base64, 'base64');
      expect(decodedBuffer.toString('utf-8')).toContain('%PDF-');
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });
});
