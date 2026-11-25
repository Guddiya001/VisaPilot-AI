import { JSDOM } from 'jsdom';
import { attachResumeFile } from '../extension/dom/file-upload.ts';
import {
  handleMcpBackgroundMessage,
  type McpRpcMessage,
} from '../extension/background/mcp-bridge.ts';

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

describe('Phase 8: MV3 Background MCP Proxy & File Uploader', () => {
  let dom: JSDOM;
  let document: Document;

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><html><body><form id="upload-form"></form></body></html>', {
      runScripts: 'dangerously',
    });
    document = dom.window.document;
    (globalThis as any).window = dom.window;
    (globalThis as any).document = document;
    (globalThis as any).Event = dom.window.Event;
    (globalThis as any).File = dom.window.File;
  });

  describe('File Uploader (attachResumeFile)', () => {
    it('populates input[type="file"] with PDF buffer and dispatches bubbling change and input events', () => {
      const form = document.getElementById('upload-form')!;
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.id = 'resume-file-input';
      form.appendChild(fileInput);

      const eventsDispatched: string[] = [];
      fileInput.addEventListener('change', (e) => {
        eventsDispatched.push('change');
        expect((e as Event).bubbles).toBe(true);
      });
      fileInput.addEventListener('input', (e) => {
        eventsDispatched.push('input');
        expect((e as Event).bubbles).toBe(true);
      });

      const samplePdfBuffer = Buffer.from('%PDF-1.4 simulated resume content');
      attachResumeFile(fileInput, samplePdfBuffer, 'Ashish_Kumar_Singh_Resume.pdf', 'application/pdf');

      expect(fileInput.files).toBeDefined();
      expect(fileInput.files!.length).toBe(1);
      expect(fileInput.files![0].name).toBe('Ashish_Kumar_Singh_Resume.pdf');
      expect(fileInput.files![0].type).toBe('application/pdf');
      expect(eventsDispatched).toContain('change');
      expect(eventsDispatched).toContain('input');
    });
  });

  describe('MV3 Background MCP Proxy Bridge', () => {
    it('handles MCP_RPC message and proxies JSON-RPC payload to local MCP endpoint', async () => {
      let capturedUrl = '';
      let capturedBody: any = null;

      // Mock fetch in background service worker context
      const mockFetch = async (url: string, opts: any) => {
        capturedUrl = url;
        capturedBody = JSON.parse(opts.body);
        return {
          ok: true,
          status: 200,
          json: async () => ({
            jsonrpc: '2.0',
            id: capturedBody.id,
            result: {
              resolutions: [
                {
                  fieldSignature: '#first_name',
                  tier: 1,
                  badge: 'GREEN_EXACT',
                  value: 'Ashish',
                },
              ],
            },
          }),
        };
      };

      const message: McpRpcMessage = {
        type: 'MCP_RPC',
        method: 'tools/call',
        params: {
          name: 'resolve_form_batch',
          arguments: {
            domain: 'greenhouse.io',
            fields: [{ fieldSignature: '#first_name', cssOrXpath: '#first_name', fieldType: 'text' }],
          },
        },
      };

      const response = await handleMcpBackgroundMessage(message, mockFetch as any);

      expect(capturedUrl).toContain('/api/mcp/http');
      expect(capturedBody.jsonrpc).toBe('2.0');
      expect(capturedBody.method).toBe('tools/call');
      expect(capturedBody.params.name).toBe('resolve_form_batch');

      expect(response.success).toBe(true);
      expect(response.data.result.resolutions[0].badge).toBe('GREEN_EXACT');
      expect(response.data.result.resolutions[0].value).toBe('Ashish');
    });

    it('gracefully handles network or server errors in proxy bridge', async () => {
      const mockFailingFetch = async () => {
        throw new Error('Connection refused to MCP server');
      };

      const message: McpRpcMessage = {
        type: 'MCP_RPC',
        method: 'tools/list',
      };

      const response = await handleMcpBackgroundMessage(message, mockFailingFetch as any);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Connection refused to MCP server');
    });
  });
});
