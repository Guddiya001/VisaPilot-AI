import {
  createVisaPilotMcpServer,
  executeMcpToolCall,
} from '../../../../../../../src/lib/mcp/server.ts';
import {
  createInMemoryResolverStore,
  type PersonaData,
} from '../../../../../../../src/lib/engine/resolver.ts';

const defaultPersona: PersonaData = {
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
    githubUrl: 'https://github.com/ashish',
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
  skills: [
    'Python',
    'TypeScript',
    'JavaScript',
    'Go',
    'Java',
    'Kubernetes',
    'Docker',
    'Apache Kafka',
    'PostgreSQL',
    'Redis',
    'eBPF',
    'Distributed Systems',
    'Microservices',
  ],
  demographicsEeo: {
    gender: 'Male',
    veteranStatus: 'No',
    disabilityStatus: 'No',
  },
  visaWorkAuth: {
    authorizedInUs: 'Yes',
    requiresSponsorship: 'No',
    sponsorshipStatus: 'Authorized to work without sponsorship',
  },
  lockedFacts: {
    employers: ['UnitedHealth Group'],
    degreeTitles: ['Bachelor of Technology'],
    verifiedDates: {
      'UnitedHealth Group': { start: '2021-03-01', end: 'Present' },
    },
    passportNumber: 'Z9876543',
  },
};

