import {
  createInMemoryResolverStore,
  type PersonaData,
} from '../lib/engine/resolver.ts';
import {
  createVisaPilotMcpServer,
  type VisaPilotMcpServerInstance,
} from '../lib/mcp/server.ts';
import {
  AutopilotStateMachine,
  SafetyGateBlockedError,
  type FieldResolutionStatus,
} from '../extension/autopilot/state-machine.ts';
import { scanDomFields } from '../extension/dom/scanner.ts';
import { setReactInputValue } from '../extension/dom/filler.ts';
import { expandRepeaterBlocks } from '../extension/dom/repeater.ts';
import { attachResumeFile } from '../extension/dom/file-upload.ts';
import { type EmbeddingService } from '../lib/engine/learner.ts';

// Universal DOM and test runner initialization
if (typeof window === 'undefined') {
  const { JSDOM } = await import('jsdom');
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>', {
    runScripts: 'dangerously',
  });
  (globalThis as any).window = dom.window;
  (globalThis as any).document = dom.window.document;
  (globalThis as any).Event = dom.window.Event;
  (globalThis as any).File = dom.window.File;
}

let describe: any;
let it: any;
let expect: any;
let beforeEach: any;

if (process.env.VITEST) {
  const vitest = await import('vitest');
  describe = vitest.describe;
  it = vitest.it;
  expect = vitest.expect;
  beforeEach = vitest.beforeEach;
} else {
  const nodeTest = await import('node:test');
  const assert = (await import('node:assert/strict')).default;
  describe = nodeTest.describe;
  it = nodeTest.it;
  beforeEach = nodeTest.beforeEach;
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

/**
 * Deterministic embedding fixture for RAG pipeline questions
 */
class SemanticTestEmbeddingService implements EmbeddingService {
  async generateEmbedding(text: string): Promise<number[]> {
    const vec = new Array(768).fill(0);
    // Align all RAG / production pipeline questions to dimensions 0 and 1
    if (/rag|pipeline|multi-tenant/i.test(text)) {
      vec[0] = 0.95;
      vec[1] = 0.31;
    } else {
      vec[10] = 1.0;
    }
    return vec;
  }
}

describe('Phase 8: Full E2E Autopilot Lifecycle Integration Test', () => {
  let doc: Document;
  let store: ReturnType<typeof createInMemoryResolverStore>;
  let embeddingService: SemanticTestEmbeddingService;
  let mcpInstance: VisaPilotMcpServerInstance;
  let activePersona: PersonaData;

  beforeEach(() => {
    doc = (globalThis as any).document || window.document;
    doc.body.innerHTML = '<div id="root"></div>';

    store = createInMemoryResolverStore();
    embeddingService = new SemanticTestEmbeddingService();

    activePersona = {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Ashish Kumar Singh',
      isActive: true,
      contactInfo: {
        firstName: 'Ashish',
        lastName: 'Singh',
        email: 'ashish.singh@example.com',
        phone: '+91-9876543210',
        location: 'Noida, India',
      },
      workHistory: [
        {
          company: 'UnitedHealth Group',
          role: 'Senior Staff Software Engineer',
          startDate: '2021-03-01',
          endDate: 'Present',
        },
        {
          company: 'DBS Bank',
          role: 'Lead Full Stack Engineer',
          startDate: '2018-04-01',
          endDate: '2021-02-28',
        },
        {
          company: 'Walmart Labs',
          role: 'Software Engineer III',
          startDate: '2014-07-01',
          endDate: '2018-03-31',
        },
      ],
      education: [
        {
          institution: 'ABES Engineering College',
          degree: 'Bachelor of Technology in Computer Science',
          graduationDate: '2014-06-01',
        },
      ],
      skills: ['TypeScript', 'Python', 'PostgreSQL', 'Kafka', 'Docker'],
      demographicsEeo: { gender: 'Male', veteranStatus: 'No' },
      visaWorkAuth: { requiresSponsorship: true, currentCitizenship: 'India' },
      lockedFacts: {
        fullName: 'Ashish Kumar Singh',
        currentTitle: 'Senior Staff Software Engineer',
        totalYearsExp: 10,
        // Notice: dod_clearance / security_clearance is intentionally absent at start!
      },
    };

    store.seedPersona(activePersona);

    // Seed baseline ATS domain selectors
    store.seedSelector({
      id: 'sel-1',
      domain: 'greenhouse.io',
      fieldSignature: 'input[data-automation-id="legalNameSection_firstName"]',
      cssOrXpath: 'input[data-automation-id="legalNameSection_firstName"]',
      mappedProfileKey: 'contactInfo.firstName',
      fieldType: 'text',
      confidence: 1.0,
      hitCount: 1,
    });
    store.seedSelector({
      id: 'sel-2',
      domain: 'greenhouse.io',
      fieldSignature: 'input[data-automation-id="legalNameSection_lastName"]',
      cssOrXpath: 'input[data-automation-id="legalNameSection_lastName"]',
      mappedProfileKey: 'contactInfo.lastName',
      fieldType: 'text',
      confidence: 1.0,
      hitCount: 1,
    });
    store.seedSelector({
      id: 'sel-3',
      domain: 'greenhouse.io',
      fieldSignature: 'input[data-automation-id="email"]',
      cssOrXpath: 'input[data-automation-id="email"]',
      mappedProfileKey: 'contactInfo.email',
      fieldType: 'text',
      confidence: 1.0,
      hitCount: 1,
    });

    // Mock Tier 3 LLM fallback
    const mockLlm = {
      async generate(prompt: string) {
        if (/clearance/i.test(prompt)) {
          return '[MISSING_FACT: security_clearance]';
        }
        return 'I have designed and operated distributed pipelines handling high concurrency.';
      },
    };

    mcpInstance = createVisaPilotMcpServer({
      store,
      embeddingService,
      llm: mockLlm,
    });
  });

  it('executes full 3-stage lifecycle: Discovery -> Safety Gate Halt -> Commit-on-Submit -> Zero-LLM Second Application', async () => {
    // =========================================================================
    // STAGE 1: Application #1 at "Stripe" (Discovery, Safety Gate Halt & Human Resolution)
    // =========================================================================
    const root = doc.getElementById('root')!;
    root.innerHTML = `
      <form id="stripe-job-app">
        <input id="first_name" name="first_name" data-automation-id="legalNameSection_firstName" />
        <input id="last_name" name="last_name" data-automation-id="legalNameSection_lastName" />
        <input id="email" name="email" data-automation-id="email" />

        <div class="work-history-section">
          <div class="work-entry"><input class="company" name="work_company_0" /></div>
          <button type="button" id="add-work-exp">+ Add Another</button>
        </div>

        <input type="file" id="resume-upload" name="resume" />

        <textarea id="rag_question" name="rag_question" data-question="How have you scaled multi-tenant RAG pipelines at Stripe?"></textarea>
        <input id="dod_clearance" name="dod_clearance" data-question="Active DoD Clearance ID" required />

        <button type="submit" id="submit-btn">Submit Application</button>
      </form>
    `;

    const form = doc.getElementById('stripe-job-app') as HTMLFormElement;
    const submitBtn = doc.getElementById('submit-btn') as HTMLElement;
    const fileInput = doc.getElementById('resume-upload') as HTMLInputElement;

    const addWorkBtn = form.querySelector('#add-work-exp')!;
    addWorkBtn.addEventListener('click', () => {
      const container = form.querySelector('.work-history-section')!;
      const count = container.querySelectorAll('.work-entry').length;
      const newBlock = doc.createElement('div');
      newBlock.className = 'work-entry';
      newBlock.innerHTML = `<input class="company" name="work_company_${count}" />`;
      container.insertBefore(newBlock, addWorkBtn);
    });

    // 1. Scan DOM with scanner.ts
    const scanned = scanDomFields(form);
    expect(scanned.length).toBeGreaterThanOrEqual(5);

    // 2. Expand repeater blocks for 3 work history items
    const expandedEntries = await expandRepeaterBlocks({
      container: form.querySelector('.work-history-section')!,
      addButtonSelector: '#add-work-exp',
      entrySelector: '.work-entry',
      targetCount: 3,
    });
    expect(expandedEntries.length).toBe(3);

    // 3. Attach PDF resume file
    const samplePdf = Buffer.from('%PDF-1.4 Simulated Ashish Resume');
    attachResumeFile(fileInput, samplePdf, 'Ashish_Kumar_Singh_Resume.pdf', 'application/pdf');
    expect(fileInput.files?.length).toBe(1);
    expect(fileInput.files![0].name).toBe('Ashish_Kumar_Singh_Resume.pdf');

    // 4. Batch resolve fields via MCP tool
    const mcpResolverTool = (mcpInstance.server as any)._registeredTools?.['resolve_form_batch'];
    expect(mcpResolverTool).toBeDefined();

    const resolveArgs = {
      domain: 'greenhouse.io',
      companyName: 'Stripe',
      roleTitle: 'Staff AI Engineer',
      fields: [
        {
          fieldSignature: 'input[data-automation-id="legalNameSection_firstName"]',
          cssOrXpath: 'input[data-automation-id="legalNameSection_firstName"]',
          fieldType: 'text' as const,
        },
        {
          fieldSignature: 'input[data-automation-id="legalNameSection_lastName"]',
          cssOrXpath: 'input[data-automation-id="legalNameSection_lastName"]',
          fieldType: 'text' as const,
        },
        {
          fieldSignature: 'input[data-automation-id="email"]',
          cssOrXpath: 'input[data-automation-id="email"]',
          fieldType: 'text' as const,
        },
        {
          fieldSignature: 'textarea#rag_question',
          cssOrXpath: 'textarea#rag_question',
          fieldType: 'text' as const,
          question: 'How have you scaled multi-tenant RAG pipelines at Stripe?',
        },
        {
          fieldSignature: 'input#dod_clearance',
          cssOrXpath: 'input#dod_clearance',
          fieldType: 'text' as const,
          question: 'Active DoD Clearance ID',
          required: true,
        },
      ],
    };

    const resolveResult = await mcpResolverTool.handler(resolveArgs);
    const parsedResolve = JSON.parse(resolveResult.content[0].text);
    const resolutions = parsedResolve.resolutions;

    // Standard fields are GREEN_EXACT Tier 1
    expect(resolutions[0].badge).toBe('GREEN_EXACT');
    expect(resolutions[0].value).toBe('Ashish');
    expect(resolutions[1].badge).toBe('GREEN_EXACT');
    expect(resolutions[1].value).toBe('Singh');
    expect(resolutions[2].badge).toBe('GREEN_EXACT');
    expect(resolutions[2].value).toBe('ashish.singh@example.com');

    // Open-ended question was answered via Tier 3 fallback
    expect(resolutions[3].badge).toBe('AMBER_LLM_DRAFT');

    // Missing clearance fact triggered RED_MISSING_FACT
    expect(resolutions[4].badge).toBe('RED_MISSING_FACT');

    // 5. Connect to AutopilotStateMachine
    let mcpToolCallMade: any = null;
    const mcpClientWrapper = {
      async callTool(args: { name: string; arguments: any }) {
        mcpToolCallMade = args;
        const tool = (mcpInstance.server as any)._registeredTools?.[args.name];
        return tool.handler(args.arguments);
      },
    };

    const stateMachine = new AutopilotStateMachine({
      mode: 'AUTOPILOT',
      formElement: form,
      submitButton: submitBtn,
      mcpClient: mcpClientWrapper,
      applicationContext: {
        personaId: activePersona.id,
        companyName: 'Stripe',
        roleTitle: 'Staff AI Engineer',
        domain: 'greenhouse.io',
        portalUrl: 'https://boards.greenhouse.io/stripe/jobs/12345',
      },
    });

    const fieldElements: FieldResolutionStatus[] = [
      {
        element: doc.getElementById('first_name')!,
        fieldSignature: resolutions[0].fieldSignature,
        tier: resolutions[0].tier,
        badge: resolutions[0].badge,
        value: resolutions[0].value,
      },
      {
        element: doc.getElementById('last_name')!,
        fieldSignature: resolutions[1].fieldSignature,
        tier: resolutions[1].tier,
        badge: resolutions[1].badge,
        value: resolutions[1].value,
      },
      {
        element: doc.getElementById('email')!,
        fieldSignature: resolutions[2].fieldSignature,
        tier: resolutions[2].tier,
        badge: resolutions[2].badge,
        value: resolutions[2].value,
      },
      {
        element: doc.getElementById('rag_question')!,
        fieldSignature: resolutions[3].fieldSignature,
        tier: resolutions[3].tier,
        badge: resolutions[3].badge,
        value: resolutions[3].value,
        question: 'How have you scaled multi-tenant RAG pipelines at Stripe?',
      },
      {
        element: doc.getElementById('dod_clearance')!,
        fieldSignature: resolutions[4].fieldSignature,
        tier: resolutions[4].tier,
        badge: resolutions[4].badge,
        value: resolutions[4].value,
        question: 'Active DoD Clearance ID',
        required: true,
      },
    ];

    await stateMachine.processResolvedFields(fieldElements);

    // Assert isolated Shadow DOM confidence badges are attached
    expect(form.querySelectorAll('.visapilot-shadow-badge-host').length).toBe(5);

    // Assert safety gate HALTED submission
    expect(stateMachine.state).toBe('REVIEW_REQUIRED');
    let submissionBlocked = false;
    try {
      await stateMachine.submitForm();
    } catch (err: any) {
      if (err instanceof SafetyGateBlockedError) {
        submissionBlocked = true;
      }
    }
    expect(submissionBlocked).toBe(true);

    // 6. User resolves missing fact and edits open-ended answer
    const approvedRagAnswer =
      'I scaled multi-tenant RAG pipelines at Stripe by implementing partitioned pgvector indexes and caching embeddings in Redis, reducing latency by 45%.';
    setReactInputValue(doc.getElementById('rag_question')!, approvedRagAnswer);
    fieldElements[3].value = approvedRagAnswer;
    fieldElements[3].wasEditedByHuman = true;

    // Lock the clearance fact to profile
    activePersona.lockedFacts.dod_clearance = 'None / Open to Clearance';
    // Map clearance field selector into domain selectors
    await store.upsertDomainSelector({
      id: 'sel-clearance',
      domain: 'greenhouse.io',
      fieldSignature: 'input#dod_clearance',
      cssOrXpath: 'input#dod_clearance',
      mappedProfileKey: 'lockedFacts.dod_clearance',
      fieldType: 'text',
      confidence: 1.0,
      hitCount: 1,
    });

    fieldElements[4].badge = 'GREEN_EXACT';
    fieldElements[4].tier = 1;
    fieldElements[4].value = 'None / Open to Clearance';

    // Now invoke learn_from_submission tool via state machine
    await stateMachine.processResolvedFields(fieldElements);
    stateMachine.focusedField = null;
    stateMachine.state = 'FILLING';

    await stateMachine.submitForm();
    expect(stateMachine.state).toBe('SUBMITTED');
    expect(mcpToolCallMade).toBeDefined();
    expect(mcpToolCallMade.name).toBe('learn_from_submission');

    // =========================================================================
    // STAGE 2: Self-Learning Verification in DB
    // =========================================================================
    // 1. Assert submitted answer for Stripe was generalized to {{COMPANY_NAME}} in semantic memory
    const matches = await store.searchSemanticMemory(
      await embeddingService.generateEmbedding(
        'How have you scaled multi-tenant RAG pipelines at Stripe?'
      )
    );
    expect(matches.length).toBeGreaterThanOrEqual(1);
    expect(matches[0].answerTemplate).toContain('{{COMPANY_NAME}}');
    expect(matches[0].answerTemplate).not.toContain('Stripe');
    expect(matches[0].answerTemplate).toContain('partitioned pgvector indexes');

    // 2. Assert resolved clearance fact is persisted in persona lockedFacts
    const reloadedPersona = await store.getActivePersona();
    expect(reloadedPersona?.lockedFacts.dod_clearance).toBe('None / Open to Clearance');

    // 3. Assert applicationsAudit logged Application #1
    const auditRecord = await store.getAuditRecord(
      Object.keys((store as any).getAuditRecord ? (store as any).auditRecords ?? {} : {})[0] ||
        'audit-stripe'
    );
    expect(auditRecord).toBeDefined();

    // =========================================================================
    // STAGE 3: Application #2 at "Vercel" (100% Zero-LLM Autopilot Auto-Submit)
    // =========================================================================
    root.innerHTML = `
      <form id="vercel-job-app">
        <input id="v_first_name" name="first_name" data-automation-id="legalNameSection_firstName" />
        <input id="v_last_name" name="last_name" data-automation-id="legalNameSection_lastName" />
        <input id="v_email" name="email" data-automation-id="email" />
        <input id="v_dod_clearance" name="dod_clearance" data-question="Active DoD Clearance ID" />
        <textarea id="v_rag_question" name="rag_question" data-question="Describe how you scale production RAG pipelines for Vercel."></textarea>
        <button type="submit" id="v-submit-btn">Apply Now</button>
      </form>
    `;

    const vercelForm = doc.getElementById('vercel-job-app') as HTMLFormElement;
    const vercelSubmitBtn = doc.getElementById('v-submit-btn') as HTMLElement;

    const vercelResolveArgs = {
      domain: 'greenhouse.io',
      companyName: 'Vercel',
      roleTitle: 'Principal AI Architect',
      fields: [
        {
          fieldSignature: 'input[data-automation-id="legalNameSection_firstName"]',
          cssOrXpath: 'input[data-automation-id="legalNameSection_firstName"]',
          fieldType: 'text' as const,
        },
        {
          fieldSignature: 'input[data-automation-id="legalNameSection_lastName"]',
          cssOrXpath: 'input[data-automation-id="legalNameSection_lastName"]',
          fieldType: 'text' as const,
        },
        {
          fieldSignature: 'input[data-automation-id="email"]',
          cssOrXpath: 'input[data-automation-id="email"]',
          fieldType: 'text' as const,
        },
        {
          fieldSignature: 'input#dod_clearance',
          cssOrXpath: 'input#dod_clearance',
          fieldType: 'text' as const,
          question: 'Active DoD Clearance ID',
        },
        {
          fieldSignature: 'textarea#v_rag_question',
          cssOrXpath: 'textarea#v_rag_question',
          fieldType: 'text' as const,
          question: 'Describe how you scale production RAG pipelines for Vercel.',
        },
      ],
    };

    const vercelResolveResult = await mcpResolverTool.handler(vercelResolveArgs);
    const vercelParsed = JSON.parse(vercelResolveResult.content[0].text);
    const vResolutions = vercelParsed.resolutions;
    const vStats = vercelParsed.stats;

    // Assert 0 LLM calls!
    expect(vStats.tier3LlmCalls).toBe(0);
    expect(vStats.tier1Hits).toBe(4); // first_name, last_name, email, dod_clearance
    expect(vStats.tier2VectorHits).toBe(1); // RAG question resolved via semantic memory!

    // Verify Vercel was hydrated into {{COMPANY_NAME}}
    expect(vResolutions[4].badge).toBe('BLUE_VECTOR_LEARNED');
    expect(vResolutions[4].value).toContain('Vercel');
    expect(vResolutions[4].value).not.toContain('{{COMPANY_NAME}}');
    expect(vResolutions[4].value).not.toContain('Stripe');

    // Run Vercel form through AutopilotStateMachine
    let vercelSubmissionCommitted: any = null;
    const vercelMcpClient = {
      async callTool(args: { name: string; arguments: any }) {
        vercelSubmissionCommitted = args;
        const tool = (mcpInstance.server as any)._registeredTools?.[args.name];
        return tool.handler(args.arguments);
      },
    };

    const vercelStateMachine = new AutopilotStateMachine({
      mode: 'AUTOPILOT',
      formElement: vercelForm,
      submitButton: vercelSubmitBtn,
      mcpClient: vercelMcpClient,
      applicationContext: {
        personaId: activePersona.id,
        companyName: 'Vercel',
        roleTitle: 'Principal AI Architect',
        domain: 'greenhouse.io',
        portalUrl: 'https://boards.greenhouse.io/vercel/jobs/99999',
      },
    });

    const vFieldElements: FieldResolutionStatus[] = [
      {
        element: doc.getElementById('v_first_name')!,
        fieldSignature: vResolutions[0].fieldSignature,
        tier: vResolutions[0].tier,
        badge: vResolutions[0].badge,
        value: vResolutions[0].value,
      },
      {
        element: doc.getElementById('v_last_name')!,
        fieldSignature: vResolutions[1].fieldSignature,
        tier: vResolutions[1].tier,
        badge: vResolutions[1].badge,
        value: vResolutions[1].value,
      },
      {
        element: doc.getElementById('v_email')!,
        fieldSignature: vResolutions[2].fieldSignature,
        tier: vResolutions[2].tier,
        badge: vResolutions[2].badge,
        value: vResolutions[2].value,
      },
      {
        element: doc.getElementById('v_dod_clearance')!,
        fieldSignature: vResolutions[3].fieldSignature,
        tier: vResolutions[3].tier,
        badge: vResolutions[3].badge,
        value: vResolutions[3].value,
      },
      {
        element: doc.getElementById('v_rag_question')!,
        fieldSignature: vResolutions[4].fieldSignature,
        tier: vResolutions[4].tier,
        badge: vResolutions[4].badge,
        value: vResolutions[4].value,
      },
    ];

    await vercelStateMachine.processResolvedFields(vFieldElements);

    // No fields are RED or AMBER
    expect(vercelStateMachine.state).toBe('FILLING');
    expect(vercelStateMachine.focusedField).toBeNull();

    // Auto-submits without safety gate blockage
    await vercelStateMachine.submitForm();
    expect(vercelStateMachine.state).toBe('SUBMITTED');
    expect(vercelSubmissionCommitted).toBeDefined();
    expect(vercelSubmissionCommitted.name).toBe('learn_from_submission');
    expect(vercelSubmissionCommitted.arguments.resolutionStats.tier3LlmCalls).toBe(0);
  });
});
