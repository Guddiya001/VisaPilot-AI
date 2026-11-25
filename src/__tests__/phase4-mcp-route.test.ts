import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import {
  createVisaPilotMcpServer,
  type VisaPilotMcpServerInstance,
} from '../lib/mcp/server.ts';
import {
  createInMemoryResolverStore,
  type PersonaData,
} from '../lib/engine/resolver.ts';
import { GET, POST } from '../../apps/web/src/app/api/mcp/[transport]/route.ts';

// Universal test runner adapter
let describe: any;
let it: any;
let expect: any;
let beforeEach: any;
let afterEach: any;

if (process.env.VITEST) {
  const vitest = await import('vitest');
  describe = vitest.describe;
  it = vitest.it;
  expect = vitest.expect;
  beforeEach = vitest.beforeEach;
  afterEach = vitest.afterEach;
} else {
  const nodeTest = await import('node:test');
  const assert = (await import('node:assert/strict')).default;
  describe = nodeTest.describe;
  it = nodeTest.it;
  beforeEach = nodeTest.beforeEach;
  afterEach = nodeTest.afterEach;
  expect = (actual: any) => ({
    toBe: (exp: any) => assert.strictEqual(actual, exp),
    toBeDefined: () => assert.notStrictEqual(actual, undefined),
    toBeNull: () => assert.strictEqual(actual, null),
    toBeGreaterThanOrEqual: (exp: number) =>
      assert.ok(actual >= exp, `Expected ${actual} >= ${exp}`),
    toBeLessThan: (exp: number) =>
      assert.ok(actual < exp, `Expected ${actual} < ${exp}`),
    toContain: (exp: any) =>
      assert.ok(actual?.includes(exp), `Expected ${actual} to contain ${exp}`),
    toEqual: (exp: any) => assert.deepStrictEqual(actual, exp),
    not: {
      toContain: (exp: any) =>
        assert.ok(!actual?.includes(exp), `Expected ${actual} NOT to contain ${exp}`),
    },
  });
}

