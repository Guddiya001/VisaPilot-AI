import {
  JobSource,
  JobType,
  WorkMode,
  VisaSponsorshipStatus,
  ApplicationStatus,
  ResumeStatus,
  NotificationType,
  NotificationChannel,
  UserRole,
  ATSProvider,
  AgentType,
  CrawlerStatus,
  ApplicationPackageStatus,
  AutoApplyStatus,
  ATSMatchLevel,
  ATSOptimizationStopReason,
} from './enums';

// ============ User Types ============
export interface CandidateProfile {
  totalExperienceYears?: number;
  seniority?: string[];
  primarySpecializations?: string[];
  domains?: string[];
  currentCountry?: string;
  targetRoles: string[];
  skills: string[];
  targetCountries: string[];
  visaRequirements: {
    requiresSponsorship: boolean;
    h1b: boolean;
    h1bTransfer: boolean;
    o1: boolean;
    euBlueCard: boolean;
    skilledWorkerUK: boolean;
    australia482: boolean;
    australia186: boolean;
    irelandCriticalSkills: boolean;
    netherlandsHSM: boolean;
  };
  relocation: {
    willing: boolean;
    targetTimelineMonths: number;
  };
  salaryPreferences?: {
    currency?: string;
    minimum?: number;
  };
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  headline?: string;
  location?: string;
  nationality?: string;
  preferredCountries?: string[];
  skills: string[];
  experience: Experience[];
  education: Education[];
  languages: Language[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Experience {
  id: string;
  company: string;
  title: string;
  startDate: Date;
  endDate?: Date;
  current: boolean;
  description: string;
  skills: string[];
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  field: string;
  startDate: Date;
  endDate?: Date;
  gpa?: number;
}

export interface Language {
  language: string;
  proficiency: 'BASIC' | 'CONVERSATIONAL' | 'PROFESSIONAL' | 'NATIVE';
}

// ============ Job Types ============
export interface JobResult {
  title: string;
  company: string;
  location: string;
  url: string;

  source: {
    type: "WEB";
    url: string;
    fetchedAt: string;
  };

  visa?: {
    status: "CONFIRMED" | "LIKELY" | "UNCLEAR" | "NOT_SUPPORTED";
    type?: "H1B" | string;
    evidence?: string;
  };

  semanticMatch: number;
}

export interface Job {
  id: string;
  externalId?: string;
  title: string;
  company: Company;
  description: string;
  requirements: string;
  responsibilities?: string;
  location: string;
  country: string;
  remote: boolean;
  workMode: WorkMode;
  type: JobType;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  source: JobSource;
  sourceUrl: string;
  visaSponsorship: VisaSponsorshipStatus;
  visaNotes?: string;
  atsProvider?: ATSProvider;
  skills: string[];
  category?: string;
  department?: string;
  experienceLevel?: string;
  postedAt: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  embedding?: number[];
  matchScore?: number;
}

export interface Company {
  id: string;
  name: string;
  website?: string;
  logoUrl?: string;
  description?: string;
  industry?: string;
  size?: string;
  headquarters?: string;
  locations: string[];
  foundedYear?: number;
  linkedInUrl?: string;
  glassdoorRating?: number;
  visaSponsorshipPolicy?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============ Application Types ============
export interface Application {
  id: string;
  userId: string;
  jobId: string;
  job: Job;
  status: ApplicationStatus;
  resumeVersionId?: string;
  coverLetterId?: string;
  notes?: string;
  appliedAt?: Date;
  interviewDate?: Date;
  offerDate?: Date;
  rejectionDate?: Date;
  rejectionReason?: string;
  source: JobSource;
  sourceUrl: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============ Resume Types ============
export interface Resume {
  id: string;
  userId: string;
  title: string;
  status: ResumeStatus;
  versions: ResumeVersion[];
  skills: string[];
  experience: Experience[];
  education: Education[];
  languages: Language[];
  certifications?: string[];
  summary?: string;
  atsScore?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResumeVersion {
  id: string;
  resumeId: string;
  version: number;
  content: string;
  parsedData?: Record<string, unknown>;
  fileUrl?: string;
  storageKey?: string;
  mimeType?: string;
  fileSize?: number;
  changes?: string;
  createdAt: Date;
}

// ============ Cover Letter Types ============
export interface CoverLetter {
  id: string;
  userId: string;
  jobId?: string;
  title: string;
  content: string;
  companyName?: string;
  jobTitle?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============ Notification Types ============
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  channel: NotificationChannel;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  read: boolean;
  sentAt: Date;
  readAt?: Date;
  createdAt: Date;
}

// ============ Interview Types ============
export interface InterviewQuestion {
  id: string;
  userId: string;
  jobId?: string;
  companyName?: string;
  question: string;
  answer?: string;
  category: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  tips?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============ AI Types ============
export interface AIAnalysis {
  id: string;
  jobId: string;
  resumeId?: string;
  analysis: Record<string, unknown>;
  matchScore?: number;
  visaProbability?: number;
  suggestions?: string[];
  risks?: string[];
  confidence: number;
  modelUsed: string;
  agentType: AgentType;
  processedAt: Date;
}

export interface ATSAnalysis {
  jobId: string;
  resumeId: string;
  overallScore: number;
  keywordMatch: number;
  experienceMatch: number;
  educationMatch: number;
  skillsMatch: number;
  formattingScore?: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  suggestions: string[];
  atsProvider?: ATSProvider;
}

export interface VisaAnalysis {
  jobId: string;
  companyId: string;
  sponsorsVisa: boolean;
  confidence: number;
  evidence: string[];
  visaTypes?: string[];
  relocationSupport: boolean;
  notes: string;
}

// ============ Search Types ============
export interface SearchHistory {
  id: string;
  userId: string;
  query: string;
  filters: SearchFilters;
  resultCount: number;
  createdAt: Date;
}

export interface SearchFilters {
  query?: string;
  countries?: string[];
  cities?: string[];
  remote?: boolean;
  workMode?: WorkMode[];
  types?: JobType[];
  salaryMin?: number;
  salaryMax?: number;
  visaSponsorship?: VisaSponsorshipStatus;
  sources?: JobSource[];
  skills?: string[];
  experienceLevel?: string[];
  postedWithinDays?: number;
  page?: number;
  limit?: number;
}

// ============ Embedding Types ============
export interface EmbeddingIndex {
  id: string;
  resourceType: 'JOB' | 'COMPANY' | 'RESUME' | 'SKILL';
  resourceId: string;
  embedding: number[];
  metadata: Record<string, unknown>;
  model: string;
  createdAt: Date;
}

// ============ Crawler Types ============
export interface CrawlerJob {
  id: string;
  source: JobSource;
  config: CrawlerConfig;
  status: CrawlerStatus;
  lastRunAt?: Date;
  nextRunAt?: Date;
  errorMessage?: string;
  jobsFound: number;
  jobsProcessed: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CrawlerConfig {
  sourceUrl: string;
  intervalMinutes: number;
  filters?: Record<string, unknown>;
  maxJobsPerRun?: number;
  proxyConfig?: {
    url: string;
    username?: string;
    password?: string;
  };
}

// ============ Common Types ============
export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: Record<string, unknown>;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  stack?: string;
}

export interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

// ============ ATS Match Score (7-Dimension) ============
export interface ATSScoreDimension {
  score: number;
  max: number;
}

export interface ATSMatchScore {
  requiredSkills: ATSScoreDimension;
  preferredSkills: ATSScoreDimension;
  experienceMatch: ATSScoreDimension;
  keywords: ATSScoreDimension;
  responsibilities: ATSScoreDimension;
  education: ATSScoreDimension;
  formatting: ATSScoreDimension;
  total: number;
  maxTotal: number;
  normalizedScore: number;
  matchLevel: ATSMatchLevel;
  matchedSkills: string[];
  missingSkills: string[];
  matchedKeywords: string[];
  missingKeywords: string[];
}

// ============ ATS Optimization Loop ============
export interface ATSIteration {
  iteration: number;
  score: number;
  changes: string[];
  addedKeywords: string[];
  skippedKeywords: Array<{ keyword: string; reason: string }>;
}

export interface ATSOptimizationResult {
  iterations: ATSIteration[];
  initialScore: number;
  finalScore: number;
  improvement: number;
  converged: boolean;
  stoppedReason: ATSOptimizationStopReason;
}

export interface ATSOptimizationConfig {
  maxIterations: number;
  targetScore: number;
}

// ============ Application Package ============
export interface ApplicationPackage {
  id: string;
  userId: string;
  jobId: string;
  applicationId?: string;
  status: ApplicationPackageStatus;
  tailoredResume: Record<string, unknown>;
  coverLetter: string;
  atsMatchScore: ATSMatchScore;
  skillMatchReport: SkillMatchReport;
  applicationAnswers?: Record<string, string>;
  iterationLog?: ATSOptimizationResult;
  createdAt: Date;
  updatedAt: Date;
}

export interface SkillMatchReport {
  matched: string[];
  missing: string[];
  partial: string[];
}

// ============ AutoApply ============
export interface AutoApplyJob {
  id: string;
  applicationPackageId: string;
  userId: string;
  status: AutoApplyStatus;
  approvedBy?: string;
  approvedAt?: Date;
  submittedAt?: Date;
  submissionResult?: Record<string, unknown>;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============ JD Analysis (structured) ============
export interface JDAnalysis {
  jobTitle: string;
  companyName: string;
  country: string;
  city: string;
  locationText: string;
  companyIndustry: string;
  companyCulture: string[];
  requiredSkills: string[];
  preferredSkills: string[];
  experienceYears: number;
  domainFocus: string[];
  visaIndicators: string[];
  roleLevel: string;
  keyResponsibilities: string[];
  techStack: string[];
  [key: string]: unknown;
}


