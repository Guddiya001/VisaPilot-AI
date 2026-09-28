'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { applicationsApi, resumesApi, authApi } from '@/lib/api';
import { KanbanBoard } from './components/KanbanBoard';
import { ApplicationsTableView } from './components/ApplicationsTableView';
import { ApplicationDetailDrawer } from './components/ApplicationDetailDrawer';
import { AddApplicationModal } from './components/AddApplicationModal';
import { Application, ApplicationStatus, UserResume } from './components/types';
import {
  LayoutDashboard,
  Table,
  Plus,
  Search,
  Filter,
  FileText,
  Clock,
  Sparkles,
  Trophy,
  Briefcase,
  Layers,
  RefreshCw,
  Loader2,
} from 'lucide-react';

const SAMPLE_RESUMES: UserResume[] = [
  {
    id: 'resume-1',
    title: 'Software Engineer - General',
    status: 'ACTIVE',
    skills: ['TypeScript', 'React', 'Node.js', 'Python', 'AWS', 'Docker'],
    atsScore: 88,
    latestVersionId: 'v1',
  },
  {
    id: 'resume-2',
    title: 'Senior Full-Stack - EU Focus',
    status: 'ACTIVE',
    skills: ['TypeScript', 'React', 'Next.js', 'Node.js', 'GraphQL', 'Kubernetes'],
    atsScore: 94,
    latestVersionId: 'v2',
  },
  {
    id: 'resume-3',
    title: 'Staff AI/ML Engineer',
    status: 'ACTIVE',
    skills: ['Python', 'FastAPI', 'PyTorch', 'MLOps', 'Vector DBs', 'LLMs'],
    atsScore: 91,
    latestVersionId: 'v3',
  },
];

