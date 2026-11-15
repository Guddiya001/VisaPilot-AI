import { Test, TestingModule } from '@nestjs/testing';
import { JobSource, JobType, WorkMode } from '@visapilot/shared';
import { JobsService } from './jobs.service';
import { VisaIntelligenceService } from './intelligence/visa-intelligence.service';
import { crawlerService } from '@visapilot/crawler';
import * as aiPkg from '@visapilot/ai';
import { getPrismaClient } from '@visapilot/database';

declare const jest: any;
declare const describe: any;
declare const it: any;
declare const expect: any;
declare const beforeEach: any;

jest.mock('@visapilot/crawler', () => {
  const actual = jest.requireActual('@visapilot/crawler');
  return {
    ...actual,
    crawlerService: {
      searchJobs: jest.fn(),
      streamSearchJobs: jest.fn(),
    },
  };
});

jest.mock('@visapilot/ai', () => {
  const actual = jest.requireActual('@visapilot/ai');
  return {
    ...actual,
    extractFastVisaTableBatch: jest.fn(actual.extractFastVisaTableBatch),
    llm: {
      generate: jest.fn(async (params: { prompt?: string }) => {
        const match = (params?.prompt || '').match(/(\[\{[\s\S]*\}\])/);
        const inputItems = match ? (JSON.parse(match[1]) as Array<any>) : [];
        return {
          content: JSON.stringify({
            rows: inputItems.map((item) => ({
              idx: item.idx,
              jobTitle: item.title,
              company: item.company,
              locationCountry: item.location,
              visaRelocationSignal: item.preSignal || 'Known Sponsor (Silent)',
              matchScore: item.company === 'Monzo' ? 96 : item.company === 'Booking.com' ? 94 : 91,
              directApplyUrl: item.applyUrl,
            })),
          }),
          model: 'minimax-m3:cloud',
          durationMs: 12,
        };
      }),
    },
  };
});

jest.mock('@visapilot/database', () => {
  const mockPrisma = {
    company: {
      findMany: jest.fn(),
      createMany: jest.fn(),
    },
    job: {
      findMany: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
    },
  };
  return {
    getPrismaClient: jest.fn(() => mockPrisma),
    jobRepository: {
      findByExternalId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      search: jest.fn(),
    },
    companyRepository: {
      findByName: jest.fn(),
      create: jest.fn(),
    },
    userRepository: {
      findById: jest.fn(),
    },
  };
});

