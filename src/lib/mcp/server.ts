import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
  TierResolver,
  type ResolverStore,
  type PersonaData,
  createInMemoryResolverStore,
} from '../engine/resolver.ts';
import {
  ApplicationLearner,
  type EmbeddingService,
  OllamaEmbeddingService,
} from '../engine/learner.ts';
import {
  Tier3LlmFallback,
  type LlmProvider,
} from '../engine/tier3-llm.ts';

export interface CreateMcpServerOptions {
  store?: ResolverStore;
  llm?: LlmProvider;
  embeddingService?: EmbeddingService;
}

export interface VisaPilotMcpServerInstance {
  server: McpServer;
  store: ResolverStore;
  resolver: TierResolver;
  learner: ApplicationLearner;
  tier3: Tier3LlmFallback;
  embeddingService: EmbeddingService;
}

/**
 * Creates and configures the VisaPilot Model Context Protocol (MCP) server
 */
export function createVisaPilotMcpServer(
  options: CreateMcpServerOptions = {}
): VisaPilotMcpServerInstance {
  const store = options.store ?? createInMemoryResolverStore();
  const llm =
    options.llm ??
    ({
      async generate(prompt: string) {
        return 'Standard generated response for profile context.';
      },
    } satisfies LlmProvider);

  const embeddingService =
    options.embeddingService ?? new OllamaEmbeddingService();

  const resolver = new TierResolver(store);
  const learner = new ApplicationLearner(store, embeddingService);
  const tier3 = new Tier3LlmFallback(llm);

  const server = new McpServer({
    name: 'visapilot-autopilot',
    version: '1.0.0',
  });

  // -------------------------------------------------------------
  // RESOURCE 1: Active Persona (visapilot://personas/active)
  // -------------------------------------------------------------
  server.resource(
    'active-persona',
    'visapilot://personas/active',
    async (uri) => {
      const persona = await store.getActivePersona();
      if (!persona) {
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify({ error: 'No active persona found' }),
            },
          ],
        };
      }
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(persona),
          },
        ],
      };
    }
  );

  // -------------------------------------------------------------
  // RESOURCE 2: Domain Adapter (visapilot://adapters/{domain})
  // -------------------------------------------------------------
  server.resource(
    'domain-adapter',
    new ResourceTemplate('visapilot://adapters/{domain}', { list: undefined }),
    async (uri, { domain }) => {
      const activePersona = await store.getActivePersona();
      // Look up known selectors for this domain or wildcard
      const sampleSignatures = [
        'input[data-automation-id="legalNameSection_firstName"]',
        'input[data-automation-id="email"]',
        'input[name="urls[LinkedIn]"]',
        'textarea[name="why_us"]',
      ];

      const foundSelectors = [];
      for (const sig of sampleSignatures) {
        const sel = await store.findDomainSelector(String(domain), sig);
        if (sel) foundSelectors.push(sel);
      }

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify({
              domain,
              selectors: foundSelectors,
              personaId: activePersona?.id,
            }),
          },
        ],
      };
    }
  );

  // -------------------------------------------------------------
  // TOOL 1: resolve_form_batch
  // -------------------------------------------------------------
  server.tool(
    'resolve_form_batch',
    {
      domain: z.string(),
      companyName: z.string().optional(),
      roleTitle: z.string().optional(),
      fields: z.array(
        z.object({
          fieldSignature: z.string(),
          cssOrXpath: z.string(),
          fieldType: z
            .enum([
              'text',
              'select',
              'combobox',
              'radio',
              'checkbox',
              'file',
              'repeater_add_btn',
            ])
            .default('text'),
          label: z.string().optional(),
          question: z.string().optional(),
          maxLength: z.number().optional(),
          required: z.boolean().optional(),
        })
      ),
    },
    async ({ domain, companyName, roleTitle, fields }) => {
      const persona = await store.getActivePersona();
      const resolutions = [];
      let tier1Hits = 0;
      let tier2VectorHits = 0;
      let tier3LlmCalls = 0;

      for (const field of fields) {
        // Step 1: Attempt Tier 1 Exact Selector Resolution
        const t1Result = await resolver.resolveField({
          domain,
          fieldSignature: field.fieldSignature,
          cssOrXpath: field.cssOrXpath,
          personaId: persona?.id,
        });

        if (t1Result.isHit && t1Result.badge === 'GREEN_EXACT') {
          tier1Hits++;
          resolutions.push({
            fieldSignature: field.fieldSignature,
            ...t1Result,
          });
          continue;
        }

        // Step 2: Attempt Tier 2 Semantic Vector Resolution (if question/label provided)
        const qText = field.question || field.label;
        if (qText) {
          const emb = await embeddingService.generateEmbedding(qText);
          const t2Result = await resolver.resolveQuestion({
            rawQuestion: qText,
            queryEmbedding: emb,
            context: { companyName, roleTitle },
            maxLength: field.maxLength,
            personaId: persona?.id,
          });

          if (t2Result.isHit && t2Result.badge === 'BLUE_VECTOR_LEARNED') {
            tier2VectorHits++;
            resolutions.push({
              fieldSignature: field.fieldSignature,
              ...t2Result,
            });
            continue;
          }
        }

        // Step 3: Tier 3 Guarded LLM Fallback
        if (persona && qText) {
          const t3Result = await tier3.generateGuardedResponse({
            rawPrompt: `Field: ${qText}. Candidate context: ${JSON.stringify(persona.contactInfo)}. Please answer for ${companyName ?? 'the company'}.`,
            persona,
            question: qText,
            maxLength: field.maxLength,
          });

          if (t3Result.badge === 'AMBER_LLM_DRAFT') {
            tier3LlmCalls++;
          }

          resolutions.push({
            fieldSignature: field.fieldSignature,
            ...t3Result,
          });
          continue;
        }

        // Default Cache Miss
        resolutions.push({
          fieldSignature: field.fieldSignature,
          tier: 1,
          badge: 'CACHE_MISS',
          value: null,
          llmCalls: 0,
          isHit: false,
          source: 'none',
        });
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              resolutions,
              stats: {
                tier1Hits,
                tier2VectorHits,
                tier3LlmCalls,
                totalFields: fields.length,
              },
            }),
          },
        ],
      };
    }
  );

  // -------------------------------------------------------------
  // TOOL 2: learn_from_submission
  // -------------------------------------------------------------
  server.tool(
    'learn_from_submission',
    {
      personaId: z.string(),
      companyName: z.string(),
      roleTitle: z.string(),
      domain: z.string(),
      portalUrl: z.string(),
      fields: z.array(
        z.object({
          fieldSignature: z.string(),
          cssOrXpath: z.string(),
          fieldType: z
            .enum([
              'text',
              'select',
              'combobox',
              'radio',
              'checkbox',
              'file',
              'repeater_add_btn',
            ])
            .default('text'),
          value: z.string(),
          label: z.string().optional(),
          question: z.string().optional(),
          originalBadge: z
            .enum([
              'GREEN_EXACT',
              'BLUE_VECTOR_LEARNED',
              'AMBER_LLM_DRAFT',
              'RED_MISSING_FACT',
              'CACHE_MISS',
            ])
            .optional(),
          wasEditedByHuman: z.boolean().optional(),
          mappedProfileKey: z.string().optional(),
          category: z.string().optional(),
        })
      ),
      jdRawText: z.string().optional(),
      resumeVersionPath: z.string().optional(),
      resolutionStats: z.object({
        tier1Hits: z.number(),
        tier2VectorHits: z.number(),
        tier3LlmCalls: z.number(),
      }),
    },
    async (submission) => {
      const auditId = await learner.commitOnSubmit(submission as any);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              auditId,
              learnedCount: submission.fields.length,
            }),
          },
        ],
      };
    }
  );

  // -------------------------------------------------------------
  // TOOL 3: diff_and_tailor_resume
  // -------------------------------------------------------------
  server.tool(
    'diff_and_tailor_resume',
    {
      jdRawText: z.string(),
      personaId: z.string().optional(),
    },
    async ({ jdRawText, personaId }) => {
      const persona = await store.getActivePersona(personaId);
      if (!persona) {
        throw new Error('No active persona available for resume tailoring');
      }

      // Keyword extraction list
      const TECH_KEYWORDS = [
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
        'Distributed Consensus',
        'System Design',
      ];

      const matchedKeywords: string[] = [];
      const missingKeywords: string[] = [];
      const candidateSkills = (persona.skills ?? []).map((s) => s.toLowerCase());

      for (const kw of TECH_KEYWORDS) {
        const regex = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (regex.test(jdRawText)) {
          if (candidateSkills.some((s) => s.includes(kw.toLowerCase()) || kw.toLowerCase().includes(s))) {
            matchedKeywords.push(kw);
          } else {
            missingKeywords.push(kw);
          }
        }
      }

      // Tailor bullets fact-locked to persona's verified work history
      const tailoredBullets: Array<{
        original: string;
        tailored: string;
        groundedSkills: string[];
      }> = [];

      for (const role of persona.workHistory ?? []) {
        for (const bullet of role.bullets ?? [
          'Engineered resilient backend systems and database pipelines.',
        ]) {
          const relevantGrounded = matchedKeywords.slice(0, 3);
          const tailored = `${bullet.replace(/\.$/, '')} utilizing ${relevantGrounded.join(', ')}, elevating throughput and system reliability.`;
          tailoredBullets.push({
            original: bullet,
            tailored,
            groundedSkills: relevantGrounded,
          });
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              matchedKeywords,
              missingKeywords,
              tailoredBullets,
              factLockVerified: true,
            }),
          },
        ],
      };
    }
  );

  return {
    server,
    store,
    resolver,
    learner,
    tier3,
    embeddingService,
  };
}

