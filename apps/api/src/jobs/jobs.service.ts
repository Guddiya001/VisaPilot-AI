import { Inject, Injectable, NotFoundException, Logger } from '@nestjs/common';
import { JobSource, VisaSponsorshipStatus, WorkMode, JobType } from '@visapilot/shared';
import { SearchAgent, visaDetectionAgent } from '@visapilot/ai';
import { jobRepository, companyRepository, getPrismaClient } from '@visapilot/database';
import type { Job, SearchFilters } from '@visapilot/shared';
import { VisaIntelligenceService } from './intelligence/visa-intelligence.service';
import { crawlerService } from '@visapilot/crawler';

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
    private readonly visaIntelligenceService: VisaIntelligenceService,
  ) { }

  async search(params: SearchParams) {
    this.logger.log(`[JobsService] Starting LLM-first search orchestration for query: "${params.query}"`);
    this.logger.log('JOB_SEARCH_STARTED');

    // 1. LLM Intent Extraction (First orchestration layer)
    const intentOutput = await this.searchAgent.process({
      searchQuery: params.query,
      searchFilters: {
        country: params.country,
        remote: params.remote,
        visaSponsorship: params.visaSponsorship,
      },
    });

    if (!intentOutput.success || !intentOutput.data?.intent) {
      this.logger.warn(`Intent extraction failed. Returning 0 results as per strict web-only policy.`);
      return { success: true, data: [], meta: { total: 0, page: params.page, source: 'WEB' } };
    }

    const intent = intentOutput.data.intent as any;
    const tools = intent.tools || [];
    this.logger.log(`LLM_INTENT_EXTRACTED`);
    this.logger.log(`[JobsService] Extracted intent: ${JSON.stringify(intent)}`);

    let fetchedJobs: any[] = [];

    // 2. Determine required search tools & Search external sources
    if (tools.includes('search_jobs') && intent.queries?.length > 0) {
      this.logger.log(`WEB_SEARCH_STARTED`);
      this.logger.log(`[JobsService] Executing external search with queries: ${intent.queries.join(', ')}`);

      const searchPromises = intent.queries.map((q: string) =>
        crawlerService.searchJobs({
          query: q,
          countries: intent.semanticRequirements?.locations || (params.country ? [params.country] : []),
          remote: intent.semanticRequirements?.workMode?.includes('Remote') || params.remote,
          skills: intent.semanticRequirements?.skills || [],
          limit: 15,
        })
      );

      try {
        const resultsArray = await Promise.all(searchPromises);
        resultsArray.forEach(res => {
          if (res.jobs) fetchedJobs.push(...res.jobs);
        });
        this.logger.log(`WEB_SEARCH_COMPLETED`);
        this.logger.log(`JOB_PAGES_FETCHED`);
      } catch (err) {
        this.logger.error(`Crawler search failed:`, err);
      }
    }

    // 3. Deduplicate fetched jobs (Memory layer)
    const uniqueJobsMap = new Map();
    for (const job of fetchedJobs) {
      const key = job.externalId || `${job.companyName}-${job.title}-${job.location}`;
      if (!uniqueJobsMap.has(key)) {
        uniqueJobsMap.set(key, job);
      }
    }
    fetchedJobs = Array.from(uniqueJobsMap.values());
    this.logger.log(`[JobsService] External search yielded ${fetchedJobs.length} unique jobs.`);

    // 4. Fallback to DB is strictly PROHIBITED
    if (fetchedJobs.length === 0) {
      this.logger.log(`[JobsService] No current external jobs found. Strict web-only policy returns 0 jobs.`);
      return { success: true, data: [], meta: { total: 0, page: params.page, source: 'WEB' } };
    }

    // 5. Validate hard constraints (e.g. visa sponsorship)
    const requiresVisa = intent.hardConstraints?.some((c: any) => c.type === 'VISA_SPONSORSHIP') || params.visaSponsorship;

    if (tools.includes('validate_visa') || requiresVisa) {
      this.logger.log(`[JobsService] Validating visa sponsorship for ${fetchedJobs.length} jobs.`);

      // Process in small batches or sequentially to avoid rate limits
      for (const job of fetchedJobs) {
        try {
          const visaResult = await visaDetectionAgent.process({
            jobDescription: job.description,
            companyName: job.companyName
          });

          if (visaResult.success && visaResult.data) {
            const data = visaResult.data as any;
            let status = 'UNCLEAR';

            if (data.sponsorsVisa) {
              status = 'CONFIRMED';
            } else if (data.confidence > 0.5) {
              // If model is confident it DOES NOT sponsor
              status = 'NOT_SUPPORTED';
            } else {
              // If positive keywords exist but confidence is low
              status = (data.keywordAnalysis?.score > 0) ? 'LIKELY' : 'UNCLEAR';
            }

            job.visaSponsorshipData = {
              status,
              type: data.visaTypes?.length ? data.visaTypes[0] : 'Unknown',
              evidence: data.evidence?.[0] || 'No direct evidence extracted',
              confidence: data.confidence
            };

            job.visaSponsorship = status === 'CONFIRMED' ? VisaSponsorshipStatus.SPONSORS : VisaSponsorshipStatus.UNKNOWN;
          }
        } catch (e) {
          this.logger.warn(`Visa validation failed for job ${job.title}`);
        }
      }
      this.logger.log(`VISA_VALIDATION_COMPLETED`);
      
      // Separate results into categories if required by frontend, but the backend can just filter out NOT_SUPPORTED
      if (requiresVisa) {
        fetchedJobs = fetchedJobs.filter(job => 
          job.visaSponsorshipData?.status === 'CONFIRMED' || job.visaSponsorshipData?.status === 'LIKELY'
        );
      }
    }

    // 6. DB Deduplication & Persistence (Async)
    this.logger.log(`[JobsService] Starting async persistence for ${fetchedJobs.length} jobs.`);
    this.persistJobsAsync(fetchedJobs).catch(err => {
      this.logger.error(`Failed async persistence`, err);
    });

    // 7. Match against user profile & LLM ranking
    let finalJobs = fetchedJobs;
    if (params.userId && tools.includes('rank_jobs')) {
      this.logger.log(`[JobsService] Matching and ranking jobs for user ${params.userId}`);
      try {
        const userProfile = await this.visaIntelligenceService.buildCandidateProfile(params.userId);

        const scoredPromises = fetchedJobs.map(async job => {
          // Wrap crawled job to match Job interface expected by scoreJobWithAI
          const jobForScoring: any = { ...job, company: { name: job.companyName } };
          const matchData = await this.visaIntelligenceService.scoreJobWithAI(jobForScoring, userProfile);
          job.matchScore = matchData.matchScore;
          return job;
        });

        finalJobs = await Promise.all(scoredPromises);
        finalJobs.sort((a: any, b: any) => b.matchScore - a.matchScore);
        this.logger.log(`SEMANTIC_MATCH_COMPLETED`);
      } catch (err) {
        this.logger.warn(`Failed to match against user profile:`, err);
      }
    } else {
      // Basic ranking based on visa status if requested
      if (requiresVisa) {
        finalJobs.sort((a: any, b: any) => {
          const aS = a.visaSponsorshipData?.status === 'CONFIRMED' ? 1 : 0;
          const bS = b.visaSponsorshipData?.status === 'CONFIRMED' ? 1 : 0;
          return bS - aS;
        });
      }
    }

    this.logger.log(`RESULTS_RANKED`);

    const jobResults = finalJobs.map(job => ({
      title: job.title,
      company: job.companyName,
      location: job.location,
      url: job.sourceUrl || job.applyUrl || '',
      source: {
        type: 'WEB',
        url: job.sourceUrl || job.applyUrl || '',
        fetchedAt: new Date().toISOString()
      },
      visa: job.visaSponsorshipData ? {
        status: job.visaSponsorshipData.status,
        type: job.visaSponsorshipData.type,
        evidence: job.visaSponsorshipData.evidence
      } : undefined,
      semanticMatch: job.matchScore || 0
    }));

    this.logger.log(`[JobsService] Job search completed. searchSource="WEB" dbJobSearchCalled=false`);
    return {
      success: true,
      data: jobResults,
      meta: {
        total: jobResults.length,
        page: params.page,
        intent,
      },
    };
  }

  private async persistJobsAsync(fetchedJobs: any[]) {
    for (const job of fetchedJobs) {
      try {
        let existingJob = null;
        if (job.externalId) {
          existingJob = await jobRepository.findByExternalId(job.externalId);
        }

        if (existingJob) {
          await jobRepository.update(existingJob.id, {
            title: job.title,
            description: job.description,
            visaSponsorship: job.visaSponsorship,
          });
        } else {
          let company = await companyRepository.findByName(job.companyName || 'Unknown Company');
          if (!company) {
            company = await companyRepository.create({
              name: job.companyName || 'Unknown Company',
              locations: job.country ? [job.country] : [],
            });
          }

          await jobRepository.create({
            externalId: job.externalId || undefined,
            title: job.title || 'Unknown Position',
            description: job.description || '',
            location: job.location || '',
            country: job.country || '',
            remote: job.remote ?? false,
            workMode: job.workMode || WorkMode.ONSITE,
            type: job.type || JobType.FULL_TIME,
            salaryMin: job.salaryMin,
            salaryMax: job.salaryMax,
            salaryCurrency: job.salaryCurrency,
            source: job.source || JobSource.LINKEDIN,
            sourceUrl: job.sourceUrl || '',
            visaSponsorship: job.visaSponsorship || VisaSponsorshipStatus.UNKNOWN,
            skills: job.skills || [],
            postedAt: job.postedAt ? new Date(job.postedAt) : new Date(),
            companyId: company.id,
          } as any);
        }
      } catch (err) {
        this.logger.warn(`Failed to persist job ${job.title}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
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
