import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { MODELS } from '../../ai/models.ts';
import { LLMService } from '../../ai/llm-service.ts';
import { GeminiProvider } from '../../providers/gemini.ts';
import {
  FastVisaTableBatchSchema,
  extractFastVisaTableBatch,
  renderVisaMarkdownTable,
  type BatchJobInput,
} from '../batch-visa-table.ts';

const originalFetch = globalThis.fetch;
const originalGeminiKey = process.env.GEMINI_API_KEY;

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalGeminiKey === undefined) {
    delete process.env.GEMINI_API_KEY;
  } else {
    process.env.GEMINI_API_KEY = originalGeminiKey;
  }
});

function buildThirtyGlobalJobSnippets(): BatchJobInput[] {
  const seedJobs: BatchJobInput[] = [
    {
      title: 'Senior Staff Backend Engineer',
      companyName: 'Monzo',
      location: 'London, UK',
      country: 'United Kingdom',
      description: 'Build distributed banking systems in Go and Cassandra. UK Skilled Worker visa sponsorship available.',
      applyUrl: 'https://job-boards.greenhouse.io/monzo/jobs/6036797',
      skills: ['Go', 'Cassandra', 'Kafka'],
    },
    {
      title: 'Staff Backend Engineer',
      companyName: 'Booking.com',
      location: 'Amsterdam, Netherlands',
      country: 'Netherlands',
      description: 'High-scale travel platform services. Kennismigrant / IND sponsorship and relocation package.',
      applyUrl: 'https://jobs.booking.com/careers/job/1002',
      skills: ['Java', 'Go', 'Distributed Systems'],
    },
    {
      title: 'Senior Distributed Systems Engineer',
      companyName: 'Zalando',
      location: 'Berlin, Germany',
      country: 'Germany',
      description: 'Core commerce infrastructure in Berlin. EU Blue Card and international relocation support.',
      applyUrl: 'https://jobs.zalando.com/en/jobs/1003',
      skills: ['Scala', 'Kubernetes', 'Kafka'],
    },
    {
      title: 'Senior Defense Systems Engineer',
      companyName: 'Atlassian',
      location: 'Reston, VA, United States',
      country: 'United States',
      description: 'US Citizens only. Security Clearance required for federal cloud systems.',
      applyUrl: 'https://www.atlassian.com/company/careers/details/1004',
      skills: ['Java', 'AWS'],
    },
    {
      title: 'Backend Platform Engineer',
      companyName: 'Adyen',
      location: 'Amsterdam, Netherlands',
      country: 'Netherlands',
      description: 'Design fault-tolerant payment processing microservices in Java and PostgreSQL.',
      applyUrl: 'https://careers.adyen.com/vacancies/1005',
      skills: ['Java', 'PostgreSQL'],
    },
    {
      title: 'Backend Engineer',
      companyName: 'Wise',
      location: 'London, UK',
      country: 'United Kingdom',
      description: 'Scale international money transfer ledgers with full relocation assistance.',
      applyUrl: 'https://wise.jobs/role/1006',
      skills: ['Java', 'Kafka', 'Kubernetes'],
    },
  ];

  const generated: BatchJobInput[] = [...seedJobs];
  const companies = [
    { name: 'Revolut', location: 'London, UK', country: 'United Kingdom' },
    { name: 'Spotify', location: 'Stockholm, Sweden', country: 'Sweden' },
    { name: 'Grab', location: 'Singapore', country: 'Singapore' },
    { name: 'Canva', location: 'Sydney, Australia', country: 'Australia' },
    { name: 'Mercari', location: 'Tokyo, Japan', country: 'Japan' },
    { name: 'Stripe', location: 'Dublin, Ireland', country: 'Ireland' },
  ];

  for (let i = seedJobs.length; i < 30; i++) {
    const comp = companies[i % companies.length];
    generated.push({
      title: i % 2 === 0 ? `Senior Backend Engineer #${i + 1}` : `Staff Distributed Systems Engineer #${i + 1}`,
      companyName: comp.name,
      location: comp.location,
      country: comp.country,
      description: `Build scalable backend microservices and platform APIs at ${comp.name}.`,
      applyUrl: `https://careers.example.com/${comp.name.toLowerCase()}/jobs/${i + 1}`,
      skills: ['Go', 'TypeScript', 'Kubernetes'],
    });
  }

  return generated;
}

