import { ollamaClient } from '../ollama/client';
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

      const intent = await this.extractIntent(query, context);
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

  private async extractIntent(query: string, context: AgentContext): Promise<JobSearchIntent> {
    const prompt = `You are an expert job search intent extractor and orchestrator. 
Extract structured search intent and decide which tools to call based on the user's request.

Available Tools:
- search_jobs: Search current external job sources (web/crawler)
- search_web: General web search for company information
- get_user_profile: Fetch the user's profile and resume from the database
- validate_visa: Validate if a job explicitly sponsors visas
- rank_jobs: Match and rank jobs against the user profile

User Query: "${query}"
Context Filters: ${JSON.stringify(context.searchFilters || {})}
Prior Skills/Context: ${(context.userSkills || []).join(', ')}

Instructions:
1. Identify if this is a job search request (JOB_SEARCH) or something else.
2. Extract semantic requirements like skills, roles, and locations.
3. Extract hard constraints like "H-1B sponsorship", "Security Clearance", or explicitly required work modes.
4. Generate 3-4 optimized search queries (e.g. '"React.js" "H-1B sponsorship" jobs United States').
5. Decide which tools need to be called. If they ask for visa, include "validate_visa".

Respond ONLY with valid JSON matching this exact structure:
{
  "intent": "JOB_SEARCH",
  "semanticRequirements": {
    "skills": ["React.js"],
    "roles": ["Software Engineer"],
    "locations": ["United States"]
  },
  "hardConstraints": [
    {
      "type": "VISA_SPONSORSHIP",
      "value": "H-1B",
      "required": true
    }
  ],
  "preferences": {},
  "queries": ["\\"React.js\\" \\"H-1B sponsorship\\" jobs United States"],
  "tools": ["search_jobs", "validate_visa", "get_user_profile", "rank_jobs"]
}`;

    try {
      const response = await ollamaClient.generateCompletion(prompt, {
        temperature: 0.1,
        maxTokens: 1000,
      });

      console.log("Intent Response: ", response);

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          intent: parsed.intent || 'JOB_SEARCH',
          semanticRequirements: {
            skills: parsed.semanticRequirements?.skills || [],
            roles: parsed.semanticRequirements?.roles || [],
            locations: parsed.semanticRequirements?.locations || [],
            seniority: parsed.semanticRequirements?.seniority,
            technologies: parsed.semanticRequirements?.technologies,
            industries: parsed.semanticRequirements?.industries,
            workMode: parsed.semanticRequirements?.workMode,
          },
          hardConstraints: parsed.hardConstraints || [],
          preferences: parsed.preferences || {},
          queries: parsed.queries && parsed.queries.length > 0 ? parsed.queries : [query],
          tools: parsed.tools || ['search_jobs', 'rank_jobs']
        };
      }
      //return ( "Ashish");
    } catch (e) {
      console.log('Error parsing intent:', e);
    }

    // Fallback deterministic intent
    return {
      intent: 'JOB_SEARCH',
      semanticRequirements: {
        skills: [],
        roles: [],
        locations: []
      },
      hardConstraints: [],
      preferences: {},
      queries: [query],
      tools: ['search_jobs']
    };
  }
}
