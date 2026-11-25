import { registerMcpBackgroundListener } from './mcp-bridge.ts';

/**
 * Initializes the MV3 Background Service Worker:
 * 1. Registers the MCP proxy message listener (Content Script -> Background -> App Router).
 * 2. Configures Side Panel behavior to open on extension action click.
 */
export function initBackgroundServiceWorker(): void {
  registerMcpBackgroundListener();

  const chromeObj = (globalThis as any).chrome;
  if (typeof chromeObj !== 'undefined') {
    const enableSidePanel = () => {
      if (chromeObj?.sidePanel?.setPanelBehavior) {
        chromeObj.sidePanel
          .setPanelBehavior({ openPanelOnActionClick: true })
          .catch((err: any) => {
            console.warn('Failed to enable sidePanel openPanelOnActionClick:', err);
          });
      }
    };

    enableSidePanel();

    if (chromeObj?.runtime?.onInstalled) {
      chromeObj.runtime.onInstalled.addListener(() => {
        enableSidePanel();
      });
    }

    // Fallback click handler if openPanelOnActionClick is not available
    if (chromeObj?.action?.onClicked) {
      chromeObj.action.onClicked.addListener(async (tab: any) => {
        if (chromeObj?.sidePanel?.open && tab?.id) {
          try {
            await chromeObj.sidePanel.open({ tabId: tab.id });
          } catch {
            // Ignore if side panel was already toggled
          }
        }
      });
    }
  }
}

// Auto-bootstrap in service worker runtime
if (
  typeof globalThis !== 'undefined' &&
  (globalThis as any).chrome?.runtime?.id &&
  typeof (globalThis as any).window === 'undefined'
) {
  initBackgroundServiceWorker();
}
