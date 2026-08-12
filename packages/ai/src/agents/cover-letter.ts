import { ollamaClient } from '../ollama/client';
import type { IAgent, AgentOutput } from '@visapilot/shared';
import type { AgentContext } from '../types';
import { AgentType } from '@visapilot/shared';
import { CoverLetterSchema } from '../types';

export class CoverLetterAgent implements IAgent {
  readonly name = 'Cover Letter Agent';
  readonly type = AgentType.COVER_LETTER;

  validate(input: Record<string, unknown>): boolean {
    return !!(input.coverLetterParams || (input.jobDescription && input.userSkills));
  }

  async process(input: Record<string, unknown>): Promise<AgentOutput> {
    try {
      const context = input as unknown as AgentContext;
      const params = context.coverLetterParams || {
        userName: (context as any).userName || 'Candidate',
        userSkills: context.userSkills || [],
        jobTitle: (context as any).jobTitle || '',
        companyName: context.companyName || '',
        jobDescription: context.jobDescription || '',
        tone: (context as any).tone || 'professional',
      };

      // Step 1: Analyze job description
      const jobAnalysis = await this.analyzeJobDescription(params.jobDescription);

      // Step 2: Identify matching points
      const matchingPoints = this.identifyMatchingPoints(
        params.userSkills,
        jobAnalysis.requiredSkills,
      );

      // Step 3: Generate cover letter
      const coverLetter = await this.generateCoverLetter({
        userName: params.userName,
        userSkills: params.userSkills,
        jobTitle: params.jobTitle,
        companyName: params.companyName,
        jobDescription: params.jobDescription,
        tone: params.tone || 'professional',
        jobAnalysis,
        matchingPoints,
      });

      // Step 4: Extract key points
      const keyPoints = this.extractKeyPoints(coverLetter);

      const result = {
        content: coverLetter,
        tone: params.tone || 'professional',
        keyPoints,
        wordCount: coverLetter.split(/\s+/).length,
      };

      // Validate
      CoverLetterSchema.parse(result);

      // Step 5: Generate variations if requested
      const variations = await this.generateVariations(
        params,
        coverLetter,
      );

      return {
        success: true,
        data: {
          ...result,
          jobAnalysis,
          matchingPoints,
          variations,
          usage: {
            purpose: `Application for ${params.jobTitle} at ${params.companyName}`,
            targetAudience: 'Hiring Manager / Recruiter',
            suggestedSubject: `Application for ${params.jobTitle} - ${params.userName}`,
          },
        },
        confidence: 0.85,
        metadata: {
          wordCount: result.wordCount,
          keyPointsCount: keyPoints.length,
          matchingSkillsCount: matchingPoints.length,
          variationsGenerated: variations.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Cover letter agent failed',
        confidence: 0,
      };
    }
  }

  private async analyzeJobDescription(
    jobDescription: string,
  ): Promise<{
    requiredSkills: string[];
    keyResponsibilities: string[];
    companyValues: string[];
    tone: string;
  }> {
    const prompt = `Analyze this job description and extract key information.

Job Description:
${jobDescription.slice(0, 3000)}

Return a JSON object with:
1. requiredSkills: array of key skills required
2. keyResponsibilities: array of main responsibilities
3. companyValues: array of company values/mission statements mentioned
4. tone: the tone of the job description (formal, casual, technical, etc.)

Return ONLY valid JSON:`;

    try {
      const response = await ollamaClient.generateCompletion(prompt, {
        temperature: 0.1,
        maxTokens: 800,
      });
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          requiredSkills: Array.isArray(parsed.requiredSkills) ? parsed.requiredSkills : [],
          keyResponsibilities: Array.isArray(parsed.keyResponsibilities) ? parsed.keyResponsibilities : [],
          companyValues: Array.isArray(parsed.companyValues) ? parsed.companyValues : [],
          tone: String(parsed.tone || 'professional'),
        };
      }
    } catch {
      // fall through
    }

