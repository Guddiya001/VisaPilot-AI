import { type FieldType } from '../../db/schema.ts';

export interface ScannedFormField {
  element: HTMLElement;
  fieldSignature: string;
  cssPath: string;
  shadowPath: string[];
  label?: string;
  question?: string;
  fieldType: FieldType;
  currentValue: string;
  isCombobox: boolean;
  attributes: Record<string, string>;
  required?: boolean;
}

/**
 * Builds a stable path/selector descriptor for an element.
 */
function computeFieldSignature(el: HTMLElement): string {
  const automationId = el.getAttribute('data-automation-id');
  if (automationId) {
    return `${el.tagName.toLowerCase()}[data-automation-id="${automationId}"]`;
  }
  const name = el.getAttribute('name');
  if (name) {
    return `${el.tagName.toLowerCase()}[name="${name}"]`;
  }
  const id = el.getAttribute('id');
  if (id) {
    return `#${id}`;
  }
  const role = el.getAttribute('role');
  if (role) {
    return `${el.tagName.toLowerCase()}[role="${role}"]`;
  }
  return el.tagName.toLowerCase();
}

/**
 * Resolves the user-facing label or question for a form field.
 */
function resolveLabel(el: HTMLElement): string | undefined {
  const ariaLabel = el.getAttribute('aria-label');
  if (ariaLabel) return ariaLabel.trim();

  const rootNode =
    typeof el.getRootNode === 'function'
      ? (el.getRootNode() as Document | ShadowRoot)
      : el.ownerDocument;

  const id = el.getAttribute('id');
  if (id && rootNode && 'querySelector' in rootNode) {
    const labelFor = rootNode.querySelector(`label[for="${id}"]`);
    if (labelFor?.textContent) {
      return labelFor.textContent.trim();
    }
  }

  const parentLabel = el.closest ? el.closest('label') : null;
  if (parentLabel?.textContent) {
    return parentLabel.textContent.trim();
  }

  const placeholder = el.getAttribute('placeholder');
  if (placeholder) return placeholder.trim();

  return undefined;
}

/**
 * Traverses the DOM tree recursively, discovering elements inside light DOM,
 * open Shadow DOM roots, and iframes.
 */
export function scanFormFields(
  root: Document | HTMLElement | DocumentFragment = document,
  currentShadowPath: string[] = []
): ScannedFormField[] {
  const results: ScannedFormField[] = [];

  function traverse(node: Node, shadowPath: string[]) {
    if (!node) return;

    if (node.nodeType === 1 /* ELEMENT_NODE */) {
      const el = node as HTMLElement;
      const tagName = el.tagName.toLowerCase();
      const role = el.getAttribute('role');
      const isCombobox = role === 'combobox';

      const isInput =
        tagName === 'input' &&
        !['hidden', 'submit', 'button', 'reset'].includes(
          el.getAttribute('type') || ''
        );
      const isTextarea = tagName === 'textarea';
      const isSelect = tagName === 'select';

      if (isInput || isTextarea || isSelect || isCombobox) {
        let fieldType: FieldType = 'text';
        if (isCombobox) {
          fieldType = 'combobox';
        } else if (isSelect) {
          fieldType = 'select';
        } else if (isInput) {
          const typeAttr = el.getAttribute('type');
          if (typeAttr === 'checkbox') fieldType = 'checkbox';
          else if (typeAttr === 'radio') fieldType = 'radio';
          else if (typeAttr === 'file') fieldType = 'file';
        }

        const signature = computeFieldSignature(el);
        const label = resolveLabel(el);
        const val =
          'value' in el ? String((el as HTMLInputElement).value || '') : '';

        const attributes: Record<string, string> = {};
        for (let i = 0; i < el.attributes.length; i++) {
          const attr = el.attributes[i];
          attributes[attr.name] = attr.value;
        }

        const isRequired =
          el.hasAttribute('required') ||
          el.getAttribute('aria-required') === 'true' ||
          ('required' in el && Boolean((el as HTMLInputElement).required));

        results.push({
          element: el,
          fieldSignature: signature,
          cssPath: signature,
          shadowPath: [...shadowPath],
          label,
          question: label,
          fieldType,
          currentValue: val,
          isCombobox,
          attributes,
          required: isRequired,
        });
      }

      // Check if element has an open shadowRoot
      if (el.shadowRoot) {
        const hostId = el.id ? `#${el.id}` : el.tagName.toLowerCase();
        const nextShadowPath = [...shadowPath, hostId];
        for (let i = 0; i < el.shadowRoot.childNodes.length; i++) {
          traverse(el.shadowRoot.childNodes[i], nextShadowPath);
        }
      }

      // Check if element is an iframe with accessible contentDocument
      if (tagName === 'iframe') {
        try {
          const iframe = el as HTMLIFrameElement;
          if (iframe.contentDocument) {
            const iframeId = iframe.id ? `#${iframe.id}` : 'iframe';
            const nextShadowPath = [...shadowPath, iframeId];
            for (let i = 0; i < iframe.contentDocument.childNodes.length; i++) {
              traverse(iframe.contentDocument.childNodes[i], nextShadowPath);
            }
          }
        } catch {
          // Cross-origin iframe boundary
        }
      }
    }

    // Traverse child nodes
    for (let i = 0; i < node.childNodes.length; i++) {
      traverse(node.childNodes[i], shadowPath);
    }
  }

  traverse(root, currentShadowPath);
  return results;
}

export const scanDomFields = scanFormFields;

