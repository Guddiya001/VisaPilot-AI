export type ApplicationStatus = 
  | 'SAVED'
  | 'APPLYING'
  | 'APPLIED'
  | 'SCREENING'
  | 'INTERVIEWING'
  | 'OFFERED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'WITHDRAWN';

export interface UserResume {
  id: string;
  title: string;
  status: string;
  skills: string[];
  atsScore?: number;
  latestVersionId?: string;
  versionCount?: number;
  lastUpdated?: string | Date;
}

export interface Application {
  id: string;
  status: ApplicationStatus;
  notes?: string;
  appliedAt?: string;
  interviewDate?: string;
  offerDate?: string;
  rejectionDate?: string;
  rejectionReason?: string;
  resumeVersionId?: string;
  resumeVersion?: {
    id: string;
    version: number;
    fileUrl?: string;
    changes?: string;
    resume?: {
      id: string;
      title: string;
      atsScore?: number;
      skills?: string[];
    };
  };
  coverLetterId?: string;
  coverLetter?: {
    id: string;
    title: string;
    content: string;
  };
  job: {
    id: string;
    title: string;
    company: string | { name: string; logoUrl?: string };
    location?: string;
    workMode?: string;
    visaSponsorship?: string;
    url?: string;
    sourceUrl?: string;
    description?: string;
    requirements?: string;
    salaryMin?: number;
    salaryMax?: number;
    currency?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface InterviewRound {
  id: string;
  roundName: string; // e.g. "Screening Call", "Technical Round 1", "System Design", "Cultural Fit"
  scheduledAt?: string;
  interviewer?: string;
  meetingUrl?: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'PASSED' | 'FAILED';
  notes?: string;
}
