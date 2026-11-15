import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { JobSource, VisaSponsorshipStatus } from '@visapilot/shared';
import type { Job } from '@visapilot/shared';
import { GoogleJobsAdapter } from '../google.ts';
import { LeverAdapter } from '../lever.ts';
import { AshbyAdapter } from '../ashby.ts';
import { RSSAdapter } from '../rss.ts';
import { LinkedInAdapter } from '../linkedin.ts';
import { WorkdayAdapter } from '../workday.ts';
import { YCombinatorAdapter } from '../ycombinator.ts';
import { WellfoundAdapter } from '../wellfound.ts';
import { CrawlerService } from '../../service.ts';

const originalFetch = globalThis.fetch;

async function collectJobs(gen: AsyncGenerator<Job>): Promise<Job[]> {
  const jobs: Job[] = [];
  for await (const job of gen) {
    jobs.push(job);
  }
  return jobs;
}

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('Phase 3: Dual-Mode SerpAPI Adapter, Bounded Concurrency & Adapter Registry', () => {
  describe('1. Dual-Mode GoogleJobsAdapter (SerpAPI)', () => {
    it('Mode A (searchAtsDorks): queries engine=google with expanded ATS dorks and extracts company slug & ATS source', async () => {
      const requestedUrls: string[] = [];
      globalThis.fetch = (async (input: string | URL | Request) => {
        const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
        requestedUrls.push(urlStr);

        return {
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: new Headers(),
          json: async () => ({
            organic_results: [
              {
                title: 'Senior Staff Backend Engineer - Monzo',
                link: 'https://job-boards.greenhouse.io/monzo/jobs/6036797',
                snippet: 'Build distributed banking systems in Go and Cassandra. UK Skilled Worker visa sponsorship available.',
              },
              {
                title: 'Staff Backend Engineer',
                link: 'https://jobs.lever.co/spotify/abc-123',
                snippet: 'Stockholm, Sweden. Migrationsverket work permit support provided.',
              },
            ],
          }),
          text: async () => '',
        } as unknown as Response;
      }) as typeof fetch;

      const adapter = new GoogleJobsAdapter('test-serp-api-key');
      const jobs = await adapter.searchAtsDorks({
        query: 'Backend Engineer',
        countries: ['UK'],
      });

      assert.ok(requestedUrls.length > 0, 'Expected fetch to be called for ATS dorks');
      assert.ok(
        requestedUrls.every((u) => u.startsWith('https://serpapi.com/search.json') && u.includes('engine=google')),
        'Expected all Mode A requests to hit https://serpapi.com/search.json with engine=google',
      );
      assert.ok(
        requestedUrls.some((u) => u.includes('job-boards.greenhouse.io')),
        'Expected expanded ATS dork URL to include site:job-boards.greenhouse.io',
      );

      const monzoJob = jobs.find((j) => j.sourceUrl === 'https://job-boards.greenhouse.io/monzo/jobs/6036797');
      assert.ok(monzoJob, 'Expected Monzo Greenhouse job to be parsed from organic_results');
      assert.equal(monzoJob!.company.name, 'Monzo');
      assert.equal(monzoJob!.source, JobSource.GREENHOUSE);
      assert.ok(monzoJob!.description.includes('Go and Cassandra'));
      assert.equal((monzoJob as Job & { applyUrl?: string }).applyUrl, 'https://job-boards.greenhouse.io/monzo/jobs/6036797');

      const spotifyJob = jobs.find((j) => j.sourceUrl === 'https://jobs.lever.co/spotify/abc-123');
      assert.ok(spotifyJob, 'Expected Spotify Lever job to be parsed from organic_results');
      assert.equal(spotifyJob!.company.name, 'Spotify');
      assert.equal(spotifyJob!.source, JobSource.LEVER);
    });

    it('Mode B (searchGoogleJobs): queries engine=google_jobs with regional gl parameter and extracts apply_options[0].link', async () => {
      const requestedUrls: string[] = [];
      globalThis.fetch = (async (input: string | URL | Request) => {
        const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
        requestedUrls.push(urlStr);

        return {
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: new Headers(),
          json: async () => ({
            jobs_results: [
              {
                job_id: 'gj-adyen-1',
                title: 'Senior Backend Engineer',
                company_name: 'Adyen',
                location: 'Amsterdam, Netherlands',
                description:
                  'Build resilient payment processing infrastructure. Kennismigrant / IND visa sponsorship and international relocation provided.',
                apply_options: [
                  { title: 'Apply on Adyen', link: 'https://careers.adyen.com/vacancies/12345' },
                ],
                detected_extensions: { schedule_type: 'Full-time', work_from_home: false },
              },
            ],
          }),
          text: async () => '',
        } as unknown as Response;
      }) as typeof fetch;

      const adapter = new GoogleJobsAdapter('test-serp-api-key');
      const jobs = await adapter.searchGoogleJobs({
        query: 'Backend Engineer',
        countries: ['NL'],
      });

      assert.ok(requestedUrls.length > 0);
      assert.ok(
        requestedUrls.some((u) => u.includes('engine=google_jobs') && u.includes('gl=nl')),
        `Expected Mode B request with engine=google_jobs and gl=nl, got: ${requestedUrls.join(', ')}`,
      );

      assert.equal(jobs.length, 1);
      assert.equal(jobs[0].company.name, 'Adyen');
      assert.equal(jobs[0].sourceUrl, 'https://careers.adyen.com/vacancies/12345');
      assert.equal((jobs[0] as Job & { applyUrl?: string }).applyUrl, 'https://careers.adyen.com/vacancies/12345');
      assert.ok(jobs[0].description.includes('Kennismigrant / IND'));
      assert.equal(jobs[0].visaSponsorship, VisaSponsorshipStatus.SPONSORS);
    });

    it('gracefully returns empty results without fake GoogleTech stubs when SERP_API_KEY is missing', async () => {
      const adapter = new GoogleJobsAdapter(undefined);
      const dorkJobs = await adapter.searchAtsDorks({ query: 'Backend Engineer' });
      const googleJobs = await adapter.searchGoogleJobs({ query: 'Backend Engineer' });

      assert.deepEqual(dorkJobs, []);
      assert.deepEqual(googleJobs, []);

      const streamed: Job[] = [];
      for await (const job of adapter.searchJobs({ query: 'Backend Engineer' })) {
        streamed.push(job);
      }
      assert.equal(streamed.length, 0);
      assert.equal(
        streamed.some((j) => j.company.name === 'GoogleTech' || j.title.includes('Stub')),
        false,
      );
    });

    it('searchJobs merges & deduplicates Mode A + Mode B results and keeps semantic role synonyms', async () => {
      globalThis.fetch = (async (input: string | URL | Request) => {
        const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

        if (urlStr.includes('engine=google_jobs')) {
          return {
            ok: true,
            status: 200,
            statusText: 'OK',
            headers: new Headers(),
            json: async () => ({
              jobs_results: [
                {
                  job_id: 'gj-dup-1',
                  title: 'Senior Staff Backend Engineer',
                  company_name: 'Monzo',
                  location: 'London, UK',
                  description: 'Build distributed banking systems in Go.',
                  apply_options: [{ link: 'https://job-boards.greenhouse.io/monzo/jobs/6036797' }],
                },
                {
                  job_id: 'gj-syn-2',
                  title: 'Senior Distributed Systems Engineer',
                  company_name: 'Wise',
                  location: 'London, UK',
                  description: 'High-throughput global payments infrastructure.',
                  apply_options: [{ link: 'https://jobs.smartrecruiters.com/Wise/999' }],
                },
              ],
            }),
            text: async () => '',
          } as unknown as Response;
        }

        return {
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: new Headers(),
          json: async () => ({
            organic_results: [
              {
                title: 'Senior Staff Backend Engineer - Monzo',
                link: 'https://job-boards.greenhouse.io/monzo/jobs/6036797',
                snippet: 'London, UK. Go and Cassandra.',
              },
            ],
          }),
          text: async () => '',
        } as unknown as Response;
      }) as typeof fetch;

      const adapter = new GoogleJobsAdapter('test-serp-api-key');
      const jobs: Job[] = [];
      for await (const job of adapter.searchJobs({ query: 'Backend Engineer', countries: ['UK'] })) {
        jobs.push(job);
      }

      assert.equal(jobs.length, 2, 'Expected 1 deduplicated Monzo job + 1 Wise synonym job');
      assert.ok(jobs.some((j) => j.title.includes('Distributed Systems')));
    });
  });

  describe('2. Bounded Concurrency (concurrency = 8) in LeverAdapter, AshbyAdapter, and RSSAdapter', () => {
    it('LeverAdapter processes 13 boards with 200ms latency in <600ms via bounded concurrency', async () => {
      let inFlight = 0;
      let maxInFlight = 0;

      globalThis.fetch = (async () => {
        inFlight++;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise((r) => setTimeout(r, 200));
        inFlight--;

        return {
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: new Headers(),
          json: async () => [],
          text: async () => '[]',
        } as unknown as Response;
      }) as typeof fetch;

      const boards = Array.from({ length: 13 }, (_, i) => `lever-board-${i + 1}`);
      const adapter = new LeverAdapter(boards);

      const start = performance.now();
      await collectJobs(adapter.searchJobs({ query: 'Backend Engineer' }));
      const elapsedMs = performance.now() - start;

      assert.ok(
        elapsedMs < 600,
        `Expected 13 Lever boards @ 200ms with concurrency=8 to finish in <600ms, took ${elapsedMs.toFixed(1)}ms`,
      );
      assert.ok(maxInFlight >= 2 && maxInFlight <= 8, `Expected maxInFlight in [2, 8], got ${maxInFlight}`);
    });

    it('AshbyAdapter processes 8 boards with 200ms latency in <600ms via bounded concurrency', async () => {
      let inFlight = 0;
      let maxInFlight = 0;

      globalThis.fetch = (async () => {
        inFlight++;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise((r) => setTimeout(r, 200));
        inFlight--;

        return {
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: new Headers(),
          json: async () => ({ jobs: [] }),
          text: async () => '{"jobs":[]}',
        } as unknown as Response;
      }) as typeof fetch;

      const boards = Array.from({ length: 8 }, (_, i) => `ashby-board-${i + 1}`);
      const adapter = new AshbyAdapter(boards);

      const start = performance.now();
      await collectJobs(adapter.searchJobs({ query: 'Backend Engineer' }));
      const elapsedMs = performance.now() - start;

      assert.ok(
        elapsedMs < 600,
        `Expected 8 Ashby boards @ 200ms with concurrency=8 to finish in <600ms, took ${elapsedMs.toFixed(1)}ms`,
      );
      assert.ok(maxInFlight >= 2 && maxInFlight <= 8, `Expected maxInFlight in [2, 8], got ${maxInFlight}`);
    });

    it('RSSAdapter fetches multiple feeds concurrently via Promise.allSettled in <500ms', async () => {
      let inFlight = 0;
      let maxInFlight = 0;

      globalThis.fetch = (async () => {
        inFlight++;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise((r) => setTimeout(r, 200));
        inFlight--;

        return {
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: new Headers(),
          text: async () => '<rss version="2.0"><channel><title>Feed</title></channel></rss>',
        } as unknown as Response;
      }) as typeof fetch;

      const adapter = new RSSAdapter({});
      adapter.configureFeeds([
        'https://example.com/feed1.rss',
        'https://example.com/feed2.rss',
        'https://example.com/feed3.rss',
        'https://example.com/feed4.rss',
      ]);

      const start = performance.now();
      await collectJobs(adapter.searchJobs({ query: 'Backend Engineer' }));
      const elapsedMs = performance.now() - start;

      assert.ok(
        elapsedMs < 500,
        `Expected 4 RSS feeds @ 200ms to finish in <500ms, took ${elapsedMs.toFixed(1)}ms`,
      );
      assert.ok(maxInFlight >= 2, `Expected concurrent RSS fetches, got maxInFlight=${maxInFlight}`);
    });
  });

  describe('3. LinkedInAdapter 9-Hub Query Parsing & Two-Tier Visa Classification', () => {
    it('extracts all 9 visa hub countries and rescues silent LinkedIn cards for known sponsors', async () => {
      const requestedUrls: string[] = [];
      globalThis.fetch = (async (input: string | URL | Request) => {
        const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
        requestedUrls.push(urlStr);

        return {
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: new Headers(),
          text: async () => `
            <ul>
              <li>
                <div class="base-card" data-entity-urn="urn:li:jobPosting:999111">
                  <a class="base-card__full-link" href="https://www.linkedin.com/jobs/view/999111"></a>
                  <h3 class="base-search-card__title">Senior Staff Backend Engineer</h3>
                  <h4 class="base-search-card__subtitle">Monzo</h4>
                  <span class="job-search-card__location">London, UK</span>
                </div>
              </li>
            </ul>
          `,
        } as unknown as Response;
      }) as typeof fetch;

      const adapter = new LinkedInAdapter();
      const jobs: Job[] = [];
      for await (const job of adapter.searchJobs({ query: 'Backend Engineer Amsterdam' })) {
        jobs.push(job);
      }

      assert.ok(
        requestedUrls.some((u) => decodeURIComponent(u).includes('Netherlands')),
        `Expected Amsterdam query to map location=Netherlands, got: ${requestedUrls.join(', ')}`,
      );
      assert.equal(jobs.length, 1);
      assert.equal(
        jobs[0].visaSponsorship,
        VisaSponsorshipStatus.SPONSORS,
        'Expected silent Monzo card to be rescued via Two-Tier classifier instead of dead UNKNOWN',
      );

      // Verify all 9 visa hub countries are recognized in extractLocationFromQuery
      const hubExpectations: Array<[string, string]> = [
        ['Backend Engineer London', 'United Kingdom'],
        ['Backend Engineer Berlin', 'Germany'],
        ['Backend Engineer Amsterdam', 'Netherlands'],
        ['Backend Engineer Dublin', 'Ireland'],
        ['Backend Engineer Stockholm', 'Sweden'],
        ['Backend Engineer Toronto', 'Canada'],
        ['Backend Engineer Singapore', 'Singapore'],
        ['Backend Engineer Sydney', 'Australia'],
        ['Backend Engineer Tokyo', 'Japan'],
      ];

      const extractLoc = (adapter as unknown as { extractLocationFromQuery: (q: string) => string | null })
        .extractLocationFromQuery.bind(adapter);

      for (const [queryText, expectedCountry] of hubExpectations) {
        assert.equal(
          extractLoc(queryText),
          expectedCountry,
          `Expected LinkedIn extractLocationFromQuery("${queryText}") -> "${expectedCountry}"`,
        );
      }
    });
  });

  describe('4. CrawlerService Registration, Zero Fake Stubs & Curated Global Sponsors', () => {
    it('registers GOOGLE_JOBS, emits zero fake stub jobs, and includes all 15 curated global sponsors', async () => {
      globalThis.fetch = (async () => ({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        json: async () => ({ jobs: [] }),
        text: async () => '[]',
      })) as unknown as Response;

      const service = new CrawlerService();

      assert.ok(
        service.getRegisteredSources().includes(JobSource.GOOGLE_JOBS),
        'CrawlerService must register JobSource.GOOGLE_JOBS in this.adapters',
      );

      // Stub-only adapters must not yield fake stub jobs
      for (const stubAdapter of [
        new WorkdayAdapter(['netflix']),
        new YCombinatorAdapter(),
        new WellfoundAdapter(),
      ]) {
        const stubJobs: Job[] = [];
        for await (const job of stubAdapter.searchJobs({ query: 'Backend Engineer' })) {
          stubJobs.push(job);
        }
        assert.equal(stubJobs.length, 0, `${stubAdapter.name} must not emit fake stub jobs`);
      }

      const result = await service.searchJobs({ query: 'Backend Engineer' });
      const hasFakeStub = result.jobs.some((j) =>
        /(Workday Stub|YC Stub|Wellfound Stub|Indeed Stub|GoogleTech|AngelTech)/i.test(
          `${j.title} ${j.companyName}`,
        ),
      );
      assert.equal(hasFakeStub, false, 'CrawlerService must never return fake stub jobs');

      const allConfiguredBoards = service.getConfiguredBoardTokens();
      const requiredSponsors = [
        'monzo',
        'wise',
        'revolut',
        'deliveroo',
        'booking',
        'adyen',
        'zalando',
        'deliveryhero',
        'hellofresh',
        'n26',
        'klarna',
        'spotify',
        'canva',
        'atlassian',
        'grab',
      ];

      for (const sponsor of requiredSponsors) {
        assert.ok(
          allConfiguredBoards.includes(sponsor),
          `Expected curated global board tokens in CrawlerService to include "${sponsor}"`,
        );
      }
    });
  });
});
