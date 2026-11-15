import { z } from 'zod';
import { llm } from '../ai/llm-service.ts';
import type { GenerateParams, LLMResult } from '../ai/llm-service.ts';
import { MODELS } from '../ai/models.ts';
import type { EngineeringPersona } from './persona-router.ts';
import { ENGINEERING_PERSONAS } from './persona-router.ts';

export const BANNED_AI_WORDS: readonly string[] = [
  'spearheaded',
  'delved into',
  'testament to',
  'seamlessly orchestrated',
  'passionate about leveraging',
  'thrilled to apply',
  'beacon',
  'tapestry',
  'game-changer',
  'esteemed organization',
  'harnessing the power',
  "in today's fast-paced world",
] as const;

export type FormQuestionCategory =
  | 'PERSONAL_IDENTITY_AND_LINKS'
  | 'VISA_CURRENT_AUTHORIZATION'
  | 'VISA_SPONSORSHIP_NEEDED'
  | 'LOGISTICS_COMPENSATION_NOTICE'
  | 'DEMOGRAPHIC_EEO'
  | 'OPEN_ENDED_TECHNICAL_OR_MOTIVATION';

export interface FormFieldOption {
  label: string;
  value: string;
}

export interface CandidateWorkExperience {
  company: string;
  role: string;
  highlights: string[];
}

export interface CandidateProfile {
  fullName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  currentCity: string;
  currentCountry: string;
  currentCountryCode: string; // e.g. 'IN'
  linkedInUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  requiresVisaSponsorship: boolean;
  targetCountries: string[];
  noticePeriod?: string;
  earliestStartDate?: string;
  salaryExpectations?: {
    currency: string;
    minimum: number;
    expected: number;
  };
  eeoPreferences?: {
    gender?: string;
    ethnicity?: string;
    veteran?: string;
    disability?: string;
  };
  primaryPersona?: string;
  workExperience?: CandidateWorkExperience[];
}

export interface DeterministicAnswerParams {
  question: string;
  category: FormQuestionCategory;
  fieldType: 'text' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'file';
  options?: FormFieldOption[];
  candidateProfile: CandidateProfile;
  jobTargetCountry?: string; // e.g. 'UK', 'DE', 'NL'
}

export interface DeterministicAnswerResult {
  suggestedAnswer: string;
  selectedOptionValue?: string;
  confidence: number;
  isKnockoutRisk: boolean;
  reasoning?: string;
}

export interface OpenEndedQuestionInput {
  id: string;
  question: string;
}

export interface OpenEndedBatchParams {
  questions: OpenEndedQuestionInput[];
  candidateProfile: CandidateProfile;
  persona: EngineeringPersona;
  jobContext: {
    company: string;
    title: string;
    description?: string;
  };
  llmClient?: {
    generate(params: GenerateParams): Promise<Pick<LLMResult, 'content' | 'model' | 'durationMs'>>;
  };
}

export interface OpenEndedAnswerResult {
  questionId: string;
  answer: string;
  confidence: number;
}

export const OpenEndedBatchResponseSchema: Record<string, unknown> = {
  type: 'OBJECT',
  properties: {
    answers: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          questionId: { type: 'STRING' },
          answer: { type: 'STRING' },
        },
        required: ['questionId', 'answer'],
      },
    },
  },
  required: ['answers'],
};

/**
 * Classifies any screening or form question into 1 of 6 canonical categories.
 */
