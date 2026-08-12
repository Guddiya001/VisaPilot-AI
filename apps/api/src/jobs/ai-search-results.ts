export interface PersistableSearchResult {
  id?: string;
  title?: string;
  companyName?: string;
  company?: string;
  description?: string;
  location?: string;
  country?: string;
  remote?: boolean;
  workMode?: string;
  type?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  source?: string;
  sourceUrl?: string;
  applyUrl?: string;
  skills?: string[];
  postedAt?: string | Date;
  visaSponsorship?: string;
}

export interface PersistableSearchPayload {
  webResults?: Array<Record<string, unknown>>;
  ragResults?: Array<Record<string, unknown>>;
}

export function normalizePersistableSearchResults(payload: PersistableSearchPayload): PersistableSearchResult[] {
  const sources = [
    ...(Array.isArray(payload.webResults) ? payload.webResults : []),
    ...(Array.isArray(payload.ragResults) ? payload.ragResults : []),
  ] as Array<Record<string, unknown>>;

  return sources.map((result) => ({
    id: (result.id as string | undefined) || (result.externalId as string | undefined),
    title: (result.title as string | undefined) || 'Unknown Position',
    companyName: (result.companyName as string | undefined) || (result.company as string | undefined) || 'Unknown Company',
    company: (result.companyName as string | undefined) || (result.company as string | undefined) || 'Unknown Company',
    description: (result.description as string | undefined) || '',
    location: (result.location as string | undefined) || '',
    country: (result.country as string | undefined) || '',
    remote: typeof result.remote === 'boolean' ? result.remote : Boolean(result.remote),
    workMode: (result.workMode as string | undefined) || 'ONSITE',
    type: (result.type as string | undefined) || 'FULL_TIME',
    salaryMin: typeof result.salaryMin === 'number' ? result.salaryMin : undefined,
    salaryMax: typeof result.salaryMax === 'number' ? result.salaryMax : undefined,
    salaryCurrency: (result.salaryCurrency as string | undefined) || undefined,
    source: (result.source as string | undefined) || 'GREENHOUSE',
    sourceUrl: (result.sourceUrl as string | undefined) || '',
    applyUrl: (result.applyUrl as string | undefined) || undefined,
    skills: Array.isArray(result.skills) ? (result.skills as string[]) : [],
    postedAt: result.postedAt as string | Date | undefined,
    visaSponsorship: (result.visaSponsorship as string | undefined) || 'UNKNOWN',
  }));
}
