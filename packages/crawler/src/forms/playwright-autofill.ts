import type { ExtractedApplicationForm, ExtractedFormField } from './form-extractor.ts';

export interface AutoFillAction {
  selector: string;
  fieldId: string;
  action: 'fill' | 'select' | 'check' | 'upload';
  value: string;
  label?: string;
  description?: string;
}

export interface AutoFillPlan {
  applyUrl: string;
  atsProvider: string;
  actions: AutoFillAction[];
  requiresHumanReview: boolean;
  reviewReason?: string;
  resumePdfPath?: string;
  totalFields: number;
  autoFilledCount: number;
}

export interface FormAnswerMapping {
  fieldId: string;
  value: string;
  action?: 'fill' | 'select' | 'check' | 'upload';
}

/**
 * Generates an executable Playwright / assisted browser auto-fill action plan
 * that maps answers and resume paths to DOM elements, with anti-bot safety checks.
 */
export function generatePlaywrightAutoFillPlan(
  form: ExtractedApplicationForm,
  answers: Map<string, string> | Record<string, string> | FormAnswerMapping[],
  resumePdfPath?: string,
): AutoFillPlan {
  const answersMap = new Map<string, string>();

  if (Array.isArray(answers)) {
    for (const a of answers) {
      answersMap.set(a.fieldId, a.value);
    }
  } else if (answers instanceof Map) {
    for (const [k, v] of answers.entries()) {
      answersMap.set(k, v);
    }
  } else if (typeof answers === 'object' && answers !== null) {
    for (const [k, v] of Object.entries(answers)) {
      answersMap.set(k, v);
    }
  }

  const actions: AutoFillAction[] = [];
  let autoFilledCount = 0;

  for (const field of form.fields) {
    // 1. File Upload (Resume / CV)
    if (field.type === 'file') {
      if (resumePdfPath) {
        actions.push({
          selector: field.selector,
          fieldId: field.fieldId,
          action: 'upload',
          value: resumePdfPath,
          label: field.label,
          description: 'Upload candidate tailored resume PDF',
        });
        autoFilledCount++;
      }
      continue;
    }

    // 2. Value lookup by fieldId, name, or label
    const answer =
      answersMap.get(field.fieldId) ??
      answersMap.get(field.name) ??
      answersMap.get(field.label);

    if (answer === undefined || answer === '') {
      continue;
    }

    let actionType: 'fill' | 'select' | 'check' = 'fill';
    let targetValue = answer;

    if (field.type === 'select') {
      actionType = 'select';
      // Match option value if available
      if (field.options && field.options.length > 0) {
        const matchingOpt = field.options.find(
          (opt) =>
            opt.value === answer ||
            opt.label.toLowerCase() === answer.toLowerCase() ||
            (answer.toLowerCase() === 'yes' && opt.label.toLowerCase().startsWith('yes')) ||
            (answer.toLowerCase() === 'no' && opt.label.toLowerCase().startsWith('no')),
        );
        if (matchingOpt) {
          targetValue = matchingOpt.value;
        }
      }
    } else if (field.type === 'checkbox' || field.type === 'radio') {
      actionType = 'check';
    }

    actions.push({
      selector: field.selector,
      fieldId: field.fieldId,
      action: actionType,
      value: targetValue,
      label: field.label,
    });
    autoFilledCount++;
  }

  const requiresHumanReview = form.hasCaptcha;
  const reviewReason = form.hasCaptcha
    ? 'CAPTCHA or verification challenge detected - requires human review before final submit'
    : undefined;

  return {
    applyUrl: form.applyUrl,
    atsProvider: form.atsProvider,
    actions,
    requiresHumanReview,
    reviewReason,
    resumePdfPath,
    totalFields: form.fields.length,
    autoFilledCount,
  };
}

