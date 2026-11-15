import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import {
  JobSource,
  JobType,
  WorkMode,
  VisaSponsorshipStatus,
} from '@visapilot/shared';
import type { Job } from '@visapilot/shared';
import {
  expandGlobalVisaQueries,
  REGION_VISA_PROFILES,
  scoreTokenizedRelevance,
} from '../query-expander.ts';
import { BaseCrawlerAdapter } from '../../adapters/base.ts';

class TestCrawlerAdapter extends BaseCrawlerAdapter {
  readonly source = JobSource.GREENHOUSE;
  readonly name = 'TestCrawlerAdapter';

  constructor() {
    super(JobSource.GREENHOUSE, {});
  }

  async initialize(): Promise<void> {
    this.initialized = true;
  }

  async *searchJobs(): AsyncGenerator<Job> {
    // Not needed for unit tests
  }

  async getJobDetails(): Promise<Job> {
    throw new Error('Not implemented');
  }

  normalizeJob(rawJob: Record<string, unknown>): Job {
    return rawJob as unknown as Job;
  }

  public testMatchesQueryFilter(job: Job, query: string | undefined): boolean {
    return this.matchesQueryFilter(job, query);
  }

  public testMatchesCountryFilter(job: Job, countries: string[] | undefined): boolean {
    return this.matchesCountryFilter(job, countries);
  }

  public testExtractCountry(location: string): string {
    return this.extractCountry(location);
  }
}