function createConfiguredMcpInstance() {
  const store = createInMemoryResolverStore();
  store.seedPersona(defaultPersona);

  // Seed universal ATS domain selectors
  const defaultSelectors = [
    // First Name
    { domain: '*', fieldSignature: 'input[data-automation-id="legalNameSection_firstName"]', cssOrXpath: 'input[data-automation-id="legalNameSection_firstName"]', mappedProfileKey: 'contactInfo.firstName', fieldType: 'text' as const },
    { domain: '*', fieldSignature: 'input[name="firstName"]', cssOrXpath: 'input[name="firstName"]', mappedProfileKey: 'contactInfo.firstName', fieldType: 'text' as const },
    { domain: '*', fieldSignature: 'input[id="first_name"]', cssOrXpath: 'input[id="first_name"]', mappedProfileKey: 'contactInfo.firstName', fieldType: 'text' as const },
    { domain: '*', fieldSignature: '#first_name', cssOrXpath: '#first_name', mappedProfileKey: 'contactInfo.firstName', fieldType: 'text' as const },
    { domain: '*', fieldSignature: '#firstName', cssOrXpath: '#firstName', mappedProfileKey: 'contactInfo.firstName', fieldType: 'text' as const },

    // Last Name
    { domain: '*', fieldSignature: 'input[data-automation-id="legalNameSection_lastName"]', cssOrXpath: 'input[data-automation-id="legalNameSection_lastName"]', mappedProfileKey: 'contactInfo.lastName', fieldType: 'text' as const },
    { domain: '*', fieldSignature: 'input[name="lastName"]', cssOrXpath: 'input[name="lastName"]', mappedProfileKey: 'contactInfo.lastName', fieldType: 'text' as const },
    { domain: '*', fieldSignature: 'input[id="last_name"]', cssOrXpath: 'input[id="last_name"]', mappedProfileKey: 'contactInfo.lastName', fieldType: 'text' as const },
    { domain: '*', fieldSignature: '#last_name', cssOrXpath: '#last_name', mappedProfileKey: 'contactInfo.lastName', fieldType: 'text' as const },
    { domain: '*', fieldSignature: '#lastName', cssOrXpath: '#lastName', mappedProfileKey: 'contactInfo.lastName', fieldType: 'text' as const },

    // Email
    { domain: '*', fieldSignature: 'input[data-automation-id="email"]', cssOrXpath: 'input[data-automation-id="email"]', mappedProfileKey: 'contactInfo.email', fieldType: 'text' as const },
    { domain: '*', fieldSignature: 'input[name="email"]', cssOrXpath: 'input[name="email"]', mappedProfileKey: 'contactInfo.email', fieldType: 'text' as const },
    { domain: '*', fieldSignature: 'input[type="email"]', cssOrXpath: 'input[type="email"]', mappedProfileKey: 'contactInfo.email', fieldType: 'text' as const },
    { domain: '*', fieldSignature: '#email', cssOrXpath: '#email', mappedProfileKey: 'contactInfo.email', fieldType: 'text' as const },

    // Phone
    { domain: '*', fieldSignature: 'input[data-automation-id="phone-number"]', cssOrXpath: 'input[data-automation-id="phone-number"]', mappedProfileKey: 'contactInfo.phone', fieldType: 'text' as const },
    { domain: '*', fieldSignature: 'input[name="phone"]', cssOrXpath: 'input[name="phone"]', mappedProfileKey: 'contactInfo.phone', fieldType: 'text' as const },
    { domain: '*', fieldSignature: 'input[type="tel"]', cssOrXpath: 'input[type="tel"]', mappedProfileKey: 'contactInfo.phone', fieldType: 'text' as const },
    { domain: '*', fieldSignature: '#phone', cssOrXpath: '#phone', mappedProfileKey: 'contactInfo.phone', fieldType: 'text' as const },

    // LinkedIn
    { domain: '*', fieldSignature: 'input[data-automation-id="linkedin-question"]', cssOrXpath: 'input[data-automation-id="linkedin-question"]', mappedProfileKey: 'contactInfo.linkedinUrl', fieldType: 'text' as const },
    { domain: '*', fieldSignature: 'input[name="urls[LinkedIn]"]', cssOrXpath: 'input[name="urls[LinkedIn]"]', mappedProfileKey: 'contactInfo.linkedinUrl', fieldType: 'text' as const },
    { domain: '*', fieldSignature: 'input[name="linkedin_url"]', cssOrXpath: 'input[name="linkedin_url"]', mappedProfileKey: 'contactInfo.linkedinUrl', fieldType: 'text' as const },
    { domain: '*', fieldSignature: 'input[name="linkedin"]', cssOrXpath: 'input[name="linkedin"]', mappedProfileKey: 'contactInfo.linkedinUrl', fieldType: 'text' as const },
    { domain: '*', fieldSignature: '#linkedin_url', cssOrXpath: '#linkedin_url', mappedProfileKey: 'contactInfo.linkedinUrl', fieldType: 'text' as const },
    { domain: '*', fieldSignature: '#linkedin', cssOrXpath: '#linkedin', mappedProfileKey: 'contactInfo.linkedinUrl', fieldType: 'text' as const },

    // GitHub
    { domain: '*', fieldSignature: 'input[data-automation-id="github-question"]', cssOrXpath: 'input[data-automation-id="github-question"]', mappedProfileKey: 'contactInfo.githubUrl', fieldType: 'text' as const },
    { domain: '*', fieldSignature: 'input[name="github_url"]', cssOrXpath: 'input[name="github_url"]', mappedProfileKey: 'contactInfo.githubUrl', fieldType: 'text' as const },
    { domain: '*', fieldSignature: 'input[name="github"]', cssOrXpath: 'input[name="github"]', mappedProfileKey: 'contactInfo.githubUrl', fieldType: 'text' as const },
    { domain: '*', fieldSignature: '#github_url', cssOrXpath: '#github_url', mappedProfileKey: 'contactInfo.githubUrl', fieldType: 'text' as const },
    { domain: '*', fieldSignature: '#github', cssOrXpath: '#github', mappedProfileKey: 'contactInfo.githubUrl', fieldType: 'text' as const },

    // Location / City
    { domain: '*', fieldSignature: 'input[name="location"]', cssOrXpath: 'input[name="location"]', mappedProfileKey: 'contactInfo.location', fieldType: 'text' as const },
    { domain: '*', fieldSignature: 'input[name="city"]', cssOrXpath: 'input[name="city"]', mappedProfileKey: 'contactInfo.location', fieldType: 'text' as const },
    { domain: '*', fieldSignature: '#location', cssOrXpath: '#location', mappedProfileKey: 'contactInfo.location', fieldType: 'text' as const },
  ];

  for (let i = 0; i < defaultSelectors.length; i++) {
    store.seedSelector({
      id: `sel-seed-${i + 1}`,
      ...defaultSelectors[i],
      confidence: 1.0,
      hitCount: 1,
    });
  }

  return createVisaPilotMcpServer({ store });
}

