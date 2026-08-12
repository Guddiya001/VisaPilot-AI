import { JobSource } from '@visapilot/shared';

export interface CrawlerAdapterConfig {
  source: JobSource;
  baseUrl: string;
  apiKey?: string;
  webhookUrl?: string;
  rateLimitPerMinute: number;
  maxRetries: number;
  timeout: number;
}

export interface CrawledJob {
  externalId: string;
  title: string;
  companyName: string;
  description: string;
  requirements: string;
  responsibilities?: string;
  location: string;
  country: string;
  remote: boolean;
  workMode: string;
  type: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  source: JobSource;
  sourceUrl: string;
  applyUrl?: string;
  skills: string[];
  category?: string;
  department?: string;
  experienceLevel?: string;
  educationLevel?: string;
  postedAt: Date;
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface CrawlerResult {
  jobs: CrawledJob[];
  errors: CrawlerError[];
  metadata: {
    source: JobSource;
    totalFetched: number;
    totalProcessed: number;
    duration: number;
    cached: boolean;
  };
}

export interface CrawlerError {
  source: JobSource;
  url?: string;
  code: string;
  message: string;
  retryable: boolean;
}

export interface NormalizedJob {
  title: string;
  companyName: string;
  description: string;
  requirements: string;
  responsibilities?: string;
  location: string;
  country: string;
  remote: boolean;
  workMode: string;
  type: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  source: JobSource;
  sourceUrl: string;
  applyUrl?: string;
  skills: string[];
  category?: string;
  department?: string;
  experienceLevel?: string;
  educationLevel?: string;
  postedAt: Date;
  expiresAt?: Date;
  normalizedAt: Date;
}

export interface JobDeduplicationResult {
  unique: NormalizedJob[];
  duplicates: NormalizedJob[];
  duplicateCount: number;
}

