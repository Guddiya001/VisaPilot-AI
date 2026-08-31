import { JobSource, ATSProvider, CrawlerStatus } from './enums';
import { Job, SearchFilters, ATSAnalysis, VisaAnalysis, CrawlerConfig } from './types';

// ============ Crawler Adapter Interface ============
export interface ICrawlerAdapter {
  readonly source: JobSource;
  readonly name: string;
  initialize(): Promise<void>;
  searchJobs(filters: SearchFilters): AsyncGenerator<Job>;
  getJobDetails(externalId: string): Promise<Job>;
  normalizeJob(rawJob: Record<string, unknown>): Job;
  validateConfig(config: CrawlerConfig): boolean;
  healthCheck(): Promise<boolean>;
}

// ============ ATS Adapter Interface ============
export interface IATSAdapter {
  readonly provider: ATSProvider;
  parseJobDescription(jobDescription: string): Promise<Record<string, unknown>>;
  calculateMatch(resumeContent: string, jobDescription: string): Promise<ATSAnalysis>;
  extractKeywords(text: string): Promise<string[]>;
  analyzeFormatting(content: string): Promise<Record<string, unknown>>;
}

// ============ AI Service Interface ============
export interface IAIService {
  generateEmbedding(text: string): Promise<number[]>;
  generateCompletion(prompt: string, options?: AICompletionOptions): Promise<string>;
  analyzeSentiment(text: string): Promise<number>;
  extractEntities(text: string): Promise<Record<string, unknown>>;
}

export interface AICompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
}

// ============ Visa Detection Interface ============
export interface IVisaDetectionService {
  analyzeJob(job: Job): Promise<VisaAnalysis>;
  analyzeCompany(companyName: string, website?: string): Promise<VisaAnalysis>;
  extractVisaKeywords(text: string): Promise<string[]>;
  detectRelocationSupport(text: string): Promise<boolean>;
}

// ============ Resume Service Interface ============
export interface IResumeService {
  parseResume(content: string, mimeType: string): Promise<Record<string, unknown>>;
  generateATSResume(
    originalContent: string,
    jobDescription: string,
  ): Promise<string>;
  optimizeKeywords(
    resumeContent: string,
    targetKeywords: string[],
  ): Promise<string>;
  calculateATSScore(resumeContent: string, jobDescription: string): Promise<ATSAnalysis>;
  extractSkills(text: string): Promise<string[]>;
}

// ============ Cover Letter Service Interface ============
export interface ICoverLetterService {
  generateCoverLetter(params: {
    userName: string;
    userSkills: string[];
    jobTitle: string;
    companyName: string;
    jobDescription: string;
    tone?: string;
    highlights?: string[];
  }): Promise<string>;
  personalizeContent(
    baseContent: string,
    companyInfo: Record<string, unknown>,
  ): Promise<string>;
}

// ============ Interview Service Interface ============
export interface IInterviewService {
  generateQuestions(jobDescription: string): Promise<IInterviewQuestion[]>;
  evaluateAnswer(question: string, answer: string): Promise<InterviewFeedback>;
  generateFollowUpQuestions(
    question: string,
    answer: string,
  ): Promise<string[]>;
}

export interface IInterviewQuestion {
  question: string;
  category: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  expectedKeywords: string[];
  tips: string;
}

export interface InterviewFeedback {
  score: number;
  strengths: string[];
  improvements: string[];
  sampleAnswer: string;
}

// ============ Notification Service Interface ============
export interface INotificationService {
  send(params: NotificationParams): Promise<boolean>;
  sendBatch(params: NotificationParams[]): Promise<boolean[]>;
  getUserPreferences(userId: string): Promise<NotificationPreferences>;
  updateUserPreferences(
    userId: string,
    preferences: NotificationPreferences,
  ): Promise<void>;
}

export interface NotificationParams {
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  channels: string[];
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  inApp: boolean;
  types: Record<string, boolean>;
}

// ============ Database Repository Interfaces ============
export interface IJobRepository {
  findById(id: string): Promise<Job | null>;
  findByExternalId(externalId: string): Promise<Job | null>;
  search(filters: SearchFilters): Promise<[Job[], number]>;
  create(job: Partial<Job>): Promise<Job>;
  update(id: string, job: Partial<Job>): Promise<Job>;
  delete(id: string): Promise<void>;
  findSimilar(jobId: string, limit?: number): Promise<Job[]>;
}

