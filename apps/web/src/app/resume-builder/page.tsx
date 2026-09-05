'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ResumeProvider, useResume } from './context';
import { ResumeForm } from './components/ResumeForm';
import { ResumePreview } from './components/ResumePreview';
import { CoverLetterPreview } from './components/CoverLetterPreview';
import { Toolbar } from './components/Toolbar';
import { ATSAnalysisPanel } from './components/ATSAnalysisPanel';
import { CoverLetterEditor } from './components/CoverLetterEditor';
import { GenerateResumeModal } from './components/GenerateResumeModal';
import { openPrintWindow, openCoverLetterPrintWindow } from './components/PrintableResume';
import { FileText, Eye, PenLine, FileSignature, Sparkles, Briefcase, CheckCircle2, Loader2, Wand2 } from 'lucide-react';
import { jobsApi, aiApi } from '@/lib/api';
import type { ResumeData } from './types';

type PreviewMode = 'resume' | 'cover-letter';
type MobileTab = 'edit' | 'preview';

function ResumeBuilderInner() {
  const { data, dispatch } = useResume();
  const searchParams = useSearchParams();
  const jobId = searchParams ? searchParams.get('jobId') : null;
  const autoTailorParam = searchParams ? searchParams.get('autoTailor') === 'true' : false;
  const autoGenerateParam = searchParams ? searchParams.get('autoGenerate') === 'true' : false;

  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState<PreviewMode>('resume');
  const [mobileTab, setMobileTab] = useState<MobileTab>('edit');
  const [showCoverEditor, setShowCoverEditor] = useState(false);
  const [generateModalOpen, setGenerateModalOpen] = useState(false);

  const [jobInfo, setJobInfo] = useState<{ id: string; title: string; company: string; description: string; requirements: string } | null>(null);
  const [tailoring, setTailoring] = useState(false);
  const [tailoredStatus, setTailoredStatus] = useState<string | null>(null);

  const jobTitle = searchParams ? searchParams.get('jobTitle') : null;
  const jobCompany = searchParams ? searchParams.get('jobCompany') : null;
  const jobUrl = searchParams ? searchParams.get('jobUrl') : null;

  useEffect(() => {
    // Path 1: Load job from DB by ID
    if (jobId) {
      async function loadJob() {
        const res = await jobsApi.getById(jobId as string);
        if (res.success && res.data) {
          const j = res.data as any;
          const info = {
            id: j.id,
            title: j.title || 'Target Role',
            company: j.company?.name || 'Company',
            description: j.description || '',
            requirements: j.requirements || '',
          };
          setJobInfo(info);

          if (autoGenerateParam) {
            setGenerateModalOpen(true);
          } else if (autoTailorParam) {
            triggerAutoTailor(info);
          }
        }
      }
      loadJob();
      return;
    }

    // Path 2: Load job info from query params (crawled jobs without DB ID)
    if (jobTitle) {
      const info = {
        id: '',
        title: jobTitle,
        company: jobCompany || 'Company',
        description: '',
        requirements: '',
      };
      setJobInfo(info);

      if (autoGenerateParam) {
        setGenerateModalOpen(true);
      }
    }
  }, [jobId, jobTitle]); // eslint-disable-line react-hooks/exhaustive-deps

  const triggerAutoTailor = async (info: { title: string; company: string; description: string; requirements: string }) => {
    setTailoring(true);
    setTailoredStatus(null);
    try {
      const fullJD = `${info.title} at ${info.company}\n\nDescription:\n${info.description}\n\nRequirements:\n${info.requirements}`;
      const resumeText = [
        data.basics.summary,
        ...data.experience.flatMap((e) => e.bullets),
        ...data.skillsFlat,
      ].join(' ');

      const res = await aiApi.tailorResume({
        resumeContent: resumeText,
        jobTitle: info.title,
        companyName: info.company,
        jobDescription: fullJD,
      });

      if (res.success && res.data) {
        dispatch({
          type: 'TAILOR_FOR_JOB',
          payload: {
            summary: res.data.tailoredSummary,
            addedSkills: res.data.addedSkills,
            coverLetter: res.data.coverLetter,
            bulletImprovements: res.data.bulletImprovements,
          },
        });
        setTailoredStatus(`Resume & Cover Letter tailored for ${info.title} at ${info.company}! (${res.data.atsScoreAfter}% ATS Match)`);
      }
    } catch (err) {
      console.error('Tailor failed:', err);
    } finally {
      setTailoring(false);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleApplyGeneratedResume = (result: any, options: { withCoverLetter: boolean } = { withCoverLetter: false }) => {
    dispatch({
      type: 'GENERATE_FULL_RESUME',
      payload: {
        jdAnalysis: result.jdAnalysis as any,
        strategy: result.strategy as any,
        strategyReason: String(result.strategyReason || ''),
        resumeData: result.resumeData as unknown as ResumeData,
        atsScore: Number(result.atsScore),
        atsBreakdown: (result.atsBreakdown || { keywordMatch: 0, experienceMatch: 0, skillsMatch: 0, formattingScore: 0 }) as any,
        // Only include cover letter when explicitly requested
        coverLetter: options.withCoverLetter ? String(result.coverLetter || '') : '',
        networkingTips: (result.networkingTips || []) as string[],
        interviewProbability: (result.interviewProbability || { atsPass: 0, recruiterResponse: 0, technicalInterview: 0, offerProbability: 0, expectedTimeline: '' }) as any,
        finalDecision: result.finalDecision as any,
        finalDecisionReason: String(result.finalDecisionReason || ''),
      },
    });
    setGenerateModalOpen(false);
    const coverNote = options.withCoverLetter ? ' + Cover Letter' : '';
    setTailoredStatus(`✨ Resume generated with ${result.atsScore}% ATS score (Strategy ${result.strategy})${coverNote}`);
  };

  const handleExportPDF = () => {
    if (previewMode === 'cover-letter') {
      openCoverLetterPrintWindow(data, jobInfo);
    } else {
      openPrintWindow(data, jobInfo);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] animate-fade-in">
      {/* ─── Top Bar ─── */}
      <div className="flex-shrink-0 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-7 h-7 text-primary-600" />
              Resume Builder & Tailor
            </h1>
            <p className="text-gray-500 mt-0.5 text-sm">
              Build and customize your resume specifically for any Job Description
            </p>
          </div>
          <button
            onClick={() => setGenerateModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-bold text-sm rounded-lg shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5"
          >
            <Wand2 className="w-4 h-4 text-yellow-300" />
            Generate from JD
          </button>
        </div>

        {/* ─── Job Target Banner ─── */}
        {jobInfo && (
          <div className="mb-3 bg-gradient-to-r from-slate-900 via-primary-950 to-indigo-950 rounded-xl p-4 text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in border border-primary-900/50">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/10 rounded-lg backdrop-blur-sm">
                <Briefcase className="w-6 h-6 text-primary-300" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-primary-300 font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                  <span>Target Job Description</span>
                </div>
                <h2 className="text-lg font-bold text-white mt-0.5">
                  {jobInfo.title} <span className="font-normal text-gray-300">at {jobInfo.company}</span>
                </h2>
              </div>
            </div>
            <button
              onClick={() => triggerAutoTailor(jobInfo)}
              disabled={tailoring}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-bold text-sm rounded-lg shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {tailoring ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Tailoring Resume...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-slate-950" />
                  <span>Auto-Tailor Resume for JD</span>
                </>
              )}
            </button>
          </div>
        )}

        {tailoredStatus && (
          <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-center gap-2 shadow-sm animate-fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span className="font-medium">{tailoredStatus}</span>
          </div>
        )}

        <Toolbar onExportPDF={handleExportPDF} onAnalyze={() => setAnalysisOpen(true)} jobInfo={jobInfo} />
      </div>

      {/* ─── Mobile Tab Switcher ─── */}
      <div className="flex lg:hidden mb-3 bg-gray-100 rounded-lg p-1 gap-1">
        <button
          onClick={() => setMobileTab('edit')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${
            mobileTab === 'edit'
              ? 'bg-white text-primary-700 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <PenLine className="w-4 h-4" />
          Edit
        </button>
        <button
          onClick={() => setMobileTab('preview')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${
            mobileTab === 'preview'
              ? 'bg-white text-primary-700 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Eye className="w-4 h-4" />
          Preview
        </button>
      </div>

      {/* ─── Main Split Pane ─── */}
      <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
        {/* ─── Left: Editor ─── */}
        <div
          className={`w-full lg:w-1/2 xl:w-[45%] overflow-y-auto pr-1 ${
            mobileTab === 'preview' ? 'hidden lg:block' : ''
          }`}
        >
          <ResumeForm />

          {/* Cover Letter Editor Toggle */}
          <div className="mt-4">
            <button
              onClick={() => setShowCoverEditor(!showCoverEditor)}
              className="w-full flex items-center justify-between px-4 py-3 bg-white rounded-xl border border-gray-200 hover:border-primary-300 hover:shadow-sm transition-all text-sm font-medium text-gray-700"
            >
              <span className="flex items-center gap-2">
                <FileSignature className="w-4 h-4 text-primary-500" />
                Cover Letter Editor
              </span>
              <span
                className={`transform transition-transform ${showCoverEditor ? 'rotate-180' : ''}`}
              >
                ▾
              </span>
            </button>
            {showCoverEditor && (
              <div className="mt-2 animate-slide-down">
                <CoverLetterEditor />
              </div>
            )}
          </div>
        </div>

        {/* ─── Right: Preview ─── */}
        <div
          className={`w-full lg:w-1/2 xl:w-[55%] flex flex-col min-h-0 ${
            mobileTab === 'edit' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {/* Preview Mode Tabs */}
          <div className="flex-shrink-0 flex items-center gap-2 mb-3">
            <button
              onClick={() => setPreviewMode('resume')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                previewMode === 'resume'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Resume
            </button>
            <button
              onClick={() => setPreviewMode('cover-letter')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                previewMode === 'cover-letter'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <FileSignature className="w-3.5 h-3.5" />
              Cover Letter
            </button>
          </div>

          {/* Preview Container */}
          <div className="flex-1 overflow-y-auto bg-gray-100 rounded-xl p-4 border border-gray-200">
            <div
              className="bg-white rounded-lg shadow-lg mx-auto"
              style={{
                maxWidth: '794px',
                minHeight: '1123px',
                aspectRatio: '1 / 1.414',
              }}
            >
              {previewMode === 'resume' ? (
                <ResumePreview />
              ) : (
                <CoverLetterPreview />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── ATS Analysis Slide-over ─── */}
      <ATSAnalysisPanel isOpen={analysisOpen} onClose={() => setAnalysisOpen(false)} />

      {/* ─── Generate Resume Modal ─── */}
      <GenerateResumeModal
        isOpen={generateModalOpen}
        onClose={() => setGenerateModalOpen(false)}
        onApplyResume={(result, options) => handleApplyGeneratedResume(result, options)}
        initialJobDescription={jobInfo ? `${jobInfo.title} at ${jobInfo.company}\n\nDescription:\n${jobInfo.description}\n\nRequirements:\n${jobInfo.requirements}` : ''}
        initialJobTitle={jobInfo?.title || ''}
        initialCompanyName={jobInfo?.company || ''}
      />
    </div>
  );
}

export default function ResumeBuilderPage() {
  return (
    <ResumeProvider>
      <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading Resume Builder...</div>}>
        <ResumeBuilderInner />
      </Suspense>
    </ResumeProvider>
  );
}
