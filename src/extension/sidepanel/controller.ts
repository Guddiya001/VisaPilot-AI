/**
 * VisaPilot MV3 Side Panel Controller
 * Handles communication between the user UI, the active Chrome tab, and the background MCP proxy.
 */

export interface PanelMetrics {
  tier1Hits: number;
  tier2VectorHits: number;
  tier3LlmCalls: number;
  zeroLlmSaved: number;
  gateStatus: string;
}

export function appendLogEntry(container: HTMLElement, message: string, type: 'info' | 'success' | 'warn' | 'error' = 'info'): void {
  const entry = container.ownerDocument.createElement('div');
  entry.className = `log-entry ${type}`;
  const timestamp = new Date().toLocaleTimeString();
  entry.textContent = `[${timestamp}] ${message}`;
  container.appendChild(entry);
  container.scrollTop = container.scrollHeight;
}

export function updatePanelMetrics(doc: Document, metrics: PanelMetrics): void {
  const t1 = doc.getElementById('tier1-count');
  const t2 = doc.getElementById('tier2-count');
  const t3 = doc.getElementById('tier3-count');
  const saved = doc.getElementById('saved-count');
  const gateBadge = doc.getElementById('gate-status-badge');

  if (t1) t1.textContent = String(metrics.tier1Hits);
  if (t2) t2.textContent = String(metrics.tier2VectorHits);
  if (t3) t3.textContent = String(metrics.tier3LlmCalls);
  if (saved) saved.textContent = String(metrics.zeroLlmSaved);

  if (gateBadge) {
    gateBadge.textContent = metrics.gateStatus;
    gateBadge.className = 'status-badge';
    if (metrics.gateStatus === 'REVIEW_REQUIRED') {
      gateBadge.classList.add('review');
    } else if (metrics.gateStatus === 'SUBMITTED') {
      gateBadge.classList.add('submitted');
    } else if (metrics.gateStatus === 'SCANNING' || metrics.gateStatus === 'RESOLVING') {
      gateBadge.classList.add('running');
    }
  }
}

export async function executeAutopilotAction(
  doc: Document,
  chromeInstance: any = (globalThis as any).chrome
): Promise<void> {
  const companyInput = doc.getElementById('company-input') as HTMLInputElement | null;
  const roleInput = doc.getElementById('role-input') as HTMLInputElement | null;
  const modeSelect = doc.getElementById('mode-select') as HTMLSelectElement | null;
  const btnExecute = doc.getElementById('btn-execute') as HTMLButtonElement | null;
  const logContainer = doc.getElementById('activity-log') as HTMLElement | null;
  const alertContainer = doc.getElementById('review-alert-container') as HTMLElement | null;
  const alertText = doc.getElementById('review-alert-text') as HTMLElement | null;

  const company = companyInput?.value || 'Company';
  const role = roleInput?.value || 'Software Engineer';
  const mode = modeSelect?.value || 'REVIEW';

  if (btnExecute) btnExecute.disabled = true;
  if (alertContainer) alertContainer.classList.remove('show');

  if (logContainer) {
    appendLogEntry(logContainer, `Starting ${mode} mode for ${company} (${role})...`);
  }

  updatePanelMetrics(doc, {
    tier1Hits: 0,
    tier2VectorHits: 0,
    tier3LlmCalls: 0,
    zeroLlmSaved: 0,
    gateStatus: 'SCANNING',
  });

  if (!chromeInstance?.tabs?.query) {
    if (logContainer) {
      appendLogEntry(logContainer, 'Chrome runtime API not detected. Is this loaded in Chrome?', 'warn');
    }
    if (btnExecute) btnExecute.disabled = false;
    return;
  }

  try {
    chromeInstance.tabs.query(
      { active: true, currentWindow: true },
      (tabs: any[]) => {
        const activeTab = tabs?.[0];
        if (!activeTab?.id) {
          if (logContainer) appendLogEntry(logContainer, 'No active tab found.', 'error');
          if (btnExecute) btnExecute.disabled = false;
          return;
        }

        chromeInstance.tabs.sendMessage(
          activeTab.id,
          {
            type: 'EXECUTE_AUTOPILOT',
            mode,
            company,
            role,
          },
          (res: any) => {
            if (btnExecute) btnExecute.disabled = false;

            if (chromeInstance.runtime?.lastError) {
              const errMsg = chromeInstance.runtime.lastError.message || '';
              if (errMsg.includes('Receiving end does not exist')) {
                if (logContainer) {
                  appendLogEntry(
                    logContainer,
                    'Content script not active on this tab. Please refresh the page (F5) so Autopilot is loaded, or navigate to http://localhost:3001/autopilot/demo',
                    'warn'
                  );
                }
              } else {
                if (logContainer) {
                  appendLogEntry(
                    logContainer,
                    `Tab communication error: ${errMsg}`,
                    'error'
                  );
                }
              }
              return;
            }

            if (!res || !res.success) {
              if (logContainer) {
                appendLogEntry(logContainer, res?.error || 'Autopilot execution failed on page.', 'error');
              }
              return;
            }

            // Update UI with response metrics
            updatePanelMetrics(doc, {
              tier1Hits: res.tier1Hits || 0,
              tier2VectorHits: res.tier2VectorHits || 0,
              tier3LlmCalls: res.tier3LlmCalls || 0,
              zeroLlmSaved: res.zeroLlmSaved || 0,
              gateStatus: res.gateStatus || 'COMPLETE',
            });

            if (logContainer) {
              if (res.scannedCount === 0) {
                appendLogEntry(
                  logContainer,
                  'No form fields detected on this tab. Navigate to an application form or visit http://localhost:3001/autopilot/demo',
                  'warn'
                );
              } else {
                appendLogEntry(
                  logContainer,
                  `Scanned ${res.scannedCount} fields. Tier 1: ${res.tier1Hits}, Tier 2: ${res.tier2VectorHits}, Tier 3: ${res.tier3LlmCalls}.`,
                  'success'
                );
              }
            }

            // Display review alert if safety gate blocked
            if (res.gateStatus === 'REVIEW_REQUIRED' && res.blockedField) {
              if (alertContainer) alertContainer.classList.add('show');
              if (alertText) {
                alertText.textContent = `Field [${res.blockedField.fieldSignature}] requires review (${res.blockedField.badge}): "${res.blockedField.question || ''}"`;
              }
              if (logContainer) {
                appendLogEntry(logContainer, `Safety Gate HALT: ${res.blockedField.badge} on field`, 'warn');
              }
            } else if (res.gateStatus === 'SUBMITTED') {
              if (logContainer) {
                appendLogEntry(logContainer, 'Application successfully auto-submitted! 🎉', 'success');
              }
            }
          }
        );
      }
    );
  } catch (err: any) {
    if (logContainer) appendLogEntry(logContainer, `Error: ${err?.message || err}`, 'error');
    if (btnExecute) btnExecute.disabled = false;
  }
}