function makeJob(overrides: Partial<Job> = {}): Job {
  const now = new Date();
  return {
    id: 'job-1',
    externalId: 'ext-1',
    title: 'Software Engineer',
    company: {
      id: 'comp-1',
      name: 'Acme',
      locations: [],
      createdAt: now,
      updatedAt: now,
    },
    description: '',
    requirements: '',
    location: 'Remote',
    country: 'Unknown',
    remote: false,
    workMode: WorkMode.ONSITE,
    type: JobType.FULL_TIME,
    source: JobSource.GREENHOUSE,
    sourceUrl: 'https://boards.greenhouse.io/acme/jobs/1',
    visaSponsorship: VisaSponsorshipStatus.UNKNOWN,
    skills: [],
    postedAt: now,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('Phase 1: Multi-Region Semantic Query Expander & Tokenized Matchers', () => {
  describe('1. expandGlobalVisaQueries performance & role-synonym expansion', () => {
    it('executes in <5ms (zero LLM blocking) and expands Backend Engineer into role-synonym OR groups', () => {
      const start = performance.now();
      const result = expandGlobalVisaQueries({ query: 'Backend Engineer', country: 'all' });
      const elapsedMs = performance.now() - start;

      assert.ok(
        elapsedMs < 5,
        `Expected expandGlobalVisaQueries to execute in <5ms, took ${elapsedMs.toFixed(3)}ms`,
      );

      assert.equal(result.originalQuery, 'Backend Engineer');
      assert.ok(
        result.roleOrClause.includes(
          '"Backend Engineer" OR "Systems Engineer" OR "Platform Engineer" OR "Distributed Systems"',
        ),
        `Expected roleOrClause to contain Backend/Systems/Platform/Distributed Systems OR group, got: ${result.roleOrClause}`,
      );
      assert.deepEqual(
        result.roleSynonyms.slice(0, 4),
        ['Backend Engineer', 'Systems Engineer', 'Platform Engineer', 'Distributed Systems'],
      );
    });
  });

  describe('2. Parallel ATS site-dork generation', () => {
    it('generates parallel ATS site-dork queries across all 6 target ATS platforms', () => {
      const result = expandGlobalVisaQueries({ query: 'Backend Engineer', country: 'all' });
      const expectedSites = [
        'site:job-boards.greenhouse.io',
        'site:boards.greenhouse.io',
        'site:jobs.lever.co',
        'site:jobs.ashbyhq.com',
        'site:myworkdayjobs.com',
        'site:jobs.smartrecruiters.com',
      ];

      assert.ok(result.atsDorkQueries.length >= expectedSites.length);

      const allDorks = result.atsDorkQueries.map((q) => q.dorkQuery);
      for (const siteOperator of expectedSites) {
        assert.ok(
          allDorks.some((q) => q.includes(siteOperator)),
          `Expected generated ATS dorks to cover ${siteOperator}`,
        );
      }

      for (const item of result.atsDorkQueries) {
        assert.ok(
          item.dorkQuery.includes(
            '"Backend Engineer" OR "Systems Engineer" OR "Platform Engineer" OR "Distributed Systems"',
          ),
          `ATS dork query should include expanded role OR group: ${item.dorkQuery}`,
        );
      }
    });
  });

  describe('3. 9 target visa hubs & regional permit/relocation OR-clauses without restrictive AND choke', () => {
    it('covers all 9 target visa hubs (uk, de, nl, ie, se, ca, sg, au, jp) with expected regional permit terms', () => {
      const targetHubs = ['uk', 'de', 'nl', 'ie', 'se', 'ca', 'sg', 'au', 'jp'] as const;
      for (const hub of targetHubs) {
        assert.ok(
          REGION_VISA_PROFILES[hub],
          `REGION_VISA_PROFILES must define profile for hub "${hub}"`,
        );
      }

      const result = expandGlobalVisaQueries({ query: 'Backend Engineer', country: 'all' });
      const combinedAllQueries = result.queryStrings.join('\n');

      const requiredRegionalTerms = [
        'Skilled Worker',
        'EU Blue Card',
        'Highly Skilled Migrant',
        'kennismigrant',
        'IND',
        'Critical Skills',
        'Migrationsverket',
        'LMIA',
        'Global Talent Stream',
        'Employment Pass',
        '482',
        'relocation',
      ];

      for (const term of requiredRegionalTerms) {
        assert.ok(
          combinedAllQueries.includes(term),
          `Expected expanded queries to include regional permit/relocation term "${term}"`,
        );
      }

      for (const hub of targetHubs) {
        assert.ok(
          result.queries.some((q) => q.region === hub),
          `Expected generated queries to cover region "${hub}"`,
        );
      }
    });

    it('NEVER forces a restrictive AND "visa sponsorship" choke in any generated query', () => {
      const result = expandGlobalVisaQueries({ query: 'Backend Engineer', country: 'all' });
      for (const q of result.queryStrings) {
        assert.equal(
          /\bAND\s+["']?visa sponsorship["']?/i.test(q),
          false,
          `Query must NOT force restrictive AND "visa sponsorship": ${q}`,
        );
      }

      const singleRegionResult = expandGlobalVisaQueries({ query: 'Backend Engineer', country: 'nl' });
      assert.deepEqual(singleRegionResult.regions, ['nl']);
      for (const q of singleRegionResult.queryStrings) {
        assert.equal(
          /\bAND\s+["']?visa sponsorship["']?/i.test(q),
          false,
          `Single-region query must NOT force restrictive AND "visa sponsorship": ${q}`,
        );
        assert.ok(q.includes('Highly Skilled Migrant'));
        assert.ok(q.includes('kennismigrant'));
      }
    });
  });

  describe('4. Tokenized weighted overlap & BaseCrawlerAdapter matchers', () => {
    it('scoreTokenizedRelevance scores semantic overlap higher than unrelated roles', () => {
      const match = scoreTokenizedRelevance('Backend Distributed Systems', {
        title: 'Senior Staff Backend Engineer - Microservices',
        description: '',
        skills: [],
      });
      assert.equal(match.matched, true);
      assert.ok(match.score > 0.3, `Expected positive weighted score > 0.3, got ${match.score}`);

      const mismatch = scoreTokenizedRelevance('Backend Distributed Systems', {
        title: 'Senior Frontend Engineer',
        description: 'React UI component design system',
        skills: ['React', 'CSS'],
      });
      assert.equal(mismatch.matched, false);
      assert.ok(mismatch.score < match.score);
    });

    it('BaseCrawlerAdapter.matchesQueryFilter matches "Backend Distributed Systems" against "Senior Staff Backend Engineer - Microservices"', () => {
      const adapter = new TestCrawlerAdapter();
      const job = makeJob({
        title: 'Senior Staff Backend Engineer - Microservices',
        description: 'Build high-throughput core services and APIs.',
        skills: [],
      });

      assert.equal(
        adapter.testMatchesQueryFilter(job, 'Backend Distributed Systems'),
        true,
      );

      const nonMatchingJob = makeJob({
        title: 'Account Executive - EMEA',
        description: 'Sell backend distributed systems software to enterprise clients.',
      });
      assert.equal(
        adapter.testMatchesQueryFilter(nonMatchingJob, 'Backend Distributed Systems'),
        false,
      );

      const emailMarketingJob = makeJob({
        title: 'Email Marketing Specialist',
        description: 'Run email automation campaigns.',
      });
      assert.equal(adapter.testMatchesQueryFilter(emailMarketingJob, 'AI'), false);

      // Supports OR-group syntax, tech aliases, and special symbol tokens like C++
      const tsJob = makeJob({
        title: 'Full-Stack Developer',
        description: 'Experience with TypeScript and C++ systems.',
      });
      assert.equal(adapter.testMatchesQueryFilter(tsJob, 'Gen AI or TS, Python'), true);
      assert.equal(adapter.testMatchesQueryFilter(tsJob, 'C++'), true);
    });

    it('BaseCrawlerAdapter.matchesCountryFilter accurately maps global visa hub cities to country codes and names', () => {
      const adapter = new TestCrawlerAdapter();

      const cityToCountryCases: Array<{ location: string; codes: string[]; expectedCountry: string }> = [
        { location: 'Amsterdam', codes: ['NL', 'Netherlands'], expectedCountry: 'Netherlands' },
        { location: 'Dublin', codes: ['IE', 'Ireland'], expectedCountry: 'Ireland' },
        { location: 'Stockholm', codes: ['SE', 'Sweden'], expectedCountry: 'Sweden' },
        { location: 'Malmö', codes: ['SE', 'Sweden'], expectedCountry: 'Sweden' },
        { location: 'Singapore', codes: ['SG', 'Singapore'], expectedCountry: 'Singapore' },
        { location: 'Tokyo', codes: ['JP', 'Japan'], expectedCountry: 'Japan' },
        { location: 'Sydney', codes: ['AU', 'Australia'], expectedCountry: 'Australia' },
        { location: 'Melbourne', codes: ['AU', 'Australia'], expectedCountry: 'Australia' },
        { location: 'Zurich', codes: ['CH', 'Switzerland'], expectedCountry: 'Switzerland' },
        { location: 'Zürich', codes: ['CH', 'Switzerland'], expectedCountry: 'Switzerland' },
        { location: 'Toronto', codes: ['CA', 'Canada'], expectedCountry: 'Canada' },
        { location: 'Vancouver', codes: ['CA', 'Canada'], expectedCountry: 'Canada' },
        { location: 'London', codes: ['UK', 'GB', 'United Kingdom'], expectedCountry: 'United Kingdom' },
        { location: 'Cardiff', codes: ['UK', 'GB', 'United Kingdom'], expectedCountry: 'United Kingdom' },
        { location: 'Berlin', codes: ['DE', 'Germany'], expectedCountry: 'Germany' },
        { location: 'Munich', codes: ['DE', 'Germany'], expectedCountry: 'Germany' },
        { location: 'München', codes: ['DE', 'Germany'], expectedCountry: 'Germany' },
      ];

      for (const { location, codes, expectedCountry } of cityToCountryCases) {
        const job = makeJob({ location, country: 'Unknown' });
        assert.equal(adapter.testExtractCountry(location), expectedCountry);
        for (const code of codes) {
          assert.equal(
            adapter.testMatchesCountryFilter(job, [code]),
            true,
            `Expected location "${location}" to match country filter "${code}"`,
          );
        }
      }

      // Guard against 2-letter substring & state/province disambiguation false positives
      assert.equal(
        adapter.testMatchesCountryFilter(
          makeJob({ location: 'Seattle, WA', country: 'United States' }),
          ['SE'],
        ),
        false,
        'Seattle, WA must not falsely match SE (Sweden)',
      );
      assert.equal(
        adapter.testMatchesCountryFilter(
          makeJob({ location: 'Adelaide, Australia', country: 'Australia' }),
          ['DE'],
        ),
        false,
        'Adelaide must not falsely match DE (Germany)',
      );
      assert.equal(
        adapter.testMatchesCountryFilter(
          makeJob({ location: 'San Francisco, CA', country: 'United States' }),
          ['CA'],
        ),
        false,
        'San Francisco, CA (United States) must not falsely match CA (Canada)',
      );
      assert.equal(
        adapter.testMatchesCountryFilter(
          makeJob({ location: 'London, ON', country: 'Unknown' }),
          ['UK'],
        ),
        false,
        'London, ON (Canada) must not falsely match UK',
      );
      assert.equal(
        adapter.testMatchesCountryFilter(
          makeJob({ location: 'London, ON', country: 'Unknown' }),
          ['CA'],
        ),
        true,
        'London, ON must match CA (Canada)',
      );
      assert.equal(
        adapter.testMatchesCountryFilter(
          makeJob({ location: 'Melbourne, FL', country: 'Unknown' }),
          ['AU'],
        ),
        false,
        'Melbourne, FL (United States) must not falsely match AU',
      );
    });
  });
});
