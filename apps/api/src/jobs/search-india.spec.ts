import { JobsService } from './jobs.service';
import { SearchAgent } from '@visapilot/ai';
import { jobRepository, companyRepository } from '@visapilot/database';

declare const jest: any;
declare const describe: any;
declare const it: any;
declare const expect: any;
declare const beforeEach: any;

describe('Job Search & Auto-Persistence (e.g. Software Engineer india)', () => {
  let jobsService: JobsService;
  let searchAgent: SearchAgent;

  beforeEach(() => {
    searchAgent = new SearchAgent();
    const visaIntelligenceService = new (jest.fn())();
    jobsService = new JobsService(searchAgent, visaIntelligenceService as any);
  });

  it('should search for "Software Engineer india", discover live jobs, save them to DB, and return them', async () => {
    const query = 'Software Engineer india';

    const result = await jobsService.search({
      query,
      page: 1,
      limit: 20,
    });

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data.length).toBeGreaterThan(0);

    // Verify properties of returned jobs
    const firstJob = result.data[0];
    expect(firstJob.title).toBeDefined();
    expect(firstJob.location).toContain('India');
    expect(firstJob.company).toBeDefined();

    // Verify company names and job titles are populated
    const companies = result.data.map((j: any) => j.company?.name || j.companyName);
    expect(companies.length).toBeGreaterThan(0);
    expect(companies.some((c) => Boolean(c && c.length > 1))).toBe(true);

    // Verify the jobs are saved in the database repository
    const dbSearch = await jobRepository.search({
      query: 'Software Engineer',
      countries: ['India'],
      page: 1,
      limit: 20,
    });

    expect(dbSearch.data.length).toBeGreaterThan(0);
    const foundJob = dbSearch.data.find((j) => j.country?.toLowerCase().includes('india') || j.location?.toLowerCase().includes('india'));
    expect(foundJob).toBeDefined();
  }, 60000);

  it('should execute live AI Job Discovery and save jobs when crawler has 0 results for a niche query in India', async () => {
    const result = await jobsService.search({
      query: 'Staff AI Solutions Architect India',
      page: 1,
      limit: 20,
    });

    expect(result.success).toBe(true);
    expect(result.data.length).toBeGreaterThan(0);
    expect(result.data.some((j: any) => j.location.includes('India'))).toBe(true);

    // Verify saved to database
    const dbSearch = await jobRepository.search({
      query: 'Architect',
      countries: ['India'],
      page: 1,
      limit: 20,
    });
    expect(dbSearch.data.length).toBeGreaterThan(0);
  }, 60000);

  it('should also discover and save jobs for other international searches like "Frontend Developer Germany"', async () => {
    const result = await jobsService.search({
      query: 'Frontend Developer Germany',
      page: 1,
      limit: 20,
    });

    expect(result.success).toBe(true);
    expect(result.data.length).toBeGreaterThan(0);
    expect(result.data.some((j: any) => j.location.includes('Germany'))).toBe(true);
  }, 60000);
});
