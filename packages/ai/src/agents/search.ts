import { crawlerService } from '@visapilot/crawler';
import type { CrawledJob } from '@visapilot/crawler';
import { ollamaClient } from '../ollama/client';
import { embeddingService } from '../ollama/embeddings';
import { ragService } from '../rag/service';
import {
  AgentType,
  JobSource,
  JobType,
  VisaSponsorshipStatus,
  WorkMode,
  type IAgent,
  type AgentOutput,
  type SearchFilters,
} from '@visapilot/shared';
import type { AgentContext } from '../types';

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

      console.log(`[SearchAgent] ===== STARTING SEARCH PROCESSING =====`);
      console.log(`[SearchAgent] Original query: "${query}"`);
      console.log(`[SearchAgent] Filters:`, JSON.stringify(context.searchFilters));

      // Step 1: Enrich search query
      console.log(`[SearchAgent] Step 1/7: Enriching search query...`);
      const enrichedQuery = await this.enrichSearchQuery(query, context);
      console.log(`[SearchAgent] Step 1/7: Enriched query: "${enrichedQuery}"`);

      // Step 2: Generate embedding for semantic search
      console.log(`[SearchAgent] Step 2/7: Generating embedding for semantic search...`);
      let queryEmbedding: number[] = [];
      try {
        queryEmbedding = await embeddingService.generateSearchQueryEmbedding(enrichedQuery);
        console.log(`[SearchAgent] Step 2/7: Embedding generated. Length: ${queryEmbedding.length}`);
        console.log(`[SearchAgent] Step 2/7: First 5 values: [${queryEmbedding.slice(0, 5).join(', ')}]`);
      } catch (embedError) {
        console.log(`[SearchAgent] Step 2/7: ❌ Embedding generation FAILED:`, embedError);
      }

      // Step 3: Extract search keywords
      console.log(`[SearchAgent] Step 3/7: Extracting keywords...`);
      const keywords = await this.extractKeywords(enrichedQuery);
      console.log(`[SearchAgent] Step 3/7: Keywords extracted:`, keywords);

      // Step 4: Classify job type and requirements
      console.log(`[SearchAgent] Step 4/7: Classifying job...`);
      const classification = await this.classifyJob(enrichedQuery);
      console.log(`[SearchAgent] Step 4/7: Classification result:`, JSON.stringify(classification));

      // Step 5: Generate job recommendations
      console.log(`[SearchAgent] Step 5/7: Generating recommendations...`);
      const recommendations = await this.generateRecommendations(enrichedQuery, classification);
      console.log(`[SearchAgent] Step 5/7: Recommendations count:`, recommendations.length);
      if (recommendations.length > 0) {
        console.log(`[SearchAgent] Step 5/7: First recommendation:`, JSON.stringify(recommendations[0]));
      }

      // Step 6: Search the live web/crawler sources for jobs
      console.log(`[SearchAgent] Step 6/7: Searching live web via crawler...`);
      const searchFilters = this.buildSearchFilters(context, classification, enrichedQuery);
      console.log(`[SearchAgent] Step 6/7: Search filters:`, JSON.stringify(searchFilters));
      let webResults = await this.searchWebJobs(searchFilters, query, classification);
      console.log(`[SearchAgent] Step 6/7: Web results found: ${webResults.length}`);
      if (webResults.length > 0) {
        console.log(`[SearchAgent] Step 6/7: First web result:`, JSON.stringify(webResults[0]?.title));
        console.log(`[SearchAgent] Step 6/7: Web result sources:`, [...new Set(webResults.map((r: any) => r.source))]);
      }

      // Step 7: Fall back to the local RAG index only if no live results are available
      let ragResults: any[] = [];
      if (webResults.length > 0) {
        console.log(`[SearchAgent] Step 7/7: Live results found — skipping RAG fallback`);
      } else {
        console.log(`[SearchAgent] Step 7/7: No live results — falling back to RAG index...`);
        ragResults = await ragService.searchJobs(enrichedQuery);
        console.log(`[SearchAgent] Step 7/7: RAG results found: ${ragResults.length}`);

        // Note: if both crawler and RAG return 0 results, the API will return an empty data array
      }

      return {
        success: true,
        data: {
          originalQuery: query,
          enrichedQuery,
          queryEmbedding,
          keywords,
          classification,
          recommendations,
          webResults,
          ragResults,
          searchStrategy: {
            sources: ['GREENHOUSE', 'LEVER', 'ASHBY', 'RSS'],
            semanticSearch: true,
            keywordSearch: true,
            liveWebSearch: true,
            visaFilter: context.searchFilters?.visaSponsorship === 'SPONSORS',
          },
        },
        confidence: 0.85,
        metadata: {
          queryLength: query.length,
          keywordsFound: keywords.length,
          recommendationsGenerated: recommendations.length,
          webResultsFound: webResults.length,
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

  private buildSearchFilters(
    context: AgentContext,
    classification: Record<string, unknown>,
    query: string,
  ): SearchFilters {
    const filters: SearchFilters = {
      query: this.expandQueryForCrawler(query, classification),
      limit: 12,
      page: 1,
    };

    const country = this.normalizeString(context.searchFilters?.country);
    if (country) {
      filters.countries = [country];
    }

    if (typeof context.searchFilters?.remote === 'boolean') {
      filters.remote = context.searchFilters.remote;
    }

    const visaFilter = this.normalizeVisaFilter(context.searchFilters?.visaSponsorship);
    if (visaFilter) {
      filters.visaSponsorship = visaFilter;
    }

    const workMode = this.normalizeWorkMode(this.normalizeString(classification.work_type));
    if (workMode) {
      filters.workMode = [workMode];
    }

    const jobType = this.normalizeJobType(this.normalizeString(classification.employment_type));
    if (jobType) {
      filters.types = [jobType];
    }

    const requiredSkills = Array.isArray(classification.required_skills)
      ? (classification.required_skills as string[]).filter(Boolean)
      : [];
    if (requiredSkills.length > 0) {
      filters.skills = requiredSkills;
    }

    return filters;
  }

  private async searchWebJobs(
    filters: SearchFilters,
    originalQuery: string,
    classification: Record<string, unknown>,
  ): Promise<Array<Record<string, unknown>>> {
    try {
      console.log(`[SearchAgent]   -> Calling crawlerService.searchJobs with query="${filters.query}"`);
      const result = await crawlerService.searchJobs(filters, [
        JobSource.GREENHOUSE,
        JobSource.LEVER,
        JobSource.ASHBY,
        JobSource.RSS,
      ]);

      console.log(`[SearchAgent]   -> Crawler returned ${result.jobs?.length || 0} jobs, ${result.errors?.length || 0} errors`);
      if (result.errors && result.errors.length > 0) {
        console.log(`[SearchAgent]   -> Crawler errors:`, JSON.stringify(result.errors));
      }

      const normalizedJobs = (result.jobs || [])
        .map((job: CrawledJob) => ({
          id: job.externalId || job.title,
          title: job.title,
          companyName: job.companyName,
          source: job.source,
          location: job.location,
          country: job.country,
          remote: job.remote,
          workMode: job.workMode,
          type: job.type,
          salaryMin: job.salaryMin,
          salaryMax: job.salaryMax,
          sourceUrl: job.sourceUrl,
          applyUrl: job.applyUrl,
          description: job.description,
          skills: job.skills,
          postedAt: job.postedAt,
          score: this.scoreJob(job, filters.query, originalQuery),
        }))
        .sort((a, b) => (b.score as number) - (a.score as number))
        .slice(0, 20);

      if (normalizedJobs.length > 0) {
        console.log(`[SearchAgent]   -> Using ${normalizedJobs.length} normalized results from primary search`);
        return normalizedJobs;
      }

      console.log(`[SearchAgent]   -> No primary results, trying ${this.buildFallbackQueries(originalQuery, classification).length} fallback queries`);
      const fallbackQueries = this.buildFallbackQueries(originalQuery, classification);
      for (const fallbackQuery of fallbackQueries) {
        const fallbackFilters = { ...filters, query: fallbackQuery, limit: 8 };
        console.log(`[SearchAgent]   -> Fallback query: "${fallbackQuery}"`);
        const fallbackResult = await crawlerService.searchJobs(fallbackFilters, [
          JobSource.GREENHOUSE,
          JobSource.LEVER,
          JobSource.ASHBY,
          JobSource.RSS,
        ]);

        console.log(`[SearchAgent]   -> Fallback returned ${fallbackResult.jobs?.length || 0} jobs`);

        if ((fallbackResult.jobs || []).length > 0) {
          return (fallbackResult.jobs || [])
            .map((job: CrawledJob) => ({
              id: job.externalId || job.title,
              title: job.title,
              companyName: job.companyName,
              source: job.source,
              location: job.location,
              country: job.country,
              remote: job.remote,
              workMode: job.workMode,
              type: job.type,
              salaryMin: job.salaryMin,
              salaryMax: job.salaryMax,
              sourceUrl: job.sourceUrl,
              applyUrl: job.applyUrl,
              description: job.description,
              skills: job.skills,
              postedAt: job.postedAt,
              score: this.scoreJob(job, fallbackQuery, originalQuery),
            }))
            .sort((a, b) => (b.score as number) - (a.score as number))
            .slice(0, 10);
        }
      }

      console.log(`[SearchAgent]   -> All queries exhausted, returning empty results`);
      return [];
    } catch (error) {
      console.log(`[SearchAgent]   -> ❌ searchWebJobs threw exception:`, error);
      return [];
    }
  }

  private expandQueryForCrawler(query: string, classification: Record<string, unknown>): string {
    const baseTerms = query
      .split(/\s+/)
      .map((term) => term.trim())
      .filter(Boolean);

    const role = this.normalizeString(classification.role);
    const requiredSkills = Array.isArray(classification.required_skills)
      ? (classification.required_skills as string[]).filter(Boolean)
      : [];

    const expandedTerms = new Set<string>([
      ...baseTerms,
      ...(role ? [role] : []),
      ...requiredSkills.slice(0, 5),
    ]);

    return Array.from(expandedTerms).join(' ');
  }

  private buildFallbackQueries(query: string, classification: Record<string, unknown>): string[] {
    const role = this.normalizeString(classification.role);
    const requiredSkills = Array.isArray(classification.required_skills)
      ? (classification.required_skills as string[]).filter(Boolean)
      : [];

    const variants = new Set<string>();
    const base = query.trim();
    if (base) variants.add(base);
    if (role) variants.add(role);

    const trimmedRole = role?.replace(/\s*\([^)]*\)\s*$/i, '').trim();
    if (trimmedRole) variants.add(trimmedRole);

    for (const skill of requiredSkills.slice(0, 5)) {
      if (skill) variants.add(skill);
    }

    const fallbackQueries = Array.from(variants);
    return fallbackQueries.length > 0 ? fallbackQueries : [base || 'software engineer'];
  }

  private scoreJob(job: CrawledJob, query?: string, originalQuery?: string): number {
    const haystacks = [
      job.title,
      job.companyName,
      job.description,
      job.location,
      job.country,
      job.skills?.join(' ') || '',
      originalQuery || '',
      query || '',
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    const terms = (query || originalQuery || '')
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);

    let score = 0;
    for (const term of terms) {
      if (haystacks.includes(term)) score += 3;
    }

    const title = job.title.toLowerCase();
    if (title.includes('engineer') || title.includes('developer') || title.includes('software')) score += 2;
    if (job.remote) score += 1;
    if (job.country && job.country.toLowerCase() === 'us') score += 1;
    if ((job.skills || []).length > 0) score += 1;

    return score;
  }

  private normalizeString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }

  private normalizeWorkMode(value: string | undefined): WorkMode | undefined {
    if (!value) return undefined;

    const normalized = value.toUpperCase();
    if (normalized === 'REMOTE') return WorkMode.REMOTE;
    if (normalized === 'ONSITE') return WorkMode.ONSITE;
    if (normalized === 'HYBRID') return WorkMode.HYBRID;
    return undefined;
  }

  private normalizeJobType(value: string | undefined): JobType | undefined {
    if (!value) return undefined;

    const normalized = value.toUpperCase().replace(/\s+/g, '_');
    if (normalized === 'FULL_TIME') return JobType.FULL_TIME;
    if (normalized === 'PART_TIME') return JobType.PART_TIME;
    if (normalized === 'CONTRACT') return JobType.CONTRACT;
    if (normalized === 'INTERNSHIP') return JobType.INTERNSHIP;
    if (normalized === 'TEMPORARY') return JobType.TEMPORARY;
    if (normalized === 'FREELANCE') return JobType.FREELANCE;
    return undefined;
  }

  private normalizeVisaFilter(value: unknown): VisaSponsorshipStatus | undefined {
    const normalized = this.normalizeString(value);
    if (!normalized) return undefined;

    const upper = normalized.toUpperCase();
    if (upper === 'SPONSORS') return VisaSponsorshipStatus.SPONSORS;
    if (upper === 'DOES_NOT_SPONSOR') return VisaSponsorshipStatus.DOES_NOT_SPONSOR;
    if (upper === 'CASE_BY_CASE') return VisaSponsorshipStatus.CASE_BY_CASE;
    return VisaSponsorshipStatus.UNKNOWN;
  }

  private async enrichSearchQuery(
    query: string,
    context: AgentContext,
  ): Promise<string> {
    const prompt = `Enrich this job search query with relevant skills, technologies, and requirements to improve search results.

Original query: ${query}
User skills: ${(context.userSkills || []).join(', ')}
Filters: ${JSON.stringify(context.searchFilters || {})}

Return ONLY the enriched search query:`;

    try {
      return await ollamaClient.generateCompletion(prompt, {
        temperature: 0.3,
        maxTokens: 200,
      });
    } catch {
      return query;
    }
  }

  private async extractKeywords(query: string): Promise<string[]> {
    const prompt = `Extract important keywords from this job search query. Include skills, technologies, roles, and requirements.

Query: ${query}

Return as a comma-separated list:`;

    try {
      const response = await ollamaClient.generateCompletion(prompt, {
        temperature: 0.1,
        maxTokens: 200,
      });
      return response
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean);
    } catch {
      return [];
    }
  }

  private async classifyJob(
    query: string,
  ): Promise<Record<string, unknown>> {
    const prompt = `Classify this job search query and return JSON with:
- role: the job role/title
- seniority: entry | mid | senior | lead | executive
- industry: the industry sector
- required_skills: array of required skills
- preferred_skills: array of preferred skills
- work_type: remote | onsite | hybrid
- employment_type: full_time | part_time | contract | internship

Query: ${query}

Return ONLY valid JSON:`;

    try {
      const response = await ollamaClient.generateCompletion(prompt, {
        temperature: 0.1,
        maxTokens: 500,
      });

      console.log('Classification response ------------------------:            ', response);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch {
      return {};
    }
  }

  private async generateRecommendations(
    query: string,
    classification: Record<string, unknown>,
  ): Promise<Array<Record<string, unknown>>> {
    const prompt = `Based on the following job classification, generate 5 specific job search recommendations.

Classification: ${JSON.stringify(classification, null, 2)}

For each recommendation, provide:
1. Job title variations to search for
2. Related roles to consider
3. Companies that typically hire for these roles
4. Skills to highlight in applications
5. Search strategies to find matching positions

Return as JSON array:`;

    try {
      const response = await ollamaClient.generateCompletion(prompt, {
        temperature: 0.4,
        maxTokens: 1000,
      });

      console.log('Recommendations response:', response);
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
      return [];
    }
  }

}

export const searchAgent = new SearchAgent();

console.log('SearchAgent initialized and ready to process search queries.', searchAgent);