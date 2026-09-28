'use client';

import React from 'react';
import {
  Building2,
  MapPin,
  Calendar,
  FileText,
  ExternalLink,
  Clock,
  ChevronRight,
  MoreVertical,
  Trash2,
  Globe2,
} from 'lucide-react';
import Link from 'next/link';
import { Application, ApplicationStatus, UserResume } from './types';

interface ApplicationsTableViewProps {
  applications: Application[];
  resumes: UserResume[];
  onSelectApplication: (app: Application) => void;
  onStatusChange: (id: string, status: ApplicationStatus) => void;
  onDeleteApplication: (id: string) => void;
}

const STATUS_CONFIG: Record<ApplicationStatus, { label: string; color: string }> = {
  SAVED: { label: 'Saved', color: 'bg-gray-100 text-gray-700 border-gray-200' },
  APPLYING: { label: 'Applying', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  APPLIED: { label: 'Applied', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  SCREENING: { label: 'Screening', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  INTERVIEWING: { label: 'Interviewing', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  OFFERED: { label: 'Offered', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  ACCEPTED: { label: 'Accepted', color: 'bg-green-100 text-green-700 border-green-200' },
  REJECTED: { label: 'Rejected', color: 'bg-rose-100 text-rose-700 border-rose-200' },
  WITHDRAWN: { label: 'Withdrawn', color: 'bg-slate-100 text-slate-700 border-slate-200' },
};

export function ApplicationsTableView({
  applications,
  resumes,
  onSelectApplication,
  onStatusChange,
  onDeleteApplication,
}: ApplicationsTableViewProps) {
  const getCompanyName = (app: Application) => {
    if (typeof app.job.company === 'string') return app.job.company;
    return app.job.company?.name || 'Unknown Company';
  };

  const getResumeForApp = (app: Application) => {
    if (app.resumeVersion?.resume?.title) {
      return {
        title: app.resumeVersion.resume.title,
        version: app.resumeVersion.version,
        score: app.resumeVersion.resume.atsScore || 85,
      };
    }
    if (app.resumeVersionId) {
      const match = resumes.find((r) => r.latestVersionId === app.resumeVersionId);
      if (match) {
        return {
          title: match.title,
          version: 1,
          score: match.atsScore || 85,
        };
      }
    }
    // Default fallback to first resume if any
    if (resumes.length > 0) {
      return {
        title: resumes[0].title,
        version: 1,
        score: resumes[0].atsScore || 85,
      };
    }
    return null;
  };

  if (applications.length === 0) {
    return (
      <div className="py-16 text-center">
        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <h4 className="text-base font-semibold text-gray-700">No applications match your filter</h4>
        <p className="text-xs text-gray-500 mt-1">Try resetting your search or filter options.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50/70 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
            <th className="py-3 px-4">Company & Role</th>
            <th className="py-3 px-4">Stage</th>
            <th className="py-3 px-4">Resume Used</th>
            <th className="py-3 px-4">Date Applied</th>
            <th className="py-3 px-4">Visa Sponsorship</th>
            <th className="py-3 px-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 text-xs">
          {applications.map((app) => {
            const companyName = getCompanyName(app);
            const resumeInfo = getResumeForApp(app);
            const statusConfig = STATUS_CONFIG[app.status] || STATUS_CONFIG.SAVED;

            const isStale =
              app.status === 'APPLIED' &&
              app.appliedAt &&
              (Date.now() - new Date(app.appliedAt).getTime()) / (1000 * 60 * 60 * 24) >= 7;

            return (
              <tr
                key={app.id}
                onClick={() => onSelectApplication(app)}
                className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
              >
                {/* Company & Role */}
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs uppercase border border-gray-200 shrink-0">
                      {companyName.slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-gray-900 truncate flex items-center gap-2">
                        {app.job.title}
                        {(app.job.url || app.job.sourceUrl) && (
                          <a
                            href={app.job.url || app.job.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-gray-400 hover:text-primary-600 transition-colors"
                            title="Open posting"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-gray-500 text-[11px] mt-0.5">
                        <span className="font-medium text-gray-700">{companyName}</span>
                        {app.job.location && (
                          <>
                            <span>•</span>
                            <span className="truncate">{app.job.location}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </td>

                {/* Stage */}
                <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                  <select
                    value={app.status}
                    onChange={(e) => onStatusChange(app.id, e.target.value as ApplicationStatus)}
                    className={`text-xs font-semibold py-1 px-2.5 rounded-lg border focus:outline-none focus:ring-1 focus:ring-primary-500 cursor-pointer ${statusConfig.color}`}
                  >
                    {Object.keys(STATUS_CONFIG).map((st) => (
                      <option key={st} value={st}>
                        {STATUS_CONFIG[st as ApplicationStatus].label}
                      </option>
                    ))}
                  </select>
                </td>

                {/* Resume Used */}
                <td className="py-3.5 px-4">
                  {resumeInfo ? (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50/80 border border-blue-100 text-blue-800">
                      <FileText className="w-3 h-3 text-blue-600 shrink-0" />
                      <span className="font-semibold truncate max-w-[140px]" title={resumeInfo.title}>
                        {resumeInfo.title}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-200 text-blue-900">
                        {resumeInfo.score}%
                      </span>
                    </div>
                  ) : (
                    <span className="text-gray-400 italic">No resume attached</span>
                  )}
                </td>

                {/* Date Applied */}
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-1.5 text-gray-600">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    <span>
                      {app.appliedAt
                        ? new Date(app.appliedAt).toLocaleDateString()
                        : 'Not set'}
                    </span>
                  </div>
                  {isStale && (
                    <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded mt-1 border border-amber-200">
                      <Clock className="w-2.5 h-2.5" /> Follow-up Due
                    </div>
                  )}
                </td>

                {/* Visa Sponsorship */}
                <td className="py-3.5 px-4">
                  {app.job.visaSponsorship === 'SPONSORS' ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <Globe2 className="w-3 h-3" /> Sponsors Visa
                    </span>
                  ) : (
                    <span className="text-gray-500 text-[11px]">
                      {app.job.visaSponsorship || 'Unknown'}
                    </span>
                  )}
                </td>

                {/* Actions */}
                <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/resume-builder?jobId=${app.job.id}&jobTitle=${encodeURIComponent(app.job.title)}&jobCompany=${encodeURIComponent(companyName)}`}
                      className="text-xs font-semibold text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 px-2.5 py-1 rounded-md transition-colors"
                      title="Tailor resume"
                    >
                      Tailor
                    </Link>
                    <button
                      onClick={() => onSelectApplication(app)}
                      className="text-gray-400 hover:text-gray-700 p-1 rounded-md hover:bg-gray-100 transition-colors"
                      title="View details"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Delete or withdraw this application?')) {
                          onDeleteApplication(app.id);
                        }
                      }}
                      className="text-gray-300 hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
