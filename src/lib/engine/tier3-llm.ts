import {
  type PersonaData,
  type ResolutionResult,
} from './resolver.ts';
import { scrubPii, rehydratePii, PiiScrubber } from './pii-scrubber.ts';

/**
 * Thrown when an LLM generation alters or hallucinates immutable candidate facts.
 */
export class FactLockViolationError extends Error {
  public violatedFact: string;
  public expectedValue: string;
  public actualValue: string;

  constructor(violatedFact: string, expectedValue: string, actualValue: string) {
    super(
      `FactLockViolationError: LLM mutated locked fact "${violatedFact}". Expected: "${expectedValue}", Got: "${actualValue}".`
    );
    this.name = 'FactLockViolationError';
    this.violatedFact = violatedFact;
    this.expectedValue = expectedValue;
    this.actualValue = actualValue;
  }
}

export interface LlmProvider {
  generate(prompt: string, systemPrompt?: string): Promise<string>;
}

export interface Tier3GuardedRequest {
  rawPrompt: string;
  persona: PersonaData;
  question: string;
  requiredFactKeys?: string[];
  maxLength?: number;
}

export interface Tier3GuardedResponse {
  tier: 3;
  badge: 'AMBER_LLM_DRAFT' | 'RED_MISSING_FACT';
  value: string;
  llmCalls: number;
  missingFactKey?: string;
  isHit?: boolean;
}

/**
 * Known fact triggers mapped to normalized lockedFacts keys.
 */
const KNOWN_FACT_PATTERNS: Array<{ regex: RegExp; key: string }> = [
  { regex: /clearance\s*(number|level|status)?/i, key: 'security_clearance' },
  { regex: /driver(?:'s)?\s*license/i, key: 'drivers_license' },
  { regex: /national\s*insurance\s*number|ssn|social\s*security/i, key: 'national_id' },
  { regex: /visa\s*grant\s*number/i, key: 'visa_grant_number' },
];

/**
 * Tier 3 Guarded LLM Fallback
 * Provides safety-gated LLM fallback with:
 * 1. Automatic PII scrubbing on outbound prompts and rehydration on return.
 * 2. Fact-lock checking: emits RED_MISSING_FACT rather than allowing hallucination.
 * 3. Fact-lock verification: throws FactLockViolationError if LLM mutates locked employer names or verified dates.
 */
export class Tier3LlmFallback {
  private llm: LlmProvider;
  private scrubber: PiiScrubber;

  constructor(llm: LlmProvider, scrubber: PiiScrubber = new PiiScrubber()) {
    this.llm = llm;
    this.scrubber = scrubber;
  }

  /**
   * Generates an LLM response guarded against PII leakage and factual hallucination.
   */
  async generateGuardedResponse(
    request: Tier3GuardedRequest
  ): Promise<Tier3GuardedResponse> {
    const { rawPrompt, persona, question, requiredFactKeys = [] } = request;
    const lockedFacts = persona.lockedFacts ?? {};

    // 1. Check for explicit required facts or pattern-detected facts missing from lockedFacts
    const allRequiredKeys = [...requiredFactKeys];
    for (const pattern of KNOWN_FACT_PATTERNS) {
      if (pattern.regex.test(question) || pattern.regex.test(rawPrompt)) {
        if (!allRequiredKeys.includes(pattern.key)) {
          allRequiredKeys.push(pattern.key);
        }
      }
    }

    for (const key of allRequiredKeys) {
      const factVal = lockedFacts[key];
      if (!factVal) {
        return {
          tier: 3,
          badge: 'RED_MISSING_FACT',
          value: `[MISSING_FACT: ${key}]`,
          missingFactKey: key,
          llmCalls: 0,
          isHit: false,
        };
      }
    }

    // 2. Scrub PII from outbound prompt
    const knownPii = {
      ...(persona.contactInfo ?? {}),
      passport: lockedFacts.passportNumber ?? persona.contactInfo?.passport,
    };

    const { scrubbedText, restoreMap } = this.scrubber.scrub(rawPrompt, knownPii);

    // 3. Invoke LLM provider with scrubbed prompt
    const rawLlmOutput = await this.llm.generate(scrubbedText);

    // 4. Validate output against lockedFacts to prevent mutations
    this.validateLockedFacts(rawLlmOutput, lockedFacts);

    // 5. Rehydrate scrubbed PII tokens
    const rehydratedOutput = this.scrubber.rehydrate(rawLlmOutput, restoreMap);

    return {
      tier: 3,
      badge: 'AMBER_LLM_DRAFT',
      value: rehydratedOutput,
      llmCalls: 1,
      isHit: true,
    };
  }

  /**
   * Enforces that the draft does not mutate verified employer names or dates.
   */
  private validateLockedFacts(
    draft: string,
    lockedFacts: Record<string, any>
  ): void {
    const employers = (lockedFacts.employers as string[]) ?? [];
    const verifiedDates = (lockedFacts.verifiedDates as Record<string, { start: string; end: string }>) ?? {};

    // Check employer name tampering (e.g. "United Health Corporation" when locked is "UnitedHealth Group")
    for (const emp of employers) {
      // Look for mutated variations: words matching the start or core of the employer name
      const coreEmpWord = emp.split(' ')[0]; // e.g. "UnitedHealth" or "United"
      if (coreEmpWord.length >= 5) {
        // Find mentions in draft
        const regex = new RegExp(`\\b(${coreEmpWord}[A-Za-z\\s]{0,25})\\b`, 'i');
        const match = draft.match(regex);
        if (match) {
          const mentioned = match[0].trim();
          // If mentioned company contains mutated form instead of exact employer name
          if (
            (mentioned.toLowerCase().includes('united') || mentioned.toLowerCase().includes(coreEmpWord.toLowerCase())) &&
            !mentioned.includes(emp) &&
            !emp.includes(mentioned)
          ) {
            throw new FactLockViolationError(
              'employer_name',
              emp,
              mentioned
            );
          }
        }
      }

      // Check date mutations for verified employers
      const dates = verifiedDates[emp];
      if (dates) {
        // If draft mentions dates like 2018-01-01 when locked start is 2021-03-01
        const dateRegex = /\b(\d{4}-\d{2}-\d{2})\b/g;
        let dateMatch: RegExpExecArray | null;
        while ((dateMatch = dateRegex.exec(draft)) !== null) {
          const foundDate = dateMatch[1];
          if (foundDate !== dates.start && foundDate !== dates.end) {
            throw new FactLockViolationError(
              'employment_date',
              dates.start,
              foundDate
            );
          }
        }
      }
    }
  }
}
