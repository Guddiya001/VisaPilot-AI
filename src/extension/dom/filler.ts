/**
 * React 18/19 Input Value Setter
 * Bypasses React's synthetic input tracker by accessing the native HTMLInputElement
 * or HTMLTextAreaElement prototype value setter, then dispatches bubbling events.
 */
export function setReactInputValue(
  element: HTMLElement,
  value: string
): void {
  const tagName = element.tagName.toLowerCase();

  let prototype: any;
  if (tagName === 'textarea') {
    prototype =
      typeof window !== 'undefined'
        ? window.HTMLTextAreaElement.prototype
        : Object.getPrototypeOf(element);
  } else {
    prototype =
      typeof window !== 'undefined'
        ? window.HTMLInputElement.prototype
        : Object.getPrototypeOf(element);
  }

  const descriptor =
    Object.getOwnPropertyDescriptor(prototype, 'value') ||
    Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'value');

  if (descriptor?.set) {
    descriptor.set.call(element, value);
  } else {
    (element as any).value = value;
  }

  // Dispatch bubbling DOM events required by React 18 & 19
  const EventCtor = typeof Event !== 'undefined' ? Event : (window as any).Event;
  const inputEvent = new EventCtor('input', { bubbles: true, cancelable: true });
  const changeEvent = new EventCtor('change', { bubbles: true, cancelable: true });
  const blurEvent = new EventCtor('blur', { bubbles: true });

  element.dispatchEvent(inputEvent);
  element.dispatchEvent(changeEvent);
  element.dispatchEvent(blurEvent);
}
