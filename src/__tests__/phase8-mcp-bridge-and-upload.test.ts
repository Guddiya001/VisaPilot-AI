import { JSDOM } from 'jsdom';
import { attachResumeFile } from '../extension/dom/file-upload.ts';
import {
  executeMcpJsonRpc,
  handleMcpBackgroundMessage,
  callMcpToolFromContentScript,
  registerMcpBackgroundListener,
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

describe('Phase 8: MV3 Background MCP Proxy & File Uploader (Bridge & Upload)', () => {
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

  describe('attachResumeFile', () => {
    it('attaches PDF buffer to input[type="file"] and dispatches change and input events', () => {
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

  describe('executeMcpJsonRpc & handleMcpBackgroundMessage', () => {
    it('executes JSON-RPC payload against local endpoint with proper headers', async () => {
      let capturedUrl = '';
      let capturedBody: any = null;

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

      const response = await executeMcpJsonRpc(
        'tools/call',
        {
          name: 'resolve_form_batch',
          arguments: {
            domain: 'greenhouse.io',
            fields: [{ fieldSignature: '#first_name', cssOrXpath: '#first_name', fieldType: 'text' }],
          },
        },
        'http://localhost:3000/api/mcp/http',
        mockFetch as any
      );

      expect(capturedUrl).toBe('http://localhost:3000/api/mcp/http');
      expect(capturedBody.jsonrpc).toBe('2.0');
      expect(capturedBody.method).toBe('tools/call');
      expect(response.success).toBe(true);
      expect(response.data.result.resolutions[0].badge).toBe('GREEN_EXACT');
    });
  });

  describe('callMcpToolFromContentScript', () => {
    it('dispatches tool call via chrome.runtime.sendMessage if chrome API is present', async () => {
      let sentMessage: any = null;
      (globalThis as any).chrome = {
        runtime: {
          sendMessage: (msg: any, callback: (res: any) => void) => {
            sentMessage = msg;
            callback({
              success: true,
              data: {
                result: {
                  resolutions: [
                    { fieldSignature: '#email', tier: 1, badge: 'GREEN_EXACT', value: 'ashish@example.com' },
                  ],
                },
              },
            });
          },
        },
      };

      const result = await callMcpToolFromContentScript('resolve_form_batch', {
        domain: 'lever.co',
        fields: [{ fieldSignature: '#email', cssOrXpath: '#email', fieldType: 'text' }],
      });

      expect(sentMessage.type).toBe('MCP_RPC');
      expect(sentMessage.method).toBe('tools/call');
      expect(sentMessage.params.name).toBe('resolve_form_batch');
      expect(result.resolutions[0].value).toBe('ashish@example.com');

      // Cleanup
      delete (globalThis as any).chrome;
    });

    it('falls back to executeMcpJsonRpc in environments without chrome API', async () => {
      const mockFetch = async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          jsonrpc: '2.0',
          id: 1,
          result: { ok: true },
        }),
      });

      const res = await callMcpToolFromContentScript(
        'resolve_form_batch',
        { domain: 'lever.co', fields: [] },
        { fetchFn: mockFetch as any }
      );

      expect(res.ok).toBe(true);
    });
  });
});
