import { ollamaClient } from '../ollama/client';
import type { IAgent, AgentOutput } from '@visapilot/shared';
import type { AgentContext } from '../types';
import { AgentType } from '@visapilot/shared';
import { ResumeImprovementSchema } from '../types';

export class ResumeImprovementAgent implements IAgent {
  readonly name = 'Resume Improvement Agent';
  readonly type = AgentType.RESUME_IMPROVEMENT;

  validate(input: Record<string, unknown>): boolean {
    return !!input.resumeContent;
  }

  async process(input: Record<string, unknown>): Promise<AgentOutput> {
    try {
      const context = input as unknown as AgentContext;
      const resumeContent = context.resumeContent || '';
      const jobDescription = context.jobDescription;

      // Step 1: Analyze current resume
      const analysis = await this.analyzeResume(resumeContent, jobDescription);

      // Step 2: Generate improved sections
      const improvements = await this.generateImprovements(
        resumeContent,
        jobDescription,
        analysis,
      );

      // Step 3: Apply improvements
      const improvedResume = await this.applyImprovements(
        resumeContent,
        improvements,
      );

      // Step 4: Calculate new ATS score estimate
      const improvedScore = await this.estimateScore(
        improvedResume,
        jobDescription,
      );

      const result = {
        originalScore: analysis.atsScore,
        improvedScore,
        changes: improvements,
        summary: analysis.summary,
      };

      // Validate
      ResumeImprovementSchema.parse(result);

      return {
        success: true,
        data: {
          ...result,
          originalResume: resumeContent,
          improvedResume,
          analysis,
          formattingTips: this.getFormattingTips(),
          atsKeywords: analysis.missingKeywords,
        },
        confidence: 0.75,
        metadata: {
          improvementsMade: improvements.length,
          originalLength: resumeContent.length,
          improvedLength: improvedResume.length,
          scoreImprovement: improvedScore - analysis.atsScore,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Resume improvement agent failed',
        confidence: 0,
      };
    }
  }

  private async analyzeResume(
    resumeContent: string,
    jobDescription?: string,
  ): Promise<{
    atsScore: number;
    strengths: string[];
    weaknesses: string[];
    missingKeywords: string[];
    summary: string;
  }> {
    const jobContext = jobDescription
      ? `\nTarget Job Description:\n${jobDescription.slice(0, 2000)}`
      : '';

    const prompt = `Analyze this resume and provide improvement recommendations.

Resume:
${resumeContent.slice(0, 3000)}${jobContext}

Return a JSON object with:
1. atsScore: estimated current ATS score (0-100)
2. strengths: array of what the resume does well
3. weaknesses: array of areas needing improvement
4. missingKeywords: array of important missing keywords
5. summary: brief analysis summary

Return ONLY valid JSON:`;

    try {
      const response = await ollamaClient.generateCompletion(prompt, {
        temperature: 0.2,
        maxTokens: 800,
      });
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          atsScore: Math.min(100, Math.max(0, Number(parsed.atsScore) || 50)),
          strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
          weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
          missingKeywords: Array.isArray(parsed.missingKeywords) ? parsed.missingKeywords : [],
          summary: String(parsed.summary || ''),
        };
      }
    } catch {
      // fall through
    }

    return {
      atsScore: 50,
      strengths: [],
      weaknesses: ['Unable to analyze resume'],
      missingKeywords: [],
      summary: 'AI analysis unavailable',
    };
  }

  private async generateImprovements(
    resumeContent: string,
    jobDescription?: string,
    analysis?: Record<string, unknown>,
  ): Promise<Array<{ section: string; original: string; improved: string; reason: string }>> {
    const jobContext = jobDescription
      ? `\nTarget Job: ${jobDescription.slice(0, 1500)}`
      : '';

    const prompt = `Improve this resume section by section. For each section, provide the original text and the improved version with a reason for the change.

Resume:
${resumeContent.slice(0, 3000)}${jobContext}

Return a JSON array of improvements, each with:
- section: the section name being improved
- original: the original text
- improved: the improved text
- reason: why the change improves ATS match

Focus on:
1. Adding relevant keywords
2. Quantifying achievements
3. Improving action verbs
4. Better formatting for ATS parsing
5. Tailoring to job requirements

Return ONLY valid JSON array:`;

    try {
      const response = await ollamaClient.generateCompletion(prompt, {
        temperature: 0.3,
        maxTokens: 2000,
      });
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as Array<{
          section: string;
          original: string;
          improved: string;
          reason: string;
        }>;
      }
    } catch {
      // fall through
    }

    return [
      {
        section: 'summary',
        original: 'Professional with experience',
        improved: 'Results-driven professional with proven track record in...',
        reason: 'Adding specificity and quantifying achievements improves ATS score',
      },
    ];
  }

  private async applyImprovements(
    resumeContent: string,
    improvements: Array<{ section: string; original: string; improved: string; reason: string }>,
  ): Promise<string> {
    let improved = resumeContent;

    for (const imp of improvements) {
      if (imp.original && improved.includes(imp.original)) {
        improved = improved.replace(imp.original, imp.improved);
      }
    }

    return improved;
  }

  private async estimateScore(
    resumeContent: string,
    jobDescription?: string,
  ): Promise<number> {
    if (!jobDescription) {
      return 70; // Base improvement without target
    }

    const prompt = `Estimate the ATS score (0-100) for this improved version of a resume targeting this job.

Improved Resume:
${resumeContent.slice(0, 2000)}

Job Description:
${jobDescription.slice(0, 2000)}

Return ONLY a number between 0 and 100:`;

    try {
      const response = await ollamaClient.generateCompletion(prompt, {
        temperature: 0.1,
        maxTokens: 10,
      });
      const score = parseInt(response.trim(), 10);
      return Math.min(100, Math.max(0, isNaN(score) ? 60 : score));
    } catch {
      return 60;
    }
  }

  private getFormattingTips(): string[] {
    return [
      'Use standard section headings (Experience, Education, Skills) for better ATS parsing',
      'Avoid tables, columns, and graphics that confuse ATS systems',
      'Save as PDF or DOCX format for maximum compatibility',
      'Include a professional summary at the top with target keywords',
      'Use bullet points with quantified achievements',
      'List skills in a dedicated section using comma-separated format',
      'Match keywords exactly as they appear in the job description',
      'Use standard date formats (MM/YYYY - MM/YYYY)',
      'Include relevant certifications and licenses',
      'Optimize file name: FirstName_LastName_Resume_Company.pdf',
    ];
  }
}

export const resumeImprovementAgent = new ResumeImprovementAgent();

