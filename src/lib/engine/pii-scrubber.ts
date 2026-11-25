/**
 * PII Scrubber & Rehydrator
 * Ensures outbound prompts sent to any LLM are stripped of raw candidate PII
 * (phone numbers, passport IDs, emails, national IDs) and safely restored upon return.
 */

export interface ScrubResult {
  scrubbedText: string;
  restoreMap: Map<string, string>;
}

export class PiiScrubber {
  /**
   * Scrubs PII from the input text using regex patterns and known profile PII dictionary.
   */
  scrub(text: string, knownPii: Record<string, any> = {}): ScrubResult {
    let scrubbed = text;
    const restoreMap = new Map<string, string>();

    let phoneCounter = 1;
    let emailCounter = 1;
    let passportCounter = 1;

    // 1. Scrub known explicit PII from profile context first (exact matches)
    for (const [key, rawValue] of Object.entries(knownPii)) {
      if (!rawValue || typeof rawValue !== 'string') continue;
      const val = rawValue.trim();
      if (val.length < 3) continue;

      const lowerKey = key.toLowerCase();
      if (lowerKey.includes('phone') || lowerKey.includes('mobile')) {
        const token = `{{PII_PHONE_${phoneCounter++}}}`;
        if (scrubbed.includes(val)) {
          scrubbed = scrubbed.split(val).join(token);
          restoreMap.set(token, val);
        }
      } else if (lowerKey.includes('email')) {
        const token = `{{PII_EMAIL_${emailCounter++}}}`;
        if (scrubbed.includes(val)) {
          scrubbed = scrubbed.split(val).join(token);
          restoreMap.set(token, val);
        }
      } else if (
        lowerKey.includes('passport') ||
        lowerKey.includes('ssn') ||
        lowerKey.includes('nationalid') ||
        lowerKey.includes('idnumber')
      ) {
        const token = `{{PII_PASSPORT_${passportCounter++}}}`;
        if (scrubbed.includes(val)) {
          scrubbed = scrubbed.split(val).join(token);
          restoreMap.set(token, val);
        }
      }
    }

    // 2. Pattern-based scrubber for any remaining emails
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    scrubbed = scrubbed.replace(emailRegex, (match) => {
      // Check if this email was already mapped
      for (const [token, orig] of restoreMap.entries()) {
        if (orig === match) return token;
      }
      const token = `{{PII_EMAIL_${emailCounter++}}}`;
      restoreMap.set(token, match);
      return token;
    });

    // 3. Pattern-based scrubber for international and standard phone numbers
    // e.g., +91-9876543210, +1 (555) 123-4567, 9876543210
    const phoneRegex = /(?:\+?\d{1,4}[-.\s]?)?(?:\(?\d{2,5}\)?[-.\s]?)?\d{3,5}[-.\s]?\d{4,6}/g;
    scrubbed = scrubbed.replace(phoneRegex, (match) => {
      const digitsOnly = match.replace(/\D/g, '');
      // Only treat as phone if has at least 8 digits and not a standard year like 2021
      if (digitsOnly.length < 8 || digitsOnly.length > 15) return match;
      for (const [token, orig] of restoreMap.entries()) {
        if (orig === match) return token;
      }
      const token = `{{PII_PHONE_${phoneCounter++}}}`;
      restoreMap.set(token, match);
      return token;
    });

    return {
      scrubbedText: scrubbed,
      restoreMap,
    };
  }

  /**
   * Restores scrubbed tokens in the LLM response with original real values.
   */
  rehydrate(scrubbedText: string, restoreMap: Map<string, string>): string {
    let rehydrated = scrubbedText;
    for (const [token, originalVal] of restoreMap.entries()) {
      rehydrated = rehydrated.split(token).join(originalVal);
    }
    return rehydrated;
  }
}

export const defaultPiiScrubber = new PiiScrubber();

export function scrubPii(
  text: string,
  knownPii?: Record<string, any>
): ScrubResult {
  return defaultPiiScrubber.scrub(text, knownPii);
}

export function rehydratePii(
  scrubbedText: string,
  restoreMap: Map<string, string>
): string {
  return defaultPiiScrubber.rehydrate(scrubbedText, restoreMap);
}