    return { requiredSkills: [], keyResponsibilities: [], companyValues: [], tone: 'professional' };
  }

  private identifyMatchingPoints(
    userSkills: string[],
    requiredSkills: string[],
  ): Array<{ skill: string; matchType: 'exact' | 'related' | 'transferable' }> {
    const userLower = userSkills.map((s) => s.toLowerCase());
    const requiredLower = requiredSkills.map((s) => s.toLowerCase());

    return requiredLower
      .filter((skill) =>
        userLower.some(
          (user) =>
            user.includes(skill) ||
            skill.includes(user) ||
            this.areSkillsRelated(user, skill),
        ),
      )
      .map((skill) => ({
        skill,
        matchType: userLower.includes(skill) ? 'exact' : 'related' as 'exact' | 'related' | 'transferable',
      }));
  }

  private areSkillsRelated(skill1: string, skill2: string): boolean {
    const skillRelations: Record<string, string[]> = {
      javascript: ['typescript', 'react', 'node', 'frontend', 'web'],
      typescript: ['javascript', 'react', 'angular', 'node'],
      python: ['django', 'flask', 'fastapi', 'data', 'ml'],
      react: ['javascript', 'typescript', 'frontend', 'ui'],
      aws: ['cloud', 'devops', 'azure', 'gcp'],
      docker: ['kubernetes', 'container', 'devops'],
      sql: ['postgresql', 'mysql', 'database', 'nosql'],
      management: ['leadership', 'team lead', 'manager'],
    };

    for (const [base, related] of Object.entries(skillRelations)) {
      if ((skill1.includes(base) || skill2.includes(base)) &&
          related.some((r) => skill1.includes(r) || skill2.includes(r))) {
        return true;
      }
    }

    return false;
  }

  private async generateCoverLetter(params: {
    userName: string;
    userSkills: string[];
    jobTitle: string;
    companyName: string;
    jobDescription: string;
    tone: string;
    jobAnalysis: Record<string, unknown>;
    matchingPoints: Array<{ skill: string; matchType: string }>;
  }): Promise<string> {
    const prompt = `Write a compelling cover letter for a job application.

Candidate Name: ${params.userName}
Job Title: ${params.jobTitle}
Company: ${params.companyName}
Tone: ${params.tone}
Skills: ${params.userSkills.slice(0, 10).join(', ')}
Matching Skills: ${params.matchingPoints.map((m) => m.skill).join(', ')}

Job Description Context:
${params.jobDescription.slice(0, 2000)}

Write a professional cover letter that:
1. Opens with a strong hook mentioning the specific role and company
2. Highlights 2-3 key achievements or experiences relevant to the role
3. Demonstrates knowledge of the company/industry
4. Shows enthusiasm for the role and company
5. Includes a clear call to action
6. Uses a ${params.tone} tone throughout
7. Is between 250-400 words
8. Does NOT include placeholder text like [Your Name]

Return ONLY the cover letter content, no additional text:`;

    try {
      const response = await ollamaClient.generateCompletion(prompt, {
        temperature: 0.7,
        maxTokens: 1000,
      });

      return response.trim();
    } catch {
      return `Dear Hiring Manager,\n\nI am writing to express my strong interest in the ${params.jobTitle} position at ${params.companyName}. With my background in ${params.userSkills.slice(0, 3).join(', ')}, I am confident that I would be a valuable addition to your team.\n\n[Please regenerate - AI generation failed]\n\nSincerely,\n${params.userName}`;
    }
  }

  private extractKeyPoints(content: string): string[] {
    const sentences = content.split(/[.!?]+/).filter(Boolean);
    return sentences
      .filter((s) => s.length > 30 && s.length < 200)
      .slice(0, 5)
      .map((s) => s.trim());
  }

  private async generateVariations(
    params: Record<string, unknown>,
    original: string,
  ): Promise<string[]> {
    const tones = ['professional', 'enthusiastic', 'concise'];
    const variations: string[] = [];

    for (const tone of tones.slice(0, 2)) {
      const prompt = `Rewrite this cover letter in a ${tone} tone. Keep the key points but adjust the language.

Original:
${original.slice(0, 1500)}

Return ONLY the rewritten cover letter:`;

      try {
        const response = await ollamaClient.generateCompletion(prompt, {
          temperature: 0.6,
          maxTokens: 800,
        });
        variations.push(response.trim());
      } catch {
        // Skip failed variations
      }
    }

    return variations;
  }
}

export const coverLetterAgent = new CoverLetterAgent();

