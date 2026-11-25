/**
 * File Uploader for resume / document inputs in DOM engine
 */

export function attachResumeFile(
  fileInput: HTMLInputElement,
  fileBuffer: Buffer | Uint8Array,
  fileName: string,
  mimeType = 'application/pdf'
): void {
  const FileConstructor =
    (globalThis as any).File ||
    (fileInput.ownerDocument?.defaultView as any)?.File ||
    File;
  const file = new FileConstructor([fileBuffer], fileName, { type: mimeType });

  let assigned = false;
  const DataTransferConstructor =
    (globalThis as any).DataTransfer ||
    (fileInput.ownerDocument?.defaultView as any)?.DataTransfer;

  if (DataTransferConstructor) {
    try {
      const dataTransfer = new DataTransferConstructor();
      dataTransfer.items.add(file);
      fileInput.files = dataTransfer.files;
      assigned = fileInput.files?.length === 1;
    } catch {
      assigned = false;
    }
  }

  if (!assigned) {
    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: true,
      configurable: true,
    });
  }

  const EventConstructor =
    (globalThis as any).Event ||
    (fileInput.ownerDocument?.defaultView as any)?.Event ||
    Event;

  fileInput.dispatchEvent(new EventConstructor('input', { bubbles: true }));
  fileInput.dispatchEvent(new EventConstructor('change', { bubbles: true }));
}
