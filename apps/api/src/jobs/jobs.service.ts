import { Inject, Injectable, NotFoundException, Logger } from '@nestjs/common';
import { JobSource, VisaSponsorshipStatus, WorkMode, JobType } from '@visapilot/shared';
import { SearchAgent, visaDetectionAgent } from '@visapilot/ai';
import { jobRepository, companyRepository, getPrismaClient } from '@visapilot/database';
import type { Job, SearchFilters } from '@visapilot/shared';
import { VisaIntelligenceService } from './intelligence/visa-intelligence.service';
import { crawlerService, BaseCrawlerAdapter } from '@visapilot/crawler';

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
    const searchQuery = params.query || intent.queries?.join(', ') || 'software engineer';
    if (tools.includes('search_jobs')) {
      this.logger.log(`WEB_SEARCH_STARTED`);
      this.logger.log(`[JobsService] Executing external search with query: "${searchQuery}"`);

      // Use worldwide locations when none specified by the user
      const userSpecifiedCountry = params.country ? [params.country] : undefined;

      const visaSponsorshipFilter = requiresVisa
        ? VisaSponsorshipStatus.SPONSORS
        : (params.visaSponsorship as VisaSponsorshipStatus | undefined);

      try {
        const result = await crawlerService.searchJobs({
          query: searchQuery,
          countries: userSpecifiedCountry,
          remote: intent.semanticRequirements?.workMode?.some(
            (m: string) => m.toLowerCase() === 'remote'
          ) || params.remote,
          visaSponsorship: visaSponsorshipFilter,
          skills: intent.semanticRequirements?.skills || [],
          limit: 30,
        });

        if (result?.jobs) {
          fetchedJobs.push(...result.jobs);
        }
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

    // 5. Keyword visa detection with negative context cleaning
    this.logger.log(`[JobsService] Running keyword visa detection for ${fetchedJobs.length} jobs.`);

    for (const job of fetchedJobs) {
      const visaData = this.detectVisaSponsorship(job.description);
      job.visaSponsorshipData = visaData;
      job.visaSponsorship = visaData.status === 'CONFIRMED'
        ? VisaSponsorshipStatus.SPONSORS
        : visaData.status === 'NOT_SUPPORTED'
          ? VisaSponsorshipStatus.DOES_NOT_SPONSOR
          : VisaSponsorshipStatus.UNKNOWN;
    }
    this.logger.log(`VISA_VALIDATION_COMPLETED`);

    // Keep CONFIRMED + UNCLEAR if visa required (filter out NOT_SUPPORTED)
    if (requiresVisa) {
      fetchedJobs = fetchedJobs.filter(job =>
        job.visaSponsorshipData?.status === 'CONFIRMED' ||
        job.visaSponsorshipData?.status === 'UNCLEAR'
      );
    }

    // 6. DB Deduplication & Persistence (Async)
    this.logger.log(`[JobsService] Starting async persistence for ${fetchedJobs.length} jobs.`);
    this.persistJobsAsync(fetchedJobs).catch(err => {
      this.logger.error(`Failed async persistence`, err);
    });

    // 7. Relevance scoring and keyword filtering
    const scoredJobs: any[] = [];
    for (const job of fetchedJobs) {
      const relevance = this.scoreJobRelevance(job, params.query, intent, !!requiresVisa);
      if (params.query && !relevance.isRelevant) {
        continue;
      }
      job.matchScore = relevance.score;
      scoredJobs.push(job);
    }

    let finalJobs = scoredJobs;

    // 8. Match against user profile & LLM ranking if userId provided
    if (params.userId && tools.includes('rank_jobs')) {
      this.logger.log(`[JobsService] Matching and ranking jobs for user ${params.userId}`);
      try {
        const userProfile = await this.visaIntelligenceService.buildCandidateProfile(params.userId);

        const scoredPromises = finalJobs.map(async job => {
          const jobForScoring: any = { ...job, company: { name: job.companyName } };
          const matchData = await this.visaIntelligenceService.scoreJobWithAI(jobForScoring, userProfile);
          job.matchScore = Math.round(((job.matchScore || 70) * 0.4) + (matchData.matchScore * 0.6));
          return job;
        });

        finalJobs = await Promise.all(scoredPromises);
        this.logger.log(`SEMANTIC_MATCH_COMPLETED`);
      } catch (err) {
        this.logger.warn(`Failed to match against user profile:`, err);
      }
    }

    // Rank jobs: first by matchScore descending, then by visa confirmed
    finalJobs.sort((a: any, b: any) => {
      const diff = (b.matchScore || 0) - (a.matchScore || 0);
      if (diff !== 0) return diff;
      const aV = a.visaSponsorshipData?.status === 'CONFIRMED' ? 1 : 0;
      const bV = b.visaSponsorshipData?.status === 'CONFIRMED' ? 1 : 0;
      return bV - aV;
    });

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

    // Use user query or intent queries
    const queryForStream = params.query || intent.queries?.join(', ') || 'software engineer';
    const stream = crawlerService.streamSearchJobs({
      query: queryForStream,
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

      for (const job of fetchedJobs) {
        const visaData = this.detectVisaSponsorship(job.description);
        job.visaSponsorshipData = visaData;
        job.visaSponsorship = visaData.status === 'CONFIRMED'
          ? VisaSponsorshipStatus.SPONSORS
          : visaData.status === 'NOT_SUPPORTED'
            ? VisaSponsorshipStatus.DOES_NOT_SPONSOR
            : VisaSponsorshipStatus.UNKNOWN;
      }

      if (requiresVisa) {
        fetchedJobs = fetchedJobs.filter(job =>
          job.visaSponsorshipData?.status === 'CONFIRMED' ||
          job.visaSponsorshipData?.status === 'UNCLEAR'
        );
      }

      const relevantBatch: any[] = [];
      for (const job of fetchedJobs) {
        const relevance = this.scoreJobRelevance(job, params.query, intent, !!requiresVisa);
        if (params.query && !relevance.isRelevant) {
          continue;
        }
        job.matchScore = relevance.score;
        relevantBatch.push(job);
      }

      if (relevantBatch.length === 0) continue;

      this.persistJobsAsync(relevantBatch).catch(() => {});

      let finalJobs = relevantBatch;
      if (userProfile) {
        finalJobs = await Promise.all(relevantBatch.map(async job => {
          const jobForScoring: any = { ...job, company: { name: job.companyName } };
          const matchData = await this.visaIntelligenceService.scoreJobWithAI(jobForScoring, userProfile);
          job.matchScore = Math.round(((job.matchScore || 70) * 0.4) + (matchData.matchScore * 0.6));
          return job;
        }));
      }

      finalJobs.sort((a: any, b: any) => {
        const diff = (b.matchScore || 0) - (a.matchScore || 0);
        if (diff !== 0) return diff;
        const aV = a.visaSponsorshipData?.status === 'CONFIRMED' ? 1 : 0;
        const bV = b.visaSponsorshipData?.status === 'CONFIRMED' ? 1 : 0;
        return bV - aV;
      });

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

  private detectVisaSponsorship(description?: string): { status: string; type: string; evidence: string; confidence: number } {
    const desc = (description || '').toLowerCase();
    if (!desc) {
      return { status: 'UNCLEAR', type: 'Unknown', evidence: 'No description available', confidence: 0.2 };
    }

    // Strip false-positive non-visa sponsorship contexts (e.g. executive sponsorship, event sponsorships)
    const cleanedDesc = desc.replace(
      /\b(executive|event|events|conference|conferences|corporate|booth|fiscal|commercial|community)\s+sponsorships?\b/gi,
      ''
    );

    const VISA_NEGATIVE_PATTERNS = [
      /\bno\s+(?:visa\s+)?sponsorship\b/i,
      /\bcannot\s+(?:provide\s+)?sponsorship\b/i,
      /\bdo\s+not\s+(?:provide\s+)?sponsor(?:ship)?\b/i,
      /\bdoes\s+not\s+(?:provide\s+)?sponsor(?:ship)?\b/i,
      /\bwill\s+not\s+sponsor\b/i,
      /\bunable\s+to\s+sponsor\b/i,
      /\bnot\s+eligible\s+for\s+sponsorship\b/i,
      /\bwithout\s+sponsorship\b/i,
      /\bus\s+citizen(?:s)?\s+only\b/i,
      /\bcitizen(?:s)?\s+only\b/i,
      /\bsecurity\s+clearance\s+required\b/i,
      /\bactive\s+secret\s+clearance\b/i,
      /\bmust\s+be\s+(?:a\s+)?(?:us|u\.s\.)\s+citizen\b/i,
      /\bmust\s+have\s+current\s+work\s+authorization\b/i,
      /\bnot\s+offering\s+(?:visa\s+)?sponsorship\b/i,
    ];

    for (const pattern of VISA_NEGATIVE_PATTERNS) {
      const match = cleanedDesc.match(pattern);
      if (match) {
        return {
          status: 'NOT_SUPPORTED',
          type: 'None',
          evidence: `Negative statement in JD: "${match[0]}"`,
          confidence: 0.9,
        };
      }
    }

    const VISA_POSITIVE_PATTERNS = [
      { regex: /\b(visa\s+sponsorship|sponsors?\s+visas?|will\s+sponsor(?:\s+visas?)?|we\s+sponsor(?:\s+visas?)?|provides?\s+(?:visa\s+)?sponsorship|sponsorship\s+is\s+available|visa\s+support\s+provided)\b/i, type: 'Visa Sponsorship', evidence: 'Visa sponsorship mentioned' },
      { regex: /\b(h-?1b(?:\s+sponsorship|\s+transfer|\s+visa|\s+support)?)\b/i, type: 'H-1B', evidence: 'H-1B mentioned' },
      { regex: /\b(tier\s*2\s+visa|skilled\s+worker\s+visa|blue\s+card(?:\s+sponsorship)?)\b/i, type: 'Work Visa', evidence: 'Skilled worker / Blue card mentioned' },
      { regex: /\b(work\s+visa|work\s+permit\s+sponsorship|immigration\s+(?:support|assistance|sponsorship))\b/i, type: 'Work Visa / Immigration', evidence: 'Immigration / work permit support mentioned' },
      { regex: /\b(relocation\s+(?:assistance|package|support|allowance|offered|provided|bonus)|international\s+relocation|global\s+mobility(?:\s+support)?)\b/i, type: 'Relocation Assistance', evidence: 'Relocation package mentioned' },
      { regex: /\b(open\s+to\s+relocation|international\s+candidates\s+welcome|willing\s+to\s+relocate)\b/i, type: 'Relocation Friendly', evidence: 'International / relocation friendly' },
    ];

    for (const { regex, type, evidence } of VISA_POSITIVE_PATTERNS) {
      const match = cleanedDesc.match(regex);
      if (match) {
        return {
          status: 'CONFIRMED',
          type,
          evidence: `Found in JD: "${match[0]}"`,
          confidence: 0.88,
        };
      }
    }

    return {
      status: 'UNCLEAR',
      type: 'Unknown',
      evidence: 'No explicit visa sponsorship mention in JD',
      confidence: 0.3,
    };
  }

  private scoreJobRelevance(
    job: any,
    query?: string,
    intent?: any,
    requiresVisa?: boolean
  ): { score: number; isRelevant: boolean } {
    if (/\b(stub|mock data)\b/i.test(job.title) || /\b(mock data)\b/i.test(job.description)) {
      return { score: 0, isRelevant: false };
    }

    const rawQuery = (query || '').trim();
    if (!rawQuery) {
      const base = 70;
      const visaBonus = job.visaSponsorshipData?.status === 'CONFIRMED' ? 20 : job.visaSponsorshipData?.status === 'UNCLEAR' ? 10 : 0;
      return { score: Math.min(100, base + visaBonus), isRelevant: true };
    }

    const orGroups = rawQuery
      .split(/\s+or\s+|,/i)
      .map(g => g.trim().toLowerCase())
      .filter(g => g.length > 0);

    const titleLower = (job.title || '').toLowerCase();
    const descLower = (job.description || '').toLowerCase();
    const skillsLower = (job.skills || []).map((s: string) => s.toLowerCase()).join(' ');

    const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    let bestGroupScore = 0;
    let hasValidKeywordMatch = false;

    for (const group of orGroups) {
      const aliases = BaseCrawlerAdapter.TECH_ALIASES[group] || [group];
      let groupScore = 0;
      let titleMatched = false;
      let distinctTermsMatched = 0;

      for (const alias of aliases) {
        const reg = new RegExp(`\\b${escapeRegex(alias)}\\b`, 'i');

        // Title match
        if (reg.test(titleLower)) {
          titleMatched = true;
          hasValidKeywordMatch = true;
          groupScore += 45;
        }

        // Skills match
        if (reg.test(skillsLower)) {
          hasValidKeywordMatch = true;
          groupScore += 25;
        }

        // Description match
        if (reg.test(descLower)) {
          hasValidKeywordMatch = true;
          distinctTermsMatched += 1;
        }
      }

      if (distinctTermsMatched > 0) {
        groupScore += Math.min(30, distinctTermsMatched * 10);
      }

      // Check non-technical title penalty
      const isNonTech = BaseCrawlerAdapter.NON_TECHNICAL_TITLES.some(nt => titleLower.includes(nt));
      if (isNonTech && !titleMatched) {
        groupScore = 0;
      }

      if (groupScore > bestGroupScore) {
        bestGroupScore = groupScore;
      }
    }

    // Visa bonus
    let visaBonus = 0;
    if (job.visaSponsorshipData?.status === 'CONFIRMED') {
      visaBonus = 15;
    } else if (job.visaSponsorshipData?.status === 'UNCLEAR') {
      visaBonus = 5;
    } else if (job.visaSponsorshipData?.status === 'NOT_SUPPORTED') {
      visaBonus = requiresVisa ? -30 : 0;
    }

    const finalScore = hasValidKeywordMatch ? Math.min(100, Math.max(0, bestGroupScore + visaBonus)) : 0;
    // Job must have substantial keyword relevance (title match, skill match, or multi-term description match)
    const hasStrongRelevance = bestGroupScore >= 45 || (hasValidKeywordMatch && finalScore >= 50);
    const isRelevant = hasValidKeywordMatch && hasStrongRelevance && finalScore >= 50;

    return {
      score: finalScore,
      isRelevant,
    };
  }
}
