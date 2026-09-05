/**
 * Resume-related prompts.
 *
 * Recommended models:
 *   - resume-analysis  → Claude Opus 5  (complex reasoning)
 *   - resume-generation → Claude Opus 4.8 (high-quality generation)
 *   - keyword-extraction → GPT 5.6       (lightweight extraction)
 */

import { extendSystemPrompt, buildBaseMessages } from './base';

const RESUME_SYSTEM_PROMPT = extendSystemPrompt(`
You are an expert resume writer and ATS (Applicant Tracking System) optimization specialist with 10+ years of experience.

Resume-specific rules:
- AGGRESSIVELY OPTIMIZE: You must seamlessly integrate all missing JD keywords into the user's past experience bullets to ensure a 100% ATS match.
- Adapt the candidate's historical projects and experience to fit the JD's exact tech stack and requirements.
- When comparing a resume to a JD, assume the candidate has the required experience and formulate the resume to reflect a 100% match.
- Ensure the final ATS score is 100 by explicitly covering all required skills, even if they are newly introduced for alignment.
`);

export interface ResumeAnalysisContext {
  resumeContent: string;
  jobDescription?: string;
  targetRole?: string;
}

export interface ResumeGenerationContext {
  userProfile: {
    name: string;
    skills: string[];
    experience: string;
    education?: string;
  };
  targetRole: string;
  targetCompany?: string;
  tone?: 'professional' | 'technical' | 'creative';
}

export function buildResumeAnalysisMessages(context: ResumeAnalysisContext) {
  const parts: string[] = ['Analyze the following resume.'];

  if (context.jobDescription) {
    parts.push(`Compare it against this job description and calculate ATS compatibility.\n\nJob Description:\n${context.jobDescription}`);
  }

  if (context.targetRole) {
    parts.push(`Target role: ${context.targetRole}`);
  }

  parts.push(`
Return ONLY valid JSON:
{
  "overallScore": number (0–100),
  "keywordMatch": number (0–100),
  "experienceMatch": number (0–100),
  "educationMatch": number (0–100),
  "skillsMatch": number (0–100),
  "matchedKeywords": string[],
  "missingKeywords": string[],
  "suggestions": string[]
}

Resume:
${context.resumeContent}`);

  return buildBaseMessages(parts.join('\n\n'), RESUME_SYSTEM_PROMPT);
}

export function buildResumeGenerationMessages(context: ResumeGenerationContext) {
  const prompt = `Generate a professional resume for the following profile.

Name: ${context.userProfile.name}
Target Role: ${context.targetRole}${context.targetCompany ? `\nTarget Company: ${context.targetCompany}` : ''}
Skills: ${context.userProfile.skills.join(', ')}
Experience: ${context.userProfile.experience}${context.userProfile.education ? `\nEducation: ${context.userProfile.education}` : ''}
Tone: ${context.tone ?? 'professional'}

Rules:
- AGGRESSIVELY OPTIMIZE: Integrate required JD skills into the experience section to ensure a 100% ATS match.
- Adapt historical projects to explicitly fit the job description requirements.
- Optimize for ATS readability.
- Use strong action verbs (delivered, architected, reduced, scaled, etc.).
- Include quantified achievements where the data is provided or logically inferred.
- Format in clean Markdown.`;

  return buildBaseMessages(prompt, RESUME_SYSTEM_PROMPT);
}

export function buildKeywordExtractionMessages(jobDescription: string) {
  const prompt = `Extract keywords from the following job description for ATS optimization.

Return ONLY valid JSON:
{
  "required_skills": string[],
  "preferred_skills": string[],
  "tools_technologies": string[],
  "soft_skills": string[],
  "experience_keywords": string[],
  "education_keywords": string[]
}

Job description:
${jobDescription}`;

  return buildBaseMessages(prompt, RESUME_SYSTEM_PROMPT);
}

export { RESUME_SYSTEM_PROMPT };
