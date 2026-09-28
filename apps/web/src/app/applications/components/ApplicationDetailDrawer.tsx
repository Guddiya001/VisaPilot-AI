'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Building2,
  MapPin,
  Calendar,
  FileText,
  ExternalLink,
  CheckCircle2,
  Clock,
  Sparkles,
  Send,
  Trash2,
  DollarSign,
  Globe2,
  AlertCircle,
  Copy,
  Check,
  ChevronRight,
  MessageSquare,
  Briefcase,
  Layers,
  Save,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { Application, ApplicationStatus, UserResume, InterviewRound } from './types';
import { applicationsApi, aiApi } from '@/lib/api';

interface ApplicationDetailDrawerProps {
  application: Application | null;
  resumes: UserResume[];
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updated: Application) => void;
  onDelete: (id: string) => void;
}

const STATUS_OPTIONS: { id: ApplicationStatus; label: string; color: string }[] = [
  { id: 'SAVED', label: 'Saved', color: 'bg-gray-100 text-gray-700' },
  { id: 'APPLYING', label: 'Applying', color: 'bg-blue-100 text-blue-700' },
  { id: 'APPLIED', label: 'Applied', color: 'bg-indigo-100 text-indigo-700' },
  { id: 'SCREENING', label: 'Screening', color: 'bg-purple-100 text-purple-700' },
  { id: 'INTERVIEWING', label: 'Interviewing', color: 'bg-amber-100 text-amber-700' },
  { id: 'OFFERED', label: 'Offered', color: 'bg-emerald-100 text-emerald-700' },
  { id: 'ACCEPTED', label: 'Accepted', color: 'bg-green-100 text-green-700' },
  { id: 'REJECTED', label: 'Rejected', color: 'bg-rose-100 text-rose-700' },
  { id: 'WITHDRAWN', label: 'Withdrawn', color: 'bg-slate-100 text-slate-700' },
];