export async function checkServerHealth(doc: Document = (globalThis as any).document): Promise<void> {
  const statusEl = doc?.getElementById('connection-status');
  if (!statusEl) return;

  const candidateUrls = [
    'http://localhost:3001/api/autopilot',
    'http://localhost:3000/api/autopilot',
  ];

  for (const url of candidateUrls) {
    try {
      const res = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(1500) });
      if (res.ok) {
        const port = url.includes(':3001') ? '3001' : '3000';
        statusEl.textContent = `● Live (${port})`;
        statusEl.style.color = 'var(--green, #10B981)';
        return;
      }
    } catch {}
  }

  statusEl.textContent = '○ Server Offline';
  statusEl.style.color = 'var(--red, #EF4444)';
}

export function initSidePanelController(doc: Document = (globalThis as any).document): void {
  const btnExecute = doc.getElementById('btn-execute');
  if (btnExecute) {
    btnExecute.addEventListener('click', () => {
      executeAutopilotAction(doc);
    });
  }

  const btnApproveSubmit = doc.getElementById('btn-approve-submit');
  if (btnApproveSubmit) {
    btnApproveSubmit.addEventListener('click', () => {
      const chromeInstance = (globalThis as any).chrome;
      if (!chromeInstance?.tabs?.query) return;

      chromeInstance.tabs.query({ active: true, currentWindow: true }, (tabs: any[]) => {
        const activeTab = tabs?.[0];
        if (activeTab?.id) {
          chromeInstance.tabs.sendMessage(activeTab.id, { type: 'FORCE_SUBMIT' }, (res: any) => {
            if (res?.success) {
              const alertContainer = doc.getElementById('review-alert-container');
              if (alertContainer) alertContainer.classList.remove('show');
              updatePanelMetrics(doc, {
                tier1Hits: res.tier1Hits || 0,
                tier2VectorHits: res.tier2VectorHits || 0,
                tier3LlmCalls: res.tier3LlmCalls || 0,
                zeroLlmSaved: res.zeroLlmSaved || 0,
                gateStatus: 'SUBMITTED',
              });
              const logContainer = doc.getElementById('activity-log');
              if (logContainer) {
                appendLogEntry(logContainer, 'Application human-approved and submitted! 🎉', 'success');
              }
            }
          });
        }
      });
    });
  }

  // Ping backend server health
  checkServerHealth(doc).catch(() => {});
}

// Auto-initialize when loaded in HTML window
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initSidePanelController(document));
  } else {
    initSidePanelController(document);
  }
}
