import { ollamaClient } from '../ollama/client';
import type { IAgent, AgentOutput } from '@visapilot/shared';
import type { AgentContext } from '../types';
import { AgentType } from '@visapilot/shared';
import { CoverLetterSchema } from '../types';
import type { ATSMatchScore, JDAnalysis } from '@visapilot/shared';

export interface EnhancedCoverLetterParams {
  userName: string;
  userSkills: string[];
  jobTitle: string;
  companyName: string;
  jobDescription: string;
  tone?: string;
  // New: enhanced inputs
  tailoredResume?: Record<string, unknown>;
  atsMatchScore?: ATSMatchScore;
  jdAnalysis?: JDAnalysis;
}

export class CoverLetterAgent implements IAgent {
  readonly name = 'Cover Letter Agent';
  readonly type = AgentType.COVER_LETTER;

  validate(input: Record<string, unknown>): boolean {
    return !!(input.coverLetterParams || (input.jobDescription && input.userSkills));
  }

  async process(input: Record<string, unknown>): Promise<AgentOutput> {
    try {
      const context = input as unknown as AgentContext;
      const params: EnhancedCoverLetterParams = (context.coverLetterParams as EnhancedCoverLetterParams) || {
        userName: (context as any).userName || 'Candidate',
        userSkills: context.userSkills || [],
        jobTitle: (context as any).jobTitle || '',
        companyName: context.companyName || '',
        jobDescription: context.jobDescription || '',
        tone: (context as any).tone || 'professional',
      };

      // Pull enhanced data from input if available
      const tailoredResume = (input.tailoredResume as Record<string, unknown>) || params.tailoredResume;
      const atsMatchScore = (input.atsMatchScore as ATSMatchScore) || params.atsMatchScore;
      const jdAnalysis = (input.jdAnalysis as JDAnalysis) || params.jdAnalysis;

      // Step 1: Analyze job description
      const jobAnalysis = jdAnalysis
        ? {
            requiredSkills: jdAnalysis.requiredSkills,
            keyResponsibilities: jdAnalysis.keyResponsibilities,
            companyValues: jdAnalysis.companyCulture,
            tone: 'professional',
          }
        : await this.analyzeJobDescription(params.jobDescription);

      // Step 2: Identify matching points (use ATS score if available)
      const matchingPoints = atsMatchScore
        ? atsMatchScore.matchedSkills.map((s) => ({ skill: s, matchType: 'exact' as const }))
        : this.identifyMatchingPoints(params.userSkills, jobAnalysis.requiredSkills);

      // Step 3: Generate enhanced cover letter
      const coverLetter = await this.generateEnhancedCoverLetter({
        userName: params.userName,
        userSkills: params.userSkills,
        jobTitle: params.jobTitle,
        companyName: params.companyName,
        jobDescription: params.jobDescription,
        tone: params.tone || 'professional',
        jobAnalysis,
        matchingPoints,
        tailoredResume,
        atsMatchScore,
        jdAnalysis,
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

      return {
        success: true,
        data: {
          ...result,
          jobAnalysis,
          matchingPoints,
          missingSkills: atsMatchScore?.missingSkills || [],
          usage: {
            purpose: `Application for ${params.jobTitle} at ${params.companyName}`,
            targetAudience: 'Hiring Manager / Recruiter',
            suggestedSubject: `Application for ${params.jobTitle} - ${params.userName}`,
          },
        },
        confidence: tailoredResume ? 0.92 : 0.85,
        metadata: {
          wordCount: result.wordCount,
          keyPointsCount: keyPoints.length,
          matchingSkillsCount: matchingPoints.length,
          usedTailoredResume: !!tailoredResume,
          usedATSScore: !!atsMatchScore,
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

  // ─── Enhanced cover letter generation ───

  private async generateEnhancedCoverLetter(params: {
    userName: string;
    userSkills: string[];
    jobTitle: string;
    companyName: string;
    jobDescription: string;
    tone: string;
    jobAnalysis: Record<string, unknown>;
    matchingPoints: Array<{ skill: string; matchType: string }>;
    tailoredResume?: Record<string, unknown>;
    atsMatchScore?: ATSMatchScore;
    jdAnalysis?: JDAnalysis;
  }): Promise<string> {
    // Build context from tailored resume if available
    let resumeContext = '';
    if (params.tailoredResume) {
      const basics = params.tailoredResume.basics as Record<string, string> | undefined;
      const experience = params.tailoredResume.experience as Array<Record<string, unknown>> | undefined;
      resumeContext = `
CANDIDATE SUMMARY (from tailored resume): ${basics?.summary || ''}
TOP EXPERIENCE: ${(experience || []).slice(0, 2).map((e) => `${e.role} at ${e.company}: ${((e.bullets as string[]) || []).slice(0, 2).join('; ')}`).join('\n')}`;
    }

    let atsContext = '';
    if (params.atsMatchScore) {
      atsContext = `
STRONGEST QUALIFICATIONS (ATS-verified matches): ${params.atsMatchScore.matchedSkills.slice(0, 6).join(', ')}
ATS MATCH SCORE: ${params.atsMatchScore.normalizedScore}%`;
    }

    let companyContext = '';
    if (params.jdAnalysis) {
      companyContext = `
COMPANY INDUSTRY: ${params.jdAnalysis.companyIndustry || 'Technology'}
COMPANY VALUES: ${params.jdAnalysis.companyCulture.join(', ') || 'innovation, collaboration'}
LOCATION: ${params.jdAnalysis.locationText || params.jdAnalysis.country || 'Remote'}`;
    }

    const prompt = `Write a compelling, JD-specific cover letter for a job application.

Candidate Name: ${params.userName}
Job Title: ${params.jobTitle}
Company: ${params.companyName}
Tone: ${params.tone}
Matching Skills (verified): ${params.matchingPoints.map((m) => m.skill).join(', ')}
${resumeContext}
${atsContext}
${companyContext}

Job Description Context:
${params.jobDescription.slice(0, 2000)}

STRICT RULES:
1. Mention the target role (${params.jobTitle}) by name in the opening.
2. Reference the company's (${params.companyName}) relevant needs from the JD.
3. Connect the candidate's ACTUAL experience to those needs — use details from the resume context above.
4. Highlight the strongest 2-4 qualifications from the matched skills list.
5. Use JD terminology naturally — do not force keywords unnaturally.
6. AVOID generic AI language ("I am a results-driven professional", "I am confident", "I am passionate").
7. Do NOT repeat the entire resume — highlight only the most compelling points.
8. NEVER fabricate company information or candidate experience.
9. Keep it concise: 250-400 words, 3 paragraphs maximum.
10. Do NOT include placeholder text like [Your Name] or [Date].
11. Use a ${params.tone} tone throughout.

Return ONLY the cover letter content, no additional text:`;

    try {
      const response = await ollamaClient.generateCompletion(prompt, {
        temperature: 0.7,
        maxTokens: 1000,
      });

      const text = response.trim();
      if (text.length > 100) return text;
    } catch {
      // fall through to fallback
    }

    return `Dear Hiring Manager,

I am writing to express my strong interest in the ${params.jobTitle} position at ${params.companyName}. With my background in ${params.matchingPoints.slice(0, 3).map((m) => m.skill).join(', ')}, I am well-positioned to contribute to your team's goals.

${resumeContext ? `In my current role, I have ${((params.tailoredResume?.experience as Array<Record<string, unknown>>)?.[0]?.bullets as string[])?.[0] || 'delivered impactful results across complex technical projects'}.` : `My experience in ${params.userSkills.slice(0, 3).join(', ')} has prepared me to tackle the challenges described in your job posting.`}

I would welcome the opportunity to discuss how my experience aligns with ${params.companyName}'s needs. Thank you for considering my application.

Sincerely,
${params.userName}`;
  }

  private extractKeyPoints(content: string): string[] {
    const sentences = content.split(/[.!?]+/).filter(Boolean);
    return sentences
      .filter((s) => s.length > 30 && s.length < 200)
      .slice(0, 5)
      .map((s) => s.trim());
  }
}

export const coverLetterAgent = new CoverLetterAgent();
