'use client';

import { useEffect, useState, useCallback, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Search,
  Filter,
  Clock,
  Bookmark,
  CheckCircle,
  Globe,
  ChevronLeft,
  ChevronRight,
  Loader2,
  FileText,
} from 'lucide-react';
import { API_BASE, jobsApi } from '@/lib/api';

interface Job {
  id?: string;
  title: string;
  company: string | { id?: string; name?: string; locations?: string[] };
  description?: string;
  requirements?: string;
  location?: string;
  country?: string;
  remote?: boolean;
  workMode?: string;
  type?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  source?: any;
  sourceUrl?: string;
  url?: string;
  visaSponsorship?: string;
  visa?: {
    status: string;
    type?: string[];
    evidence?: string;
  };
  semanticMatch?: number;
  skills?: string[];
  postedAt?: string;
}

function JobsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState(searchParams.get('query') || '');
  const [countryFilter, setCountryFilter] = useState(searchParams.get('country') || '');
  const [remoteFilter, setRemoteFilter] = useState(searchParams.get('remote') || '');
  const [visaFilter, setVisaFilter] = useState(searchParams.get('visaSponsorship') || '');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [totalPages, setTotalPages] = useState(1);
  const [isStreaming, setIsStreaming] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const [aiSearchInfo, setAiSearchInfo] = useState<{
    originalQuery?: string;
    enrichedQuery?: string;
    keywords?: string[];
    recommendations?: unknown[];
    ragResults?: unknown[];
  } | null>(null);

  const updateUrl = useCallback(
    (query: string, pg: number, country: string, remote: string, visa: string) => {
      const params = new URLSearchParams();
      if (query) params.set('query', query);
      if (country) params.set('country', country);
      if (remote) params.set('remote', remote);
      if (visa) params.set('visaSponsorship', visa);
      if (pg > 1) params.set('page', String(pg));
      const qs = params.toString();
      router.replace(`/jobs${qs ? `?${qs}` : ''}`, { scroll: false });
    },
    [router],
  );

  const fetchJobs = useCallback(
    async (query: string, pg: number, country: string, remote: string, visa: string, forceRefresh = false) => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      const params = new URLSearchParams();
      if (query) params.set('query', query);
      if (country) params.set('country', country);
      if (remote) params.set('remote', remote);
      if (visa) params.set('visaSponsorship', visa);
      params.set('page', String(pg));
      params.set('limit', '20');
      
      const cacheKey = `searchCache_${params.toString()}`;

      if (!forceRefresh && typeof window !== 'undefined') {
        try {
          const cached = sessionStorage.getItem(cacheKey);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed && Array.isArray(parsed.data)) {
              setJobs(parsed.data);
              setAiSearchInfo(parsed.meta?.intent || null);
              setPage(parsed.meta?.page || pg);
              setTotalPages(parsed.meta?.totalPages || 1);
              return; // Skip API call
            }
          }
        } catch (e) {
          console.error('Failed to load search cache', e);
        }
      }

      setLoading(true);
      setError('');
      setJobs([]);
      setAiSearchInfo(null);
      setIsStreaming(false);

      try {
        const response = await fetch(`${API_BASE}/jobs?${params.toString()}`);
        const result = await response.json();

        if (!result.success) {
          setError(result.meta?.error || result.error || 'Search failed');
          setLoading(false);
          return;
        }

        if (result.data && Array.isArray(result.data)) {
          setJobs(result.data);
          
          if (typeof window !== 'undefined') {
            try {
              sessionStorage.setItem(cacheKey, JSON.stringify({
                data: result.data,
                meta: result.meta
              }));
            } catch (e) {
              console.error('Failed to save search cache', e);
            }

            result.data.forEach((job: Job) => {
              const url = job.url || job.sourceUrl;
              if (url && (job.description || job.requirements)) {
                localStorage.setItem(`jd_${url}`, JSON.stringify({
                  description: job.description || '',
                  requirements: job.requirements || ''
                }));
              }
            });
          }

          setAiSearchInfo(result.meta?.intent || null);
          setPage(result.meta?.page || pg);
          setTotalPages(result.meta?.totalPages || 1);
        }
      } catch (err) {
        console.error('Failed to fetch jobs:', err);
        setError(err instanceof Error ? err.message : 'Network error — is the API running?');
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Fetch jobs on mount using URL params
  useEffect(() => {
    const query = searchParams.get('query') || '';
    const country = searchParams.get('country') || '';
    const remote = searchParams.get('remote') || '';
    const visa = searchParams.get('visaSponsorship') || '';
    const pg = Number(searchParams.get('page')) || 1;
    fetchJobs(query, pg, country, remote, visa, false);

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSearch(newQuery = searchQuery, newPage = 1) {
    updateUrl(newQuery, newPage, countryFilter, remoteFilter, visaFilter);
    fetchJobs(newQuery, newPage, countryFilter, remoteFilter, visaFilter, true);
  }

  function formatSalary(job: Job) {
    if (job?.salaryMin == null && job?.salaryMax == null) {
      return 'Salary not specified';
    }
    const min = job?.salaryMin != null ? job.salaryMin.toLocaleString() : '?';
    const max = job?.salaryMax != null ? job.salaryMax.toLocaleString() : '?';
    return `${job?.salaryCurrency || '$'} ${min} - ${max}`;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Search Jobs</h1>
        <p className="text-gray-500 mt-1">Find international jobs with visa sponsorship</p>
      </div>

      {aiSearchInfo && (
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
          <h2 className="text-sm font-semibold text-slate-900">AI Search insights</h2>
          <p className="text-sm text-slate-600 mt-2">
            Enriched query: <span className="font-medium text-slate-800">{aiSearchInfo.enrichedQuery || aiSearchInfo.originalQuery}</span>
          </p>
          {aiSearchInfo.keywords?.length ? (
            <p className="text-sm text-slate-600 mt-1">
              Keywords: <span className="font-medium text-slate-800">{aiSearchInfo.keywords.join(', ')}</span>
            </p>
          ) : null}
          <div className="flex flex-wrap gap-3 mt-3 text-xs text-slate-500">
            {aiSearchInfo.recommendations ? (
              <span>{aiSearchInfo.recommendations.length} recommendation(s)</span>
            ) : null}
            {'webResults' in aiSearchInfo && aiSearchInfo.webResults ? (
              <span>{(aiSearchInfo as any).webResults.length} Web result(s)</span>
            ) : null}
            {aiSearchInfo.ragResults ? (
              <span>{aiSearchInfo.ragResults.length} RAG result(s)</span>
            ) : null}
          </div>
        </div>
      )}
      <div className="bg-white rounded-xl p-4 border border-gray-100">
        <form
          className="grid gap-4 lg:grid-cols-[1fr,200px] xl:grid-cols-[1fr,240px]"
          onSubmit={(event) => {
            event.preventDefault();
            handleSearch(searchQuery, 1);
          }}
        >
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by title, company, skill, or keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              />
            </div>
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
            >
              <Filter className="w-5 h-5 text-gray-500" />
              <span className="text-gray-700">Search</span>
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <select
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            >
              <option value="">All countries</option>
              <option value="United States">🇺🇸 United States</option>
              <option value="United Kingdom">🇬🇧 United Kingdom</option>
              <option value="Germany">🇩🇪 Germany</option>
              <option value="Canada">🇨🇦 Canada</option>
              <option value="Australia">🇦🇺 Australia</option>
              <option value="Netherlands">🇳🇱 Netherlands</option>
              <option value="Ireland">🇮🇪 Ireland</option>
              <option value="Switzerland">🇨🇭 Switzerland</option>
              <option value="Singapore">🇸🇬 Singapore</option>
              <option value="Japan">🇯🇵 Japan</option>
              <option value="UAE">🇦🇪 UAE</option>
              <option value="New Zealand">🇳🇿 New Zealand</option>
              <option value="France">🇫🇷 France</option>
              <option value="Sweden">🇸🇪 Sweden</option>
              <option value="Norway">🇳🇴 Norway</option>
              <option value="India">🇮🇳 India</option>
              <option value="Poland">🇵🇱 Poland</option>
              <option value="Spain">🇪🇸 Spain</option>
              <option value="Denmark">🇩🇰 Denmark</option>
              <option value="Finland">🇫🇮 Finland</option>
            </select>
            <select
              value={remoteFilter}
              onChange={(e) => setRemoteFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            >
              <option value="">Any work mode</option>
              <option value="true">Remote</option>
              <option value="false">Onsite</option>
            </select>
            <select
              value={visaFilter}
              onChange={(e) => setVisaFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            >
              <option value="">Any visa status</option>
              <option value="SPONSORS">Sponsors</option>
              <option value="DOES_NOT_SPONSOR">Does not sponsor</option>
              <option value="CASE_BY_CASE">Case by case</option>
              <option value="UNKNOWN">Unknown</option>
            </select>
          </div>
        </form>

        {/* Quick keyword chips for visa & search refinement */}
        <div className="mt-3 pt-3 border-t border-gray-50">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-400 font-medium">Quick search:</span>
            {[
              { label: '🛂 Visa Sponsorship', query: 'visa sponsorship' },
              { label: '🇺🇸 H-1B', query: 'H-1B visa sponsor' },
              { label: '📋 Work Permit', query: 'work permit' },
              { label: '🇬🇧 Skilled Worker Visa', query: 'skilled worker visa' },
              { label: '🌍 Relocation', query: 'relocation support' },
              { label: '🤝 International Welcome', query: 'international candidates welcome' },
              { label: '💻 Remote Global', query: 'remote worldwide' },
              { label: '🇪🇺 EU Blue Card', query: 'EU blue card' },
            ].map((chip) => (
              <button
                key={chip.query}
                type="button"
                onClick={() => {
                  setSearchQuery(chip.query);
                  handleSearch(chip.query, 1);
                }}
                className="text-xs px-2.5 py-1 rounded-full border border-gray-200 text-gray-600 hover:bg-primary-50 hover:border-primary-300 hover:text-primary-700 transition-all cursor-pointer whitespace-nowrap"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading && (
        <div className="rounded-xl border border-gray-100 bg-white p-6 text-center text-gray-500">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            <span>Searching jobs{searchQuery ? ` for "${searchQuery}"` : ''}...</span>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && jobs.length === 0 && (
        <div className="rounded-xl border border-gray-100 bg-white p-8 text-center">
          <div className="max-w-md mx-auto">
            <Globe className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No jobs found</h3>
            <p className="text-sm text-gray-500 mb-4">
              Try adjusting your search or filters. Here are some tips:
            </p>
            <ul className="text-sm text-gray-500 text-left space-y-1.5 mb-5">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                Use broader keywords like &ldquo;software engineer&rdquo; instead of very specific terms
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                Try removing country or work mode filters
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                Search for skills like &ldquo;React&rdquo;, &ldquo;Python&rdquo;, or &ldquo;AWS&rdquo;
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                Use the quick search chips above for visa-specific searches
              </li>
            </ul>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setCountryFilter('');
                setRemoteFilter('');
                setVisaFilter('');
                handleSearch('', 1);
              }}
              className="text-sm font-medium text-primary-600 hover:text-primary-800 transition-colors"
            >
              Clear all filters and show all jobs →
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {jobs.map((job, index) => {
          const companyName = typeof job.company === 'string' ? job.company : (job.company?.name || 'Unknown Company');
          const jobKey = job.id || job.url || job.sourceUrl || `job-${index}`;
          return (
            <div key={jobKey} className="bg-white rounded-xl p-5 border border-gray-100 hover:shadow-md transition-all">
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-4 flex-1">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg flex items-center justify-center text-primary-700 font-bold text-lg uppercase">
                    {companyName.charAt(0) || 'C'}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{job.title}</h3>
                    <p className="text-sm text-gray-500">{companyName} · {job.location || job.country || 'Unknown location'}</p>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      {(job.salaryMin != null || job.salaryMax != null) && (
                        <span className="text-sm font-medium text-gray-700">{formatSalary(job)}</span>
                      )}
                      {job.type && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{job.type}</span>
                      )}
                      {job.visa?.status && job.visa.status !== 'NO_SPONSORSHIP' && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                          <Globe className="w-3 h-3" /> Visa: {job.visa.status}
                        </span>
                      )}
                      {!job.visa && job.visaSponsorship && job.visaSponsorship !== 'DOES_NOT_SPONSOR' && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                          <Globe className="w-3 h-3" /> Visa Sponsorship
                        </span>
                      )}
                      {job.semanticMatch !== undefined && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                          Match: {job.semanticMatch}%
                        </span>
                      )}
                      {job.postedAt && (
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {new Date(job.postedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-primary-600">
                    {job.remote ? 'Remote' : 'Onsite'}
                  </div>
                  <div className="flex gap-3 mt-1">
                    <Link
                      href={`/resume-builder?${job.id ? `jobId=${encodeURIComponent(job.id)}&` : ''}jobTitle=${encodeURIComponent(job.title || '')}&jobCompany=${encodeURIComponent(companyName)}&jobUrl=${encodeURIComponent(job.url || job.sourceUrl || '')}&autoGenerate=true`}
                      onClick={() => {
                        if (!job.id && (job.description || job.requirements)) {
                          sessionStorage.setItem('tempJobDescription', job.description || '');
                          sessionStorage.setItem('tempJobRequirements', job.requirements || '');
                        }
                      }}
                      className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg bg-gradient-to-r from-violet-50 to-purple-50 text-violet-700 border border-violet-200 hover:from-violet-100 hover:to-purple-100 hover:border-violet-300 transition-all"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      ATS Resume
                    </Link>
                    <a
                      href={job.url || job.sourceUrl || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-primary-600 hover:text-primary-800"
                    >
                      Apply / Details ↗
                    </a>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {isStreaming && !loading && (
        <div className="flex items-center justify-center py-6 animate-pulse">
          <div className="flex items-center gap-3 text-primary-600 bg-primary-50 px-6 py-3 rounded-full shadow-sm border border-primary-100">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm font-medium">Scanning more sources for jobs...</span>
          </div>
        </div>
      )}

      {totalPages > 1 && !isStreaming && (
        <div className="flex items-center justify-center gap-3 pt-4">
          <button
            type="button"
            onClick={() => handleSearch(searchQuery, Math.max(1, page - 1))}
            disabled={page <= 1}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => handleSearch(searchQuery, Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function JobsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading page...</div>}>
      <JobsContent />
    </Suspense>
  );
}
