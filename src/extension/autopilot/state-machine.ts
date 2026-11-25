import {
  type ResolutionBadge,
  type ResolutionTier,
} from '../../lib/engine/resolver.ts';
import { type FieldType } from '../../db/schema.ts';
import { setReactInputValue } from '../dom/filler.ts';

export type AutopilotMode = 'REVIEW' | 'AUTOPILOT';

export type AutopilotState =
  | 'IDLE'
  | 'SCANNING'
  | 'RESOLVING'
  | 'FILLING'
  | 'REVIEW_REQUIRED'
  | 'SUBMITTING'
  | 'SUBMITTED'
  | 'ERROR';

export class SafetyGateBlockedError extends Error {
  public blockedField: FieldResolutionStatus;

  constructor(blockedField: FieldResolutionStatus) {
    super(
      `SafetyGateBlockedError: Form submission blocked. Field "${blockedField.fieldSignature}" requires human review with badge "${blockedField.badge}".`
    );
    this.name = 'SafetyGateBlockedError';
    this.blockedField = blockedField;
  }
}

export interface FieldResolutionStatus {
  element: HTMLElement;
  fieldSignature: string;
  cssOrXpath?: string;
  fieldType?: FieldType;
  tier: ResolutionTier;
  badge: ResolutionBadge;
  value: string | null;
  confidence?: number;
  similarity?: number;
  required?: boolean;
  question?: string;
  label?: string;
  wasEditedByHuman?: boolean;
  category?: string;
}

export interface AutopilotConfig {
  mode: AutopilotMode;
  formElement: HTMLFormElement;
  submitButton?: HTMLElement | null;
  mcpClient?: {
    callTool: (args: { name: string; arguments: any }) => Promise<any>;
  };
  applicationContext?: {
    personaId: string;
    companyName: string;
    roleTitle: string;
    domain: string;
    portalUrl: string;
  };
}

const BADGE_COLORS: Record<ResolutionBadge, { bg: string; text: string; border: string }> = {
  GREEN_EXACT: { bg: '#ECFDF5', text: '#065F46', border: '#10B981' },
  BLUE_VECTOR_LEARNED: { bg: '#EFF6FF', text: '#1E40AF', border: '#3B82F6' },
  AMBER_LLM_DRAFT: { bg: '#FFFBEB', text: '#92400E', border: '#F59E0B' },
  RED_MISSING_FACT: { bg: '#FEF2F2', text: '#991B1B', border: '#EF4444' },
  CACHE_MISS: { bg: '#F3F4F6', text: '#374151', border: '#9CA3AF' },
};

/**
 * Attaches an isolated Shadow DOM confidence badge directly adjacent to a form element.
 */
export function attachShadowConfidenceBadge(
  targetElement: HTMLElement,
  badge: ResolutionBadge,
  options: { confidence?: number; similarity?: number; message?: string } = {}
): HTMLElement {
  const doc = targetElement.ownerDocument || document;

  // Check if badge container already exists
  let host = targetElement.nextElementSibling as HTMLElement | null;
  if (!host || !host.classList.contains('visapilot-shadow-badge-host')) {
    host = doc.createElement('div');
    host.className = 'visapilot-shadow-badge-host';
    host.style.display = 'inline-block';
    host.style.marginLeft = '6px';
    host.style.verticalAlign = 'middle';

    if (targetElement.parentNode) {
      targetElement.parentNode.insertBefore(host, targetElement.nextSibling);
    }
  }

  // Create or reuse shadow root
  let shadowRoot = host.shadowRoot;
  if (!shadowRoot) {
    shadowRoot = host.attachShadow({ mode: 'open' });
  }

  const colors = BADGE_COLORS[badge] ?? BADGE_COLORS.CACHE_MISS;
  const score =
    options.similarity !== undefined
      ? ` (${Math.round(options.similarity * 100)}%)`
      : options.confidence !== undefined
        ? ` (${Math.round(options.confidence * 100)}%)`
        : '';

  shadowRoot.innerHTML = `
    <style>
      @media print {
        :host {
          display: none !important;
        }
      }
      :host {
        all: initial;
        display: inline-flex;
        align-items: center;
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }
      .visapilot-badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 2px 8px;
        border-radius: 9999px;
        font-size: 11px;
        font-weight: 600;
        line-height: 1.2;
        background-color: ${colors.bg};
        color: ${colors.text};
        border: 1px solid ${colors.border};
        box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
      }
      .visapilot-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background-color: ${colors.border};
      }
    </style>
    <span class="visapilot-badge" title="${options.message ?? badge}" style="${badge === 'AMBER_LLM_DRAFT' || badge === 'RED_MISSING_FACT' ? 'cursor: pointer;' : ''}">
      <span class="visapilot-dot"></span>
      <span>${badge}${score}</span>
    </span>
  `;

  const badgeEl = shadowRoot.querySelector('.visapilot-badge');
  if (badgeEl && (badge === 'AMBER_LLM_DRAFT' || badge === 'RED_MISSING_FACT')) {
    badgeEl.addEventListener('click', (e) => {
      e.stopPropagation();
      attachShadowConfidenceBadge(targetElement, 'GREEN_EXACT', { confidence: 1.0 });
    });
  }

  return host;
}

