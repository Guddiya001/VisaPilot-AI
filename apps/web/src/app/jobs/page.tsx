'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
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
} from 'lucide-react';
import { jobsApi } from '@/lib/api';

interface Job {
  id: string;
  title: string;
  company: {
    id: string;
    name: string;
    locations: string[];
  };
  description: string;
  requirements: string;
  location: string;
  country: string;
  remote: boolean;
  workMode: string;
  type: string;
  salaryMin: number;
  salaryMax: number;
  salaryCurrency: string;
  source: string;
  sourceUrl: string;
  visaSponsorship: string;
  skills: string[];
  postedAt: string;
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
    async (query: string, pg: number, country: string, remote: string, visa: string) => {
      setLoading(true);
      setError('');

      const result = await jobsApi.search(
        query || undefined,
        pg,
        20,
        country || undefined,
        remote || undefined,
        visa || undefined,
      );
      console.log('Jobs API result:', result);

      if (!result.success) {
        setError(result.error || 'Failed to load jobs.');
        setJobs([]);
        setAiSearchInfo(null);
        setLoading(false);
        return;
      }

      const payload = result.data;
      const jobsData = Array.isArray(payload)
        ? (payload as Job[])
        : ((payload as { data?: Job[] })?.data as Job[]) || [];

      const topLevelMeta = (result as unknown as { meta?: { page?: number; totalPages?: number; aiSearch?: typeof aiSearchInfo } }).meta;
      const nestedMeta = !Array.isArray(payload)
        ? (payload as { meta?: { page?: number; totalPages?: number; aiSearch?: typeof aiSearchInfo } }).meta
        : undefined;
      const meta = topLevelMeta ?? nestedMeta;

      setJobs(jobsData);
      setPage(meta?.page ?? pg);
      setTotalPages(meta?.totalPages ?? 1);
      setAiSearchInfo(meta?.aiSearch ?? null);
      setLoading(false);
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
    fetchJobs(query, pg, country, remote, visa);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSearch(newQuery = searchQuery, newPage = 1) {
    updateUrl(newQuery, newPage, countryFilter, remoteFilter, visaFilter);
    fetchJobs(newQuery, newPage, countryFilter, remoteFilter, visaFilter);
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
                placeholder="Search by title, company, or skill..."
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
              <option value="United States">United States</option>
              <option value="United Kingdom">United Kingdom</option>
              <option value="Germany">Germany</option>
              <option value="Canada">Canada</option>
              <option value="Australia">Australia</option>
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
      </div>

      {loading && (
        <div className="rounded-xl border border-gray-100 bg-white p-6 text-center text-gray-500">
          Loading jobs...
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && jobs.length === 0 && (
        <div className="rounded-xl border border-gray-100 bg-white p-6 text-center text-gray-500">
          No jobs found. Try a different keyword or filter.
        </div>
      )}

      <div className="space-y-3">
        {jobs.map((job) => (
          <div key={job.id} className="bg-white rounded-xl p-5 border border-gray-100 hover:shadow-md transition-all">
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-4 flex-1">
                <div className="w-12 h-12 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg flex items-center justify-center text-primary-700 font-bold text-lg">
                  {job.company.name[0]}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{job.title}</h3>
                  <p className="text-sm text-gray-500">{job.company.name} · {job.location}</p>
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-700">{formatSalary(job)}</span>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{job.type}</span>
                    {job.visaSponsorship !== 'DOES_NOT_SPONSOR' && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                        <Globe className="w-3 h-3" /> Visa Sponsorship
                      </span>
                    )}
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {new Date(job.postedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-primary-600">
                  {job.remote ? 'Remote' : 'Onsite'}
                </div>
                <div className="flex gap-3 mt-1">
                  <Link
                    href={`/resume-builder?jobId=${job.id}`}
                    className="text-sm font-medium text-slate-600 hover:text-primary-600 flex items-center gap-1"
                  >
                    Build Resume
                  </Link>
                  <Link
                    href={`/jobs/${job.id}`}
                    className="text-sm font-medium text-primary-600 hover:text-primary-800"
                  >
                    View details
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
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
