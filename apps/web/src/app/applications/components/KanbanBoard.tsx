'use client';

import React, { useState } from 'react';
import {
  Calendar,
  Building2,
  MapPin,
  MoreVertical,
  ExternalLink,
  FileText,
  Clock,
  Sparkles,
  Globe2,
} from 'lucide-react';
import Link from 'next/link';
import { Application, ApplicationStatus, UserResume } from './types';

interface KanbanBoardProps {
  applications: Application[];
  resumes: UserResume[];
  onStatusChange: (id: string, newStatus: ApplicationStatus) => void;
  onSelectApplication: (app: Application) => void;
}

const COLUMNS: { id: ApplicationStatus; label: string; color: string; badgeColor: string }[] = [
  { id: 'SAVED', label: 'Saved', color: 'border-t-gray-400', badgeColor: 'bg-gray-100 text-gray-700' },
  { id: 'APPLYING', label: 'Applying', color: 'border-t-blue-400', badgeColor: 'bg-blue-100 text-blue-700' },
  { id: 'APPLIED', label: 'Applied', color: 'border-t-indigo-500', badgeColor: 'bg-indigo-100 text-indigo-700' },
  { id: 'SCREENING', label: 'Screening', color: 'border-t-purple-500', badgeColor: 'bg-purple-100 text-purple-700' },
  { id: 'INTERVIEWING', label: 'Interviewing', color: 'border-t-amber-500', badgeColor: 'bg-amber-100 text-amber-700' },
  { id: 'OFFERED', label: 'Offered', color: 'border-t-emerald-500', badgeColor: 'bg-emerald-100 text-emerald-700' },
  { id: 'ACCEPTED', label: 'Accepted', color: 'border-t-green-600', badgeColor: 'bg-green-100 text-green-800' },
  { id: 'REJECTED', label: 'Rejected', color: 'border-t-rose-400', badgeColor: 'bg-rose-100 text-rose-700' },
];

export function KanbanBoard({
  applications,
  resumes,
  onStatusChange,
  onSelectApplication,
}: KanbanBoardProps) {
  const [draggedApp, setDraggedApp] = useState<Application | null>(null);

  const handleDragStart = (e: React.DragEvent, app: Application) => {
    setDraggedApp(app);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, status: ApplicationStatus) => {
    e.preventDefault();
    if (draggedApp && draggedApp.status !== status) {
      onStatusChange(draggedApp.id, status);
    }
    setDraggedApp(null);
  };

  const getCompanyName = (job: Application['job']) => {
    if (typeof job.company === 'string') return job.company;
    return job.company?.name || 'Unknown';
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
    if (resumes.length > 0) {
      return {
        title: resumes[0].title,
        version: 1,
        score: resumes[0].atsScore || 85,
      };
    }
    return null;
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-6 h-full items-start min-h-[72vh] px-1">
      {COLUMNS.map((col) => {
        const columnApps = applications.filter((app) => app.status === col.id);

        return (
          <div
            key={col.id}
            className={`shrink-0 w-80 bg-slate-50/90 rounded-2xl p-3.5 flex flex-col gap-3 min-h-[580px] border border-gray-200/80 shadow-2xs border-t-4 ${col.color}`}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, col.id)}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between px-1 pt-0.5">
              <h3 className="font-bold text-xs uppercase tracking-wider text-gray-700 flex items-center gap-2">
                {col.label}
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${col.badgeColor}`}>
                  {columnApps.length}
                </span>
              </h3>
            </div>

            {/* Column Cards */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-0.5">
              {columnApps.map((app) => {
                const companyName = getCompanyName(app.job);
                const resumeInfo = getResumeForApp(app);
                const isStale =
                  app.status === 'APPLIED' &&
                  app.appliedAt &&
                  (Date.now() - new Date(app.appliedAt).getTime()) / (1000 * 60 * 60 * 24) >= 7;

                return (
                  <div
                    key={app.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, app)}
                    onClick={() => onSelectApplication(app)}
                    className="bg-white p-4 rounded-xl shadow-xs border border-gray-200/90 cursor-grab active:cursor-grabbing hover:border-primary-400 hover:shadow-md transition-all group relative"
                  >
                    {/* Follow-up Due badge */}
                    {isStale && (
                      <div className="mb-2 inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                        <Clock className="w-3 h-3 text-amber-600" /> Follow-up Due (7d+)
                      </div>
                    )}

                    <div className="flex justify-between items-start gap-2">
                      <h4 className="font-bold text-sm text-gray-900 leading-snug group-hover:text-primary-600 transition-colors">
                        {app.job.title}
                      </h4>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectApplication(app);
                        }}
                        className="text-gray-400 hover:text-gray-700 p-1 rounded hover:bg-gray-100 opacity-60 group-hover:opacity-100 transition-all"
                        title="View details"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="mt-2 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs text-gray-700 font-medium">
                        <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="truncate">{companyName}</span>
                      </div>
                      {app.job.location && (
                        <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                          <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                          <span className="truncate">{app.job.location}</span>
                        </div>
                      )}
                    </div>

                    {/* Resume Attribution Pill (Core Feature) */}
                    <div className="mt-3 pt-2.5 border-t border-gray-100">
                      {resumeInfo ? (
                        <div
                          className="flex items-center justify-between text-[11px] bg-blue-50/70 border border-blue-100 px-2.5 py-1.5 rounded-lg text-blue-900 group-hover:border-blue-200 transition-colors"
                          title={`Resume: ${resumeInfo.title} (v${resumeInfo.version})`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <FileText className="w-3 h-3 text-blue-600 shrink-0" />
                            <span className="font-semibold truncate max-w-[130px]">
                              {resumeInfo.title}
                            </span>
                          </div>
                          <span className="font-bold text-[10px] px-1.5 py-0.2 rounded bg-blue-200/80 text-blue-900 shrink-0">
                            {resumeInfo.score}% ATS
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-[11px] text-gray-400 italic bg-gray-50 px-2.5 py-1 rounded-md">
                          <FileText className="w-3 h-3 text-gray-400" />
                          <span>No resume attached</span>
                        </div>
                      )}
                    </div>

                    {/* Footer tags & links */}
                    <div className="mt-3 flex items-center justify-between gap-2 text-xs">
                      {app.appliedAt ? (
                        <span className="text-[11px] text-gray-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          {new Date(app.appliedAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      ) : (
                        <span className="text-[11px] text-gray-400">Not applied yet</span>
                      )}

                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <Link
                          href={`/resume-builder?jobId=${app.job.id}&jobTitle=${encodeURIComponent(app.job.title)}&jobCompany=${encodeURIComponent(companyName)}`}
                          className="text-[11px] font-semibold text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 px-2 py-1 rounded-md transition-colors"
                          title="Tailor resume for this role"
                        >
                          Tailor
                        </Link>
                        {(app.job.url || app.job.sourceUrl) && (
                          <a
                            href={app.job.url || app.job.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 p-1.5 rounded-md transition-colors"
                            title="Open job posting"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {columnApps.length === 0 && (
                <div className="h-28 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center text-xs font-medium text-gray-400 bg-white/40">
                  Drop applications here
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