/**
 * Autopilot State Machine
 * Orchestrates form scanning, resolution, filling, safety-gate review, and auto-submission.
 */
export class AutopilotStateMachine {
  public state: AutopilotState = 'IDLE';
  public mode: AutopilotMode;
  public focusedField: FieldResolutionStatus | null = null;
  public resolvedFields: FieldResolutionStatus[] = [];

  private formElement: HTMLFormElement;
  private submitButton?: HTMLElement | null;
  private mcpClient?: AutopilotConfig['mcpClient'];
  private applicationContext?: AutopilotConfig['applicationContext'];

  constructor(config: AutopilotConfig) {
    this.mode = config.mode;
    this.formElement = config.formElement;
    this.submitButton = config.submitButton;
    this.mcpClient = config.mcpClient;
    this.applicationContext = config.applicationContext;
  }

  /**
   * Processes resolved fields, renders confidence badges, fills inputs, and evaluates safety gates.
   */
  async processResolvedFields(fields: FieldResolutionStatus[]): Promise<void> {
    this.resolvedFields = fields;
    this.state = 'FILLING';

    let firstBlockingField: FieldResolutionStatus | null = null;

    for (const field of fields) {
      // 1. Attach isolated Shadow DOM confidence badge
      if (field.element) {
        attachShadowConfidenceBadge(field.element, field.badge, {
          confidence: field.confidence,
          similarity: field.similarity,
        });

        // 2. Fill values into controlled inputs (excluding file inputs which use attachResumeFile)
        if (field.value !== null && field.value !== undefined) {
          const inputEl = field.element as HTMLInputElement;
          if (inputEl.tagName?.toLowerCase() !== 'input' || inputEl.type?.toLowerCase() !== 'file') {
            setReactInputValue(field.element, field.value);
          }
        }
      }

      // 3. Safety Gate: evaluate required fields for RED or AMBER statuses
      if (field.badge === 'RED_MISSING_FACT' || field.badge === 'AMBER_LLM_DRAFT') {
        if (!firstBlockingField) {
          firstBlockingField = field;
        }
      }
    }

    if (firstBlockingField) {
      // Safety gate triggers: halt autopilot and demand human review
      this.state = 'REVIEW_REQUIRED';
      this.focusedField = firstBlockingField;
      if (firstBlockingField.element?.focus) {
        firstBlockingField.element.focus();
      }
    }
  }

  /**
   * Submits the application form if safety gate allows.
   */
  async submitForm(): Promise<void> {
    if (this.state === 'REVIEW_REQUIRED' && this.focusedField) {
      throw new SafetyGateBlockedError(this.focusedField);
    }

    this.state = 'SUBMITTING';

    // 1. Trigger form submit
    if (this.submitButton) {
      this.submitButton.dispatchEvent(new Event('click', { bubbles: true }));
    } else if (this.formElement) {
      this.formElement.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    }

    // 2. Trigger learn_from_submission MCP tool if connected
    if (this.mcpClient && this.applicationContext) {
      let tier1Hits = 0;
      let tier2VectorHits = 0;
      let tier3LlmCalls = 0;

      const submissionFields = this.resolvedFields.map((f) => {
        if (f.tier === 1) tier1Hits++;
        else if (f.tier === 2) tier2VectorHits++;
        else if (f.tier === 3) tier3LlmCalls++;

        return {
          fieldSignature: f.fieldSignature,
          cssOrXpath: f.cssOrXpath ?? f.fieldSignature,
          fieldType: f.fieldType ?? 'text',
          value: f.value ?? '',
          question: f.question,
          originalBadge: f.badge,
          wasEditedByHuman: f.wasEditedByHuman ?? false,
          category: f.category,
        };
      });

      await this.mcpClient.callTool({
        name: 'learn_from_submission',
        arguments: {
          personaId: this.applicationContext.personaId,
          companyName: this.applicationContext.companyName,
          roleTitle: this.applicationContext.roleTitle,
          domain: this.applicationContext.domain,
          portalUrl: this.applicationContext.portalUrl,
          fields: submissionFields,
          resolutionStats: {
            tier1Hits,
            tier2VectorHits,
            tier3LlmCalls,
          },
        },
      });
    }

    this.state = 'SUBMITTED';
  }
}