// Shared server instance for App Router
const defaultMcpInstance = createConfiguredMcpInstance();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ transport: string }> }
) {
  const { transport } = await params;

  if (transport === 'sse') {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(`event: endpoint\ndata: /api/mcp/messages\n\n`)
        );
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  }

  return Response.json({
    status: 'ok',
    server: 'visapilot-autopilot',
    transport,
    protocolVersion: '2024-11-05',
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ transport: string }> }
) {
  const { transport } = await params;

  try {
    const body = await request.json();
    const { id = 1, method, params: methodParams } = body;

    // Handle tools/list
    if (method === 'tools/list') {
      return Response.json({
        jsonrpc: '2.0',
        id,
        result: {
          tools: [
            {
              name: 'resolve_form_batch',
              description:
                'Batch resolve form fields via Tier 1 selectors, Tier 2 pgvector semantic memory, and Tier 3 guarded LLM fallback.',
              inputSchema: {
                type: 'object',
                properties: {
                  domain: { type: 'string' },
                  companyName: { type: 'string' },
                  roleTitle: { type: 'string' },
                  fields: { type: 'array' },
                },
                required: ['domain', 'fields'],
              },
            },
            {
              name: 'learn_from_submission',
              description:
                'Commit submitted application form, learn new DOM selectors, vectorize human Q&A edits, and record immutable audit.',
              inputSchema: {
                type: 'object',
                properties: {
                  personaId: { type: 'string' },
                  companyName: { type: 'string' },
                  roleTitle: { type: 'string' },
                  domain: { type: 'string' },
                  fields: { type: 'array' },
                },
                required: ['personaId', 'companyName', 'roleTitle', 'domain', 'fields'],
              },
            },
            {
              name: 'diff_and_tailor_resume',
              description:
                'Diff job description keywords against persona skills and tailor resume bullets strictly adhering to locked facts.',
              inputSchema: {
                type: 'object',
                properties: {
                  jdRawText: { type: 'string' },
                  personaId: { type: 'string' },
                },
                required: ['jdRawText'],
              },
            },
          ],
        },
      });
    }

    // Handle tools/call
    if (method === 'tools/call') {
      const toolName = methodParams?.name || methodParams?.tool;
      const toolArgs = methodParams?.arguments || methodParams?.args || {};

      if (!toolName) {
        return Response.json(
          {
            jsonrpc: '2.0',
            id,
            error: { code: -32602, message: 'Missing tool name in tools/call parameters' },
          },
          { status: 400 }
        );
      }

      const result = await executeMcpToolCall(defaultMcpInstance, toolName, toolArgs);
      return Response.json({
        jsonrpc: '2.0',
        id,
        result,
      });
    }

    // Handle resources/list
    if (method === 'resources/list') {
      return Response.json({
        jsonrpc: '2.0',
        id,
        result: {
          resources: [
            {
              uri: 'visapilot://personas/active',
              name: 'Active Persona',
              mimeType: 'application/json',
            },
            {
              uri: 'visapilot://adapters/{domain}',
              name: 'Domain Selector Adapter',
              mimeType: 'application/json',
            },
          ],
        },
      });
    }

    // Handle resources/read
    if (method === 'resources/read') {
      const uri = methodParams?.uri;
      if (uri === 'visapilot://personas/active') {
        const persona = await defaultMcpInstance.store.getActivePersona();
        return Response.json({
          jsonrpc: '2.0',
          id,
          result: {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(persona || { error: 'No active persona found' }),
              },
            ],
          },
        });
      }

      if (uri?.startsWith('visapilot://adapters/')) {
        const domain = uri.replace('visapilot://adapters/', '');
        const sampleSignatures = [
          'input[data-automation-id="legalNameSection_firstName"]',
          'input[data-automation-id="email"]',
          'input[name="urls[LinkedIn]"]',
          'textarea[name="why_us"]',
        ];
        const found = [];
        for (const sig of sampleSignatures) {
          const sel = await defaultMcpInstance.store.findDomainSelector(domain, sig);
          if (sel) found.push(sel);
        }
        return Response.json({
          jsonrpc: '2.0',
          id,
          result: {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify({ domain, selectors: found }),
              },
            ],
          },
        });
      }
    }

    // Default fallback
    return Response.json({
      jsonrpc: '2.0',
      id,
      result: { ok: true, transport },
    });
  } catch (error: any) {
    return Response.json(
      {
        jsonrpc: '2.0',
        id: null,
        error: { code: -32603, message: error?.message || 'Internal MCP handler error' },
      },
      { status: 500 }
    );
  }
}