export interface IUserRepository {
  findById(id: string): Promise<import('./types').UserProfile | null>;
  findByEmail(email: string): Promise<import('./types').UserProfile | null>;
  create(user: Partial<import('./types').UserProfile>): Promise<import('./types').UserProfile>;
  update(id: string, user: Partial<import('./types').UserProfile>): Promise<import('./types').UserProfile>;
  delete(id: string): Promise<void>;
}

// ============ Cache Interface ============
export interface ICacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  clear(pattern?: string): Promise<void>;
}

// ============ Queue Interface ============
export interface IQueueService {
  add<T>(queueName: string, data: T, options?: QueueOptions): Promise<string>;
  process<T>(
    queueName: string,
    handler: (job: QueueJob<T>) => Promise<void>,
  ): Promise<void>;
  getStatus(queueName: string): Promise<QueueStatus>;
  pause(queueName: string): Promise<void>;
  resume(queueName: string): Promise<void>;
}

export interface QueueOptions {
  priority?: number;
  delay?: number;
  attempts?: number;
  backoff?: {
    type: 'fixed' | 'exponential';
    delay: number;
  };
}

export interface QueueJob<T> {
  id: string;
  data: T;
  attempts: number;
  timestamp: Date;
}

export interface QueueStatus {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

// ============ Agent Interfaces ============
export interface IAgent {
  readonly name: string;
  readonly type: import('./enums').AgentType;
  process(input: Record<string, unknown>): Promise<AgentOutput>;
  validate(input: Record<string, unknown>): boolean;
}

export interface AgentOutput {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  confidence: number;
  metadata?: Record<string, unknown>;
}

// ============ RAG Interface ============
export interface IRAGService {
  index(resourceType: string, resourceId: string, content: string): Promise<void>;
  search(query: string, options?: RAGSearchOptions): Promise<RAGResult[]>;
  deleteIndex(resourceType: string, resourceId: string): Promise<void>;
  reindex(resourceType: string, resourceId: string, content: string): Promise<void>;
}

export interface RAGSearchOptions {
  resourceType?: string;
  maxResults?: number;
  similarityThreshold?: number;
  filters?: Record<string, unknown>;
}

export interface RAGResult {
  resourceType: string;
  resourceId: string;
  content: string;
  score: number;
  metadata: Record<string, unknown>;
}

// ============ Auth Interface ============
export interface IAuthService {
  register(params: RegisterParams): Promise<AuthResult>;
  login(params: LoginParams): Promise<AuthResult>;
  refreshToken(refreshToken: string): Promise<AuthResult>;
  validateToken(token: string): Promise<TokenPayload>;
  logout(userId: string): Promise<void>;
}

export interface RegisterParams {
  email: string;
  password: string;
  name: string;
}

export interface LoginParams {
  email: string;
  password: string;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: import('./types').UserProfile;
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: import('./enums').UserRole;
  iat: number;
  exp: number;
}

// ============ Application Package Service Interface ============
export interface IApplicationPackageService {
  generatePackage(
    userId: string,
    jobId: string,
    jobDescription: string,
    options?: { maxIterations?: number; targetScore?: number },
  ): Promise<import('./types').ApplicationPackage>;
  getPackage(packageId: string): Promise<import('./types').ApplicationPackage | null>;
  getPackageByJob(userId: string, jobId: string): Promise<import('./types').ApplicationPackage | null>;
  approvePackage(packageId: string, userId: string): Promise<import('./types').ApplicationPackage>;
}

// ============ AutoApply Service Interface ============
export interface IAutoApplyService {
  queueAutoApply(applicationPackageId: string, userId: string): Promise<import('./types').AutoApplyJob>;
  getStatus(autoApplyJobId: string): Promise<import('./types').AutoApplyJob | null>;
  approve(autoApplyJobId: string, userId: string): Promise<import('./types').AutoApplyJob>;
  submit(autoApplyJobId: string): Promise<import('./types').AutoApplyJob>;
}