const SAMPLE_APPLICATIONS: Application[] = [
  {
    id: 'app-1',
    status: 'INTERVIEWING',
    appliedAt: new Date(Date.now() - 14 * 86400000).toISOString(),
    interviewDate: new Date(Date.now() + 2 * 86400000).toISOString(),
    notes: 'Technical round with hiring manager scheduled. Review distributed systems & API design.',
    resumeVersionId: 'v2',
    resumeVersion: {
      id: 'v2',
      version: 2,
      resume: {
        id: 'resume-2',
        title: 'Senior Full-Stack - EU Focus',
        atsScore: 94,
        skills: ['TypeScript', 'React', 'Node.js', 'GraphQL'],
      },
    },
    job: {
      id: 'job-1',
      title: 'Senior Full-Stack Engineer',
      company: { name: 'Spotify' },
      location: 'Stockholm, Sweden (Hybrid)',
      workMode: 'HYBRID',
      visaSponsorship: 'SPONSORS',
      salaryMin: 85000,
      salaryMax: 105000,
      currency: '€',
      url: 'https://spotify.com/careers',
      description: 'Join our Core Infrastructure tribe building web tools used by millions of listeners and artists.',
      requirements: '5+ years experience with React, TypeScript, and microservice backend systems.',
    },
  },
  {
    id: 'app-2',
    status: 'APPLIED',
    appliedAt: new Date(Date.now() - 8 * 86400000).toISOString(), // >7 days => Stale / Follow-up due
    notes: 'Applied through company portal. Referred by Alex M.',
    resumeVersionId: 'v1',
    resumeVersion: {
      id: 'v1',
      version: 1,
      resume: {
        id: 'resume-1',
        title: 'Software Engineer - General',
        atsScore: 88,
        skills: ['TypeScript', 'React', 'Node.js'],
      },
    },
    job: {
      id: 'job-2',
      title: 'Senior Frontend Engineer - Design Systems',
      company: { name: 'Stripe' },
      location: 'London, UK (Remote / Hybrid)',
      workMode: 'HYBRID',
      visaSponsorship: 'SPONSORS',
      salaryMin: 95000,
      salaryMax: 125000,
      currency: '£',
      url: 'https://stripe.com/jobs',
      description: 'Help develop and scale modern UI design frameworks across Stripe products.',
      requirements: 'Expertise in modern web architecture, CSS performance, and accessibility.',
    },
  },
  {
    id: 'app-3',
    status: 'SCREENING',
    appliedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    interviewDate: new Date(Date.now() + 1 * 86400000).toISOString(),
    notes: 'Recruiter phone screening call booked for tomorrow 3 PM CET.',
    resumeVersionId: 'v2',
    resumeVersion: {
      id: 'v2',
      version: 2,
      resume: {
        id: 'resume-2',
        title: 'Senior Full-Stack - EU Focus',
        atsScore: 94,
        skills: ['TypeScript', 'React', 'Node.js'],
      },
    },
    job: {
      id: 'job-3',
      title: 'Full-Stack Platform Engineer',
      company: { name: 'Revolut' },
      location: 'Berlin, Germany',
      workMode: 'HYBRID',
      visaSponsorship: 'SPONSORS',
      salaryMin: 90000,
      salaryMax: 110000,
      currency: '€',
      url: 'https://revolut.com/careers',
      description: 'Building high-throughput financial microservices and modular frontend banking apps.',
    },
  },
  {
    id: 'app-4',
    status: 'OFFERED',
    appliedAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    offerDate: new Date(Date.now() - 2 * 86400000).toISOString(),
    notes: 'Written offer received! Competitive stock grants + full visa relocation assistance package.',
    resumeVersionId: 'v2',
    resumeVersion: {
      id: 'v2',
      version: 2,
      resume: {
        id: 'resume-2',
        title: 'Senior Full-Stack - EU Focus',
        atsScore: 94,
        skills: ['TypeScript', 'Node.js', 'AWS'],
      },
    },
    job: {
      id: 'job-4',
      title: 'Senior Backend Engineer (Fintech)',
      company: { name: 'Klarna' },
      location: 'Stockholm, Sweden',
      workMode: 'HYBRID',
      visaSponsorship: 'SPONSORS',
      salaryMin: 92000,
      salaryMax: 115000,
      currency: '€',
      url: 'https://klarna.com/careers',
      description: 'Scale payment infrastructure and settlement microservices.',
    },
  },
  {
    id: 'app-5',
    status: 'SAVED',
    notes: 'Job discovered via VisaPilot search. Need to tailor AI/ML skills on resume before submitting.',
    resumeVersionId: 'v3',
    resumeVersion: {
      id: 'v3',
      version: 3,
      resume: {
        id: 'resume-3',
        title: 'Staff AI/ML Engineer',
        atsScore: 91,
        skills: ['Python', 'FastAPI', 'PyTorch'],
      },
    },
    job: {
      id: 'job-5',
      title: 'AI Solutions Architect',
      company: { name: 'Datadog' },
      location: 'Paris, France (Remote)',
      workMode: 'REMOTE',
      visaSponsorship: 'SPONSORS',
      salaryMin: 110000,
      salaryMax: 140000,
      currency: '€',
      url: 'https://datadoghq.com/careers',
      description: 'Architect generative AI monitoring and LLM evaluation observability pipelines.',
    },
  },
];

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [resumes, setResumes] = useState<UserResume[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedResumeFilter, setSelectedResumeFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');

  // Modals & Drawer State
  const [selectedAppForDrawer, setSelectedAppForDrawer] = useState<Application | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [appsRes, resumesRes] = await Promise.all([
        applicationsApi.getAll(),
        resumesApi.getAll(),
      ]);

      let userResumes = SAMPLE_RESUMES;
      if (resumesRes.success && resumesRes.data?.data && Array.isArray(resumesRes.data.data)) {
        userResumes = resumesRes.data.data as UserResume[];
      }
      setResumes(userResumes);

      if (appsRes.success && appsRes.data?.data && appsRes.data.data.length > 0) {
        setApplications(appsRes.data.data as Application[]);
      } else {
        // Use demo sample data if user hasn't added applications yet
        setApplications(SAMPLE_APPLICATIONS);
      }
    } catch (err) {
      console.warn('Using sample applications data', err);
      setApplications(SAMPLE_APPLICATIONS);
      setResumes(SAMPLE_RESUMES);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: ApplicationStatus) => {
    setApplications((prev) =>
      prev.map((app) => (app.id === id ? { ...app, status: newStatus } : app))
    );

    if (selectedAppForDrawer && selectedAppForDrawer.id === id) {
      setSelectedAppForDrawer((prev) => (prev ? { ...prev, status: newStatus } : null));
    }

    try {
      await applicationsApi.updateStatus(id, newStatus);
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  const handleUpdateApplication = (updatedApp: Application) => {
    setApplications((prev) =>
      prev.map((app) => (app.id === updatedApp.id ? updatedApp : app))
    );
    setSelectedAppForDrawer(updatedApp);
  };

  const handleDeleteApplication = async (id: string) => {
    setApplications((prev) => prev.filter((app) => app.id !== id));
    if (selectedAppForDrawer?.id === id) {
      setSelectedAppForDrawer(null);
    }
    try {
      await applicationsApi.delete(id);
    } catch (err) {
      console.error('Failed to delete application', err);
    }
  };

  const handleAddApplication = (newApp: Application) => {
    setApplications((prev) => [newApp, ...prev]);
  };

  // Filtered Applications
  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const title = app.job.title.toLowerCase();
        const company = (typeof app.job.company === 'string' ? app.job.company : app.job.company?.name || '').toLowerCase();
        const notes = (app.notes || '').toLowerCase();
        if (!title.includes(query) && !company.includes(query) && !notes.includes(query)) {
          return false;
        }
      }

      // Resume filter
      if (selectedResumeFilter !== 'ALL') {
        const appResumeId =
          app.resumeVersion?.resume?.id ||
          resumes.find((r) => r.latestVersionId === app.resumeVersionId)?.id;
        if (appResumeId !== selectedResumeFilter) {
          return false;
        }
      }

      // Status filter
      if (selectedStatusFilter !== 'ALL') {
        if (app.status !== selectedStatusFilter) {
          return false;
        }
      }

      return true;
    });
  }, [applications, searchQuery, selectedResumeFilter, selectedStatusFilter, resumes]);

  // Key KPI Metrics
  const stats = useMemo(() => {
    const total = applications.length;
    const interviewing = applications.filter((a) => a.status === 'INTERVIEWING' || a.status === 'SCREENING').length;
    const offered = applications.filter((a) => a.status === 'OFFERED' || a.status === 'ACCEPTED').length;
    const followUps = applications.filter((a) => {
      if (a.status !== 'APPLIED' || !a.appliedAt) return false;
      const days = (Date.now() - new Date(a.appliedAt).getTime()) / (1000 * 60 * 60 * 24);
      return days >= 7;
    }).length;

    return { total, interviewing, offered, followUps };
  }, [applications]);

  if (loading) {
    return (
      <div className="flex h-[75vh] items-center justify-center">
        <div className="flex items-center gap-3 text-primary-600 bg-primary-50 px-6 py-3 rounded-full shadow-xs border border-primary-100">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm font-medium">Loading application tracking system...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in flex flex-col min-h-screen pb-12">
      {/* Top Header & Metrics Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
              <LayoutDashboard className="w-6 h-6 text-primary-600" />
              Application Tracking System
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary-50 text-primary-700 border border-primary-100">
              ATS Pro
            </span>
          </div>
          <p className="text-gray-500 text-xs mt-1">
            Track applications across all interview stages, attribute tailored resumes, and monitor follow-ups.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Application
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-2xs">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
            <Briefcase className="w-3.5 h-3.5 text-gray-400" /> Total Applications
          </span>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-2xs">
          <span className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" /> In Interview Stages
          </span>
          <p className="text-2xl font-bold text-amber-600 mt-1">{stats.interviewing}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-2xs">
          <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-emerald-500" /> Offers Received
          </span>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.offered}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-2xs">
          <span className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-rose-500" /> Follow-ups Due (7d+)
          </span>
          <p className="text-2xl font-bold text-rose-600 mt-1">{stats.followUps}</p>
        </div>
      </div>

      {/* Control Bar: Search, Filters & View Switcher */}
      <div className="bg-white p-3.5 rounded-2xl border border-gray-200/90 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search role, company, or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs font-medium pl-9 pr-3 py-2 rounded-xl border border-gray-200 bg-gray-50/50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all"
          />
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap justify-between md:justify-end">
          {/* Resume Filter (Core Feature) */}
          <div className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-gray-400" />
            <select
              value={selectedResumeFilter}
              onChange={(e) => setSelectedResumeFilter(e.target.value)}
              className="text-xs font-medium py-1.5 px-2.5 rounded-lg border border-gray-200 bg-gray-50/60 text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="ALL">All Resumes Used</option>
              {resumes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="text-xs font-medium py-1.5 px-2.5 rounded-lg border border-gray-200 bg-gray-50/60 text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="ALL">All Stages</option>
              <option value="SAVED">Saved</option>
              <option value="APPLYING">Applying</option>
              <option value="APPLIED">Applied</option>
              <option value="SCREENING">Screening</option>
              <option value="INTERVIEWING">Interviewing</option>
              <option value="OFFERED">Offered</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          {/* View Toggle (Kanban vs Table) */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200/80">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                viewMode === 'kanban'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Kanban
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                viewMode === 'table'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              Table
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area: Kanban or Table */}
      <div className="flex-1 bg-white rounded-2xl border border-gray-200/80 shadow-2xs p-4 overflow-hidden">
        {viewMode === 'kanban' ? (
          <KanbanBoard
            applications={filteredApplications}
            resumes={resumes}
            onStatusChange={handleStatusChange}
            onSelectApplication={(app) => setSelectedAppForDrawer(app)}
          />
        ) : (
          <ApplicationsTableView
            applications={filteredApplications}
            resumes={resumes}
            onSelectApplication={(app) => setSelectedAppForDrawer(app)}
            onStatusChange={handleStatusChange}
            onDeleteApplication={handleDeleteApplication}
          />
        )}
      </div>

      {/* Application Detail Drawer */}
      <ApplicationDetailDrawer
        application={selectedAppForDrawer}
        resumes={resumes}
        isOpen={!!selectedAppForDrawer}
        onClose={() => setSelectedAppForDrawer(null)}
        onUpdate={handleUpdateApplication}
        onDelete={handleDeleteApplication}
      />

      {/* Add Application Modal */}
      <AddApplicationModal
        isOpen={isAddModalOpen}
        resumes={resumes}
        onClose={() => setIsAddModalOpen(false)}
        onAdded={handleAddApplication}
      />
    </div>
  );
}
