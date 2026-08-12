import { ollamaClient } from '../ollama/client';
import type { IAgent, AgentOutput } from '@visapilot/shared';
import type { AgentContext } from '../types';
import { AgentType } from '@visapilot/shared';

export class LearningAgent implements IAgent {
  readonly name = 'Learning Agent';
  readonly type = AgentType.LEARNING;

  validate(input: Record<string, unknown>): boolean {
    return true;
  }

  async process(input: Record<string, unknown>): Promise<AgentOutput> {
    try {
      const context = input as unknown as AgentContext;

      // Analyze patterns and generate insights
      const insights = await this.generateInsights(context);

      // Generate skill recommendations
      const skillRecommendations = await this.generateSkillRecommendations(context);

      // Generate learning path
      const learningPath = await this.generateLearningPath(context, skillRecommendations);

      // Generate market trends
      const marketTrends = await this.analyzeMarketTrends(context);

      return {
        success: true,
        data: {
          insights,
          skillRecommendations,
          learningPath,
          marketTrends,
          summary: this.generateSummary(insights, skillRecommendations, marketTrends),
        },
        confidence: 0.7,
        metadata: {
          insightsGenerated: insights.length,
          skillsRecommended: skillRecommendations.length,
          learningSteps: learningPath.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Learning agent failed',
        confidence: 0,
      };
    }
  }

  private async generateInsights(
    context: AgentContext,
  ): Promise<Array<{ area: string; insight: string; impact: string; action: string }>> {
    const userContext = this.buildUserContext(context);

    const prompt = `Analyze this job seeker's profile and generate actionable insights.

${userContext}

Generate 3-5 insights. For each insight provide:
1. area: the area of focus (Skills, Experience, Market Position, etc.)
2. insight: the specific insight
3. impact: the potential impact on job search
4. action: a specific action to take

Return as JSON array:`;

    try {
      const response = await ollamaClient.generateCompletion(prompt, {
        temperature: 0.5,
        maxTokens: 1000,
      });
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as Array<{
          area: string;
          insight: string;
          impact: string;
          action: string;
        }>;
      }
    } catch {
      // fall through
    }

    return [
      {
        area: 'Skills',
        insight: 'Consider identifying and addressing skill gaps',
        impact: 'Improves competitiveness in job market',
        action: 'Review job descriptions in target roles for required skills',
      },
    ];
  }

  private async generateSkillRecommendations(
    context: AgentContext,
  ): Promise<Array<{
    skill: string;
    relevance: string;
    priority: 'high' | 'medium' | 'low';
    resources: string[];
  }>> {
    const userSkills = context.userSkills || [];
    const currentSkills = userSkills.length > 0
      ? userSkills.join(', ')
      : 'Not specified';

    const prompt = `Based on current market trends and the user's existing skills, recommend skills to learn.

Current skills: ${currentSkills}
Job search context: ${context.searchQuery || 'General job search'}

For each recommended skill, provide:
1. skill: the skill name
2. relevance: why this skill is relevant
3. priority: high | medium | low
4. resources: array of 2-3 learning resources (courses, books, websites)

Return as JSON array:`;

    try {
      const response = await ollamaClient.generateCompletion(prompt, {
        temperature: 0.4,
        maxTokens: 1000,
      });
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as Array<{
          skill: string;
          relevance: string;
          priority: 'high' | 'medium' | 'low';
          resources: string[];
        }>;
      }
    } catch {
      // fall through
    }

    return [
      {
        skill: 'System Design',
        relevance: 'Critical for senior-level technical interviews',
        priority: 'high',
        resources: ['System Design Interview by Ashish', 'Grokking the System Design Interview'],
      },
    ];
  }

  private async generateLearningPath(
    context: AgentContext,
    recommendations: Array<{ skill: string; priority: string }>,
  ): Promise<Array<{
    step: number;
    skill: string;
    duration: string;
    milestones: string[];
  }>> {
    if (recommendations.length === 0) {
      return [];
    }

    const prompt = `Create a structured learning path based on these recommended skills.

Skills to learn: ${recommendations.slice(0, 3).map((r) => r.skill).join(', ')}

For each skill, provide:
1. step: the order number
2. skill: the skill name
3. duration: estimated time to learn (e.g., "2 weeks", "1 month")
4. milestones: array of 2-3 learning milestones

Return as JSON array:`;

    try {
      const response = await ollamaClient.generateCompletion(prompt, {
        temperature: 0.3,
        maxTokens: 800,
      });
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as Array<{
          step: number;
          skill: string;
          duration: string;
          milestones: string[];
        }>;
      }
    } catch {
      // fall through
    }

    return recommendations.slice(0, 3).map((r, i) => ({
      step: i + 1,
      skill: r.skill,
      duration: '4 weeks',
      milestones: [`Complete beginner course`, `Build a small project`, `Practice with real-world scenarios`],
    }));
  }

  private async analyzeMarketTrends(
    context: AgentContext,
  ): Promise<Array<{
    trend: string;
    impact: string;
    opportunity: string;
  }>> {
    const userSkills = context.userSkills || [];
    const prompt = `Analyze current job market trends relevant to this profile.

User skills: ${userSkills.length > 0 ? userSkills.join(', ') : 'General professional'}
Search context: ${context.searchQuery || 'General'}

Return 3 market trends as JSON array with:
1. trend: the market trend
2. impact: how it affects the job search
3. opportunity: how to leverage this trend

Return ONLY valid JSON:`;

    try {
      const response = await ollamaClient.generateCompletion(prompt, {
        temperature: 0.5,
        maxTokens: 600,
      });
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as Array<{
          trend: string;
          impact: string;
          opportunity: string;
        }>;
      }
    } catch {
      // fall through
    }

    return [
      {
        trend: 'Remote Work Continuation',
        impact: 'More international opportunities available',
        opportunity: 'Expand job search to include remote-friendly companies worldwide',
      },
    ];
  }

  private buildUserContext(context: AgentContext): string {
    const parts: string[] = [];

    if (context.userSkills && context.userSkills.length > 0) {
      parts.push(`Skills: ${context.userSkills.join(', ')}`);
    }
    if (context.userExperience) {
      parts.push(`Experience: ${context.userExperience}`);
    }
    if (context.searchQuery) {
      parts.push(`Target role: ${context.searchQuery}`);
    }
    if (context.jobDescription) {
      parts.push(`Target job: ${context.jobDescription.slice(0, 500)}`);
    }

    return parts.length > 0 ? parts.join('\n') : 'General job seeker profile';
  }

  private generateSummary(
    insights: Array<Record<string, unknown>>,
    recommendations: Array<Record<string, unknown>>,
    trends: Array<Record<string, unknown>>,
  ): string {
    return `Analysis complete: ${insights.length} insights generated, ${recommendations.length} skills recommended, ${trends.length} market trends identified. Focus on high-priority skill development to improve job search competitiveness.`;
  }
}

export const learningAgent = new LearningAgent();