describe('Phase 5: JobsService Integration, Fast Visa Table & Batched Persistence', () => {
  let service: JobsService;
  let mockSearchAgent: { process: any };
  let mockVisaIntelligenceService: {
    buildCandidateProfile: any;
    scoreJobWithAI: any;
    scoreJob: any;
    scoreJobsBatchWithAI: any;
  };
  let mockPrismaClient: any;

  const sampleGlobalJobs = [
    {
      externalId: 'gh-monzo-6036797',
      title: 'Senior Staff Backend Engineer',
      companyName: 'Monzo',
      description: 'Build resilient banking microservices in Go and Cassandra.',
      requirements: '',
      location: 'London, UK',
      country: 'United Kingdom',
      remote: false,
      workMode: WorkMode.HYBRID,
      type: JobType.FULL_TIME,
      source: JobSource.GREENHOUSE,
      sourceUrl: 'https://job-boards.greenhouse.io/monzo/jobs/6036797',
      applyUrl: 'https://job-boards.greenhouse.io/monzo/jobs/6036797',
      skills: ['Go', 'Cassandra'],
      postedAt: new Date(),
    },
    {
      externalId: 'ashby-rev-2',
      title: 'Staff Systems Engineer',
      companyName: 'Revolut',
      description: 'Scale core financial ledger infrastructure across global clusters.',
      requirements: '',
      location: 'London, UK',
      country: 'United Kingdom',
      remote: false,
      workMode: WorkMode.ONSITE,
      type: JobType.FULL_TIME,
      source: JobSource.ASHBY,
      sourceUrl: 'https://jobs.ashbyhq.com/revolut/rev-2',
      applyUrl: 'https://jobs.ashbyhq.com/revolut/rev-2',
      skills: ['Java', 'Kubernetes'],
      postedAt: new Date(),
    },
    {
      externalId: 'lever-bk-3',
      title: 'Senior Backend Engineer',
      companyName: 'Booking.com',
      description: 'Distributed accommodation search services in Amsterdam.',
      requirements: '',
      location: 'Amsterdam, Netherlands',
      country: 'Netherlands',
      remote: false,
      workMode: WorkMode.HYBRID,
      type: JobType.FULL_TIME,
      source: JobSource.LEVER,
      sourceUrl: 'https://jobs.lever.co/booking/bk-3',
      applyUrl: 'https://jobs.lever.co/booking/bk-3',
      skills: ['Java', 'Kafka'],
      postedAt: new Date(),
    },
    {
      externalId: 'serp-zal-4',
      title: 'Staff Distributed Systems Engineer',
      companyName: 'Zalando',
      description: 'Event-driven commerce systems in Berlin.',
      requirements: '',
      location: 'Berlin, Germany',
      country: 'Germany',
      remote: false,
      workMode: WorkMode.HYBRID,
      type: JobType.FULL_TIME,
      source: JobSource.GOOGLE_JOBS,
      sourceUrl: 'https://jobs.zalando.com/en/jobs/zal-4',
      applyUrl: 'https://jobs.zalando.com/en/jobs/zal-4',
      skills: ['Scala', 'Kafka'],
      postedAt: new Date(),
    },
    {
      externalId: 'li-acme-5',
      title: 'Principal Backend Engineer',
      companyName: 'Acme UK',
      description: 'UK Skilled Worker visa sponsorship provided for senior platform hires.',
      requirements: '',
      location: 'London, UK',
      country: 'United Kingdom',
      remote: false,
      workMode: WorkMode.HYBRID,
      type: JobType.FULL_TIME,
      source: JobSource.LINKEDIN,
      sourceUrl: 'https://boards.greenhouse.io/acmeuk/jobs/5',
      applyUrl: 'https://boards.greenhouse.io/acmeuk/jobs/5',
      skills: ['Go', 'PostgreSQL'],
      postedAt: new Date(),
    },
    {
      externalId: 'gh-refused-6',
      title: 'Senior Backend Engineer',
      companyName: 'DefenseCorp',
      description: 'US Citizens only. Security Clearance required. No visa sponsorship.',
      requirements: '',
      location: 'Reston, VA',
      country: 'United States',
      remote: false,
      workMode: WorkMode.ONSITE,
      type: JobType.FULL_TIME,
      source: JobSource.GREENHOUSE,
      sourceUrl: 'https://boards.greenhouse.io/defensecorp/jobs/6',
      applyUrl: 'https://boards.greenhouse.io/defensecorp/jobs/6',
      skills: ['Go'],
      postedAt: new Date(),
    },
  ];

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrismaClient = (getPrismaClient as any)();

    mockSearchAgent = {
      // Simulate slow 6-second LLM intent extraction that must NOT block hot search path
      process: jest.fn(
        () =>
          new Promise((resolve) => {
            const t = setTimeout(
              () =>
                resolve({
                  success: true,
                  confidence: 0.9,
                  data: { intent: { intent: 'JOB_SEARCH', tools: ['search_jobs'], queries: [] } },
                }),
              6000,
            );
            if (typeof t.unref === 'function') t.unref();
          }),
      ),
    };

    mockVisaIntelligenceService = {
      buildCandidateProfile: jest.fn(),
      scoreJobWithAI: jest.fn(),
      scoreJob: jest.fn(() => 75),
      scoreJobsBatchWithAI: jest.fn(),
    };

    (crawlerService.searchJobs as any).mockResolvedValue({
      jobs: sampleGlobalJobs,
      errors: [],
      metadata: {
        source: JobSource.MANUAL,
        totalFetched: sampleGlobalJobs.length,
        totalProcessed: sampleGlobalJobs.length,
        duration: 15,
        cached: false,
      },
    });

    mockPrismaClient.company.findMany
      .mockResolvedValueOnce([{ id: 'comp-monzo', name: 'Monzo', visaSponsorshipPolicy: 'SPONSORS' }])
      .mockResolvedValueOnce([{ id: 'comp-booking', name: 'Booking.com', visaSponsorshipPolicy: 'SPONSORS' }]);
    mockPrismaClient.company.createMany.mockResolvedValue({ count: 4 });
    mockPrismaClient.job.findMany.mockResolvedValue([]);
    mockPrismaClient.job.createMany.mockResolvedValue({ count: 5 });
    mockPrismaClient.job.update.mockResolvedValue({});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobsService,
        { provide: 'SearchAgent', useValue: mockSearchAgent },
        { provide: VisaIntelligenceService, useValue: mockVisaIntelligenceService },
      ],
    }).compile();

    service = module.get<JobsService>(JobsService);
  });

  it('1. preserves expandGlobalVisaQueries output without discarding expanded queries or blocking on SearchAgent', async () => {
    const start = Date.now();
    const result: any = await service.search({
      query: 'Backend Engineer',
      country: 'UK',
      visaSponsorship: true as any,
      page: 1,
      limit: 20,
    });
    const elapsedMs = Date.now() - start;

    expect(result.success).toBe(true);
    expect(elapsedMs).toBeLessThan(1000);
    expect(crawlerService.searchJobs).toHaveBeenCalledTimes(1);

    const searchFiltersArg = (crawlerService.searchJobs as any).mock.calls[0][0];
    expect(searchFiltersArg.query).toContain('Systems Engineer');
    expect(searchFiltersArg.query).toContain('Platform Engineer');
    expect(searchFiltersArg.query).toContain('Distributed Systems');
    expect(result.meta?.expandedQueries?.length).toBeGreaterThan(0);
    expect(
      result.meta.expandedQueries.some((q: string) => q.includes('Skilled Worker')),
    ).toBe(true);
  });

  it('2. retains multi-word variant titles and rescues silent Tier-2 sponsors instead of dropping at score < 50', async () => {
    const result: any = await service.search({
      query: 'Backend Engineer',
      country: 'UK',
      visaSponsorship: true as any,
      page: 1,
      limit: 20,
    });

    const returnedTitles = (result.jobs || result.data).map((j: any) => j.title);
    const returnedCompanies = (result.jobs || result.data).map((j: any) => j.company);

    expect(returnedTitles).toContain('Senior Staff Backend Engineer');
    expect(returnedTitles).toContain('Staff Systems Engineer');
    expect(returnedTitles).toContain('Staff Distributed Systems Engineer');

    expect(returnedCompanies).toContain('Monzo');
    expect(returnedCompanies).toContain('Booking.com');
    expect(returnedCompanies).toContain('Zalando');
    expect(returnedCompanies).toContain('Revolut');
    expect(returnedCompanies).not.toContain('DefenseCorp');
  });

  it('3. calls extractFastVisaTableBatch once (zero N+1 scoreJobWithAI) and returns jobs, visaTableRows, and visaMarkdownTable', async () => {
    const result: any = await service.search({
      query: 'Backend Engineer',
      country: 'UK',
      visaSponsorship: true as any,
      page: 1,
      limit: 20,
    });

    expect(aiPkg.extractFastVisaTableBatch).toHaveBeenCalledTimes(1);
    expect((aiPkg.llm as any).generate).toHaveBeenCalledTimes(1);
    expect(result.meta?.batchExtractionUsedFallback).toBe(false);
    expect(mockVisaIntelligenceService.scoreJobWithAI).not.toHaveBeenCalled();

    expect(Array.isArray(result.jobs)).toBe(true);
    expect(Array.isArray(result.visaTableRows)).toBe(true);
    expect(result.visaTableRows.length).toBe(5);
    expect(typeof result.visaMarkdownTable).toBe('string');
    expect(result.visaMarkdownTable).toContain(
      '| Job Title | Company | Location/Country | Visa/Relocation Signal | Match Score | Direct Apply URL |',
    );
    expect(result.visaMarkdownTable).toContain('https://job-boards.greenhouse.io/monzo/jobs/6036797');
  });

  it('4. persistJobsAsync deduplicates companies and jobs in batch rather than O(3N) sequential queries', async () => {
    mockPrismaClient.company.findMany
      .mockReset()
      .mockResolvedValueOnce([{ id: 'comp-monzo', name: 'Monzo' }])
      .mockResolvedValueOnce([{ id: 'comp-booking', name: 'Booking.com' }]);

    const batchJobs = Array.from({ length: 12 }, (_, i) => ({
      ...sampleGlobalJobs[i % 4],
      externalId: i < 8 ? `batch-ext-${i}` : `batch-ext-${i % 4}`,
      title: `Backend Engineer ${i}`,
      companyName: i % 2 === 0 ? 'Monzo' : 'Booking.com',
    }));

    await (service as any).persistJobsAsync(batchJobs);

    expect(mockPrismaClient.company.findMany.mock.calls.length).toBeLessThanOrEqual(2);
    expect(mockPrismaClient.company.createMany).toHaveBeenCalledTimes(1);
    expect(mockPrismaClient.company.createMany.mock.calls[0][0].skipDuplicates).toBe(true);

    expect(mockPrismaClient.job.findMany).toHaveBeenCalledTimes(1);
    expect(mockPrismaClient.job.createMany).toHaveBeenCalledTimes(1);
    expect(mockPrismaClient.job.createMany.mock.calls[0][0].skipDuplicates).toBe(true);
    expect(mockPrismaClient.job.createMany.mock.calls[0][0].data.length).toBe(8);
  });
});
