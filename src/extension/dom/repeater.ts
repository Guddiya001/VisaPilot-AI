/**
 * Repeater Block Automation
 * Dynamically expands and populates multi-entry arrays (work history, education)
 * by clicking "+ Add Another" buttons, awaiting DOM mutation stability, and populating
 * entries in reverse-chronological order.
 */

export interface RepeaterConfig<T> {
  containerElement: HTMLElement;
  itemBlockSelector: string;
  addButton?: HTMLElement | null;
  entries: T[];
  fillEntry: (
    block: HTMLElement,
    entry: T,
    index: number
  ) => void | Promise<void>;
  delayBetweenClicksMs?: number;
  maxWaitMs?: number;
}

/**
 * Waits for a condition to be met, listening for DOM mutations on the target element.
 */
function waitForDomMutation(
  target: HTMLElement,
  predicate: () => boolean,
  timeoutMs: number = 1500
): Promise<boolean> {
  if (predicate()) return Promise.resolve(true);

  return new Promise<boolean>((resolve) => {
    let finished = false;

    const timer = setTimeout(() => {
      if (!finished) {
        finished = true;
        observer?.disconnect();
        resolve(predicate());
      }
    }, timeoutMs);

    const doc = target.ownerDocument || document;
    const ObserverCtor =
      typeof MutationObserver !== 'undefined'
        ? MutationObserver
        : (doc.defaultView as any)?.MutationObserver;

    let observer: any = null;
    if (ObserverCtor) {
      observer = new ObserverCtor(() => {
        if (predicate() && !finished) {
          finished = true;
          clearTimeout(timer);
          observer.disconnect();
          resolve(true);
        }
      });
      observer.observe(target, {
        childList: true,
        subtree: true,
      });
    }
  });
}

/**
 * Expands and populates repeater blocks idempotently.
 */
export async function populateRepeaterBlocks<T>(
  config: RepeaterConfig<T>
): Promise<void> {
  const {
    containerElement,
    itemBlockSelector,
    addButton,
    entries,
    fillEntry,
    delayBetweenClicksMs = 50,
    maxWaitMs = 2000,
  } = config;

  if (!entries || entries.length === 0) return;

  const targetCount = entries.length;

  // 1. Check existing mounted blocks
  let currentBlocks = Array.from(
    containerElement.querySelectorAll<HTMLElement>(itemBlockSelector)
  );

  // 2. Expand repeater if needed
  while (currentBlocks.length < targetCount && addButton) {
    const prevCount = currentBlocks.length;

    // Trigger add button click
    addButton.dispatchEvent(new Event('click', { bubbles: true }));

    // Wait for DOM mutation adding a new block
    await waitForDomMutation(
      containerElement,
      () =>
        containerElement.querySelectorAll(itemBlockSelector).length > prevCount,
      maxWaitMs
    );

    // Optional throttle delay between successive clicks
    if (delayBetweenClicksMs > 0) {
      await new Promise((r) => setTimeout(r, delayBetweenClicksMs));
    }

    currentBlocks = Array.from(
      containerElement.querySelectorAll<HTMLElement>(itemBlockSelector)
    );

    // Guard against infinite loops if the page fails to spawn blocks
    if (currentBlocks.length === prevCount) {
      break;
    }
  }

  // 3. Populate each block in reverse-chronological order
  for (let i = 0; i < Math.min(currentBlocks.length, entries.length); i++) {
    const block = currentBlocks[i];
    const entry = entries[i];
    await fillEntry(block, entry, i);
  }
}

export interface ExpandRepeaterOptions {
  container: HTMLElement;
  addButtonSelector?: string;
  addButton?: HTMLElement | null;
  entrySelector: string;
  targetCount: number;
  delayBetweenClicksMs?: number;
  maxWaitMs?: number;
}

/**
 * Expands repeater blocks up to targetCount and returns the resulting elements.
 */
export async function expandRepeaterBlocks(
  options: ExpandRepeaterOptions
): Promise<HTMLElement[]> {
  const addButton =
    options.addButton ??
    (options.addButtonSelector
      ? options.container.querySelector<HTMLElement>(options.addButtonSelector)
      : null);

  await populateRepeaterBlocks({
    containerElement: options.container,
    itemBlockSelector: options.entrySelector,
    addButton,
    entries: new Array(options.targetCount).fill(null),
    fillEntry: () => {},
    delayBetweenClicksMs: options.delayBetweenClicksMs ?? 10,
    maxWaitMs: options.maxWaitMs ?? 1000,
  });

  return Array.from(
    options.container.querySelectorAll<HTMLElement>(options.entrySelector)
  );
}