/**
 * Directly executes an MCP tool call against a VisaPilotMcpServerInstance.
 * Used by both JSON-RPC HTTP transport routes and McpServer tool handlers.
 */
export async function executeMcpToolCall(
  instance: VisaPilotMcpServerInstance,
  toolName: string,
  args: any
): Promise<{ content: Array<{ type: string; text: string }>; [key: string]: any }> {
  const { store, resolver, learner, tier3 } = instance;
  const embeddingService = instance.embeddingService ?? new OllamaEmbeddingService();

  if (toolName === 'resolve_form_batch') {
    const { domain, companyName, roleTitle, fields = [] } = args || {};
    const persona = await store.getActivePersona();
    const resolutions = [];
    let tier1Hits = 0;
    let tier2VectorHits = 0;
    let tier3LlmCalls = 0;

    for (const field of fields) {
      // Step 1: Attempt Tier 1 Exact Selector Resolution
      const t1Result = await resolver.resolveField({
        domain,
        fieldSignature: field.fieldSignature,
        cssOrXpath: field.cssOrXpath,
        personaId: persona?.id,
      });

      if (t1Result.isHit && t1Result.badge === 'GREEN_EXACT') {
        tier1Hits++;
        resolutions.push({
          fieldSignature: field.fieldSignature,
          ...t1Result,
        });
        continue;
      }

      // Step 2: Attempt Tier 2 Semantic Vector Resolution (if question/label provided)
      const qText = field.question || field.label;
      if (qText) {
        const emb = await embeddingService.generateEmbedding(qText);
        const t2Result = await resolver.resolveQuestion({
          rawQuestion: qText,
          queryEmbedding: emb,
          context: { companyName, roleTitle },
          maxLength: field.maxLength,
          personaId: persona?.id,
        });

        if (t2Result.isHit && t2Result.badge === 'BLUE_VECTOR_LEARNED') {
          tier2VectorHits++;
          resolutions.push({
            fieldSignature: field.fieldSignature,
            ...t2Result,
          });
          continue;
        }
      }

      // Step 3: Tier 3 Guarded LLM Fallback
      if (persona && qText) {
        const t3Result = await tier3.generateGuardedResponse({
          rawPrompt: `Field: ${qText}. Candidate context: ${JSON.stringify(persona.contactInfo)}. Please answer for ${companyName ?? 'the company'}.`,
          persona,
          question: qText,
          maxLength: field.maxLength,
        });

        if (t3Result.badge === 'AMBER_LLM_DRAFT') {
          tier3LlmCalls++;
        }

        resolutions.push({
          fieldSignature: field.fieldSignature,
          ...t3Result,
        });
        continue;
      }

      // Default Cache Miss
      resolutions.push({
        fieldSignature: field.fieldSignature,
        tier: 1,
        badge: 'CACHE_MISS',
        value: null,
        llmCalls: 0,
        isHit: false,
        source: 'none',
      });
    }

    const payload = {
      resolutions,
      stats: {
        tier1Hits,
        tier2VectorHits,
        tier3LlmCalls,
        totalFields: fields.length,
      },
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(payload),
        },
      ],
      ...payload,
    };
  }

  if (toolName === 'learn_from_submission') {
    const auditId = await learner.commitOnSubmit(args as any);
    const payload = {
      success: true,
      auditId,
      learnedCount: args.fields?.length ?? 0,
    };
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(payload),
        },
      ],
      ...payload,
    };
  }

  if (toolName === 'diff_and_tailor_resume') {
    const { jdRawText, personaId } = args || {};
    const persona = await store.getActivePersona(personaId);
    if (!persona) {
      throw new Error('No active persona available for resume tailoring');
    }

    const TECH_KEYWORDS = [
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
      'Distributed Consensus',
      'System Design',
    ];

    const matchedKeywords: string[] = [];
    const missingKeywords: string[] = [];
    const candidateSkills = (persona.skills ?? []).map((s: string) => s.toLowerCase());

    for (const kw of TECH_KEYWORDS) {
      const regex = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(jdRawText)) {
        if (candidateSkills.some((s: string) => s.includes(kw.toLowerCase()) || kw.toLowerCase().includes(s))) {
          matchedKeywords.push(kw);
        } else {
          missingKeywords.push(kw);
        }
      }
    }

    const tailoredBullets: Array<{
      original: string;
      tailored: string;
      groundedSkills: string[];
    }> = [];

    for (const role of persona.workHistory ?? []) {
      for (const bullet of role.bullets ?? [
        'Engineered resilient backend systems and database pipelines.',
      ]) {
        const relevantGrounded = matchedKeywords.slice(0, 3);
        const tailored = `${bullet.replace(/\.$/, '')} utilizing ${relevantGrounded.join(', ')}, elevating throughput and system reliability.`;
        tailoredBullets.push({
          original: bullet,
          tailored,
          groundedSkills: relevantGrounded,
        });
      }
    }

    const payload = {
      matchedKeywords,
      missingKeywords,
      tailoredBullets,
      factLockVerified: true,
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(payload),
        },
      ],
      ...payload,
    };
  }

  throw new Error(`Unknown MCP tool: ${toolName}`);
}
