import { Inject, Injectable, NotFoundException, Logger } from '@nestjs/common';
import { JobSource, VisaSponsorshipStatus, WorkMode, JobType } from '@visapilot/shared';
import {
  SearchAgent,
  extractFastVisaTableBatch,
  llm,
  renderVisaMarkdownTable,
  type FastVisaTableBatchResult,
  type FastVisaTableRow,
} from '@visapilot/ai';
import { jobRepository, getPrismaClient } from '@visapilot/database';
import type { Job } from '@visapilot/shared';
import { VisaIntelligenceService } from './intelligence/visa-intelligence.service';
import {
  crawlerService,
  expandGlobalVisaQueries,
  classifySponsorshipTwoTier,
  scoreJobTokenizedRelevance,
  extractApplicationForm,
  generatePlaywrightAutoFillPlan,
  type ExtractedApplicationForm,
  type ExtractedFormField,
  type AutoFillPlan,
} from '@visapilot/crawler';
import {
  FormQuestionResponder,
  classifyFormQuestion,
  selectPersonaForJob,
  type CandidateProfile,
  type FormQuestionCategory,
  type EngineeringPersona,
} from '@visapilot/ai';

interface SearchParams {
  query?: string;
  country?: string;
  remote?: boolean;
  visaSponsorship?: string | boolean;
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
  ) {}

  async search(params: SearchParams) {
    this.logger.log(`[JobsService] Starting search for: "${params.query}"`);
    this.logger.log('JOB_SEARCH_STARTED');

    // 60-second hard ceiling; cleared in finally so no dangling timer remains
    const SEARCH_TIMEOUT_MS = 60_000;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(
        () => reject(new Error('Search timeout: exceeded 60 seconds')),
        SEARCH_TIMEOUT_MS,
      );
    });

    try {
      return await Promise.race([this._doSearch(params), timeoutPromise]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`[JobsService] Search failed: ${msg}`);
      return {
        success: false,
        data: [],
        jobs: [],
        visaTableRows: [],
        visaMarkdownTable: renderVisaMarkdownTable([]),
        meta: { total: 0, page: params.page, totalPages: 1, error: msg },
      };
    } finally {
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    }
  }

  private buildDeterministicIntent(params: SearchParams) {
    const rawQuery = (params.query || '').trim();
    const expanded = expandGlobalVisaQueries({
      query: rawQuery || 'Software Engineer',
      country: params.country || 'all',
    });
    const requiresVisa = Boolean(
      params.visaSponsorship ||
        /\b(h.?1.?b|visa|sponsor|immigration|work.?permit|work.?authorization|blue.?card|skilled.?worker|kennismigrant|relocat)/i.test(
          rawQuery,
        ),
    );

    const tools = ['search_jobs'];
    if (requiresVisa) tools.push('validate_visa');
    if (params.userId) tools.push('rank_jobs');

    const intent = {
      intent: 'JOB_SEARCH' as const,
      semanticRequirements: {
        roles: expanded.roleSynonyms,
        skills: rawQuery ? rawQuery.split(/\s+or\s+|,/i).map((s) => s.trim()).filter(Boolean) : [],
        locations: params.country ? [params.country] : expanded.regions,
        workMode: params.remote ? ['Remote'] : [],
      },
      hardConstraints: requiresVisa
        ? [{ type: 'VISA_SPONSORSHIP', value: 'GLOBAL', required: true }]
        : [],
      queries: expanded.queryStrings,
      roleSynonyms: expanded.roleSynonyms,
      regions: expanded.regions,
      tools,
    };

    return { expanded, requiresVisa, intent };
  }

  private fireBackgroundIntentExtraction(params: SearchParams): void {
    try {
      const result = this.searchAgent?.process?.({
        searchQuery: params.query,
        searchFilters: {
          country: params.country,
          remote: params.remote,
          visaSponsorship: params.visaSponsorship,
        },
      });
      if (result && typeof (result as Promise<unknown>).catch === 'function') {
        void (result as Promise<unknown>).catch(() => {});
      }
    } catch {
      // Non-blocking background enrichment
    }
  }

  private async loadCompanyPolicies(companyNames: string[]): Promise<Map<string, string>> {
    const policyMap = new Map<string, string>();
    const uniqueNames = Array.from(
      new Set(companyNames.map((n) => n.trim()).filter(Boolean)),
    );
    if (uniqueNames.length === 0) return policyMap;

    try {
      const prisma = typeof getPrismaClient === 'function' ? getPrismaClient() : null;
      if (!prisma?.company?.findMany) return policyMap;

      const records = await prisma.company.findMany({
        where: { name: { in: uniqueNames } },
        select: { name: true, visaSponsorshipPolicy: true },
      });

      for (const rec of records || []) {
        if (rec?.name && rec?.visaSponsorshipPolicy) {
          policyMap.set(rec.name.toLowerCase(), rec.visaSponsorshipPolicy);
        }
      }
    } catch {
      // Continue cleanly if DB is unavailable
    }

    return policyMap;
  }

  private classifyJobsTwoTier(
    jobs: any[],
    companyPolicies: Map<string, string>,
  ): void {
    for (const job of jobs) {
      const companyName = (job.companyName || job.company?.name || '').trim();
      const policy = companyName ? companyPolicies.get(companyName.toLowerCase()) : undefined;

      const classification = classifySponsorshipTwoTier({
        title: job.title,
        companyName,
        company: {
          name: companyName,
          visaSponsorshipPolicy: policy || job.company?.visaSponsorshipPolicy,
        },
        location: job.location,
        country: job.country,
        description: job.description,
        requirements: job.requirements,
        sourceUrl: job.sourceUrl,
        applyUrl: job.applyUrl || job.sourceUrl,
      });

      job.visaClassification = classification;

      if (classification.category === 'VISA_SPONSORED') {
        job.visaSponsorship = VisaSponsorshipStatus.SPONSORS;
        job.visaSponsorshipData = {
          status: 'CONFIRMED',
          type: classification.primaryScheme || 'Visa Sponsorship',
          evidence: classification.evidence.join('; '),
          confidence: classification.confidence,
        };
      } else if (classification.category === 'KNOWN_SPONSOR_SILENT') {
        job.visaSponsorship = VisaSponsorshipStatus.SPONSORS;
        job.visaSponsorshipData = {
          status: 'CONFIRMED',
          type: classification.primaryScheme || 'Known Sponsor',
          evidence: classification.evidence.join('; '),
          confidence: classification.confidence,
        };
      } else if (classification.category === 'RELOCATION_PROVIDED') {
        job.visaSponsorship = VisaSponsorshipStatus.RELOCATION_SUPPORT;
        job.visaSponsorshipData = {
          status: 'CONFIRMED',
          type: 'Relocation Provided',
          evidence: classification.evidence.join('; '),
          confidence: classification.confidence,
        };
      } else if (classification.category === 'NOT_SPONSORED') {
        job.visaSponsorship = VisaSponsorshipStatus.DOES_NOT_SPONSOR;
        job.visaSponsorshipData = {
          status: 'NOT_SUPPORTED',
          type: 'None',
          evidence: classification.evidence.join('; '),
          confidence: classification.confidence,
        };
      } else {
        job.visaSponsorship = VisaSponsorshipStatus.UNKNOWN;
        job.visaSponsorshipData = {
          status: 'UNCLEAR',
          type: 'Unknown',
          evidence: classification.evidence.join('; '),
          confidence: classification.confidence,
        };
      }
    }
  }

  private async _doSearch(params: SearchParams) {
    // 1. Deterministic sub-millisecond query expansion (no 6s SearchAgent block on hot path)
    const { expanded, requiresVisa, intent } = this.buildDeterministicIntent(params);
    this.fireBackgroundIntentExtraction(params);

    const expandedSearchQuery = expanded.roleSynonyms.join(' OR ');
    const userSpecifiedCountry = params.country ? [params.country] : undefined;
    const visaSponsorshipFilter = requiresVisa
      ? VisaSponsorshipStatus.SPONSORS
      : (params.visaSponsorship as VisaSponsorshipStatus | undefined);

    this.logger.log(`WEB_SEARCH_STARTED`);
    this.logger.log(`[JobsService] Executing external search with expanded query: "${expandedSearchQuery}"`);

    let fetchedJobs: any[] = [];
    try {
      const result = await crawlerService.searchJobs({
        query: expandedSearchQuery,
        countries: userSpecifiedCountry,
        remote: params.remote,
        visaSponsorship: visaSponsorshipFilter,
        skills: intent.semanticRequirements.skills,
        limit: Math.max(params.limit || 20, 30),
      });

      if (result?.jobs) {
        fetchedJobs.push(...result.jobs);
      }
      this.logger.log(`WEB_SEARCH_COMPLETED`);
      this.logger.log(`JOB_PAGES_FETCHED`);
    } catch (err) {
      this.logger.error(`Crawler search failed:`, err);
    }

    // 2. Deduplicate fetched jobs in memory
    const uniqueJobsMap = new Map<string, any>();
    for (const job of fetchedJobs) {
      const key = job.externalId || `${job.companyName || ''}-${job.title || ''}-${job.location || ''}`;
      if (!uniqueJobsMap.has(key)) {
        uniqueJobsMap.set(key, job);
      }
    }
    fetchedJobs = Array.from(uniqueJobsMap.values());
    this.logger.log(`[JobsService] External search yielded ${fetchedJobs.length} unique jobs.`);

    if (fetchedJobs.length === 0) {
      return {
        success: true,
        data: [],
        jobs: [],
        visaTableRows: [],
        visaMarkdownTable: renderVisaMarkdownTable([]),
        meta: {
          total: 0,
          page: params.page,
          limit: params.limit,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
          source: 'WEB',
          intent,
          expandedQueries: expanded.queryStrings,
        },
      };
    }

    // 3. Batch-load Prisma Company.visaSponsorshipPolicy & run Two-Tier classification
    const companyPolicies = await this.loadCompanyPolicies(
      fetchedJobs.map((j) => j.companyName || j.company?.name || ''),
    );
    this.classifyJobsTwoTier(fetchedJobs, companyPolicies);
    this.logger.log(`VISA_VALIDATION_COMPLETED`);

    if (requiresVisa) {
      fetchedJobs = fetchedJobs.filter(
        (job) => job.visaSponsorshipData?.status !== 'NOT_SUPPORTED',
      );
    }

    // 4. Batched DB Deduplication & Persistence (async)
    this.persistJobsAsync(fetchedJobs).catch((err) => {
      this.logger.error(`Failed async persistence`, err);
    });

    // 5. Tokenized relevance scoring (replaces legacy contiguous regex filter)
    const scoredJobs: any[] = [];
    for (const job of fetchedJobs) {
      const relevance = scoreJobTokenizedRelevance(job, params.query, {
        requiresVisa,
      });
      if (params.query && !relevance.isRelevant) {
        continue;
      }
      job.matchScore = relevance.score;
      scoredJobs.push(job);
    }

    // Rank candidates before single-shot batch extraction
    scoredJobs.sort((a: any, b: any) => {
      const diff = (b.matchScore || 0) - (a.matchScore || 0);
      if (diff !== 0) return diff;
      const aV = a.visaSponsorshipData?.status === 'CONFIRMED' ? 1 : 0;
      const bV = b.visaSponsorshipData?.status === 'CONFIRMED' ? 1 : 0;
      return bV - aV;
    });

    // 6. Single-shot batch LLM structured visa table extraction (zero N+1 calls)
    let userProfile: any = null;
    if (params.userId) {
      userProfile = await this.visaIntelligenceService
        .buildCandidateProfile(params.userId)
        .catch(() => null);
    }

    const candidateBatch = scoredJobs.slice(0, Math.max(params.limit || 20, 30));
    const batchResult: FastVisaTableBatchResult = await extractFastVisaTableBatch(
      candidateBatch.map((job) => ({
        title: job.title,
        companyName: job.companyName || job.company?.name,
        company: {
          name: job.companyName || job.company?.name,
          visaSponsorshipPolicy: companyPolicies.get(
            (job.companyName || job.company?.name || '').toLowerCase(),
          ),
        },
        location: job.location,
        country: job.country,
        description: job.description,
        requirements: job.requirements,
        skills: job.skills,
        sourceUrl: job.sourceUrl,
        applyUrl: job.applyUrl || job.sourceUrl,
      })),
      {
        query: params.query,
        skills: userProfile?.skills,
        targetCountries: params.country ? [params.country] : userProfile?.targetCountries,
        requiresVisa,
      },
      llm,
    );

    const rowByUrlOrTitle = new Map<string, FastVisaTableRow>();
    for (const row of batchResult.rows) {
      const key = row.directApplyUrl || `${row.company.toLowerCase()}::${row.jobTitle.toLowerCase()}`;
      rowByUrlOrTitle.set(key, row);
    }

    const jobResults = candidateBatch.map((job) => {
      const url = job.applyUrl || job.sourceUrl || '';
      const companyName = job.companyName || job.company?.name || 'Unknown Company';
      const tableRow =
        rowByUrlOrTitle.get(url) ||
        rowByUrlOrTitle.get(`${companyName.toLowerCase()}::${(job.title || '').toLowerCase()}`);

      return {
        title: job.title,
        company: companyName,
        location: job.location,
        description: job.description,
        requirements: job.requirements,
        url,
        source: {
          type: 'WEB',
          url,
          fetchedAt: new Date().toISOString(),
        },
        visa: job.visaSponsorshipData
          ? {
              status: job.visaSponsorshipData.status,
              type: job.visaSponsorshipData.type,
              evidence: job.visaSponsorshipData.evidence,
            }
          : undefined,
        visaRelocationSignal: tableRow?.visaRelocationSignal,
        semanticMatch: tableRow?.matchScore ?? job.matchScore ?? 0,
      };
    });

    const total = jobResults.length;
    const page = params.page;
    const limit = params.limit;
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
      success: true,
      data: jobResults,
      jobs: jobResults,
      visaTableRows: batchResult.rows,
      visaMarkdownTable: batchResult.markdownTable,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
        intent,
        expandedQueries: expanded.queryStrings,
        batchExtractionUsedFallback: batchResult.usedFallback,
      },
    };
  }

  async *streamSearch(params: SearchParams) {
    this.logger.log(`[JobsService] Starting streaming search for: "${params.query}"`);
    const { expanded, requiresVisa, intent } = this.buildDeterministicIntent(params);
    this.fireBackgroundIntentExtraction(params);

    const userSpecifiedCountry = params.country ? [params.country] : undefined;
    const visaSponsorshipFilter = requiresVisa
      ? VisaSponsorshipStatus.SPONSORS
      : (params.visaSponsorship as VisaSponsorshipStatus | undefined);

    const expandedSearchQuery = expanded.roleSynonyms.join(' OR ');
    const stream = crawlerService.streamSearchJobs(
      {
        query: expandedSearchQuery,
        countries: userSpecifiedCountry,
        remote: params.remote,
        visaSponsorship: visaSponsorshipFilter,
        skills: intent.semanticRequirements.skills,
        limit: 25,
      },
      undefined,
      10,
    );

    const uniqueJobsMap = new Map<string, boolean>();

    for await (const batch of stream) {
      let fetchedJobs: any[] = batch.filter((job) => {
        const key = job.externalId || `${job.companyName}-${job.title}-${job.location}`;
        if (uniqueJobsMap.has(key)) return false;
        uniqueJobsMap.set(key, true);
        return true;
      });

      if (fetchedJobs.length === 0) continue;

      const companyPolicies = await this.loadCompanyPolicies(
        fetchedJobs.map((j) => j.companyName || j.company?.name || ''),
      );
      this.classifyJobsTwoTier(fetchedJobs, companyPolicies);

      if (requiresVisa) {
        fetchedJobs = fetchedJobs.filter(
          (job) => job.visaSponsorshipData?.status !== 'NOT_SUPPORTED',
        );
      }

      const relevantBatch: any[] = [];
      for (const job of fetchedJobs) {
        const relevance = scoreJobTokenizedRelevance(job, params.query, {
          requiresVisa,
        });
        if (params.query && !relevance.isRelevant) {
          continue;
        }
        job.matchScore = relevance.score;
        relevantBatch.push(job);
      }

      if (relevantBatch.length === 0) continue;

      this.persistJobsAsync(relevantBatch).catch(() => {});

      relevantBatch.sort((a: any, b: any) => {
        const diff = (b.matchScore || 0) - (a.matchScore || 0);
        if (diff !== 0) return diff;
        const aV = a.visaSponsorshipData?.status === 'CONFIRMED' ? 1 : 0;
        const bV = b.visaSponsorshipData?.status === 'CONFIRMED' ? 1 : 0;
        return bV - aV;
      });

      const jobResults = relevantBatch.map((job) => ({
        title: job.title,
        company: job.companyName,
        location: job.location,
        description: job.description,
        requirements: job.requirements,
        url: job.sourceUrl || job.applyUrl || '',
        source: {
          type: 'WEB',
          url: job.sourceUrl || job.applyUrl || '',
          fetchedAt: new Date().toISOString(),
        },
        visa: job.visaSponsorshipData
          ? {
              status: job.visaSponsorshipData.status,
              type: job.visaSponsorshipData.type,
              evidence: job.visaSponsorshipData.evidence,
            }
          : undefined,
        semanticMatch: job.matchScore || 0,
      }));

      yield {
        success: true,
        data: jobResults,
        jobs: jobResults,
        meta: { intent, expandedQueries: expanded.queryStrings },
      };
    }
  }

  /**
   * Batched DB deduplication & persistence: resolves companies and existing jobs
   * via batched `findMany` + `createMany({ skipDuplicates: true })` instead of O(3N) queries.
   */
  private async persistJobsAsync(fetchedJobs: any[]): Promise<void> {
    if (!fetchedJobs.length) return;

    const prisma = typeof getPrismaClient === 'function' ? getPrismaClient() : null;
    if (!prisma?.company?.findMany || !prisma?.job?.findMany) {
      return;
    }

    try {
      // 1. Deduplicate incoming jobs in memory
      const dedupedJobs: any[] = [];
      const seenInputKeys = new Set<string>();
      for (const job of fetchedJobs) {
        const companyName = (job.companyName || job.company?.name || 'Unknown Company').trim();
        const key = job.externalId
          ? `ext:${job.externalId}`
          : `sig:${companyName.toLowerCase()}::${(job.title || '').toLowerCase()}::${(job.location || '').toLowerCase()}`;
        if (!seenInputKeys.has(key)) {
          seenInputKeys.add(key);
          dedupedJobs.push({ ...job, _resolvedCompanyName: companyName });
        }
      }

      // 2. Batch company lookup & missing company creation
      const uniqueCompanyMap = new Map<string, { name: string; locations: string[] }>();
      for (const job of dedupedJobs) {
        const name = job._resolvedCompanyName as string;
        const lower = name.toLowerCase();
        if (!uniqueCompanyMap.has(lower)) {
          uniqueCompanyMap.set(lower, {
            name,
            locations: job.country ? [job.country] : [],
          });
        }
      }

      const uniqueCompanyNames = Array.from(uniqueCompanyMap.values()).map((c) => c.name);
      const existingCompanies = await prisma.company.findMany({
        where: { name: { in: uniqueCompanyNames } },
        select: { id: true, name: true },
      });

      const companyIdByLowerName = new Map<string, string>();
      for (const c of existingCompanies || []) {
        if (c?.name && c?.id) {
          companyIdByLowerName.set(c.name.toLowerCase(), c.id);
        }
      }

      const missingCompanies = Array.from(uniqueCompanyMap.entries())
        .filter(([lower]) => !companyIdByLowerName.has(lower))
        .map(([, val]) => ({
          name: val.name,
          locations: val.locations,
        }));

      if (missingCompanies.length > 0) {
        await prisma.company.createMany({
          data: missingCompanies,
          skipDuplicates: true,
        });

        const createdCompanies = await prisma.company.findMany({
          where: { name: { in: missingCompanies.map((c) => c.name) } },
          select: { id: true, name: true },
        });
        for (const c of createdCompanies || []) {
          if (c?.name && c?.id) {
            companyIdByLowerName.set(c.name.toLowerCase(), c.id);
          }
        }
      }

      // 3. Batch existing job lookup by externalId
      const externalIds = Array.from(
        new Set(
          dedupedJobs
            .map((j) => j.externalId)
            .filter((id): id is string => typeof id === 'string' && id.length > 0),
        ),
      );

      const existingIdByExternalId = new Map<string, string>();
      if (externalIds.length > 0) {
        const existingJobs = await prisma.job.findMany({
          where: { externalId: { in: externalIds } },
          select: { id: true, externalId: true },
        });
        for (const ej of existingJobs || []) {
          if (ej?.externalId && ej?.id) {
            existingIdByExternalId.set(ej.externalId, ej.id);
          }
        }
      }

      // 4. Partition updates vs batch createMany
      const jobsToUpdate: Array<{ id: string; job: any }> = [];
      const createPayloads: any[] = [];

      for (const job of dedupedJobs) {
        const existingId = job.externalId ? existingIdByExternalId.get(job.externalId) : undefined;
        if (existingId) {
          jobsToUpdate.push({ id: existingId, job });
          continue;
        }

        const companyId = companyIdByLowerName.get(
          (job._resolvedCompanyName as string).toLowerCase(),
        );
        if (!companyId) continue;

        createPayloads.push({
          externalId: job.externalId || undefined,
          title: job.title || 'Unknown Position',
          description: job.description || '',
          requirements: job.requirements || '',
          responsibilities: job.responsibilities,
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
          applyUrl: job.applyUrl || undefined,
          visaSponsorship: job.visaSponsorship || VisaSponsorshipStatus.UNKNOWN,
          visaNotes: job.visaNotes,
          skills: job.skills || [],
          postedAt: job.postedAt ? new Date(job.postedAt) : new Date(),
          companyId,
        });
      }

      if (createPayloads.length > 0) {
        await prisma.job.createMany({
          data: createPayloads,
          skipDuplicates: true,
        });
      }

      if (jobsToUpdate.length > 0) {
        await Promise.allSettled(
          jobsToUpdate.map(({ id, job }) =>
            prisma.job.update({
              where: { id },
              data: {
                title: job.title,
                description: job.description,
                visaSponsorship: job.visaSponsorship,
                visaNotes: job.visaNotes,
              },
            }),
          ),
        );
      }
    } catch (err) {
      this.logger.warn(
        `Batched persistence failed: ${err instanceof Error ? err.message : String(err)}`,
      );
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

  /**
   * Prepares an end-to-end application package for a target job:
   * 1. Extracts the application form schema
   * 2. Answers questions deterministically (identity, visa knockout, logistics, EEO)
   * 3. Generates persona-grounded, human-toned answers for open-ended questions in 1 batch
   * 4. Produces an executable Playwright auto-fill action plan and tailored resume PDF URL
   */
  async prepareApplication(
    jobId: string,
    options?: {
      candidateProfile?: Partial<CandidateProfile>;
      formHtml?: string;
      applyUrl?: string;
    },
  ) {
    const jobRes = await this.findById(jobId);
    const job = jobRes.data;

    const companyName =
      typeof (job as any).company === 'object' && (job as any).company?.name
        ? (job as any).company.name
        : typeof (job as any).company === 'string'
          ? (job as any).company
          : (job as any).companyName || 'Target Company';

    const applyUrl =
      options?.applyUrl || (job as any).applyUrl || (job as any).url || (job as any).sourceUrl || '';
    let formHtml = options?.formHtml || '';

    // If formHtml is not provided, try to fetch it if applyUrl is an external web link
    if (!formHtml && applyUrl && (applyUrl.startsWith('http://') || applyUrl.startsWith('https://'))) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);
        const res = await fetch(applyUrl, {
          signal: controller.signal,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          },
        });
        clearTimeout(timeout);
        if (res.ok) {
          formHtml = await res.text();
        }
      } catch (err) {
        this.logger.warn(`Could not fetch formHtml from ${applyUrl}: ${err}`);
      }
    }

    // Fallback baseline HTML if no form was fetched
    if (!formHtml) {
      formHtml = `
        <form id="application_form">
          <input type="text" id="first_name" name="first_name" required="required" />
          <input type="text" id="last_name" name="last_name" required="required" />
          <input type="email" id="email" name="email" required="required" />
          <input type="tel" id="phone" name="phone" />
          <input type="file" id="resume" name="resume" required="required" />
          <label for="work_authorization">Are you legally authorised to work in the UK/EU?</label>
          <select id="work_authorization" name="work_authorization">
            <option value="1">Yes</option>
            <option value="0">No</option>
          </select>
          <label for="visa_sponsorship">Will you require visa sponsorship?</label>
          <select id="visa_sponsorship" name="visa_sponsorship">
            <option value="1">Yes</option>
            <option value="0">No</option>
          </select>
          <label for="why_company">Why are you interested in joining ${companyName}?</label>
          <textarea id="why_company" name="why_company"></textarea>
        </form>
      `;
    }

    const form = extractApplicationForm(formHtml, applyUrl);

    // Merge candidate profile with sensible defaults
    const candidateProfile: CandidateProfile = {
      fullName: options?.candidateProfile?.fullName || 'Arjun Sharma',
      firstName: options?.candidateProfile?.firstName || 'Arjun',
      lastName: options?.candidateProfile?.lastName || 'Sharma',
      email: options?.candidateProfile?.email || 'arjun.sharma@example.com',
      phone: options?.candidateProfile?.phone || '+91 98765 43210',
      currentCity: options?.candidateProfile?.currentCity || 'Noida',
      currentCountry: options?.candidateProfile?.currentCountry || 'India',
      currentCountryCode: options?.candidateProfile?.currentCountryCode || 'IN',
      linkedInUrl: options?.candidateProfile?.linkedInUrl || 'https://linkedin.com/in/arjun-sharma-dev',
      githubUrl: options?.candidateProfile?.githubUrl || 'https://github.com/arjunsharma',
      portfolioUrl: options?.candidateProfile?.portfolioUrl || 'https://arjunsharma.dev',
      requiresVisaSponsorship: options?.candidateProfile?.requiresVisaSponsorship ?? true,
      targetCountries: options?.candidateProfile?.targetCountries || ['UK', 'DE', 'NL'],
      noticePeriod: options?.candidateProfile?.noticePeriod || '30 days',
      earliestStartDate: options?.candidateProfile?.earliestStartDate || '1 month',
      salaryExpectations: options?.candidateProfile?.salaryExpectations || {
        currency: 'GBP',
        minimum: 90000,
        expected: 105000,
      },
      workExperience: options?.candidateProfile?.workExperience || [
        {
          company: 'DBS Bank',
          role: 'Senior Backend Engineer',
          highlights: [
            'Architected distributed event-driven payment ledger in Go and Kafka handling 15,000 TPS',
            'Reduced p99 settlement latency from 450ms to 65ms across 12 microservices',
          ],
        },
      ],
    };

    const targetCountry = (job.country || 'UK').toUpperCase();
    const persona = selectPersonaForJob(job.title || '', job.description || '');
    const responder = new FormQuestionResponder();

    const formAnswers: Array<{
      fieldId: string;
      domSelector: string;
      question: string;
      category: FormQuestionCategory;
      suggestedAnswer: string;
      confidence: number;
      selectedOptionValue?: string;
      isKnockoutRisk?: boolean;
      fieldType: string;
    }> = [];

    const openEndedToBatch: Array<{ id: string; question: string; field: ExtractedFormField }> = [];

    // Categorize and answer deterministic fields first
    for (const field of form.fields) {
      if (field.type === 'file') continue; // Resume handled separately

      const category = classifyFormQuestion(field.label, field.options?.map((o) => o.label));

      if (category === 'OPEN_ENDED_TECHNICAL_OR_MOTIVATION') {
        openEndedToBatch.push({
          id: field.fieldId,
          question: field.label,
          field,
        });
      } else {
        const answer = await responder.answerDeterministicQuestion({
          question: field.label,
          category,
          fieldType: field.type,
          options: field.options,
          candidateProfile,
          jobTargetCountry: targetCountry,
        });

        formAnswers.push({
          fieldId: field.fieldId,
          domSelector: field.selector,
          question: field.label,
          category,
          suggestedAnswer: answer.suggestedAnswer,
          confidence: answer.confidence,
          selectedOptionValue: answer.selectedOptionValue,
          isKnockoutRisk: answer.isKnockoutRisk,
          fieldType: field.type,
        });
      }
    }

    // Process open-ended questions in 1 single batched LLM call
    if (openEndedToBatch.length > 0) {
      const batchAnswers = await responder.answerOpenEndedBatch({
        questions: openEndedToBatch.map((q) => ({ id: q.id, question: q.question })),
        candidateProfile,
        persona,
        jobContext: {
          company: companyName,
          title: job.title || 'Target Role',
          description: job.description || '',
        },
      });

      for (const item of openEndedToBatch) {
        const res = batchAnswers.find((a) => a.questionId === item.id);
        formAnswers.push({
          fieldId: item.field.fieldId,
          domSelector: item.field.selector,
          question: item.field.label,
          category: 'OPEN_ENDED_TECHNICAL_OR_MOTIVATION',
          suggestedAnswer:
            res?.answer || `${persona.signatureExperience} I look forward to contributing to ${companyName}.`,
          confidence: res?.confidence ?? 0.9,
          fieldType: item.field.type,
        });
      }
    }

    const tailoredResumePdfUrl = `/api/v1/resumes/${jobId}/tailored.pdf`;

    // Generate executable Playwright auto-fill action plan
    const answersMap: Record<string, string> = {};
    for (const ans of formAnswers) {
      answersMap[ans.fieldId] = ans.selectedOptionValue || ans.suggestedAnswer;
    }

    const autofillPlan = generatePlaywrightAutoFillPlan(form, answersMap, tailoredResumePdfUrl);

    return {
      success: true,
      data: {
        jobId,
        jobTitle: job.title,
        company: companyName,
        targetCountry,
        persona: {
          id: persona.id,
          title: persona.title,
          focus: persona.focus,
        },
        tailoredResumePdfUrl,
        formAnswers,
        autofillPlan,
      },
    };
  }
}