export function classifyFormQuestion(
  question: string,
  options?: string[],
): FormQuestionCategory {
  const q = question.toLowerCase();

  // 1. Visa Sponsorship Needed check (check first so "authorized" isn't miscategorized)
  if (
    /sponsor|sponsorship/i.test(q) &&
    /require|need|will\s+you|now\s+or\s+in\s+the\s+future|seeking|immigration/i.test(q)
  ) {
    return 'VISA_SPONSORSHIP_NEEDED';
  }

  // 2. Visa Current Authorization check
  if (
    /authori[sz]ed\s+to\s+work|right\s+to\s+work|valid\s+work\s+(?:authorization|permit)|hold\s+(?:a\s+)?valid\s+visa|eligible\s+to\s+work/i.test(
      q,
    )
  ) {
    return 'VISA_CURRENT_AUTHORIZATION';
  }

  // 3. Demographic / EEO check
  if (
    /gender|race|ethnicity|veteran|disability|sexual\s+orientation|hispanic|latino|equal\s+employment/i.test(
      q,
    )
  ) {
    return 'DEMOGRAPHIC_EEO';
  }

  // 4. Logistics, Compensation, Notice check
  if (
    /notice\s+period|start\s+date|earliest\s+date|when\s+can\s+you\s+start|salary|compensation|expected\s+rate|remuneration|timezone|hours/i.test(
      q,
    )
  ) {
    return 'LOGISTICS_COMPENSATION_NOTICE';
  }

  // 5. Personal identity & links
  if (
    /first[\s_-]*name|last[\s_-]*name|full[\s_-]*name|\bemail\b|\bphone\b|\bmobile\b|current[\s_-]*(?:city|country|location)|\baddress\b|linkedin|github|portfolio|website|twitter/i.test(
      q,
    )
  ) {
    return 'PERSONAL_IDENTITY_AND_LINKS';
  }

  // 6. Open-ended technical or motivation
  return 'OPEN_ENDED_TECHNICAL_OR_MOTIVATION';
}

function matchOptionValue(
  targetText: string,
  options?: FormFieldOption[],
): string | undefined {
  if (!options || options.length === 0) return undefined;

  const targetLower = targetText.toLowerCase();

  // Exact value or label match
  for (const opt of options) {
    if (opt.value.toLowerCase() === targetLower || opt.label.toLowerCase() === targetLower) {
      return opt.value;
    }
  }

  // Prefix/keyword match
  for (const opt of options) {
    const optLabelLower = opt.label.toLowerCase();
    if (targetLower === 'no' && (optLabelLower === 'no' || optLabelLower.startsWith('no '))) {
      return opt.value;
    }
    if (targetLower === 'yes' && (optLabelLower === 'yes' || optLabelLower.startsWith('yes '))) {
      return opt.value;
    }
    if (optLabelLower.includes(targetLower)) {
      return opt.value;
    }
  }

  // Boolean 0 / 1 mapping
  if (targetLower === 'no') {
    const zeroOpt = options.find((o) => o.value === '0' || o.value === 'false');
    if (zeroOpt) return zeroOpt.value;
  }
  if (targetLower === 'yes') {
    const oneOpt = options.find((o) => o.value === '1' || o.value === 'true');
    if (oneOpt) return oneOpt.value;
  }

  return options[0]?.value;
}

