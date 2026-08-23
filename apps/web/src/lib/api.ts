/**
 * API client for communicating with the VisaPilot AI backend.
 */

export const API_BASE =
  typeof window !== 'undefined'
    ? process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'
    : 'http://localhost:4000/api/v1';

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return {
        success: false,
        error: `HTTP ${response.status}: ${errorBody.slice(0, 200)}`,
      };
    }

    const parsed = await response.json();
    if (
      parsed &&
      typeof parsed === 'object' &&
      'success' in parsed &&
      typeof parsed.success === 'boolean'
    ) {
      return parsed as ApiResponse<T>;
    }

    return {
      success: true,
      data: parsed as T,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

// AI Chat endpoints
export const aiApi = {
  chat(message: string, context?: Record<string, unknown>) {
    return request<{
      reply: string;
      suggestions?: string[];
    }>('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message, context }),
    });
  },

  analyzeResume(resumeContent: string, jobDescription: string) {
    return request('/ai/analyze-resume', {
      method: 'POST',
      body: JSON.stringify({ resumeContent, jobDescription }),
    });
  },

  generateCoverLetter(params: {
    userName: string;
    jobTitle: string;
    companyName: string;
    jobDescription: string;
    skills: string[];
  }) {
    return request('/ai/generate-cover-letter', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  optimizeResume(resumeContent: string, jobDescription: string) {
    return request('/ai/optimize-resume', {
      method: 'POST',
      body: JSON.stringify({ resumeContent, jobDescription }),
    });
  },

  tailorResume(params: {
    resumeData?: Record<string, unknown>;
    resumeContent?: string;
    jobTitle?: string;
    companyName?: string;
    jobDescription: string;
  }) {
    return request<{
      tailoredSummary: string;
      addedSkills: string[];
      bulletImprovements: Array<{ original: string; improved: string; reason: string }>;
      atsScoreBefore: number;
      atsScoreAfter: number;
      keyChanges: string[];
      coverLetter: string;
    }>('/ai/tailor-resume', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  generateResume(params: {
    jobDescription: string;
    jobTitle?: string;
    companyName?: string;
    strategy?: 'A' | 'B' | 'C' | 'auto';
  }) {
    return request<{
      jdAnalysis: {
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
      };
      strategy: 'A' | 'B' | 'C';
      strategyReason: string;
      resumeData: Record<string, unknown>;
      atsScore: number;
      atsBreakdown: {
        keywordMatch: number;
        experienceMatch: number;
        skillsMatch: number;
        formattingScore: number;
        locationMatch: number;
        companyAlignment: number;
      };
      coverLetter: string;
      networkingTips: string[];
      interviewProbability: {
        atsPass: number;
        recruiterResponse: number;
        technicalInterview: number;
        offerProbability: number;
        expectedTimeline: string;
      };
      finalDecision: string;
      finalDecisionReason: string;
    }>('/ai/generate-resume', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  analyzeVisa(jobDescription: string, companyName: string) {
    return request('/ai/visa-analysis', {
      method: 'POST',
      body: JSON.stringify({ jobDescription, companyName }),
    });
  },

  interviewPrep(jobDescription: string, companyName?: string) {
    return request('/ai/interview-prep', {
      method: 'POST',
      body: JSON.stringify({ jobDescription, companyName }),
    });
  },

  // Health (public, no auth required)
  health() {
    return request<{
      status: string;
      available: boolean;
      modelLoaded: boolean;
      models: string[];
    }>('/health/ollama');
  },

  ping() {
    return request<{ status: string }>('/health/ping');
  },
};

export const jobsApi = {
  search(
    query?: string,
    page = 1,
    limit = 20,
    country?: string,
    remote?: string,
    visaSponsorship?: string,
  ) {
    const params = new URLSearchParams();
    if (query) params.set('query', query);
    if (country) params.set('country', country);
    if (remote) params.set('remote', remote);
    if (visaSponsorship) params.set('visaSponsorship', visaSponsorship);
    params.set('page', String(page));
    params.set('limit', String(limit));

    return request<{
      data: unknown[];
      meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPreviousPage: boolean;
        aiSearch?: {
          originalQuery?: string;
          enrichedQuery?: string;
          keywords?: string[];
          recommendations?: unknown[];
          ragResults?: unknown[];
          metadata?: Record<string, unknown>;
        };
      };
    }>(`/jobs?${params.toString()}`);
  },

  getById(id: string) {
    return request<unknown>(`/jobs/${id}`);
  },
};

// Auth
export const authApi = {
  login(email: string, password: string) {
    return request<{ accessToken: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  register(data: { email: string; password: string; name: string }) {
    return request<{ accessToken: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  setToken(token: string) {
    localStorage.setItem('auth_token', token);
  },

  getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token');
    }
    return null;
  },

  logout() {
    localStorage.removeItem('auth_token');
  },
};
