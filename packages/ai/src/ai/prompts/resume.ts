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
- NEVER invent: employment history, certifications, skills, companies, or salaries.
- Only use information explicitly provided by the user.
- When comparing a resume to a JD, base all scores on actual content — do not fabricate keyword matches.
- ATS score must reflect realistic keyword overlap, not an optimistic estimate.
- If a skill or experience is missing, state it clearly instead of inventing it.
- Suggestions must be actionable and specific to the provided content.
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
- Use ONLY the provided information. Do NOT invent experience, skills, or companies.
- Optimize for ATS readability.
- Use strong action verbs (delivered, architected, reduced, scaled, etc.).
- Include quantified achievements where the data is provided.
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