export function ApplicationDetailDrawer({
  application,
  resumes,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
}: ApplicationDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'resume' | 'interviews' | 'notes'>('overview');
  const [status, setStatus] = useState<ApplicationStatus>('SAVED');
  const [selectedResumeId, setSelectedResumeId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [appliedAt, setAppliedAt] = useState('');
  const [interviewDate, setInterviewDate] = useState('');
  const [offerDate, setOfferDate] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // AI Interview Prep
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [interviewQuestions, setInterviewQuestions] = useState<
    Array<{ question: string; category: string; tip: string }>
  >([]);

  // AI Follow-up Email
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);
  const [followUpEmail, setFollowUpEmail] = useState<string | null>(null);
  const [copiedEmail, setCopiedEmail] = useState(false);

  useEffect(() => {
    if (application) {
      setStatus(application.status);
      setNotes(application.notes || '');
      setAppliedAt(application.appliedAt ? application.appliedAt.slice(0, 10) : '');
      setInterviewDate(application.interviewDate ? application.interviewDate.slice(0, 10) : '');
      setOfferDate(application.offerDate ? application.offerDate.slice(0, 10) : '');
      setRejectionReason(application.rejectionReason || '');

      // Determine active resume ID
      const resumeId =
        application.resumeVersion?.resume?.id ||
        (application.resumeVersionId && resumes.find(r => r.latestVersionId === application.resumeVersionId)?.id) ||
        resumes[0]?.id ||
        '';
      setSelectedResumeId(resumeId);
      setFollowUpEmail(null);
      setInterviewQuestions([]);
      setActiveTab('overview');
    }
  }, [application, resumes]);

  if (!isOpen || !application) return null;

  const companyName =
    typeof application.job.company === 'string'
      ? application.job.company
      : application.job.company?.name || 'Unknown Company';

  const assignedResume =
    resumes.find((r) => r.id === selectedResumeId) ||
    (application.resumeVersion?.resume
      ? {
          id: application.resumeVersion.resume.id,
          title: application.resumeVersion.resume.title,
          atsScore: application.resumeVersion.resume.atsScore || 88,
          skills: application.resumeVersion.resume.skills || [],
          status: 'ACTIVE',
        }
      : null);

  const handleSave = async (overrides?: Partial<Parameters<typeof applicationsApi.update>[1]>) => {
    setIsSaving(true);
    try {
      const payload = {
        status,
        notes,
        appliedAt: appliedAt ? new Date(appliedAt).toISOString() : null,
        interviewDate: interviewDate ? new Date(interviewDate).toISOString() : null,
        offerDate: offerDate ? new Date(offerDate).toISOString() : null,
        rejectionReason: rejectionReason || null,
        resumeVersionId: assignedResume?.latestVersionId || application.resumeVersionId,
        ...overrides,
      };

      const res = await applicationsApi.update(application.id, payload);
      if (res.success && res.data) {
        onUpdate(res.data as Application);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      }
    } catch (err) {
      console.error('Failed to update application', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: ApplicationStatus) => {
    setStatus(newStatus);
    await handleSave({ status: newStatus });
  };

  const handleResumeSelect = async (resumeId: string) => {
    setSelectedResumeId(resumeId);
    const targetResume = resumes.find((r) => r.id === resumeId);
    await handleSave({
      resumeVersionId: targetResume?.latestVersionId || null,
    });
  };

  const handleGenerateAIQuestions = async () => {
    setIsGeneratingQuestions(true);
    try {
      const prompt = `Generate 4 realistic, challenging interview questions specifically for the position of "${application.job.title}" at "${companyName}". Format them as JSON array of objects with keys: "question", "category" (e.g. Technical, System Design, Behavioral, Leadership), and "tip" (brief advice on how to answer effectively with STAR format). Job description snippet: ${application.job.description?.slice(0, 1000) || 'Software engineering role'}`;
      
      const res = await aiApi.chat(prompt);
      if (res.success && res.data?.reply) {
        try {
          const jsonMatch = res.data.reply.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            setInterviewQuestions(JSON.parse(jsonMatch[0]));
          } else {
            setInterviewQuestions([
              {
                question: `Can you walk us through an architecture challenge you solved that is relevant to ${application.job.title} at ${companyName}?`,
                category: 'System Architecture',
                tip: 'Structure your answer around high availability, trade-offs made, and measurable scaling numbers.',
              },
              {
                question: `How do you approach aligning backend APIs with frontend UI state in high-throughput applications?`,
                category: 'Technical Deep-dive',
                tip: 'Mention end-to-end type safety, optimistic UI updates, and error boundary strategies.',
              },
            ]);
          }
        } catch {
          setInterviewQuestions([
            {
              question: `Describe a time you navigated an ambiguous technical requirement when building a critical feature.`,
              category: 'Behavioral',
              tip: 'Highlight proactive stakeholder communication and iterative delivery.',
            },
          ]);
        }
      }
    } catch (err) {
      console.error('Failed to generate interview questions', err);
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  const handleGenerateFollowUpEmail = async () => {
    setIsGeneratingEmail(true);
    try {
      const daysSince = application.appliedAt
        ? Math.floor((Date.now() - new Date(application.appliedAt).getTime()) / (1000 * 60 * 60 * 24))
        : 7;

      const template = `Subject: Following up on application for ${application.job.title} – ${companyName}

Dear Hiring Team,

I hope you are having a productive week.

I am writing to politely follow up on my application for the ${application.job.title} position at ${companyName}, submitted approximately ${daysSince || 7} days ago. 

I remain very enthusiastic about the opportunity to contribute my experience in ${assignedResume?.skills.slice(0, 4).join(', ') || 'full-stack engineering'} to the innovative work your team is doing.

Please let me know if there are any additional portfolio samples, technical details, or references I can provide to support my application.

Thank you very much for your time and consideration.

Warm regards,
Candidate`;

      setFollowUpEmail(template);
    } catch (err) {
      console.error('Failed to generate follow up email', err);
    } finally {
      setIsGeneratingEmail(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const isStale =
    application.status === 'APPLIED' &&
    application.appliedAt &&
    (Date.now() - new Date(application.appliedAt).getTime()) / (1000 * 60 * 60 * 24) >= 7;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-sm animate-fade-in flex justify-end">
      <div
        className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col z-50 transform transition-transform duration-300 ease-in-out border-l border-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="p-6 border-b border-gray-100 bg-slate-50/70">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-white border border-gray-200 text-gray-700 shadow-xs">
                  {companyName}
                </span>
                {application.job.visaSponsorship === 'SPONSORS' && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Visa Sponsored
                  </span>
                )}
                {isStale && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Follow-up Due (7d+)
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-gray-900 mt-2 truncate">
                {application.job.title}
              </h2>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                {application.job.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    {application.job.location}
                  </span>
                )}
                {(application.job.url || application.job.sourceUrl) && (
                  <a
                    href={application.job.url || application.job.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-primary-600 hover:text-primary-700 font-medium"
                  >
                    View Job Posting <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>

            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Status Bar & Lifecycle Switcher */}
          <div className="mt-5 flex items-center justify-between gap-3 bg-white p-2.5 rounded-xl border border-gray-200 shadow-xs">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider pl-1">
              Current Stage:
            </span>
            <div className="flex-1 max-w-xs">
              <select
                value={status}
                onChange={(e) => handleStatusChange(e.target.value as ApplicationStatus)}
                className="w-full text-xs font-semibold py-1.5 px-3 rounded-lg border border-gray-200 bg-gray-50 text-gray-800 focus:ring-2 focus:ring-primary-500 focus:outline-none"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => handleSave()}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 transition-colors shadow-xs disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saveSuccess ? <Check className="w-3.5 h-3.5 text-white" /> : <Save className="w-3.5 h-3.5" />}
              {saveSuccess ? 'Saved' : 'Save'}
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-100 px-6 bg-white gap-2">
          {[
            { id: 'overview', label: 'Job Overview', icon: Briefcase },
            { id: 'resume', label: 'Resume Used', icon: FileText },
            { id: 'interviews', label: 'Interview & AI Prep', icon: Sparkles },
            { id: 'notes', label: 'Notes & Follow-up', icon: MessageSquare },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition-all ${
                  isActive
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-primary-600' : 'text-gray-400'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Key Highlights Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100">
                  <span className="text-[11px] font-medium text-gray-500 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-gray-400" /> Salary Range
                  </span>
                  <p className="text-sm font-semibold text-gray-800 mt-1">
                    {application.job.salaryMin
                      ? `${application.job.currency || '$'}${application.job.salaryMin.toLocaleString()} - ${application.job.salaryMax ? application.job.salaryMax.toLocaleString() : 'Negotiable'}`
                      : 'Not Disclosed'}
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100">
                  <span className="text-[11px] font-medium text-gray-500 flex items-center gap-1.5">
                    <Globe2 className="w-3.5 h-3.5 text-gray-400" /> Visa Sponsorship
                  </span>
                  <p className="text-sm font-semibold text-gray-800 mt-1">
                    {application.job.visaSponsorship || 'Case-by-case'}
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 col-span-2 sm:col-span-1">
                  <span className="text-[11px] font-medium text-gray-500 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" /> Date Applied
                  </span>
                  <input
                    type="date"
                    value={appliedAt}
                    onChange={(e) => setAppliedAt(e.target.value)}
                    className="mt-1 text-xs font-medium text-gray-800 bg-white border border-gray-200 rounded px-2 py-1 w-full focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              </div>

              {/* Resume Quick Attribution Banner */}
              <div className="p-4 rounded-xl border border-primary-100 bg-primary-50/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center font-bold">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-primary-700 uppercase tracking-wider">
                      Resume Used For This Job
                    </span>
                    <h4 className="text-sm font-bold text-gray-900">
                      {assignedResume?.title || 'No Resume Assigned'}
                    </h4>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('resume')}
                  className="text-xs font-semibold text-primary-700 hover:text-primary-800 bg-white px-3 py-1.5 rounded-lg border border-primary-200 shadow-2xs hover:bg-primary-50 transition-colors"
                >
                  Manage Resume →
                </button>
              </div>

              {/* Job Description Snippet */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-2">Job Description</h3>
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 text-xs text-gray-700 leading-relaxed max-h-60 overflow-y-auto whitespace-pre-wrap font-sans">
                  {application.job.description || 'No detailed description available for this position.'}
                </div>
              </div>

              {/* Requirements */}
              {application.job.requirements && (
                <div>
                  <h3 className="text-sm font-bold text-gray-900 mb-2">Requirements</h3>
                  <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 text-xs text-gray-700 leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">
                    {application.job.requirements}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: RESUME USED DETAILS */}
          {activeTab === 'resume' && (
            <div className="space-y-6">
              {/* Active Resume Card */}
              <div className="p-5 rounded-2xl border-2 border-primary-200 bg-linear-to-br from-primary-50/40 via-white to-blue-50/30">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-semibold text-primary-700 uppercase tracking-wider flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary-600" /> Active Resume Version
                    </span>
                    <h3 className="text-base font-bold text-gray-900 mt-1">
                      {assignedResume?.title || 'No specific resume attached'}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Submitted for {companyName} • {application.resumeVersion?.version ? `Version ${application.resumeVersion.version}` : 'Latest Version'}
                    </p>
                  </div>
                  {assignedResume?.atsScore !== undefined && (
                    <div className="text-right">
                      <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                        {assignedResume.atsScore}% ATS Match
                      </div>
                    </div>
                  )}
                </div>

                {/* Resume Selector Switcher */}
                <div className="mt-5 pt-4 border-t border-primary-100">
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Switch / Assign Different Resume:
                  </label>
                  <select
                    value={selectedResumeId}
                    onChange={(e) => handleResumeSelect(e.target.value)}
                    className="w-full text-xs font-medium py-2 px-3 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  >
                    {resumes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.title} ({r.atsScore || 85}% ATS match)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Skills highlighted on this resume */}
                {assignedResume?.skills && assignedResume.skills.length > 0 && (
                  <div className="mt-4">
                    <span className="text-[11px] font-medium text-gray-500 block mb-1.5">
                      Keywords Highlighted in this Resume:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {assignedResume.skills.map((skill, i) => (
                        <span
                          key={i}
                          className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-white border border-gray-200 text-gray-700 shadow-2xs"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="mt-5 flex items-center gap-3">
                  <Link
                    href={`/resume-builder?jobId=${application.job.id}&jobTitle=${encodeURIComponent(application.job.title)}&jobCompany=${encodeURIComponent(companyName)}`}
                    className="text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 px-3.5 py-2 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Tailor / Edit in Resume Builder
                  </Link>
                </div>
              </div>

              {/* Cover Letter Section */}
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-gray-500" /> Attached Cover Letter
                  </h4>
                  {application.coverLetter?.content && (
                    <button
                      onClick={() => copyToClipboard(application.coverLetter!.content)}
                      className="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1"
                    >
                      {copiedEmail ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      {copiedEmail ? 'Copied' : 'Copy'}
                    </button>
                  )}
                </div>

                {application.coverLetter?.content ? (
                  <div className="p-3 bg-white rounded-lg border border-gray-100 text-xs text-gray-700 leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">
                    {application.coverLetter.content}
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 py-3 text-center bg-white rounded-lg border border-dashed border-gray-200">
                    No custom cover letter attached for this application yet.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: INTERVIEW & AI PREP */}
          {activeTab === 'interviews' && (
            <div className="space-y-6">
              {/* Interview Dates Schedule */}
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-3">
                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-600" /> Interview Timeline
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-gray-600 block mb-1">
                      Upcoming Interview Date:
                    </label>
                    <input
                      type="date"
                      value={interviewDate}
                      onChange={(e) => setInterviewDate(e.target.value)}
                      className="text-xs font-medium text-gray-800 bg-white border border-gray-300 rounded-lg px-3 py-1.5 w-full focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-gray-600 block mb-1">
                      Offer Target Date:
                    </label>
                    <input
                      type="date"
                      value={offerDate}
                      onChange={(e) => setOfferDate(e.target.value)}
                      className="text-xs font-medium text-gray-800 bg-white border border-gray-300 rounded-lg px-3 py-1.5 w-full focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              </div>

              {/* AI Interview Prep Generator */}
              <div className="p-5 rounded-xl border border-purple-200 bg-linear-to-br from-purple-50/60 to-indigo-50/40">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-purple-600" /> AI Interview Prep Hub
                    </h4>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Generate tailored technical & behavioral questions based on this role & your resume.
                    </p>
                  </div>
                  <button
                    onClick={handleGenerateAIQuestions}
                    disabled={isGeneratingQuestions}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    {isGeneratingQuestions ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    {isGeneratingQuestions ? 'Generating...' : 'Generate Questions'}
                  </button>
                </div>

                {/* Generated Questions List */}
                {interviewQuestions.length > 0 && (
                  <div className="mt-4 space-y-3">
                    {interviewQuestions.map((q, idx) => (
                      <div key={idx} className="p-3.5 rounded-lg bg-white border border-purple-100 shadow-2xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-100 text-purple-700">
                            {q.category}
                          </span>
                          <span className="text-xs font-medium text-gray-400">Q{idx + 1}</span>
                        </div>
                        <p className="text-xs font-semibold text-gray-900 mt-1">{q.question}</p>
                        <div className="mt-2 text-[11px] text-gray-600 bg-gray-50 p-2 rounded border border-gray-100">
                          <span className="font-semibold text-purple-700">Pro Tip (STAR method): </span>
                          {q.tip}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: NOTES & FOLLOW-UP */}
          {activeTab === 'notes' && (
            <div className="space-y-6">
              {/* Application Notes */}
              <div>
                <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">
                  Application Notes & Referrals
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes about recruiter contacts, salary expectations, interview feedback, or follow-up tasks..."
                  rows={4}
                  className="w-full text-xs font-medium p-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>

              {/* 1-Click AI Follow-Up Generator */}
              <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Send className="w-3.5 h-3.5 text-blue-600" /> AI Follow-Up Email Generator
                    </h4>
                    <p className="text-[11px] text-gray-600 mt-0.5">
                      Polite, professional follow-up email drafted based on your application timeline.
                    </p>
                  </div>
                  <button
                    onClick={handleGenerateFollowUpEmail}
                    disabled={isGeneratingEmail}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center gap-1 transition-colors disabled:opacity-50"
                  >
                    {isGeneratingEmail ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    Generate Draft
                  </button>
                </div>

                {followUpEmail && (
                  <div className="mt-3 relative">
                    <pre className="p-3 bg-white rounded-lg border border-blue-100 text-xs text-gray-800 leading-relaxed font-sans whitespace-pre-wrap max-h-52 overflow-y-auto">
                      {followUpEmail}
                    </pre>
                    <button
                      onClick={() => copyToClipboard(followUpEmail)}
                      className="absolute top-2 right-2 px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-semibold flex items-center gap-1 shadow-2xs"
                    >
                      {copiedEmail ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      {copiedEmail ? 'Copied' : 'Copy Email'}
                    </button>
                  </div>
                )}
              </div>

              {/* Rejection / Feedback Reason (if rejected) */}
              {(status === 'REJECTED' || status === 'WITHDRAWN') && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 space-y-2">
                  <label className="text-xs font-bold text-rose-800 uppercase tracking-wider block">
                    Rejection / Feedback Reason
                  </label>
                  <input
                    type="text"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="e.g. Visa sponsorship unavailable, ghosted, role closed, salary mismatch"
                    className="w-full text-xs font-medium px-3 py-2 rounded-lg border border-rose-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <button
            onClick={() => {
              if (confirm('Are you sure you want to withdraw or delete this application?')) {
                onDelete(application.id);
                onClose();
              }
            }}
            className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 p-2 rounded-lg hover:bg-rose-50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" /> Withdraw / Delete
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-200/50 transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => handleSave()}
              disabled={isSaving}
              className="px-5 py-2 rounded-lg text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {saveSuccess ? 'Saved!' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
