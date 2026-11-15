import * as cheerio from 'cheerio';

export type FormFieldType =
  | 'text'
  | 'textarea'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'file';

export interface FormFieldOption {
  label: string;
  value: string;
}

export interface ExtractedFormField {
  fieldId: string;
  name: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  options?: FormFieldOption[];
  selector: string;
  placeholder?: string;
  description?: string;
}

export interface ExtractedApplicationForm {
  atsProvider: 'greenhouse' | 'lever' | 'ashby' | 'workday' | 'generic';
  applyUrl: string;
  hasCaptcha: boolean;
  fields: ExtractedFormField[];
}

/**
 * Detects the ATS provider based on URL or HTML structure.
 */
export function detectAtsProvider(
  html: string,
  applyUrl: string = '',
): 'greenhouse' | 'lever' | 'ashby' | 'workday' | 'generic' {
  const urlLower = applyUrl.toLowerCase();
  if (urlLower.includes('greenhouse.io')) return 'greenhouse';
  if (urlLower.includes('lever.co')) return 'lever';
  if (urlLower.includes('ashbyhq.com')) return 'ashby';
  if (urlLower.includes('myworkdayjobs.com')) return 'workday';

  const htmlLower = html.toLowerCase();
  if (htmlLower.includes('greenhouse') || htmlLower.includes('id="application_form"')) {
    return 'greenhouse';
  }
  if (htmlLower.includes('lever') || htmlLower.includes('id="application-form"')) {
    return 'lever';
  }
  if (htmlLower.includes('ashby')) {
    return 'ashby';
  }
  if (htmlLower.includes('workday')) {
    return 'workday';
  }

  return 'generic';
}

/**
 * Detects whether the form contains CAPTCHA or anti-bot verification challenges.
 */
export function detectCaptcha(html: string): boolean {
  const lower = html.toLowerCase();
  const captchaIndicators = [
    'hcaptcha',
    'g-recaptcha',
    'recaptcha',
    'cf-turnstile',
    'turnstile',
    'verification_code',
    'captcha_token',
    'id="captcha"',
    'class="captcha"',
  ];

  return captchaIndicators.some((indicator) => lower.includes(indicator));
}

function cleanLabelText(rawText: string): string {
  return rawText
    .replace(/\s+/g, ' ')
    .replace(/[*]/g, '')
    .trim();
}

/**
 * Parses an ATS job application HTML page and extracts all interactive form fields.
 */
export function extractApplicationForm(
  html: string,
  applyUrl: string = '',
): ExtractedApplicationForm {
  const $ = cheerio.load(html);
  const atsProvider = detectAtsProvider(html, applyUrl);
  const hasCaptcha = detectCaptcha(html);

  const fields: ExtractedFormField[] = [];
  const seenSelectors = new Set<string>();

  // 1. Process elements inside form or container
  $('input, select, textarea').each((_, elem) => {
    const el = $(elem);
    const tagName = elem.tagName.toLowerCase();
    const typeAttr = (el.attr('type') || '').toLowerCase();

    // Ignore submit, hidden, and button inputs
    if (typeAttr === 'submit' || typeAttr === 'hidden' || typeAttr === 'button') {
      return;
    }

    const id = el.attr('id') || '';
    const name = el.attr('name') || '';
    if (!id && !name) return;

    let fieldType: FormFieldType = 'text';
    if (tagName === 'textarea') {
      fieldType = 'textarea';
    } else if (tagName === 'select') {
      fieldType = 'select';
    } else if (typeAttr === 'file') {
      fieldType = 'file';
    } else if (typeAttr === 'checkbox') {
      fieldType = 'checkbox';
    } else if (typeAttr === 'radio') {
      fieldType = 'radio';
    }

    // Determine DOM Selector
    const selector = id ? `#${id}` : `${tagName}[name="${name}"]`;
    if (seenSelectors.has(selector)) return;
    seenSelectors.add(selector);

    // Extract Label:
    // a) label[for="id"]
    // b) closest enclosing label
    // c) previous sibling label or text in enclosing .field / .question
    let label = '';
    if (id) {
      const explicitLabel = $(`label[for="${id}"]`);
      if (explicitLabel.length > 0) {
        label = cleanLabelText(explicitLabel.text());
      }
    }

    if (!label) {
      const parentLabel = el.closest('label');
      if (parentLabel.length > 0) {
        label = cleanLabelText(parentLabel.text());
      }
    }

    if (!label) {
      const container = el.closest('.field, .question, .application-question, .form-group, div');
      const containerLabel = container.find('label').first();
      if (containerLabel.length > 0) {
        label = cleanLabelText(containerLabel.text());
      }
    }

    if (!label) {
      const fallback = el.attr('placeholder') || el.attr('aria-label') || name || id;
      label = cleanLabelText(fallback.replace(/[_-]+/g, ' '));
    }

    // Determine Required status:
    const isRequired =
      el.attr('required') !== undefined ||
      el.attr('aria-required') === 'true' ||
      (id && $(`label[for="${id}"] .asterisk, label[for="${id}"] span:contains("*")`).length > 0);

    // Extract options for selects and radio groups
    let options: FormFieldOption[] | undefined;
    if (fieldType === 'select') {
      options = [];
      el.find('option').each((_, opt) => {
        const optEl = $(opt);
        const val = optEl.attr('value') ?? optEl.text().trim();
        const text = optEl.text().trim();
        // Skip default placeholder options
        if (text && text !== '--' && !text.toLowerCase().includes('select')) {
          options!.push({ label: text, value: val });
        }
      });
    }

    fields.push({
      fieldId: id || name,
      name: name || id,
      label,
      type: fieldType,
      required: Boolean(isRequired),
      options,
      selector,
      placeholder: el.attr('placeholder'),
    });
  });

  return {
    atsProvider,
    applyUrl,
    hasCaptcha,
    fields,
  };
}
