import { ollamaClient } from '../ollama/client';
import type { IAgent, AgentOutput } from '@visapilot/shared';
import type { AgentContext } from '../types';
import { AgentType } from '@visapilot/shared';
import { ATSScoreSchema } from '../types';

export class ResumeMatchAgent implements IAgent {
  readonly name = 'Resume Match Agent';
  readonly type = AgentType.RESUME_MATCH;

  validate(input: Record<string, unknown>): boolean {
    return !!(input.resumeContent || input.jobDescription);
  }

  async process(input: Record<string, unknown>): Promise<AgentOutput> {
    try {
      const context = input as unknown as AgentContext;
      const resumeContent = context.resumeContent || '';
      const jobDescription = context.jobDescription || '';

      // Step 1: Extract keywords from both resume and job
      const jobKeywords = await this.extractKeywords(jobDescription, 'job');
      const resumeKeywords = await this.extractKeywords(resumeContent, 'resume');

      // Step 2: Calculate keyword match
      const keywordAnalysis = this.calculateKeywordMatch(jobKeywords, resumeKeywords);

      // Step 3: Calculate experience match
      const experienceAnalysis = await this.calculateExperienceMatch(
        resumeContent,
        jobDescription,
      );

      // Step 4: Calculate education match
      const educationAnalysis = await this.calculateEducationMatch(
        resumeContent,
        jobDescription,
      );

      // Step 5: Calculate skills match
      const skillsAnalysis = this.calculateSkillsMatch(jobKeywords, resumeKeywords);

      // Step 6: Calculate overall ATS score
      const overallScore = this.calculateOverallScore({
        keywordMatch: keywordAnalysis.score,
        experienceMatch: experienceAnalysis.score,
        educationMatch: educationAnalysis.score,
        skillsMatch: skillsAnalysis,
      });

      // Step 7: Generate improvement suggestions
      const suggestions = await this.generateSuggestions(
        keywordAnalysis,
        experienceAnalysis,
        educationAnalysis,
        skillsAnalysis,
      );

      const result = {
        overallScore,
        keywordMatch: keywordAnalysis.score,
        experienceMatch: experienceAnalysis.score,
        educationMatch: educationAnalysis.score,
        skillsMatch: skillsAnalysis,
        matchedKeywords: keywordAnalysis.matched,
        missingKeywords: keywordAnalysis.missing,
        suggestions,
      };

      // Validate
      const parsed = ATSScoreSchema.parse(result);

      return {
        success: true,
        data: {
          ...parsed,
          detailedAnalysis: {
            keywords: keywordAnalysis,
            experience: experienceAnalysis,
            education: educationAnalysis,
            skills: skillsAnalysis,
          },
          optimizationPriority: this.getOptimizationPriorities(parsed),
        },
        confidence: 0.8,
        metadata: {
          jobKeywordsFound: jobKeywords.length,
          resumeKeywordsFound: resumeKeywords.length,
          matchedKeywordsCount: keywordAnalysis.matched.length,
          missingKeywordsCount: keywordAnalysis.missing.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Resume match agent failed',
        confidence: 0,
      };
    }
  }

  private async extractKeywords(
    text: string,
    type: 'job' | 'resume',
  ): Promise<string[]> {
    const prompt = `Extract all relevant keywords from this ${type} description.
Focus on: skills, technologies, certifications, qualifications, experience levels, and domain expertise.

Text: ${text.slice(0, 2000)}

Return keywords as a comma-separated list:`;

    try {
      const response = await ollamaClient.generateCompletion(prompt, {
        temperature: 0.1,
        maxTokens: 500,
      });
      return response
        .split(',')
        .map((k) => k.trim().toLowerCase())
        .filter(Boolean);
    } catch {
      return [];
    }
  }

  private calculateKeywordMatch(
    jobKeywords: string[],
    resumeKeywords: string[],
  ): {
    matched: string[];
    missing: string[];
    score: number;
  } {
    const jobLower = jobKeywords.map((k) => k.toLowerCase());
    const resumeLower = resumeKeywords.map((k) => k.toLowerCase());

    const matched = jobLower.filter((keyword) =>
      resumeLower.some(
        (resume) =>
          resume.includes(keyword) || keyword.includes(resume),
      ),
    );

    const missing = jobLower.filter(
      (keyword) =>
        !resumeLower.some(
          (resume) =>
            resume.includes(keyword) || keyword.includes(resume),
        ),
    );

    const score = jobLower.length > 0
      ? Math.round((matched.length / jobLower.length) * 100)
      : 0;

    return { matched: [...new Set(matched)], missing: [...new Set(missing)], score };
  }

  private async calculateExperienceMatch(
    resumeContent: string,
    jobDescription: string,
  ): Promise<{ score: number; details: string }> {
    const prompt = `Compare the candidate's experience with the job requirements.

Resume Experience:
${resumeContent.slice(0, 1500)}

Job Requirements:
${jobDescription.slice(0, 1500)}

Analyze:
1. Years of experience match (0-100)
2. Relevance of past roles
3. Industry experience match
4. Leadership/management match

Return ONLY a JSON with "score" (0-100) and "details" (string):`;

    try {
      const response = await ollamaClient.generateCompletion(prompt, {
        temperature: 0.1,
        maxTokens: 300,
      });
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          score: Math.min(100, Math.max(0, Number(parsed.score) || 50)),
          details: String(parsed.details || ''),
        };
      }
    } catch {
      // fall through
    }

