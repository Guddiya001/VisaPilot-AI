import { setReactInputValue } from './filler.ts';

/**
 * Handles async ARIA combobox dropdown interaction:
 * 1. Clicks & focuses the combobox to open the dropdown listbox.
 * 2. Types/filters target text if input element.
 * 3. Observes DOM mutations until matching role="option" element appears.
 * 4. Dispatches click on the matching option.
 */
export async function selectAriaCombobox(
  combobox: HTMLElement,
  targetText: string,
  timeoutMs: number = 2000
): Promise<boolean> {
  const doc = combobox.ownerDocument || document;

  // 1. Focus and click combobox
  combobox.focus();
  combobox.dispatchEvent(new Event('click', { bubbles: true }));

  // If combobox is an input element, type the search filter
  if (combobox.tagName.toLowerCase() === 'input') {
    setReactInputValue(combobox, targetText);
  }

  // Helper to find option in current document or open shadow roots
  function findMatchingOption(): HTMLElement | null {
    const options = Array.from(doc.querySelectorAll('[role="option"]'));
    for (const opt of options) {
      const text = opt.textContent?.trim().toLowerCase() || '';
      if (text.includes(targetText.toLowerCase())) {
        return opt as HTMLElement;
      }
    }
    return null;
  }

  // 2. Check if option is already present
  const immediateOption = findMatchingOption();
  if (immediateOption) {
    immediateOption.dispatchEvent(new Event('click', { bubbles: true }));
    return true;
  }

  // 3. Await MutationObserver for dynamically rendered portal options
  return new Promise<boolean>((resolve) => {
    let resolved = false;

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        observer.disconnect();
        resolve(false);
      }
    }, timeoutMs);

    const ObserverCtor =
      typeof MutationObserver !== 'undefined'
        ? MutationObserver
        : (doc.defaultView as any)?.MutationObserver;

    if (!ObserverCtor) {
      clearTimeout(timer);
      resolve(false);
      return;
    }

    const observer = new ObserverCtor(() => {
      const match = findMatchingOption();
      if (match && !resolved) {
        resolved = true;
        clearTimeout(timer);
        observer.disconnect();
        match.dispatchEvent(new Event('click', { bubbles: true }));
        resolve(true);
      }
    });

    observer.observe(doc.body, {
      childList: true,
      subtree: true,
    });
  });
}
