import { z } from 'zod';

export const OllamaCompletionOptions = z.object({
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().min(1).optional(),
  topP: z.number().min(0).max(1).optional(),
  frequencyPenalty: z.number().min(-2).max(2).optional(),
  presencePenalty: z.number().min(-2).max(2).optional(),
  stop: z.array(z.string()).optional(),
});

export type OllamaCompletionOptions = z.infer<typeof OllamaCompletionOptions>;

export interface OllamaCompletionResponse {
  model: string;
  createdAt: string;
  response: string;
  done: boolean;
  totalDuration?: number;
  loadDuration?: number;
  promptEvalCount?: number;
  evalCount?: number;
  evalDuration?: number;
}

export interface OllamaEmbeddingResponse {
  embedding: number[];
}

export interface AgentContext {
  jobId?: string;
  userId?: string;
  resumeId?: string;
  applicationId?: string;
  jobDescription?: string;
  resumeContent?: string;
  companyName?: string;
  userSkills?: string[];
  userExperience?: string;
  searchQuery?: string;
  searchFilters?: Record<string, unknown>;
  coverLetterParams?: {
    userName: string;
    userSkills: string[];
    jobTitle: string;
    companyName: string;
    jobDescription: string;
    tone?: string;
  };
  interviewQuestion?: string;
  interviewAnswer?: string;
  metadata?: Record<string, unknown>;
}

export interface AgentState {
  context: AgentContext;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  findings: Record<string, unknown>;
  confidence: number;
  completed: boolean;
  error?: string;
}

export interface RAGDocument {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
  score: number;
}

export const VisaAnalysisSchema = z.object({
  sponsorsVisa: z.boolean(),
  confidence: z.number().min(0).max(1),
  evidence: z.array(z.string()),
  visaTypes: z.array(z.string()).optional(),
  relocationSupport: z.boolean(),
  notes: z.string(),
});

export const ATSScoreSchema = z.object({
  overallScore: z.number().min(0).max(100),
  keywordMatch: z.number().min(0).max(100),
  experienceMatch: z.number().min(0).max(100),
  educationMatch: z.number().min(0).max(100),
  skillsMatch: z.number().min(0).max(100),
  matchedKeywords: z.array(z.string()),
  missingKeywords: z.array(z.string()),
  suggestions: z.array(z.string()),
});

export const ResumeImprovementSchema = z.object({
  originalScore: z.number(),
  improvedScore: z.number(),
  changes: z.array(z.object({
    section: z.string(),
    original: z.string(),
    improved: z.string(),
    reason: z.string(),
  })),
  summary: z.string(),
});

export const CoverLetterSchema = z.object({
  content: z.string(),
  tone: z.string(),
  keyPoints: z.array(z.string()),
  wordCount: z.number(),
});

export const InterviewQuestionSchema = z.object({
  question: z.string(),
  category: z.string(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
  expectedKeywords: z.array(z.string()),
  tips: z.string(),
});

export const InterviewFeedbackSchema = z.object({
  score: z.number().min(0).max(100),
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
  sampleAnswer: z.string(),
});

export const JobAnalysisSchema = z.object({
  requiredSkills: z.array(z.string()),
  preferredSkills: z.array(z.string()),
  experienceRequired: z.string(),
  educationRequired: z.string(),
  visaSponsorship: z.string(),
  relocationSupport: z.boolean(),
  salaryRange: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    currency: z.string().optional(),
  }).optional(),
  culture: z.string().optional(),
  growthPotential: z.string().optional(),
});