    return { score: 50, details: 'AI analysis unavailable' };
  }

  private async calculateEducationMatch(
    resumeContent: string,
    jobDescription: string,
  ): Promise<{ score: number; details: string }> {
    const prompt = `Compare the candidate's education with the job requirements.

Resume Education:
${resumeContent.slice(0, 1000)}

Job Requirements:
${jobDescription.slice(0, 1000)}

Analyze:
1. Degree level match (0-100)
2. Field of study relevance
3. Certifications match

Return ONLY a JSON with "score" (0-100) and "details" (string):`;

    try {
      const response = await ollamaClient.generateCompletion(prompt, {
        temperature: 0.1,
        maxTokens: 300,
      });
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          score: Math.min(100, Math.max(0, Number(parsed.score) || 50)),
          details: String(parsed.details || ''),
        };
      }
    } catch {
      // fall through
    }

    return { score: 50, details: 'AI analysis unavailable' };
  }

  private calculateSkillsMatch(
    jobKeywords: string[],
    resumeKeywords: string[],
  ): number {
    const skillKeywords = jobKeywords.filter(
      (k) =>
        !['experience', 'year', 'degree', 'bachelor', 'master', 'phd'].includes(k),
    );

    const matchedCount = skillKeywords.filter((keyword) =>
      resumeKeywords.some(
        (resume) =>
          resume.includes(keyword) || keyword.includes(resume),
      ),
    ).length;

    return skillKeywords.length > 0
      ? Math.round((matchedCount / skillKeywords.length) * 100)
      : 0;
  }

  private calculateOverallScore(scores: {
    keywordMatch: number;
    experienceMatch: number;
    educationMatch: number;
    skillsMatch: number;
  }): number {
    // Weighted scoring: keywords 30%, experience 35%, education 15%, skills 20%
    const weighted =
      scores.keywordMatch * 0.3 +
      scores.experienceMatch * 0.35 +
      scores.educationMatch * 0.15 +
      scores.skillsMatch * 0.2;

    return Math.round(weighted);
  }

  private async generateSuggestions(
    keywordAnalysis: { matched: string[]; missing: string[]; score: number },
    experienceAnalysis: { score: number; details: string },
    educationAnalysis: { score: number; details: string },
    skillsMatch: number,
  ): Promise<string[]> {
    const suggestions: string[] = [];

    if (keywordAnalysis.score < 70) {
      suggestions.push(
        `Add missing keywords to your resume: ${keywordAnalysis.missing.slice(0, 5).join(', ')}`,
      );
    }

    if (experienceAnalysis.score < 70) {
      suggestions.push('Highlight relevant experience more prominently in your resume summary');
    }

    if (educationAnalysis.score < 70) {
      suggestions.push('Consider adding relevant certifications or courses to match education requirements');
    }

    if (skillsMatch < 60) {
      suggestions.push('Focus on acquiring or highlighting the key technical skills mentioned in the job description');
    }

    const aiPrompt = `Based on this ATS analysis, provide 3 specific improvement suggestions.

Keyword Match: ${keywordAnalysis.score}%
Experience Match: ${experienceAnalysis.score}%
Education Match: ${educationAnalysis.score}%
Skills Match: ${skillsMatch}%
Missing Keywords: ${keywordAnalysis.missing.join(', ')}

Return as a JSON array of strings:`;

    try {
      const response = await ollamaClient.generateCompletion(aiPrompt, {
        temperature: 0.4,
        maxTokens: 500,
      });
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const aiSuggestions = JSON.parse(jsonMatch[0]) as string[];
        suggestions.push(...aiSuggestions.slice(0, 3));
      }
    } catch {
      // Use existing suggestions
    }

    return [...new Set(suggestions)].slice(0, 5);
  }

  private getOptimizationPriorities(
    analysis: { keywordMatch: number; experienceMatch: number; educationMatch: number; skillsMatch: number },
  ): Array<{ area: string; score: number; priority: 'high' | 'medium' | 'low' }> {
    return [
      {
        area: 'Keywords',
        score: analysis.keywordMatch,
        priority: analysis.keywordMatch < 50 ? 'high' : analysis.keywordMatch < 75 ? 'medium' : 'low',
      },
      {
        area: 'Experience',
        score: analysis.experienceMatch,
        priority: analysis.experienceMatch < 50 ? 'high' : analysis.experienceMatch < 75 ? 'medium' : 'low',
      },
      {
        area: 'Education',
        score: analysis.educationMatch,
        priority: analysis.educationMatch < 50 ? 'high' : analysis.educationMatch < 75 ? 'medium' : 'low',
      },
      {
        area: 'Skills',
        score: analysis.skillsMatch,
        priority: analysis.skillsMatch < 50 ? 'high' : analysis.skillsMatch < 75 ? 'medium' : 'low',
      },
    ];
  }
}

export const resumeMatchAgent = new ResumeMatchAgent();

