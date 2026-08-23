'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Clock, Globe, Bookmark, Sparkles, FileText } from 'lucide-react';
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

function formatSalary(job: Job) {
  if (job?.salaryMin == null && job?.salaryMax == null) {
    return 'Salary not specified';
  }
  const min = job?.salaryMin != null ? job.salaryMin.toLocaleString() : '?';
  const max = job?.salaryMax != null ? job.salaryMax.toLocaleString() : '?';
  return `${job?.salaryCurrency || '$'} ${min} - ${max}`;
}

function unescapeHtml(safe: string) {
  if (!safe) return '';
  return safe
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'");
}

export default function JobDetailPage() {
  const params = useParams();
  const jobId = params?.id as string | undefined;
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!jobId) {
      setError('Job ID is missing.');
      setLoading(false);
      return;
    }

    const id = jobId;

    async function fetchJob() {
      setLoading(true);
      setError('');

      const result = await jobsApi.getById(id);
      if (!result.success) {
        setError(result.error || 'Failed to load job details.');
        setLoading(false);
        return;
      }

      setJob(result.data as Job);
      setLoading(false);
    }

    fetchJob();
  }, [jobId]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/jobs" className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-800">
            <ArrowLeft className="w-4 h-4" /> Back to job search
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-3">Job Details</h1>
          <p className="text-gray-500 mt-1">View the full job description and application details.</p>
        </div>
      </div>

      {loading && (
        <div className="rounded-xl border border-gray-100 bg-white p-6 text-center text-gray-500">
          Loading job details...
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && job && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-primary-600 font-semibold mb-2">
                  {job.type.replace('_', ' ')} · {job.remote ? 'Remote' : 'Onsite'}
                </div>
                <h2 className="text-3xl font-semibold text-gray-900">{job.title}</h2>
                <p className="text-sm text-gray-500 mt-2">{job.company.name} · {job.location}</p>
              </div>
              <div className="flex flex-col gap-3 text-sm text-gray-600">
                <div className="rounded-lg bg-slate-50 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Salary</div>
                  <div className="mt-1 font-semibold text-slate-900">{formatSalary(job)}</div>
                </div>
                <div className="rounded-lg bg-slate-50 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Posted</div>
                  <div className="mt-1 text-slate-900">{new Date(job.postedAt).toLocaleDateString()}</div>
                </div>
                <div className="rounded-lg bg-slate-50 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Visa Sponsorship</div>
                  <div className="mt-1 text-slate-900">{job.visaSponsorship.replace('_', ' ')}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
            <div className="space-y-6">
              <section className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
                <h3 className="text-xl font-semibold text-gray-900">Job description</h3>
                <div 
                  className="mt-4 text-gray-700 prose prose-slate max-w-none prose-a:text-primary-600 hover:prose-a:text-primary-700" 
                  dangerouslySetInnerHTML={{ __html: unescapeHtml(job.description) }} 
                />
              </section>

              <section className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
                <h3 className="text-xl font-semibold text-gray-900">Requirements</h3>
                <div 
                  className="mt-4 text-gray-700 prose prose-slate max-w-none prose-a:text-primary-600 hover:prose-a:text-primary-700" 
                  dangerouslySetInnerHTML={{ __html: unescapeHtml(job.requirements) }} 
                />
              </section>

              <section className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
                <h3 className="text-xl font-semibold text-gray-900">How to apply</h3>
                <p className="mt-3 text-gray-700">Apply through the original job posting or generate a tailored resume customized for this position.</p>
                <div className="flex flex-wrap gap-3 mt-4">
                  <a
                    href={job.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-slate-800 transition-all"
                  >
                    <Globe className="w-4 h-4" />
                    Visit Job Posting
                  </a>
                  <Link
                    href={`/resume-builder?jobId=${job.id}&autoGenerate=true`}
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary-600 to-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-md hover:from-primary-700 hover:to-indigo-700 transition-all transform hover:-translate-y-0.5"
                  >
                    <Sparkles className="w-4 h-4 text-yellow-300 animate-pulse" />
                    Generate Resume for this Job
                  </Link>
                  <Link
                    href={`/resume-builder?jobId=${job.id}`}
                    className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all"
                  >
                    <FileText className="w-4 h-4 text-gray-500" />
                    Open in Resume Builder
                  </Link>
                </div>
              </section>
            </div>

            <aside className="space-y-4">
              <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
                <h4 className="text-lg font-semibold text-gray-900">Company</h4>
                <p className="mt-3 text-gray-700">{job.company.name}</p>
                <div className="mt-4 text-sm text-gray-500 space-y-2">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-slate-400" />
                    <span>{job.country}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span>{job.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Bookmark className="w-4 h-4 text-slate-400" />
                    <span>{job.source}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
                <h4 className="text-lg font-semibold text-gray-900">Skills</h4>
                <div className="mt-3 flex flex-wrap gap-2">
                  {job.skills.map((skill) => (
                    <span key={skill} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-700">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </div>
      )}
    </div>
  );
}
