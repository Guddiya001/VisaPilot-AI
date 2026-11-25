import { scanDomFields } from '../dom/scanner.ts';
import { expandRepeaterBlocks } from '../dom/repeater.ts';
import { attachResumeFile } from '../dom/file-upload.ts';
import {
  AutopilotStateMachine,
  type AutopilotMode,
  type FieldResolutionStatus,
} from '../autopilot/state-machine.ts';
import { callMcpToolFromContentScript } from '../background/mcp-bridge.ts';

export interface AutopilotExecutionOptions {
  type: 'EXECUTE_AUTOPILOT';
  mode?: AutopilotMode;
  company?: string;
  role?: string;
  targetWorkCount?: number;
  vaultUrl?: string;
}

export interface AutopilotExecutionResult {
  success: boolean;
  gateStatus: string;
  tier1Hits: number;
  tier2VectorHits: number;
  tier3LlmCalls: number;
  zeroLlmSaved: number;
  scannedCount: number;
  resolvedFields: Array<{
    fieldSignature: string;
    badge: string;
    value: string | null;
    tier: number;
  }>;
  blockedField: {
    fieldSignature: string;
    badge: string;
    question?: string;
  } | null;
  error?: string;
}

/**
 * Core orchestrator executed inside the webpage DOM context.
 * Performs DOM scan -> Repeater expansion -> Vault Resume upload -> MCP resolution -> Badge & Fill -> Gate check.
 */
export async function handleContentScriptMessage(
  message: AutopilotExecutionOptions,
  customDoc?: Document
): Promise<AutopilotExecutionResult> {
  const doc = customDoc || (globalThis as any).document || window.document;

  const mode: AutopilotMode = message.mode || 'REVIEW';
  const company = message.company || 'Target Company';
  const role = message.role || 'Software Engineer';

  // 1. Locate application form or fall back to body
  const form = (doc.querySelector('form') as HTMLFormElement) || (doc.body as unknown as HTMLFormElement);

  // 2. Scan form fields
  const scannedFields = scanDomFields(form);

  // 3. Dynamic repeater expansion for multi-entry work experience
  const repeaterSection = form.querySelector('.work-history-section, [data-automation-id*="workExperience"]');
  const addBtn = form.querySelector(
    '#add-work, #add-work-exp, button[data-automation-id*="add"], button[aria-label*="Add"]'
  );

  if (repeaterSection && addBtn) {
    try {
      await expandRepeaterBlocks({
        container: repeaterSection as HTMLElement,
        addButtonSelector:
          '#add-work, #add-work-exp, button[data-automation-id*="add"], button[aria-label*="Add"]',
        entrySelector: '.work-entry, [data-automation-id*="workHistory"]',
        targetCount: message.targetWorkCount || 3,
      });
    } catch (err) {
      console.warn('Repeater expansion note:', err);
    }
  }

  // 4. Attach Resume File from Local Vault API if file input exists
  const fileInput = form.querySelector('input[type="file"]') as HTMLInputElement | null;
  if (fileInput) {
    try {
      const candidateVaultUrls = [
        message.vaultUrl,
        'http://localhost:3001/api/vault/resume?path=vault/resumes/Ashish_Singh_GenAI_Engineering_Lead.pdf',
        'http://localhost:3000/api/vault/resume?path=vault/resumes/Ashish_Singh_GenAI_Engineering_Lead.pdf',
      ].filter(Boolean) as string[];

      let vaultData: any = null;
      for (const candidate of candidateVaultUrls) {
        try {
          const res = await fetch(candidate);
          if (res.ok) {
            vaultData = await res.json();
            break;
          }
        } catch {}
      }

      if (vaultData && vaultData.base64) {
        let buffer: Uint8Array | Buffer;
        if (typeof Buffer !== 'undefined') {
          buffer = Buffer.from(vaultData.base64, 'base64');
        } else {
          const binary = atob(vaultData.base64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
          }
          buffer = bytes;
        }
        attachResumeFile(
          fileInput,
          buffer,
          vaultData.fileName || 'Ashish_Kumar_Singh_Resume.pdf',
          'application/pdf'
        );
      }
    } catch {
      // Ignore vault fetch failure in test/offline environments
    }
  }

  // 5. Batch resolve scanned fields via MCP tool
  const batchFields = scannedFields.map((f) => ({
    fieldSignature: f.fieldSignature || f.cssPath || '',
    cssOrXpath: f.cssPath || f.fieldSignature || '',
    fieldType: f.fieldType || 'text',
    label: f.label,
    question: f.question || f.label,
    required: f.required ?? false,
  }));

  const domain = (globalThis as any).location?.hostname || 'greenhouse.io';
  const portalUrl = (globalThis as any).location?.href || 'https://example.com/apply';

  const mcpResponse = await callMcpToolFromContentScript('resolve_form_batch', {
    domain,
    companyName: company,
    roleTitle: role,
    fields: batchFields,
  });

  let parsed = typeof mcpResponse === 'string' ? JSON.parse(mcpResponse) : mcpResponse;
  if (!parsed?.resolutions && parsed?.content?.[0]?.text) {
    try {
      parsed = JSON.parse(parsed.content[0].text);
    } catch {}
  }
  const resolutions = parsed?.resolutions || [];

  // 6. Map resolutions back to DOM elements
  const fieldStatuses: FieldResolutionStatus[] = resolutions.map((res: any, idx: number) => {
    const scanned = scannedFields[idx];
    const element =
      scanned?.element ||
      (res.fieldSignature.startsWith('#')
        ? doc.getElementById(res.fieldSignature.slice(1))
        : doc.querySelector(res.fieldSignature));

    return {
      element: element as HTMLElement,
      fieldSignature: res.fieldSignature,
      tier: res.tier,
      badge: res.badge,
      value: res.value,
      confidence: res.confidence,
      similarity: res.similarity,
      required: Boolean(scanned?.required || res.required),
      question: res.question || scanned?.question || scanned?.label,
      label: scanned?.label,
    };
  });

  // 7. Initialize AutopilotStateMachine
  const submitBtn = form.querySelector(
    'button[type="submit"], input[type="submit"], #submit-btn, [data-automation-id="submit-button"]'
  ) as HTMLElement | null;

  const stateMachine = new AutopilotStateMachine({
    mode,
    formElement: form,
    submitButton: submitBtn,
    applicationContext: {
      personaId: '00000000-0000-0000-0000-000000000001',
      companyName: company,
      roleTitle: role,
      domain,
      portalUrl,
    },
  });

  // 8. Process resolved fields (attaches Shadow DOM badges and fills controlled inputs)
  await stateMachine.processResolvedFields(fieldStatuses);

  let tier1Hits = 0;
  let tier2VectorHits = 0;
  let tier3LlmCalls = 0;

  for (const f of fieldStatuses) {
    if (f.tier === 1) tier1Hits++;
    else if (f.tier === 2) tier2VectorHits++;
    else if (f.tier === 3) tier3LlmCalls++;
  }

  // 9. If in full AUTOPILOT mode and no blocking safety gates, auto-submit
  if (mode === 'AUTOPILOT' && stateMachine.state !== 'REVIEW_REQUIRED') {
    await stateMachine.submitForm();
  }

  return {
    success: true,
    gateStatus: stateMachine.state,
    tier1Hits,
    tier2VectorHits,
    tier3LlmCalls,
    zeroLlmSaved: tier1Hits + tier2VectorHits,
    scannedCount: scannedFields.length,
    resolvedFields: stateMachine.resolvedFields.map((f) => ({
      fieldSignature: f.fieldSignature,
      badge: f.badge,
      value: f.value,
      tier: f.tier,
    })),
    blockedField: stateMachine.focusedField
      ? {
          fieldSignature: stateMachine.focusedField.fieldSignature,
          badge: stateMachine.focusedField.badge,
          question: stateMachine.focusedField.question,
        }
      : null,
  };
}

