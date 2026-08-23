import { Test, TestingModule } from '@nestjs/testing';
import { JobsService } from './jobs.service';
import { VisaIntelligenceService } from './intelligence/visa-intelligence.service';
import { SearchAgent } from '@visapilot/ai';
import { crawlerService } from '@visapilot/crawler';

declare const jest: any;
declare const describe: any;
declare const it: any;
declare const expect: any;
declare const beforeEach: any;

jest.mock('@visapilot/ai', () => ({
  SearchAgent: jest.fn().mockImplementation(() => ({
    process: jest.fn(),
  })),
  visaDetectionAgent: {
    process: jest.fn(),
  },
}));

jest.mock('@visapilot/crawler', () => ({
  crawlerService: {
    searchJobs: jest.fn(),
  },
}));

jest.mock('@visapilot/database', () => ({
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
}));

describe('JobsService - LLM Intent Orchestration', () => {
  let service: JobsService;
  let searchAgent: any;
  let visaIntelligenceService: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobsService,
        {
          provide: 'SearchAgent',
          useClass: SearchAgent,
        },
        {
          provide: VisaIntelligenceService,
          useValue: {
            buildCandidateProfile: jest.fn(),
            scoreJobWithAI: jest.fn(),
            scoreJob: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<JobsService>(JobsService);
    searchAgent = module.get('SearchAgent');
    visaIntelligenceService = module.get(VisaIntelligenceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should execute intent-based orchestration flow', async () => {
    // Mock SearchAgent returning an intent that calls search_jobs
    searchAgent.process.mockResolvedValue({
      success: true,
      confidence: 0.9,
      data: {
        intent: {
          intent: 'JOB_SEARCH',
          tools: ['search_jobs'],
          queries: ['React engineer H-1B'],
          location: [],
        },
      },
    });

    // Mock crawler returning 1 job
    (crawlerService.searchJobs as any).mockResolvedValue({
      jobs: [{ externalId: 'ext-123', title: 'React Eng', companyName: 'TechCorp' }],
    });

    const result = await service.search({
      query: 'React engineer H-1B',
      page: 1,
      limit: 10,
    });

    expect(searchAgent.process).toHaveBeenCalled();
    expect(crawlerService.searchJobs).toHaveBeenCalled();
    expect(result.success).toBe(true);
  });
});