function sanitizeHumanTone(rawText: string, personaId?: string): string {
  let cleaned = rawText.trim();

  // Replace robotic AI buzzwords with natural language
  for (const banned of BANNED_AI_WORDS) {
    const reg = new RegExp(`\\b${banned}\\b`, 'gi');
    cleaned = cleaned.replace(reg, (match) => {
      switch (match.toLowerCase()) {
        case 'spearheaded':
          return 'led';
        case 'delved into':
          return 'investigated';
        case 'testament to':
          return 'evidence of';
        case 'seamlessly orchestrated':
          return 'coordinated';
        case 'passionate about leveraging':
          return 'interested in using';
        case 'thrilled to apply':
          return 'excited to apply';
        case 'beacon':
          return 'example';
        case 'tapestry':
          return 'collection';
        case 'game-changer':
          return 'major improvement';
        case 'esteemed organization':
          return 'team';
        case 'harnessing the power':
          return 'using';
        case "in today's fast-paced world":
          return 'currently';
        default:
          return '';
      }
    });
  }

  // If Backend persona, strip any stray frontend contamination
  if (personaId === 'BACKEND_DISTRIBUTED') {
    cleaned = cleaned
      .replace(/\b(frontend|front-end|react|css|html|lighthouse|tailwind)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  return cleaned;
}

export class FormQuestionResponder {
  /**
   * Deterministically answers compliance, identity, visa knockout, and logistics questions (0ms, zero LLM).
   */
  async answerDeterministicQuestion(
    params: DeterministicAnswerParams,
  ): Promise<DeterministicAnswerResult> {
    const { question, category, fieldType, options, candidateProfile, jobTargetCountry } = params;
    const targetCty = (jobTargetCountry || 'UK').toUpperCase();
    const candidateCtyCode = (candidateProfile.currentCountryCode || 'IN').toUpperCase();

    switch (category) {
      case 'VISA_CURRENT_AUTHORIZATION': {
        // Candidate is located outside the target country (e.g. India applying to UK)
        // and requires visa sponsorship -> truthful and compliant answer is ALWAYS "No"
        const isIndiaToForeign =
          candidateCtyCode === 'IN' ||
          candidateProfile.currentCountry.toLowerCase() === 'india' ||
          candidateProfile.requiresVisaSponsorship;

        const suggestedAnswer = isIndiaToForeign ? 'No' : 'Yes';
        const selectedOptionValue = matchOptionValue(suggestedAnswer, options);

        return {
          suggestedAnswer,
          selectedOptionValue,
          confidence: 1.0,
          isKnockoutRisk: false, // Truthful disclosure prevents downstream revocation
          reasoning: `Candidate located in ${candidateProfile.currentCountry} requires sponsorship for ${targetCty}. Truthfully selected "No" for current authorization.`,
        };
      }

      case 'VISA_SPONSORSHIP_NEEDED': {
        const requiresSponsorship = candidateProfile.requiresVisaSponsorship;
        const suggestedAnswer = requiresSponsorship ? 'Yes' : 'No';
        const selectedOptionValue = matchOptionValue(suggestedAnswer, options);

        let textAnswer = suggestedAnswer;
        if (fieldType === 'text' || fieldType === 'textarea') {
          if (targetCty === 'UK') {
            textAnswer = 'Yes, require UK Skilled Worker visa sponsorship and relocation support.';
          } else if (targetCty === 'DE') {
            textAnswer = 'Yes, require EU Blue Card sponsorship and relocation support.';
          } else if (targetCty === 'NL') {
            textAnswer = 'Yes, require Highly Skilled Migrant (kennismigrant / IND) visa sponsorship and relocation support.';
          } else {
            textAnswer = `Yes, require employment visa sponsorship and relocation support for ${targetCty}.`;
          }
        }

        return {
          suggestedAnswer: fieldType === 'select' || fieldType === 'radio' ? suggestedAnswer : textAnswer,
          selectedOptionValue,
          confidence: 1.0,
          isKnockoutRisk: false,
          reasoning: `Declared requirement for ${targetCty} visa sponsorship.`,
        };
      }

      case 'PERSONAL_IDENTITY_AND_LINKS': {
        const q = question.toLowerCase();
        let value = '';

        if (/first[\s_-]*name/i.test(q)) {
          value = candidateProfile.firstName;
        } else if (/last[\s_-]*name/i.test(q)) {
          value = candidateProfile.lastName;
        } else if (/full[\s_-]*name|\bname\b/i.test(q)) {
          value = candidateProfile.fullName;
        } else if (/email/i.test(q)) {
          value = candidateProfile.email;
        } else if (/phone|mobile/i.test(q)) {
          value = candidateProfile.phone;
        } else if (/linkedin/i.test(q)) {
          value = candidateProfile.linkedInUrl || '';
        } else if (/github/i.test(q)) {
          value = candidateProfile.githubUrl || '';
        } else if (/portfolio|website/i.test(q)) {
          value = candidateProfile.portfolioUrl || '';
        } else if (/city/i.test(q)) {
          value = candidateProfile.currentCity;
        } else if (/country/i.test(q)) {
          value = candidateProfile.currentCountry;
        } else if (/location|address/i.test(q)) {
          value = `${candidateProfile.currentCity}, ${candidateProfile.currentCountry}`;
        }

        return {
          suggestedAnswer: value,
          selectedOptionValue: matchOptionValue(value, options),
          confidence: 1.0,
          isKnockoutRisk: false,
        };
      }

      case 'LOGISTICS_COMPENSATION_NOTICE': {
        const q = question.toLowerCase();
        let val = candidateProfile.noticePeriod || '30 days';

        if (/salary|compensation|expected\s+rate|remuneration/i.test(q)) {
          val = candidateProfile.salaryExpectations
            ? `${candidateProfile.salaryExpectations.currency} ${candidateProfile.salaryExpectations.expected.toLocaleString()}`
            : 'Competitive / Open to standard regional band';
        } else if (/start\s+date|earliest/i.test(q)) {
          val = candidateProfile.earliestStartDate || '1 month after offer acceptance';
        }

        return {
          suggestedAnswer: val,
          selectedOptionValue: matchOptionValue(val, options),
          confidence: 0.95,
          isKnockoutRisk: false,
        };
      }

      case 'DEMOGRAPHIC_EEO': {
        const defaultChoice = 'Prefer not to say';
        const optVal = matchOptionValue(defaultChoice, options);
        return {
          suggestedAnswer: defaultChoice,
          selectedOptionValue: optVal,
          confidence: 1.0,
          isKnockoutRisk: false,
        };
      }

      default:
        return {
          suggestedAnswer: '',
          confidence: 0.0,
          isKnockoutRisk: false,
        };
    }
  }

  /**
   * Generates grounded, human-toned answers for all open-ended questions in a SINGLE batched LLM call.
   */
  async answerOpenEndedBatch(
    params: OpenEndedBatchParams,
  ): Promise<OpenEndedAnswerResult[]> {
    const { questions, candidateProfile, persona, jobContext, llmClient = llm } = params;
    if (questions.length === 0) return [];

    const workHighlights = (candidateProfile.workExperience || [])
      .map((w) => `${w.role} at ${w.company}: ${w.highlights.join('; ')}`)
      .join('\n');

    const prompt = `You are filling out application screening questions for ${candidateProfile.fullName}.
Role applied: "${jobContext.title}" at "${jobContext.company}".
Job Context: ${jobContext.description || 'Systems & Engineering Role'}

Engineering Persona: ${persona.title} (${persona.id})
Focus: ${persona.focus}
Signature Experience: ${persona.signatureExperience}
Candidate Background:
${workHighlights}

STRICT HUMAN VOICE RULES:
1. Write in direct first-person ("I built...", "At DBS Bank, I worked on...", "In my experience...").
2. Be concise: 2 to 4 sentences per answer. No fluff.
3. Ground answers strictly in the candidate's engineering background and persona.
4. BANNED BUZZWORDS: Never use: ${BANNED_AI_WORDS.join(', ')}.
${persona.id === 'BACKEND_DISTRIBUTED' ? '5. NEVER mention frontend technologies, CSS, HTML, or UI design.' : ''}

Questions to answer in ONE JSON object {"answers": [{"questionId": "...", "answer": "..."}]}:
${JSON.stringify(questions, null, 2)}`;

    try {
      const response = await llmClient.generate({
        task: 'fast-extraction',
        model: MODELS.MINIMAX_M3,
        prompt,
        temperature: 0.2,
        maxTokens: 2048,
        responseSchema: OpenEndedBatchResponseSchema,
      });

      const parsed = JSON.parse(response.content.replace(/```(?:json)?\s*([\s\S]*?)\s*```/i, '$1'));
      const rawAnswers: Array<{ questionId: string; answer: string }> = parsed.answers || [];

      return questions.map((q) => {
        const found = rawAnswers.find((a) => a.questionId === q.id);
        const answerText = found?.answer || `${persona.signatureExperience} I look forward to applying this at ${jobContext.company}.`;
        const cleaned = sanitizeHumanTone(answerText, persona.id);

        return {
          questionId: q.id,
          answer: cleaned,
          confidence: 0.95,
        };
      });
    } catch {
      // Deterministic fallback: grounded response from persona highlights
      return questions.map((q) => {
        const fallbackAnswer = `${persona.signatureExperience} Working with ${jobContext.company} on ${jobContext.title} directly matches my background in ${persona.keySkills.slice(0, 3).join(', ')}.`;
        return {
          questionId: q.id,
          answer: sanitizeHumanTone(fallbackAnswer, persona.id),
          confidence: 0.85,
        };
      });
    }
  }
}