describe('Phase 4: Next.js MCP Server Route Handler', () => {
  let store: ReturnType<typeof createInMemoryResolverStore>;
  let mcpInstance: VisaPilotMcpServerInstance;
  let client: Client;

  const mockPersona: PersonaData = {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Ashish Kumar Singh',
    isActive: true,
    contactInfo: {
      firstName: 'Ashish',
      lastName: 'Singh',
      email: 'ashish@example.com',
      phone: '+91-9876543210',
      linkedinUrl: 'https://linkedin.com/in/ashish',
      location: 'Noida, India',
    },
    workHistory: [
      {
        company: 'UnitedHealth Group',
        role: 'Senior Staff Software Engineer',
        startDate: '2021-03-01',
        endDate: 'Present',
        bullets: [
          'Architected high-throughput backend services using Python and Kafka.',
          'Maintained distributed database reliability on PostgreSQL and Docker.',
        ],
      },
    ],
    education: [
      {
        institution: 'ABES Engineering College',
        degree: 'Bachelor of Technology',
      },
    ],
    skills: ['Python', 'TypeScript', 'Kubernetes', 'Apache Kafka', 'PostgreSQL'],
    demographicsEeo: {},
    visaWorkAuth: {},
    lockedFacts: {
      employers: ['UnitedHealth Group'],
      degreeTitles: ['Bachelor of Technology'],
      verifiedDates: {
        'UnitedHealth Group': { start: '2021-03-01', end: 'Present' },
      },
      passportNumber: 'Z9876543',
    },
  };

  const mockLlm = {
    async generate(prompt: string) {
      return 'I have deep expertise in building reliable cloud microservices and event queues.';
    },
  };

  const mockEmbeddingService = {
    async generateEmbedding(text: string): Promise<number[]> {
      const vec = new Array(768).fill(0);
      let hash = 0;
      for (let i = 0; i < text.length; i++) {
        hash = (hash << 5) - hash + text.charCodeAt(i);
        hash |= 0;
      }
      const idx = Math.abs(hash) % 768;
      vec[idx] = 1.0;
      return vec;
    },
  };

  beforeEach(async () => {
    store = createInMemoryResolverStore();
    store.seedPersona(mockPersona);

    // Seed Tier 1 Workday selectors
    store.seedSelector({
      id: 'sel-1',
      domain: 'myworkdayjobs.com',
      fieldSignature: 'input[data-automation-id="legalNameSection_firstName"]',
      cssOrXpath: 'input[data-automation-id="legalNameSection_firstName"]',
      mappedProfileKey: 'contactInfo.firstName',
      fieldType: 'text',
      confidence: 1.0,
      hitCount: 1,
    });
    store.seedSelector({
      id: 'sel-2',
      domain: 'myworkdayjobs.com',
      fieldSignature: 'input[data-automation-id="email"]',
      cssOrXpath: 'input[data-automation-id="email"]',
      mappedProfileKey: 'contactInfo.email',
      fieldType: 'text',
      confidence: 1.0,
      hitCount: 1,
    });

    // Seed Tier 2 motivation Q&A
    const motivationEmb = await mockEmbeddingService.generateEmbedding(
      'Why do you want to join our team?'
    );
    store.seedSemanticQA({
      id: 'qa-1',
      personaId: mockPersona.id,
      category: 'motivation',
      rawQuestion: 'Why do you want to join our team?',
      normalizedQuestion: 'why do you want to join our team',
      embedding: motivationEmb,
      answerTemplate:
        'I am excited to join {{COMPANY_NAME}} as a {{ROLE_TITLE}} to build resilient distributed infrastructure.',
      maxCharLimit: 500,
      usageCount: 1,
      lastUsedAt: new Date(),
    });

    mcpInstance = createVisaPilotMcpServer({
      store,
      llm: mockLlm,
      embeddingService: mockEmbeddingService,
    });

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await mcpInstance.server.connect(serverTransport);

    client = new Client(
      { name: 'test-client', version: '1.0.0' },
      { capabilities: {} }
    );
    await client.connect(clientTransport);
  });

  afterEach(async () => {
    await client.close();
    await mcpInstance.server.close();
  });

  it('exposes active persona and domain adapter MCP resources', async () => {
    // 1. Read active persona resource
    const personaRes = await client.readResource({
      uri: 'visapilot://personas/active',
    });

    expect(personaRes.contents).toBeDefined();
    expect(personaRes.contents.length).toBe(1);
    const personaData = JSON.parse(personaRes.contents[0].text as string);
    expect(personaData.name).toBe('Ashish Kumar Singh');
    expect(personaData.contactInfo.email).toBe('ashish@example.com');
    expect(personaData.lockedFacts.employers).toContain('UnitedHealth Group');

    // 2. Read domain adapter resource for myworkdayjobs.com
    const adapterRes = await client.readResource({
      uri: 'visapilot://adapters/myworkdayjobs.com',
    });

    expect(adapterRes.contents).toBeDefined();
    expect(adapterRes.contents.length).toBe(1);
    const adapterData = JSON.parse(adapterRes.contents[0].text as string);
    expect(adapterData.domain).toBe('myworkdayjobs.com');
    expect(adapterData.selectors.length).toBeGreaterThanOrEqual(2);
  });

  it('executes resolve_form_batch MCP tool with 5 mixed fields', async () => {
    const batchArgs = {
      domain: 'myworkdayjobs.com',
      companyName: 'Stripe',
      roleTitle: 'Staff AI Engineer',
      fields: [
        // Field 1: Tier 1 Exact Selector (First Name)
        {
          fieldSignature: 'input[data-automation-id="legalNameSection_firstName"]',
          cssOrXpath: 'input[data-automation-id="legalNameSection_firstName"]',
          fieldType: 'text' as const,
        },
        // Field 2: Tier 1 Exact Selector (Email)
        {
          fieldSignature: 'input[data-automation-id="email"]',
          cssOrXpath: 'input[data-automation-id="email"]',
          fieldType: 'text' as const,
        },
        // Field 3: Tier 2 Semantic Hit (Motivation Q&A)
        {
          fieldSignature: 'textarea[name="why_join"]',
          cssOrXpath: 'textarea[name="why_join"]',
          fieldType: 'text' as const,
          question: 'Why do you want to join our team?',
        },
        // Field 4: Tier 3 Guarded LLM Draft (Novel open question)
        {
          fieldSignature: 'textarea[name="difficult_bug"]',
          cssOrXpath: 'textarea[name="difficult_bug"]',
          fieldType: 'text' as const,
          question: 'Describe your experience diagnosing complex distributed deadlocks.',
        },
        // Field 5: Tier 3 Missing Fact (Required security clearance)
        {
          fieldSignature: 'input[name="clearance_code"]',
          cssOrXpath: 'input[name="clearance_code"]',
          fieldType: 'text' as const,
          question: 'Provide your Active US DoD Secret Clearance Number.',
        },
      ],
    };

    const toolResult = await client.callTool({
      name: 'resolve_form_batch',
      arguments: batchArgs,
    });

    const parsed = JSON.parse((toolResult.content[0] as any).text);
    expect(parsed.resolutions).toBeDefined();
    expect(parsed.resolutions.length).toBe(5);

    // Verify Field 1: Tier 1 GREEN_EXACT
    expect(parsed.resolutions[0].tier).toBe(1);
    expect(parsed.resolutions[0].badge).toBe('GREEN_EXACT');
    expect(parsed.resolutions[0].value).toBe('Ashish');

    // Verify Field 2: Tier 1 GREEN_EXACT
    expect(parsed.resolutions[1].tier).toBe(1);
    expect(parsed.resolutions[1].badge).toBe('GREEN_EXACT');
    expect(parsed.resolutions[1].value).toBe('ashish@example.com');

    // Verify Field 3: Tier 2 BLUE_VECTOR_LEARNED
    expect(parsed.resolutions[2].tier).toBe(2);
    expect(parsed.resolutions[2].badge).toBe('BLUE_VECTOR_LEARNED');
    expect(parsed.resolutions[2].value).toContain('Stripe');
    expect(parsed.resolutions[2].value).toContain('Staff AI Engineer');

    // Verify Field 4: Tier 3 AMBER_LLM_DRAFT
    expect(parsed.resolutions[3].tier).toBe(3);
    expect(parsed.resolutions[3].badge).toBe('AMBER_LLM_DRAFT');
    expect(parsed.resolutions[3].value).toBeDefined();

    // Verify Field 5: Tier 3 RED_MISSING_FACT
    expect(parsed.resolutions[4].tier).toBe(3);
    expect(parsed.resolutions[4].badge).toBe('RED_MISSING_FACT');
    expect(parsed.resolutions[4].value).toBe('[MISSING_FACT: security_clearance]');

    // Verify resolution stats
    expect(parsed.stats.tier1Hits).toBe(2);
    expect(parsed.stats.tier2VectorHits).toBe(1);
    expect(parsed.stats.tier3LlmCalls).toBe(1);
  });

  it('executes learn_from_submission MCP tool and turns subsequent resolution to 100% Tier 1/2', async () => {
    // 1. Learn from a completed application
    const learnArgs = {
      personaId: mockPersona.id,
      companyName: 'Anthropic',
      roleTitle: 'Systems Engineer',
      domain: 'myworkdayjobs.com',
      portalUrl: 'https://anthropic.wd5.myworkdayjobs.com/jobs/1',
      fields: [
        {
          fieldSignature: 'textarea[name="difficult_bug"]',
          cssOrXpath: 'textarea[name="difficult_bug"]',
          fieldType: 'text' as const,
          question: 'Describe your experience diagnosing complex distributed deadlocks.',
          value:
            'At Anthropic as Systems Engineer, I resolved distributed deadlocks using eBPF and thread dump analysis.',
          wasEditedByHuman: true,
          originalBadge: 'AMBER_LLM_DRAFT' as const,
        },
      ],
      resolutionStats: {
        tier1Hits: 2,
        tier2VectorHits: 1,
        tier3LlmCalls: 1,
      },
    };

    const learnResult = await client.callTool({
      name: 'learn_from_submission',
      arguments: learnArgs,
    });

    const learnParsed = JSON.parse((learnResult.content[0] as any).text);
    expect(learnParsed.success).toBe(true);
    expect(learnParsed.auditId).toBeDefined();

    // 2. Re-resolve the same question for a different company ("OpenAI")
    const reResolveResult = await client.callTool({
      name: 'resolve_form_batch',
      arguments: {
        domain: 'myworkdayjobs.com',
        companyName: 'OpenAI',
        roleTitle: 'Systems Engineer',
        fields: [
          {
            fieldSignature: 'textarea[name="difficult_bug"]',
            cssOrXpath: 'textarea[name="difficult_bug"]',
            fieldType: 'text' as const,
            question: 'Describe your experience diagnosing complex distributed deadlocks.',
          },
        ],
      },
    });

    const reResolveParsed = JSON.parse((reResolveResult.content[0] as any).text);
    // Now it resolves via Tier 2 BLUE_VECTOR_LEARNED with ZERO LLM calls!
    expect(reResolveParsed.resolutions[0].tier).toBe(2);
    expect(reResolveParsed.resolutions[0].badge).toBe('BLUE_VECTOR_LEARNED');
    expect(reResolveParsed.resolutions[0].llmCalls).toBe(0);
    expect(reResolveParsed.resolutions[0].value).toContain('OpenAI');
    expect(reResolveParsed.resolutions[0].value).toContain('Systems Engineer');
  });

  it('executes diff_and_tailor_resume MCP tool with fact-locked bullet rewrites', async () => {
    const jdText = `
      Senior Staff Backend Engineer at Monzo.
      Requirements:
      - 8+ years experience in Python, Kubernetes, Apache Kafka, and PostgreSQL.
      - Strong knowledge of eBPF, Distributed Consensus, and high-concurrency systems.
    `;

    const toolResult = await client.callTool({
      name: 'diff_and_tailor_resume',
      arguments: {
        jdRawText: jdText,
        personaId: mockPersona.id,
      },
    });

    const parsed = JSON.parse((toolResult.content[0] as any).text);
    expect(parsed.matchedKeywords).toBeDefined();
    expect(parsed.missingKeywords).toBeDefined();
    expect(parsed.tailoredBullets).toBeDefined();
    expect(parsed.factLockVerified).toBe(true);

    expect(parsed.matchedKeywords).toContain('Python');
    expect(parsed.matchedKeywords).toContain('Kubernetes');
    expect(parsed.matchedKeywords).toContain('Apache Kafka');
    expect(parsed.missingKeywords).toContain('eBPF');

    expect(parsed.tailoredBullets.length).toBeGreaterThanOrEqual(1);
    for (const bullet of parsed.tailoredBullets) {
      expect(bullet.tailored).toBeDefined();
      // Fact-lock check: never mutate locked employer names or dates
      expect(bullet.tailored).not.toContain('United Health Corporation');
    }
  });

  it('serves Next.js App Router route handler for HTTP/SSE requests', async () => {
    const dummyReq = new Request('http://localhost:3000/api/mcp/http', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {},
      }),
    });

    const response = await POST(dummyReq, { params: Promise.resolve({ transport: 'http' }) });
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.jsonrpc).toBe('2.0');
    expect(body.result.tools).toBeDefined();
    expect(body.result.tools.some((t: any) => t.name === 'resolve_form_batch')).toBe(true);
    expect(body.result.tools.some((t: any) => t.name === 'learn_from_submission')).toBe(true);
    expect(body.result.tools.some((t: any) => t.name === 'diff_and_tailor_resume')).toBe(true);
  });

  it('handles tools/call directly via Next.js App Router POST route handler', async () => {
    const callReq = new Request('http://localhost:3000/api/mcp/http', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 42,
        method: 'tools/call',
        params: {
          name: 'resolve_form_batch',
          arguments: {
            domain: 'myworkdayjobs.com',
            companyName: 'Acme Corp',
            roleTitle: 'Staff AI Engineer',
            fields: [
              {
                fieldSignature: 'input[data-automation-id="email"]',
                cssOrXpath: 'input[data-automation-id="email"]',
                fieldType: 'text',
              },
            ],
          },
        },
      }),
    });

    const response = await POST(callReq, { params: Promise.resolve({ transport: 'http' }) });
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.jsonrpc).toBe('2.0');
    expect(body.id).toBe(42);
    expect(body.result).toBeDefined();
    expect(body.result.resolutions).toBeDefined();
    expect(body.result.resolutions.length).toBe(1);
    expect(body.result.resolutions[0].badge).toBe('GREEN_EXACT');
    expect(body.result.resolutions[0].value).toBe('ashish@example.com');
  });
});
