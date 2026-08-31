import { llm } from '../ai/llm-service';
import {
  AgentType,
  type IAgent,
  type AgentOutput,
} from '@visapilot/shared';
import type { AgentContext } from '../types';

export interface JobSearchIntent {
  intent: 'JOB_SEARCH' | 'OTHER';
  semanticRequirements: {
    skills: string[];
    roles: string[];
    seniority?: string[];
    technologies?: string[];
    industries?: string[];
    locations?: string[];
    workMode?: string[];
  };
  hardConstraints: {
    type: string;
    value: string;
    required: boolean;
  }[];
  preferences: {
    salary?: string;
    companySize?: string;
  };
  queries: string[];
  tools: string[];
}

export class SearchAgent implements IAgent {
  readonly name = 'Search Agent';
  readonly type = AgentType.SEARCH;

  validate(input: Record<string, unknown>): boolean {
    return !!input.searchQuery || !!input.jobDescription;
  }

  async process(input: Record<string, unknown>): Promise<AgentOutput> {
    try {
      const context = input as unknown as AgentContext;
      const query = context.searchQuery || context.jobDescription || '';

      console.log(`[SearchAgent] ===== STARTING INTENT EXTRACTION =====`);
      console.log(`[SearchAgent] Original query: "${query}"`);

      // Timeout the LLM call to prevent hanging search requests.
      // If the LLM is slow/offline, fall back to deterministic intent immediately.
      const INTENT_TIMEOUT_MS = 6_000;
      let intent: JobSearchIntent;
      try {
        intent = await Promise.race([
          this.extractIntent(query, context),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Intent extraction timed out after ${INTENT_TIMEOUT_MS}ms`)), INTENT_TIMEOUT_MS),
          ),
        ]);
      } catch (timeoutOrLLMError) {
        console.warn(`[SearchAgent] LLM intent extraction failed/timed out: ${timeoutOrLLMError instanceof Error ? timeoutOrLLMError.message : timeoutOrLLMError}. Using deterministic fallback.`);
        intent = this.deterministicFallbackIntent(query);
      }

      console.log(`[SearchAgent] Extracted Intent:`, JSON.stringify(intent, null, 2));

      return {
        success: true,
        data: {
          originalQuery: query,
          intent,
          searchStrategy: {
            sources: ['GREENHOUSE', 'LEVER', 'ASHBY', 'LINKEDIN', 'INDEED', 'GLASSDOOR', 'WELLFOUND', 'WORKDAY', 'WORKABLE', 'SMARTRECRUITERS', 'RSS'],
            semanticSearch: true,
            keywordSearch: true,
            liveWebSearch: true,
            visaFilter: intent.hardConstraints.some(c => c.type === 'VISA_SPONSORSHIP' || c.type === 'H1B'),
          },
        },
        confidence: 0.9,
        metadata: {
          queryLength: query.length,
          toolsRequested: intent.tools.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Search agent failed',
        confidence: 0,
      };
    }
  }

  private deterministicFallbackIntent(query: string): JobSearchIntent {
    const lower = (query || '').toLowerCase();
    const needsVisa =
      lower.includes('h-1b') || lower.includes('h1b') ||
      lower.includes('visa') || lower.includes('sponsor');

    const tools: string[] = ['search_jobs'];
    if (needsVisa) tools.push('validate_visa');

    const queries = query 
      ? query.split(/\s+or\s+|,/i).map(q => q.trim()).filter(q => q.length > 0)
      : ['software engineer jobs'];

    return {
      intent: 'JOB_SEARCH',
      semanticRequirements: { skills: [], roles: [], locations: [] },
      hardConstraints: needsVisa
        ? [{ type: 'VISA_SPONSORSHIP', value: 'H-1B', required: true }]
        : [],
      preferences: {},
      queries: queries,
      tools,
    };
  }

  private async extractIntent(query: string, context: AgentContext): Promise<JobSearchIntent> {
    const filters = context.searchFilters || {};
    const needsVisa = filters.visaSponsorship ||
      (query || '').toLowerCase().match(/h.?1.?b|visa|sponsor|immigration|work.?permit|work.?authorization/);

    const prompt = `You are an expert job search intent extractor for a worldwide visa-sponsorship job platform.
Extract structured intent and generate optimized search queries.

CONTEXT:
User Query: "${query}"
Filters: ${JSON.stringify(filters)}
Visa/H1B Needed: ${needsVisa ? 'YES' : 'detect from query'}

RULES:
1. Always set intent to "JOB_SEARCH" for job search requests.
2. Generate 4 diverse search queries targeting WORLDWIDE jobs:
   - At least 2 queries should be PURE tech/role queries WITHOUT any visa keywords (e.g. "React engineer remote", "Python developer"). This is critical because many jobs don't put "visa" in the title but still sponsor.
   - At least 2 queries should include visa sponsorship or relocation keyword variations.
   Use multiple H1B/Relocation keyword variants: "H-1B sponsorship", "visa sponsorship", "will sponsor", "sponsorship available",
   "employment visa", "work authorization", "immigration sponsorship", "H1B transfer", "visa support",
   "sponsor work visa", "immigration assistance", "relocation package", "international candidates".
3. If visa sponsorship is requested (or inferred), add "validate_visa" tool and set VISA_SPONSORSHIP hard constraint.
4. Locations should be worldwide by default: ["Worldwide", "United States", "Canada", "United Kingdom", "Germany", "Australia", "Remote"].
5. Always include "search_jobs" tool.

EXAMPLE (for "React engineer H1B jobs"):
{
  "intent": "JOB_SEARCH",
  "semanticRequirements": {
    "skills": ["React", "JavaScript", "TypeScript"],
    "roles": ["Frontend Engineer", "React Developer", "Software Engineer"],
    "locations": ["United States", "Canada", "Remote", "Worldwide"],
    "workMode": ["Remote", "Hybrid"]
  },
  "hardConstraints": [{ "type": "VISA_SPONSORSHIP", "value": "H-1B", "required": true }],
  "preferences": {},
  "queries": [
    "React engineer remote",
    "Frontend developer",
    "React JavaScript will sponsor immigration",
    "Software engineer relocation package React"
  ],
  "tools": ["search_jobs", "validate_visa"]
}

Now generate for the actual query. Return ONLY valid JSON, no other text:`;

    try {
      const result = await llm.generate({
        task: 'search-intent',
        prompt,
        temperature: 0.1,
        maxTokens: 800,
      });

      const response = result.content;
      console.log('[SearchAgent] Intent LLM response:', response.slice(0, 300));

      // Extract JSON from response (handle markdown code blocks too)
      const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/) ||
                        response.match(/(\{[\s\S]*\})/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]).trim() : '';

      if (jsonStr) {
        const parsed = JSON.parse(jsonStr);
        // Ensure worldwide locations if none specified
        const locations = parsed.semanticRequirements?.locations?.length
          ? parsed.semanticRequirements.locations
          : ['Worldwide', 'United States', 'Canada', 'United Kingdom', 'Germany', 'Remote'];

        return {
          intent: parsed.intent || 'JOB_SEARCH',
          semanticRequirements: {
            skills: parsed.semanticRequirements?.skills || [],
            roles: parsed.semanticRequirements?.roles || [],
            locations,
            seniority: parsed.semanticRequirements?.seniority,
            technologies: parsed.semanticRequirements?.technologies,
            industries: parsed.semanticRequirements?.industries,
            workMode: parsed.semanticRequirements?.workMode,
          },
          hardConstraints: parsed.hardConstraints || [],
          preferences: parsed.preferences || {},
          queries: parsed.queries?.length > 0 ? parsed.queries : [query],
          tools: parsed.tools || ['search_jobs'],
        };
      }
    } catch (e) {
      console.warn('[SearchAgent] Error parsing LLM intent response:', e instanceof Error ? e.message : e);
    }

    // Fallback: deterministic intent if LLM response fails to parse
    return this.deterministicFallbackIntent(query);
  }
}
