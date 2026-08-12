import { Inject, Injectable, NotFoundException, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { JobSource, VisaSponsorshipStatus } from '@visapilot/shared';
import { SearchAgent } from '@visapilot/ai';
import { jobRepository, companyRepository, getPrismaClient } from '@visapilot/database';
import type { Job, SearchFilters } from '@visapilot/shared';
import { normalizePersistableSearchResults } from './ai-search-results';

interface SearchParams {
  query?: string;
  country?: string;
  remote?: boolean;
  visaSponsorship?: string;
  userId?: string;
  page: number;
  limit: number;
}

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    @Inject('SearchAgent') private readonly searchAgent: SearchAgent,
  ) {}

  async search(params: SearchParams) {
    let aiSearchOutput: Record<string, unknown> | null = null;
    let querySearchTerms: string[] = [];
    const newlyPersistedJobIds: string[] = [];

    if (params.query) {
      querySearchTerms = params.query
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter(Boolean);

      try {
        this.logger.log(`[DEBUG] Starting SearchAgent with query: "${params.query}"`);
        const agentResult = await this.searchAgent.process({
          searchQuery: params.query,
          searchFilters: {
            country: params.country,
            remote: params.remote,
            visaSponsorship: params.visaSponsorship,
          },
        });

        this.logger.log(`[DEBUG] SearchAgent completed. success=${agentResult.success}, confidence=${agentResult.confidence}`);
        console.log('SearchAgent result:', JSON.stringify(agentResult, null, 2));

        if (agentResult.success) {
          const enrichedQuery =
            (agentResult.data?.enrichedQuery as string) || params.query;
          const enrichedTerms = enrichedQuery
            .toLowerCase()
            .split(/[^a-z0-9]+/)
            .filter(Boolean);

          if (enrichedTerms.length) {
            querySearchTerms = enrichedTerms;
          }

          const webResults = Array.isArray(agentResult.data?.webResults)
            ? (agentResult.data.webResults as Record<string, unknown>[])
            : [];
          const ragResults = Array.isArray(agentResult.data?.ragResults)
            ? (agentResult.data.ragResults as Record<string, unknown>[])
            : [];

          this.logger.log(`[DEBUG] Web results count: ${webResults.length}`);
          this.logger.log(`[DEBUG] RAG results count: ${ragResults.length}`);
          if (webResults.length > 0) {
            this.logger.log(`[DEBUG] First web result: ${JSON.stringify(webResults[0]?.title)}`);
          }

          aiSearchOutput = {
            originalQuery: params.query,
            enrichedQuery,
            keywords: agentResult.data?.keywords,
            recommendations: agentResult.data?.recommendations,
            webResults,
            ragResults,
            metadata: agentResult.metadata,
          };

          // ===== Persist AI search results to database =====
          try {
            const prisma = getPrismaClient();
            const now = new Date();
            let savedJobCount = 0;

            // 1. Save jobs found via web search or RAG fallback to the jobs table
            const persistableResults = normalizePersistableSearchResults({
              webResults,
              ragResults,
            });

            if (persistableResults.length > 0) {
              for (const result of persistableResults) {
                try {
                  const companyName = result.companyName || 'Unknown Company';
                  const externalId = result.id;
                  const source = result.source || 'GREENHOUSE';

                  // Check if job already exists by externalId
                  if (externalId) {
                    const existingJob = await jobRepository.findByExternalId(externalId);
                    if (existingJob) {
                      continue; // Skip if already persisted
                    }
                  }

                  // Find or create the company
                  let company = await companyRepository.findByName(companyName);
                  if (!company) {
                    company = await companyRepository.create({
                      name: companyName,
                      locations: result.country ? [result.country] : [],
                    });
                    this.logger.log(`Created new company: ${companyName}`);
                  }

                  // Create the job in the database
                  const createdJob = await jobRepository.create({
                    externalId: externalId || undefined,
                    title: result.title || 'Unknown Position',
                    description: result.description || '',
                    requirements: '',
                    location: result.location || '',
                    country: result.country || '',
                    remote: result.remote ?? false,
                    workMode: result.workMode || 'ONSITE',
                    type: result.type || 'FULL_TIME',
                    salaryMin: result.salaryMin,
                    salaryMax: result.salaryMax,
                    salaryCurrency: result.salaryCurrency,
                    source: source,
                    sourceUrl: result.sourceUrl || '',
                    applyUrl: result.applyUrl || undefined,
                    visaSponsorship: result.visaSponsorship || 'UNKNOWN',
                    skills: result.skills || [],
                    postedAt: result.postedAt ? new Date(result.postedAt) : now,
                    companyId: company.id,
                  } as any);
                  newlyPersistedJobIds.push(createdJob.id);
                  savedJobCount++;
                } catch (jobError) {
                  this.logger.warn(
                    `Failed to save individual job "${result.title}": ${jobError instanceof Error ? jobError.message : String(jobError)}`,
                  );
                  // Continue with next job
                }
              }
              this.logger.log(`Saved ${savedJobCount} new jobs to database from AI search results`);
            }

            // 2. Save embedding metadata to embedding_indexes table
            const queryEmbedding = agentResult.data?.queryEmbedding as number[] | undefined;
            console.log(`[DEBUG] Query embedding: ${queryEmbedding ? queryEmbedding.length : 'undefined'}`);
            if (queryEmbedding && Array.isArray(queryEmbedding) && queryEmbedding.length > 0) {
              const embeddingId = randomUUID();
              await prisma.embeddingIndex.upsert({
                where: {
                  resourceType_resourceId: {
                    resourceType: 'JOB',
                    resourceId: `search:${params.query}`,
                  },
                },
                update: {
                  embedding: JSON.stringify(queryEmbedding),
                  metadata: JSON.parse(JSON.stringify({
                    query: params.query,
                    enrichedQuery,
                    keywords: Array.isArray(agentResult.data?.keywords)
                      ? agentResult.data.keywords
                      : [],
                    country: params.country,
                    remote: params.remote,
                    visaSponsorship: params.visaSponsorship,
                  })),
                  model: 'nomic-embed-text',
                },
                create: {
                  id: embeddingId,
                  resourceType: 'JOB',
                  resourceId: `search:${params.query}`,
                  embedding: JSON.stringify(queryEmbedding),
                  metadata: JSON.parse(JSON.stringify({
                    query: params.query,
                    enrichedQuery,
                    keywords: Array.isArray(agentResult.data?.keywords)
                      ? agentResult.data.keywords
                      : [],
                    country: params.country,
                    remote: params.remote,
                    visaSponsorship: params.visaSponsorship,
                  })),
                  model: 'nomic-embed-text',
                },
              });
              this.logger.log(`Saved embedding metadata for search query: ${params.query}`);
            }

            // 3. Save AI analysis to ai_analyses table
            const analysisId = randomUUID();
            const analysisData = JSON.parse(JSON.stringify(agentResult.data || {}));
            const suggestions = Array.isArray(agentResult.data?.recommendations)
              ? (agentResult.data.recommendations as string[])
              : [];
            await prisma.aIAnalysis.create({
              data: {
                id: analysisId,
                resumeId: params.userId || null,
                userId: params.userId || null,
                analysis: analysisData as any,
                matchScore: null,
                visaProbability: null,
                suggestions: suggestions,
                risks: [],
                confidence: agentResult.confidence ?? 0.85,
                modelUsed: 'nomic-embed-text',
                agentType: 'SEARCH',
                processedAt: now,
              },
            });
            this.logger.log(`Saved AI analysis for search query: ${params.query}`);

            // 4. Save search history (only if userId is available)
            if (params.userId) {
              const filterData = JSON.parse(JSON.stringify({
                country: params.country,
                remote: params.remote,
                visaSponsorship: params.visaSponsorship,
              }));
              await prisma.searchHistory.create({
                data: {
                  userId: params.userId,
                  query: params.query,
                  filters: filterData as any,
                  resultCount: 0,
                },
              });
              this.logger.log(`Saved search history for user: ${params.userId}`);
            }
          } catch (persistError) {
            this.logger.warn(
              `Failed to persist AI search results: ${persistError instanceof Error ? persistError.message : String(persistError)}`,
            );
            // Non-blocking — search results are still returned
          }
        
        } else {
          this.logger.warn(
            `SearchAgent failed for query=${params.query}: ${agentResult.error}`,
          );
        }
      } catch (error) {
        this.logger.error(
          `SearchAgent execution error for query=${params.query}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }

    const filters: SearchFilters = {
      query: params.query,
      countries: params.country ? [params.country] : undefined,
      remote: params.remote,
      visaSponsorship: params.visaSponsorship as any,
      page: params.page,
      limit: params.limit,
    };

    if (querySearchTerms.length) {
      filters.query = querySearchTerms.join(' ');
    }

    const result = await jobRepository.search(filters);

    // All data comes from the database — both existing and newly persisted jobs
    let finalData: Job[] = result.data || [];
    let finalMeta = { ...result.meta };

    // Ensure newly persisted AI search jobs appear even if the search filter didn't match them
    if (newlyPersistedJobIds.length > 0) {
      const resultIds = new Set(finalData.map((job) => job.id));
      const missingIds = newlyPersistedJobIds.filter((id) => !resultIds.has(id));

      if (missingIds.length > 0) {
        this.logger.log(
          `[DEBUG] ${missingIds.length} newly persisted jobs not found by search filter — fetching from DB by ID`,
        );
        const missingJobs: Job[] = [];
        for (const id of missingIds) {
          const job = await jobRepository.findById(id);
          if (job) missingJobs.push(job);
        }
        if (missingJobs.length > 0) {
          finalData = [...finalData, ...missingJobs];
          finalMeta.total = finalData.length;
          finalMeta.totalPages = Math.ceil(finalData.length / params.limit);
          finalMeta.hasNextPage = params.page < finalMeta.totalPages;
          finalMeta.hasPreviousPage = params.page > 1;
        }
      }
    }

    // Update search_history resultCount if userId provided
    if (params.userId && params.query) {
      try {
        const prisma = getPrismaClient();
        await prisma.searchHistory.updateMany({
          where: {
            userId: params.userId,
            query: params.query,
          },
          data: {
            resultCount: finalMeta.total,
          },
        });
      } catch {
        // Non-blocking
      }
    }

    return {
      success: true,
      data: finalData,
      meta: {
        ...finalMeta,
        aiSearch: aiSearchOutput,
      },
    };
  }

  async findById(id: string) {
    const job = await jobRepository.findById(id);
    if (!job) throw new NotFoundException(`Job ${id} not found`);

    return { success: true, data: job };
  }

  async saveJob(userId: string, jobId: string) {
    const job = await jobRepository.findById(jobId);
    if (!job) throw new NotFoundException(`Job ${jobId} not found`);

    this.logger.log(`User ${userId} saved job ${jobId}`);
    return { success: true, message: 'Job saved successfully' };
  }

  async findSimilar(id: string) {
    const similar = await jobRepository.findSimilar(id, 5);
    return { success: true, data: similar };
  }
}
