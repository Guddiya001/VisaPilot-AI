/**
 * MV3 Background Service Worker MCP Proxy Bridge
 * Proxies Model Context Protocol requests from Content Scripts to local Next.js App Router
 * avoiding host-page CORS and CSP restrictions.
 */

export interface McpRpcMessage {
  type: 'MCP_RPC';
  method: string;
  params?: any;
  endpoint?: string;
}

export interface McpBridgeResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export const DEFAULT_MCP_ENDPOINT = 'http://localhost:3001/api/mcp/http';
export const FALLBACK_MCP_ENDPOINT = 'http://localhost:3000/api/mcp/http';

/**
 * Core JSON-RPC 2.0 executor calling local MCP endpoint
 */
export async function executeMcpJsonRpc(
  method: string,
  params?: any,
  endpoint = DEFAULT_MCP_ENDPOINT,
  fetchFn: typeof fetch = (globalThis as any).fetch || fetch
): Promise<McpBridgeResponse> {
  const payload = {
    jsonrpc: '2.0',
    id: Date.now(),
    method,
    params,
  };

  const doFetch = async (targetUrl: string) => {
    return await fetchFn(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  };

  try {
    let res: Response;
    try {
      res = await doFetch(endpoint);
    } catch (primaryErr) {
      // Auto-fallback across ports 3001 <-> 3000 on connection failure
      const altEndpoint = endpoint.includes(':3001')
        ? endpoint.replace(':3001', ':3000')
        : endpoint.includes(':3000')
          ? endpoint.replace(':3000', ':3001')
          : null;

      if (altEndpoint) {
        res = await doFetch(altEndpoint);
      } else {
        throw primaryErr;
      }
    }

    if (!res.ok) {
      return {
        success: false,
        error: `MCP Server responded with HTTP status ${res.status}: ${res.statusText || 'Error'}`,
      };
    }

    const data = await res.json();
    return {
      success: true,
      data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || String(err),
    };
  }
}

/**
 * Background message handler invoked by chrome.runtime.onMessage
 */
export async function handleMcpBackgroundMessage(
  message: McpRpcMessage,
  fetchFn: typeof fetch = (globalThis as any).fetch || fetch
): Promise<McpBridgeResponse> {
  return executeMcpJsonRpc(
    message.method,
    message.params,
    message.endpoint || DEFAULT_MCP_ENDPOINT,
    fetchFn
  );
}

/**
 * Invoked by Content Scripts to dispatch an MCP tool call through the MV3 background proxy
 */
export async function callMcpToolFromContentScript<T = any>(
  toolName: string,
  args: any,
  options?: { endpoint?: string; fetchFn?: typeof fetch }
): Promise<T> {
  const chromeObj = (globalThis as any).chrome;
  if (typeof chromeObj !== 'undefined' && chromeObj?.runtime?.sendMessage) {
    return new Promise((resolve, reject) => {
      chromeObj.runtime.sendMessage(
        {
          type: 'MCP_RPC',
          method: 'tools/call',
          params: { name: toolName, arguments: args },
          endpoint: options?.endpoint,
        },
        (response: any) => {
          if (chromeObj.runtime?.lastError) {
            reject(new Error(chromeObj.runtime.lastError.message));
            return;
          }
          if (!response || !response.success) {
            reject(new Error(response?.error || 'MCP tool call failed'));
            return;
          }
          resolve(response.data?.result ?? response.data);
        }
      );
    });
  }

  // Direct execution fallback for testing environments without chrome runtime mock
  const response = await executeMcpJsonRpc(
    'tools/call',
    { name: toolName, arguments: args },
    options?.endpoint,
    options?.fetchFn
  );

  if (!response.success) {
    throw new Error(response.error || 'MCP tool call failed');
  }

  return response.data?.result ?? response.data;
}

/**
 * Register chrome.runtime.onMessage listener if running in Chrome Extension MV3 background context
 */
export function registerMcpBackgroundListener(): void {
  const chromeObj = (globalThis as any).chrome;
  if (typeof chromeObj !== 'undefined' && chromeObj?.runtime?.onMessage) {
    chromeObj.runtime.onMessage.addListener(
      (message: any, _sender: any, sendResponse: (res: any) => void) => {
        if (message && message.type === 'MCP_RPC') {
          handleMcpBackgroundMessage(message).then(sendResponse);
          return true; // Keep message channel open for async response in MV3
        }
        return false;
      }
    );
  }
}