// Auto-register listener in browser content-script runtime
if (
  typeof globalThis !== 'undefined' &&
  (globalThis as any).chrome?.runtime?.onMessage
) {
  (globalThis as any).chrome.runtime.onMessage.addListener(
    (message: any, _sender: any, sendResponse: (res: any) => void) => {
      if (message && message.type === 'EXECUTE_AUTOPILOT') {
        handleContentScriptMessage(message)
          .then(sendResponse)
          .catch((err) =>
            sendResponse({ success: false, error: err?.message || String(err) })
          );
        return true; // Keep message channel open for async response
      }

      if (message && message.type === 'FORCE_SUBMIT') {
        const doc = (globalThis as any).document || document;
        const form = doc?.querySelector('form');
        const submitBtn = form?.querySelector(
          'button[type="submit"], input[type="submit"], #submit-btn, [data-automation-id="submit-button"]'
        ) as HTMLElement | null;

        if (submitBtn) {
          submitBtn.dispatchEvent(new Event('click', { bubbles: true }));
        } else if (form) {
          form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        }

        sendResponse({ success: true, gateStatus: 'SUBMITTED' });
        return true;
      }
      return false;
    }
  );
}

/**
 * Injects a floating in-page launcher pill in the bottom-right corner
 * allowing the user to trigger Autopilot directly from the page.
 */
