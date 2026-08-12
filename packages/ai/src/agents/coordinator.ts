import { ollamaClient } from '../ollama/client';
import { ragService } from '../rag/service';
import type { IAgent, AgentOutput } from '@visapilot/shared';
import type { AgentContext, AgentState } from '../types';
import { AgentType } from '@visapilot/shared';

export class CoordinatorAgent implements IAgent {
  readonly name = 'Coordinator Agent';
  readonly type = AgentType.COORDINATOR;

  validate(input: Record<string, unknown>): boolean {
    return true;
  }

  async process(input: Record<string, unknown>): Promise<AgentOutput> {
    try {
      const context = input as unknown as AgentContext;
      const state = this.buildInitialState(context);

      // Step 1: Analyze incoming request
      const analysis = await this.analyzeRequest(state);

      // Step 2: Determine which agents to invoke
      const routing = await this.routeToAgents(analysis);

      // Step 3: Prepare context for each agent
      const agentContexts = await this.prepareAgentContexts(routing, state);

      // Step 4: Generate coordination plan
      const plan = await this.generateCoordinationPlan(analysis, routing);

      return {
        success: true,
        data: {
          analysis,
          routing,
          agentContexts,
          plan,
          state,
        },
        confidence: 0.95,
        metadata: {
          agentsRequired: routing.agents,
          workflow: routing.workflow,
          estimatedComplexity: analysis.complexity,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Coordinator agent failed',
        confidence: 0,
      };
    }
  }

  private buildInitialState(context: AgentContext): AgentState {
    return {
      context,
      messages: [
        {
          role: 'system',
          content: 'You are the Coordinator Agent for VisaPilot AI, responsible for routing requests to specialized AI agents.',
        },
      ],
      findings: {},
      confidence: 1,
      completed: false,
    };
  }

  private async analyzeRequest(state: AgentState): Promise<Record<string, unknown>> {
    const prompt = `Analyze this user request and extract:
1. primary_intent: The main goal (job_search, resume_optimization, cover_letter, interview_prep, visa_check, application_tracking)
2. complexity: simple | moderate | complex
3. requires_rag: whether knowledge base search is needed
4. urgency: low | medium | high
5. required_agents: list of agent types needed
6. entities: key entities mentioned

Context: ${JSON.stringify(state.context, null, 2)}

Return ONLY valid JSON:`;

    const response = await ollamaClient.generateCompletion(prompt, {
      temperature: 0.1,
      maxTokens: 500,
    });

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : { primary_intent: 'unknown', complexity: 'moderate' };
    } catch {
      return { primary_intent: 'unknown', complexity: 'moderate' };
    }
  }

  private async routeToAgents(
    analysis: Record<string, unknown>,
  ): Promise<{ agents: string[]; workflow: string; priority: string[] }> {
    const intent = (analysis.primary_intent as string) || 'unknown';

    const agentMap: Record<string, string[]> = {
      job_search: ['SEARCH', 'VISA_DETECTION'],
      resume_optimization: ['RESUME_IMPROVEMENT', 'RESUME_MATCH'],
      cover_letter: ['COVER_LETTER'],
      interview_prep: ['INTERVIEW', 'LEARNING'],
      visa_check: ['VISA_DETECTION'],
      application_tracking: ['RESUME_MATCH'],
    };

    const agents = agentMap[intent] || ['SEARCH'];
    const complexity = (analysis.complexity as string) || 'moderate';

    return {
      agents,
      workflow: complexity === 'complex' ? 'sequential' : 'parallel',
      priority: agents,
    };
  }

  private async prepareAgentContexts(
    routing: { agents: string[]; workflow: string },
    state: AgentState,
  ): Promise<Record<string, AgentContext>> {
    const contexts: Record<string, AgentContext> = {};

    for (const agentName of routing.agents) {
      const agentContext: AgentContext = {
        ...state.context,
        metadata: {
          workflow: routing.workflow,
          parentAgent: 'coordinator',
        },
      };

      // Augment with RAG if applicable
      if (state.context.jobDescription) {
        const context = await ragService.augmentPrompt(
          state.context.jobDescription,
          state.context,
          3,
        );
        if (context) {
          agentContext.metadata = {
            ...agentContext.metadata,
            ragContext: context,
          };
        }
      }

      contexts[agentName] = agentContext;
    }

    return contexts;
  }

  private async generateCoordinationPlan(
    analysis: Record<string, unknown>,
    routing: { agents: string[]; workflow: string },
  ): Promise<Record<string, unknown>> {
    return {
      intent: analysis.primary_intent,
      workflow: routing.workflow,
      agents: routing.agents,
      estimatedDuration: routing.agents.length * (routing.workflow === 'parallel' ? 1 : 2),
      checkpoints: routing.agents.map((agent, i) => ({
        step: i + 1,
        agent,
        description: `Processing with ${agent} agent`,
        required: true,
      })),
    };
  }
}

export const coordinatorAgent = new CoordinatorAgent();

