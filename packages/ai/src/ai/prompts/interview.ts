/**
 * Interview preparation prompts.
 *
 * Answers are structured for a senior engineer with 9+ years of experience.
 * Recommended model: Claude Opus 5 (complex reasoning, multi-step).
 */

import { extendSystemPrompt, buildBaseMessages } from './base';

const INTERVIEW_SYSTEM_PROMPT = extendSystemPrompt(`
You are a senior software engineer with 9+ years of experience helping candidates prepare for technical and behavioral interviews.

Interview-answer structure (always follow this format):

### Short answer
A direct, interview-ready answer in 2–4 sentences.

### Detailed explanation
A technical deep-dive of the concept.

### Real-world example
A practical production-level example from engineering practice.

### Trade-offs
When to use this approach and when NOT to.

### Interview follow-up
2–3 likely follow-up questions with concise answers.

Engineering terminology to use naturally (expand on first use):
- scalability, availability, latency, throughput, fault tolerance
- observability, idempotency, caching, eventual consistency
- horizontal scaling, backpressure, circuit breaker
- retry strategy, rate limiting, RDBMS (Relational Database Management System)

Rules:
- Always expand uncommon abbreviations on first use. Example: RDBMS (Relational Database Management System).
- Use practical, production-grade examples — not textbook definitions.
- Never invent experience or technologies not mentioned in the context.
- Avoid generic advice. Be specific and actionable.
`);

export interface InterviewContext {
  question: string;
  role?: string;
  experienceLevel?: string;
  techStack?: string[];
  previousAnswer?: string;
}

export interface BehavioralContext {
  question: string;
  userExperience?: string;
  role?: string;
  company?: string;
}

export function buildInterviewAnswerMessages(context: InterviewContext) {
  const parts: string[] = [];

  if (context.role) parts.push(`Target role: ${context.role}`);
  if (context.experienceLevel) parts.push(`Experience level: ${context.experienceLevel}`);
  if (context.techStack?.length) parts.push(`Tech stack: ${context.techStack.join(', ')}`);

  parts.push(`Interview question:\n${context.question}`);

  if (context.previousAnswer) {
    parts.push(`Candidate's previous answer to evaluate and improve:\n${context.previousAnswer}`);
  }

  return buildBaseMessages(parts.join('\n\n'), INTERVIEW_SYSTEM_PROMPT);
}

export function buildBehavioralAnswerMessages(context: BehavioralContext) {
  const parts: string[] = [];

  if (context.role) parts.push(`Target role: ${context.role}`);
  if (context.company) parts.push(`Target company: ${context.company}`);

  parts.push(`Behavioral interview question:\n${context.question}`);

  if (context.userExperience) {
    parts.push(`Use ONLY the following real experience as the basis for the answer (do not invent scenarios):\n${context.userExperience}`);
  } else {
    parts.push(`Note: No specific experience provided. Provide a general STAR-format framework the candidate can adapt. Do NOT invent specific experiences.`);
  }

  return buildBaseMessages(parts.join('\n\n'), INTERVIEW_SYSTEM_PROMPT);
}

export function buildInterviewFeedbackMessages(question: string, answer: string) {
  const prompt = `Evaluate the following interview answer and provide structured feedback.

Question: ${question}

Candidate's answer: ${answer}

Return ONLY valid JSON:
{
  "score": number (0–100),
  "strengths": string[],
  "improvements": string[],
  "sampleAnswer": string
}`;

  return buildBaseMessages(prompt, INTERVIEW_SYSTEM_PROMPT);
}

export { INTERVIEW_SYSTEM_PROMPT };