export function mountInPageAutopilotPill(customDoc?: Document): HTMLElement | null {
  const doc = customDoc || (globalThis as any).document || (typeof window !== 'undefined' ? window.document : null);
  if (!doc || !doc.body) return null;

  // Never mount the autopilot pill on printable documents or resume windows
  if (doc.querySelector('.resume-print-window') || doc.querySelector('.rp-page')) {
    return null;
  }

  if (doc.getElementById('visapilot-autopilot-pill')) {
    return doc.getElementById('visapilot-autopilot-pill');
  }

  const host = doc.createElement('div');
  host.id = 'visapilot-autopilot-pill';
  host.style.position = 'fixed';
  host.style.bottom = '24px';
  host.style.right = '24px';
  host.style.zIndex = '2147483647';
  host.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `
    <style>
      @media print {
        :host {
          display: none !important;
          visibility: hidden !important;
        }
      }
      .vp-pill {
        display: flex;
        align-items: center;
        gap: 8px;
        background: #090D16;
        color: #F9FAFB;
        border: 1px solid #3B82F6;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5), 0 0 12px rgba(59, 130, 246, 0.4);
        border-radius: 9999px;
        padding: 8px 16px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        user-select: none;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .vp-pill:hover {
        background: #111827;
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.6), 0 0 18px rgba(59, 130, 246, 0.6);
      }
      .vp-badge {
        background: linear-gradient(135deg, #3B82F6, #8B5CF6);
        color: white;
        font-size: 10px;
        padding: 2px 8px;
        border-radius: 9999px;
        font-weight: 700;
      }
      .vp-toast {
        display: none;
        position: absolute;
        bottom: 50px;
        right: 0;
        width: 300px;
        background: #111827;
        color: #F9FAFB;
        border: 1px solid #374151;
        border-radius: 8px;
        padding: 12px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.6);
        font-size: 12px;
        line-height: 1.4;
      }
      .vp-toast.show {
        display: block;
      }
      .vp-toast a {
        display: inline-block;
        margin-top: 8px;
        color: #60A5FA;
        text-decoration: underline;
        font-weight: 600;
      }
    </style>
    <div class="vp-toast" id="vp-toast">
      <div id="vp-toast-msg">Autopilot ready.</div>
    </div>
    <div class="vp-pill" id="vp-trigger">
      <span>⚡ VisaPilot</span>
      <span class="vp-badge">Autopilot</span>
      <span id="vp-label" style="color: #9CA3AF; font-size: 11px;">Fill Form</span>
    </div>
  `;

  const trigger = shadow.getElementById('vp-trigger');
  const label = shadow.getElementById('vp-label');
  const toast = shadow.getElementById('vp-toast');
  const toastMsg = shadow.getElementById('vp-toast-msg');

  if (trigger) {
    trigger.addEventListener('click', async () => {
      const form = doc.querySelector('form');
      const inputs = doc.querySelectorAll('input:not([type="hidden"]), select, textarea');

      if (!form && inputs.length === 0) {
        if (toast && toastMsg) {
          toastMsg.innerHTML = `
            <strong>⚡ VisaPilot Active</strong><br/>
            No job application form detected on this page.<br/>
            <a href="/autopilot/demo" id="demo-link">👉 Open Live Application Demo Form</a>
          `;
          toast.classList.add('show');
          const link = toast.querySelector('#demo-link');
          if (link) {
            link.addEventListener('click', (e: Event) => {
              e.preventDefault();
              if (typeof window !== 'undefined') window.location.href = '/autopilot/demo';
            });
          }
          setTimeout(() => toast.classList.remove('show'), 6000);
        }
        return;
      }

      if (label) label.textContent = 'Scanning...';
      try {
        const result = await handleContentScriptMessage({ type: 'EXECUTE_AUTOPILOT', mode: 'REVIEW' }, doc);
        if (label) {
          label.textContent = `${result.zeroLlmSaved}/${result.scannedCount} Zero-LLM`;
        }
        if (toast && toastMsg) {
          toastMsg.innerHTML = `
            <strong>✅ Autopilot Completed</strong><br/>
            Scanned: ${result.scannedCount} fields<br/>
            Tier 1/2 Zero-LLM: ${result.zeroLlmSaved} fields<br/>
            Gate: <strong>${result.gateStatus}</strong>
          `;
          toast.classList.add('show');
          setTimeout(() => toast.classList.remove('show'), 5000);
        }
      } catch (err: any) {
        if (label) label.textContent = 'Error';
        if (toast && toastMsg) {
          toastMsg.textContent = `Error: ${err?.message || err}`;
          toast.classList.add('show');
        }
      }
    });
  }

  doc.body.appendChild(host);

  // Inject a global print-hide stylesheet to ensure all VisaPilot UI
  // elements (the floating pill and inline field badges) are invisible
  // in print / "Save as PDF" output. Shadow DOM :host rules alone are
  // insufficient in some Chromium builds for position:fixed elements.
  if (!doc.getElementById('visapilot-print-hide-css')) {
    const printStyle = doc.createElement('style');
    printStyle.id = 'visapilot-print-hide-css';
    printStyle.textContent = `
      @media print {
        #visapilot-autopilot-pill,
        .visapilot-shadow-badge-host {
          display: none !important;
          visibility: hidden !important;
          width: 0 !important;
          height: 0 !important;
          overflow: hidden !important;
          position: absolute !important;
          clip: rect(0 0 0 0) !important;
        }
      }
    `;
    (doc.head || doc.documentElement).appendChild(printStyle);
  }

  return host;
}

// Auto-mount in browser content-script runtime
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => mountInPageAutopilotPill(document));
  } else {
    mountInPageAutopilotPill(document);
  }
}