describe('Phase 4: Single-Shot Batch LLM Structured Table Extractor & Provider Schema Support', () => {
  it('1. fixes MODELS.MINIMAX_M3 typo to minimax-m3:cloud', () => {
    assert.equal(MODELS.MINIMAX_M3, 'minimax-m3:cloud');
  });

  it('2. forwards responseSchema to GeminiProvider generationConfig with application/json', async () => {
    let capturedBody: Record<string, unknown> | null = null;
    globalThis.fetch = (async (_input: string | URL | Request, init?: RequestInit) => {
      capturedBody = JSON.parse(String(init?.body || '{}')) as Record<string, unknown>;
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({
          candidates: [{ content: { parts: [{ text: '{"rows":[]}' }] }, finishReason: 'STOP' }],
        }),
      } as unknown as Response;
    }) as typeof fetch;

    // GeminiProvider reads config.GEMINI_API_KEY, so pass a stubbed key on instance if env wasn't loaded at import
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    const provider = Object.create(GeminiProvider.prototype) as GeminiProvider & {
      apiKey: string;
      defaultModel: string;
      embeddingModel: string;
      timeout: number;
    };
    provider.apiKey = 'test-gemini-key';
    provider.defaultModel = 'gemini-2.0-flash';
    provider.embeddingModel = 'text-embedding-004';
    provider.timeout = 5000;

    const schema = { type: 'OBJECT', properties: { rows: { type: 'ARRAY' } } };
    await provider.generateCompletion('Return JSON', { responseSchema: schema });

    assert.ok(capturedBody, 'Expected GeminiProvider to send POST body');
    const genConfig = (capturedBody as Record<string, unknown>).generationConfig as Record<string, unknown>;
    assert.equal(genConfig.responseMimeType, 'application/json');
    assert.deepEqual(genConfig.responseSchema, schema);
  });

  it('3. executes single-shot batch extraction (exactly 1 llm.generate call with responseSchema) for 30 jobs and renders Markdown table', async () => {
    const jobs = buildThirtyGlobalJobSnippets();
    assert.equal(jobs.length, 30);

    let llmCalls = 0;
    let capturedParams: Record<string, unknown> | null = null;

    const mockLlm = {
      generate: async (params: Record<string, unknown>) => {
        llmCalls++;
        capturedParams = params;

        const payload = {
          rows: jobs.map((job, idx) => ({
            idx,
            jobTitle: job.title || '',
            company: job.companyName || '',
            locationCountry: job.location || '',
            visaRelocationSignal:
              idx === 0 || idx === 1 || idx === 2
                ? 'Visa Sponsored'
                : idx === 3
                  ? 'No Sponsorship'
                  : idx === 5
                    ? 'Relocation Provided'
                    : 'Known Sponsor (Silent)',
            matchScore: idx === 3 ? 40 : Math.max(70, 96 - idx),
            directApplyUrl: job.applyUrl || '',
          })),
        };

        return {
          content: JSON.stringify(payload),
          model: MODELS.MINIMAX_M3,
          durationMs: 42,
        };
      },
    };

    const result = await extractFastVisaTableBatch(
      jobs,
      { query: 'Backend Engineer', skills: ['Go', 'Kafka', 'Kubernetes'] },
      mockLlm,
    );

    assert.equal(llmCalls, 1, 'Must execute exactly 1 batch LLM call for 30 jobs (zero N+1)');
    assert.ok(capturedParams?.responseSchema, 'Must pass responseSchema to llm.generate()');
    assert.equal(result.usedFallback, false);
    assert.equal(result.rows.length, 30);

    const zodValidation = FastVisaTableBatchSchema.safeParse({ rows: result.rows });
    assert.equal(zodValidation.success, true, 'Output rows must validate against FastVisaTableBatchSchema');

    const monzoRow = result.rows.find((r) => r.company === 'Monzo');
    const bookingRow = result.rows.find((r) => r.company === 'Booking.com');
    const zalandoRow = result.rows.find((r) => r.company === 'Zalando');
    const refusedRow = result.rows.find((r) => r.locationCountry.includes('Reston, VA'));

    assert.equal(monzoRow?.visaRelocationSignal, 'Visa Sponsored');
    assert.equal(bookingRow?.visaRelocationSignal, 'Visa Sponsored');
    assert.equal(zalandoRow?.visaRelocationSignal, 'Visa Sponsored');
    assert.equal(refusedRow?.visaRelocationSignal, 'No Sponsorship');

    const table = renderVisaMarkdownTable(result.rows);
    assert.ok(
      table.includes(
        '| Job Title | Company | Location/Country | Visa/Relocation Signal | Match Score | Direct Apply URL |',
      ),
    );
    assert.ok(table.includes('https://job-boards.greenhouse.io/monzo/jobs/6036797'));
    assert.equal(result.markdownTable, table);
  });

  it('4. Anti-Hallucination URL Guard rejects hallucinated URLs and restores canonical input applyUrl by idx', async () => {
    const jobs = buildThirtyGlobalJobSnippets().slice(0, 4);

    const mockLlm = {
      generate: async () => ({
        content: JSON.stringify({
          rows: [
            {
              idx: 0,
              jobTitle: 'Senior Staff Backend Engineer',
              company: 'Monzo',
              locationCountry: 'London, UK',
              visaRelocationSignal: 'Visa Sponsored',
              matchScore: 95,
              directApplyUrl: 'https://hallucinated-evil-site.example.com/fake-monzo-job',
            },
            {
              idx: 1,
              jobTitle: 'Staff Backend Engineer',
              company: 'Booking.com',
              locationCountry: 'Amsterdam, Netherlands',
              visaRelocationSignal: 'Visa Sponsored',
              matchScore: 92,
              directApplyUrl: 'https://jobs.booking.com/careers/job/1002',
            },
            {
              idx: 2,
              jobTitle: 'Senior Distributed Systems Engineer',
              company: 'Zalando',
              locationCountry: 'Berlin, Germany',
              visaRelocationSignal: 'Visa Sponsored',
              matchScore: 90,
              directApplyUrl: 'https://invented.zalando.fake/999',
            },
            {
              idx: 3,
              jobTitle: 'Senior Defense Systems Engineer',
              company: 'Atlassian',
              locationCountry: 'Reston, VA, United States',
              visaRelocationSignal: 'Visa Sponsored', // LLM hallucinated sponsorship on US-Citizens-only role!
              matchScore: 60,
              directApplyUrl: 'https://www.atlassian.com/company/careers/details/1004',
            },
          ],
        }),
        model: MODELS.MINIMAX_M3,
        durationMs: 15,
      }),
    };

    const result = await extractFastVisaTableBatch(
      jobs,
      { query: 'Backend Engineer' },
      mockLlm,
    );

    const monzo = result.rows.find((r) => r.company === 'Monzo');
    const zalando = result.rows.find((r) => r.company === 'Zalando');
    const defenseRole = result.rows.find((r) => r.jobTitle.includes('Defense'));

    assert.equal(monzo?.directApplyUrl, 'https://job-boards.greenhouse.io/monzo/jobs/6036797');
    assert.equal(zalando?.directApplyUrl, 'https://jobs.zalando.com/en/jobs/1003');
    assert.equal(result.restoredUrlsCount, 2);
    assert.equal(
      defenseRole?.visaRelocationSignal,
      'No Sponsorship',
      'Deterministic negative refusal must override hallucinated LLM positive signal',
    );
  });

  it('5. Deterministic Zero-Downtime Fallback runs in <5ms when llm.generate() throws', async () => {
    const jobs = buildThirtyGlobalJobSnippets();
    let callCount = 0;

    const failingLlm = {
      generate: async () => {
        callCount++;
        throw new Error('AgentRouter request timed out after 8000ms');
      },
    };

    const start = performance.now();
    const result = await extractFastVisaTableBatch(
      jobs,
      { query: 'Backend Engineer', skills: ['Go', 'Kafka', 'Kubernetes'] },
      failingLlm,
    );
    const elapsedMs = performance.now() - start;

    assert.equal(callCount, 1);
    assert.equal(result.usedFallback, true);
    assert.equal(result.rows.length, 30);
    assert.ok(elapsedMs < 5, `Expected deterministic fallback to run in <5ms, took ${elapsedMs.toFixed(3)}ms`);

    const zodValidation = FastVisaTableBatchSchema.safeParse({ rows: result.rows });
    assert.equal(zodValidation.success, true);

    const monzo = result.rows.find((r) => r.company === 'Monzo');
    const booking = result.rows.find((r) => r.company === 'Booking.com');
    const adyen = result.rows.find((r) => r.company === 'Adyen');
    const wise = result.rows.find((r) => r.company === 'Wise');
    const defense = result.rows.find((r) => r.jobTitle.includes('Defense'));

    assert.equal(monzo?.visaRelocationSignal, 'Visa Sponsored');
    assert.equal(booking?.visaRelocationSignal, 'Visa Sponsored');
    assert.equal(adyen?.visaRelocationSignal, 'Known Sponsor (Silent)');
    assert.equal(wise?.visaRelocationSignal, 'Relocation Provided');
    assert.equal(defense?.visaRelocationSignal, 'No Sponsorship');

    assert.ok(
      result.markdownTable.includes(
        '| Job Title | Company | Location/Country | Visa/Relocation Signal | Match Score | Direct Apply URL |',
      ),
    );
  });

  it('6. forwards responseSchema through LLMService -> model-router and handles empty/partial batches safely', async () => {
    const prevKey = process.env.AGENTROUTER_API_KEY;
    process.env.AGENTROUTER_API_KEY = 'test-agentrouter-key';
    let capturedSystem = '';
    let capturedModel = '';

    try {
      globalThis.fetch = (async (_input: string | URL | Request, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body || '{}')) as { system?: string; model?: string };
        capturedSystem = body.system || '';
        capturedModel = body.model || '';
        return {
          ok: true,
          status: 200,
          statusText: 'OK',
          json: async () => ({
            id: 'msg-1',
            model: capturedModel,
            content: [{ type: 'text', text: '{"rows":[]}' }],
          }),
        } as unknown as Response;
      }) as typeof fetch;

      const llmSvc = new LLMService();
      await llmSvc.generate({
        task: 'fast-extraction',
        prompt: 'Extract jobs',
        responseSchema: { type: 'OBJECT', properties: { rows: { type: 'ARRAY' } } },
      });

      assert.equal(capturedModel, 'minimax-m3:cloud');
      assert.ok(capturedSystem.includes('"rows"'), 'Expected responseSchema forwarded into model-router payload');

      const emptyRes = await extractFastVisaTableBatch([], { query: 'Backend' }, llmSvc);
      assert.equal(emptyRes.rows.length, 0);
      assert.equal(emptyRes.modelUsed, 'none');

      // Partial LLM return backfills missing jobs & escapes pipe chars in Markdown cells
      const partialMockLlm = {
        generate: async () => ({
          content: JSON.stringify({
            rows: [
              {
                idx: 0,
                jobTitle: 'Staff Engineer | Core Systems',
                company: 'Monzo',
                locationCountry: 'London, UK',
                visaRelocationSignal: 'Visa Sponsored',
                matchScore: 95,
                directApplyUrl: 'https://job-boards.greenhouse.io/monzo/jobs/6036797',
              },
            ],
          }),
          model: MODELS.MINIMAX_M3,
          durationMs: 5,
        }),
      };
      const twoJobs = buildThirtyGlobalJobSnippets().slice(0, 2);
      const partialRes = await extractFastVisaTableBatch(twoJobs, { query: 'Backend Engineer' }, partialMockLlm);
      assert.equal(partialRes.rows.length, 2, 'Omitted job must be backfilled from deterministic baseline');
      assert.ok(partialRes.markdownTable.includes('Staff Engineer \\| Core Systems'));
    } finally {
      if (prevKey === undefined) delete process.env.AGENTROUTER_API_KEY;
      else process.env.AGENTROUTER_API_KEY = prevKey;
    }
  });
});
