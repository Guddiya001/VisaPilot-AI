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
    this.logger.log(`[JobsService] Starting search for: "${params.query}"`);
    this.logger.log('JOB_SEARCH_STARTED');

    // 60-second budget: LLM intent (~5-8s) + crawlers (~12s) + visa check (~5s) = ~25s typical.
    const SEARCH_TIMEOUT_MS = 60_000;
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Search timeout: exceeded 60 seconds')), SEARCH_TIMEOUT_MS),
    );

    try {
      return await Promise.race([this._doSearch(params), timeoutPromise]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`[JobsService] Search failed: ${msg}`);
      return { success: false, data: [], meta: { total: 0, page: params.page, totalPages: 1, error: msg } };
    }
  }

  private async _doSearch(params: SearchParams) {

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

    // Determine visa requirement early — used both in crawler filter and validation step
    const requiresVisa = intent.hardConstraints?.some((c: any) => c.type === 'VISA_SPONSORSHIP') || params.visaSponsorship;

    // 2. Determine required search tools & Search external sources
    if (tools.includes('search_jobs') && intent.queries?.length > 0) {
      this.logger.log(`WEB_SEARCH_STARTED`);
      this.logger.log(`[JobsService] Executing external search with queries: ${intent.queries.join(', ')}`);

      // Use worldwide locations when none specified by the user
      // Only pass a country filter if the user explicitly specified a single country.
      // When the LLM generates a broad worldwide list, we intentionally skip country
      // filtering at the crawler level — the adapters would drop too many valid jobs
      // (e.g. Netherlands, Australia) that aren't in the LLM's enumerated list.
      const userSpecifiedCountry = params.country ? [params.country] : undefined;

      const visaSponsorshipFilter = requiresVisa
        ? VisaSponsorshipStatus.SPONSORS
        : (params.visaSponsorship as VisaSponsorshipStatus | undefined);

      // Cap to max 2 queries to stay well within the 60s budget.
      // The LLM generates 4 queries but running all adapters for each is expensive.
      const queriesToRun = intent.queries.slice(0, 2);
      const searchPromises = queriesToRun.map((q: string) =>
        crawlerService.searchJobs({
          query: q,
          countries: userSpecifiedCountry,
          remote: intent.semanticRequirements?.workMode?.some(
            (m: string) => m.toLowerCase() === 'remote'
          ) || params.remote,
          visaSponsorship: visaSponsorshipFilter,
          skills: intent.semanticRequirements?.skills || [],
          limit: 25,
        })
      );

      try {
        // Use allSettled so a single failing adapter (rate limit, timeout) doesn't abort everything
        const settled = await Promise.allSettled(searchPromises);
        settled.forEach(result => {
          if (result.status === 'fulfilled' && result.value?.jobs) {
            fetchedJobs.push(...result.value.jobs);
          } else if (result.status === 'rejected') {
            this.logger.warn(`[JobsService] One search query failed: ${result.reason}`);
          }
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

    // 5. Keyword-only visa detection (instant — no LLM blocking the response)
    // LLM enrichment is intentionally skipped here to keep p50 latency <15s.
    if (tools.includes('validate_visa') || requiresVisa) {
      this.logger.log(`[JobsService] Running keyword visa detection for ${fetchedJobs.length} jobs.`);

      const VISA_POSITIVE = ['visa sponsorship', 'will sponsor', 'h-1b', 'h1b', 'h1-b',
        'work visa', 'work permit', 'visa support', 'immigration support', 'we sponsor',
        'provides sponsorship', 'sponsorship available', 'immigration assistance', 'global mobility',
        'relocation assistance', 'relocation package', 'relocation support', 'relocation offered',
        'open to relocation', 'international candidates', 'global talent', 'willing to relocate',
        'employment authorization', 'sponsorship', 'tier 2 visa', 'skilled worker visa', 'blue card'];
      const VISA_NEGATIVE = ['no visa sponsorship', 'cannot sponsor', 'do not sponsor',
        'no sponsorship', 'without sponsorship', 'must be authorized', 'us citizen only',
        'citizen only', 'must have work authorization', 'must be a us'];

      for (const job of fetchedJobs) {
        const desc = (job.description || '').toLowerCase();
        if (VISA_NEGATIVE.some(kw => desc.includes(kw))) {
          job.visaSponsorshipData = { status: 'NOT_SUPPORTED', type: 'None', evidence: 'Negative keywords', confidence: 0.9 };
          job.visaSponsorship = VisaSponsorshipStatus.DOES_NOT_SPONSOR;
        } else if (VISA_POSITIVE.some(kw => desc.includes(kw))) {
          job.visaSponsorshipData = { status: 'CONFIRMED', type: 'H-1B/Relocation', evidence: 'Positive keywords', confidence: 0.85 };
          job.visaSponsorship = VisaSponsorshipStatus.SPONSORS;
        } else {
          job.visaSponsorshipData = { status: 'UNCLEAR', type: 'Unknown', evidence: 'No explicit mention', confidence: 0.3 };
        }
      }

      this.logger.log(`VISA_VALIDATION_COMPLETED`);

      // Keep CONFIRMED + UNCLEAR (many companies sponsor without saying so explicitly)
      if (requiresVisa) {
        fetchedJobs = fetchedJobs.filter(job =>
          job.visaSponsorshipData?.status === 'CONFIRMED' ||
          job.visaSponsorshipData?.status === 'UNCLEAR'
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
      description: job.description,
      requirements: job.requirements,
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
    const total = jobResults.length;
    const page = params.page;
    const limit = params.limit;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    return {
      success: true,
      data: jobResults,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
        intent,
      },
    };
  }

  async *streamSearch(params: SearchParams) {
    this.logger.log(`[JobsService] Starting streaming search for: "${params.query}"`);
    
    const intentOutput = await this.searchAgent.process({
      searchQuery: params.query,
      searchFilters: {
        country: params.country,
        remote: params.remote,
        visaSponsorship: params.visaSponsorship,
      },
    });

    if (!intentOutput.success || !intentOutput.data?.intent) {
      yield { success: true, data: [], meta: { intent: null } };
      return;
    }

    const intent = intentOutput.data.intent as any;
    const tools = intent.tools || [];
    const requiresVisa = intent.hardConstraints?.some((c: any) => c.type === 'VISA_SPONSORSHIP') || params.visaSponsorship;

    if (!tools.includes('search_jobs') || !intent.queries?.length) {
      yield { success: true, data: [], meta: { intent } };
      return;
    }

    let userProfile = null;
    if (params.userId && tools.includes('rank_jobs')) {
      userProfile = await this.visaIntelligenceService.buildCandidateProfile(params.userId).catch(() => null);
    }

    // Only restrict by country when user explicitly specified one.
    const userSpecifiedCountry = params.country ? [params.country] : undefined;

    const visaSponsorshipFilter = requiresVisa
      ? VisaSponsorshipStatus.SPONSORS
      : (params.visaSponsorship as VisaSponsorshipStatus | undefined);

    // Use primary query for streaming to avoid merging multiple async generators
    const primaryQuery = intent.queries[0];
    const stream = crawlerService.streamSearchJobs({
      query: primaryQuery,
      countries: userSpecifiedCountry,
      remote: intent.semanticRequirements?.workMode?.some(
        (m: string) => m.toLowerCase() === 'remote'
      ) || params.remote,
      visaSponsorship: visaSponsorshipFilter,
      skills: intent.semanticRequirements?.skills || [],
      limit: 25,
    }, undefined, 10);

    const uniqueJobsMap = new Map();

    for await (const batch of stream) {
      let fetchedJobs: any[] = batch.filter(job => {
        const key = job.externalId || `${job.companyName}-${job.title}-${job.location}`;
        if (uniqueJobsMap.has(key)) return false;
        uniqueJobsMap.set(key, true);
        return true;
      });

      if (fetchedJobs.length === 0) continue;

      if (tools.includes('validate_visa') || requiresVisa) {
        const VISA_POSITIVE = ['visa sponsorship', 'will sponsor', 'h-1b', 'h1b', 'h1-b', 'work visa', 'we sponsor'];
        const VISA_NEGATIVE = ['no visa sponsorship', 'cannot sponsor', 'do not sponsor', 'no sponsorship', 'us citizen only', 'citizen only'];

        const ambiguousJobs: any[] = [];
        for (const job of fetchedJobs) {
          const desc = (job.description || '').toLowerCase();
          if (VISA_NEGATIVE.some(kw => desc.includes(kw))) {
            job.visaSponsorshipData = { status: 'NOT_SUPPORTED', type: 'None', evidence: 'Negative keywords detected', confidence: 0.9 };
            job.visaSponsorship = VisaSponsorshipStatus.DOES_NOT_SPONSOR;
          } else if (VISA_POSITIVE.some(kw => desc.includes(kw))) {
            job.visaSponsorshipData = { status: 'CONFIRMED', type: 'H-1B', evidence: 'Positive keywords detected', confidence: 0.85 };
            job.visaSponsorship = VisaSponsorshipStatus.SPONSORS;
          } else {
            job.visaSponsorshipData = { status: 'UNCLEAR', type: 'Unknown', evidence: 'No explicit mention', confidence: 0.3 };
            ambiguousJobs.push(job);
          }
        }

        const LLM_BATCH = ambiguousJobs.slice(0, 5);
        if (LLM_BATCH.length > 0) {
          await Promise.allSettled(LLM_BATCH.map(async (job) => {
            try {
              const visaResult = await visaDetectionAgent.process({ jobDescription: job.description, companyName: job.companyName });
              if (visaResult.success && visaResult.data) {
                const data = visaResult.data as any;
                const status = data.sponsorsVisa ? 'CONFIRMED' : data.confidence > 0.5 ? 'NOT_SUPPORTED' : (data.keywordAnalysis?.score > 0) ? 'LIKELY' : 'UNCLEAR';
                job.visaSponsorshipData = { status, type: data.visaTypes?.[0] || 'Unknown', evidence: data.evidence?.[0] || 'LLM analysis', confidence: data.confidence };
                job.visaSponsorship = status === 'CONFIRMED' ? VisaSponsorshipStatus.SPONSORS : VisaSponsorshipStatus.UNKNOWN;
              }
            } catch {}
          }));
        }

        if (requiresVisa) {
          fetchedJobs = fetchedJobs.filter(job => job.visaSponsorshipData?.status === 'CONFIRMED' || job.visaSponsorshipData?.status === 'LIKELY');
        }
      }

      this.persistJobsAsync(fetchedJobs).catch(() => {});

      let finalJobs = fetchedJobs;
      if (userProfile) {
        finalJobs = await Promise.all(fetchedJobs.map(async job => {
          const jobForScoring: any = { ...job, company: { name: job.companyName } };
          const matchData = await this.visaIntelligenceService.scoreJobWithAI(jobForScoring, userProfile);
          job.matchScore = matchData.matchScore;
          return job;
        }));
        finalJobs.sort((a: any, b: any) => b.matchScore - a.matchScore);
      } else if (requiresVisa) {
        finalJobs.sort((a: any, b: any) => {
          const aS = a.visaSponsorshipData?.status === 'CONFIRMED' ? 1 : 0;
          const bS = b.visaSponsorshipData?.status === 'CONFIRMED' ? 1 : 0;
          return bS - aS;
        });
      }

      const jobResults = finalJobs.map(job => ({
        title: job.title,
        company: job.companyName,
        location: job.location,
        description: job.description,
        requirements: job.requirements,
        url: job.sourceUrl || (job as any).applyUrl || '',
        source: {
          type: 'WEB',
          url: job.sourceUrl || (job as any).applyUrl || '',
          fetchedAt: new Date().toISOString()
        },
        visa: job.visaSponsorshipData ? {
          status: job.visaSponsorshipData.status,
          type: job.visaSponsorshipData.type,
          evidence: job.visaSponsorshipData.evidence
        } : undefined,
        semanticMatch: (job as any).matchScore || 0
      }));

      yield {
        success: true,
        data: jobResults,
        meta: { intent }
      };
    }
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
