'use client';

import { useState } from 'react';
import { ResumeProvider, useResume } from './context';
import { ResumeForm } from './components/ResumeForm';
import { ResumePreview } from './components/ResumePreview';
import { CoverLetterPreview } from './components/CoverLetterPreview';
import { Toolbar } from './components/Toolbar';
import { ATSAnalysisPanel } from './components/ATSAnalysisPanel';
import { CoverLetterEditor } from './components/CoverLetterEditor';
import { openPrintWindow, openCoverLetterPrintWindow } from './components/PrintableResume';
import { FileText, Eye, PenLine, FileSignature } from 'lucide-react';

type PreviewMode = 'resume' | 'cover-letter';
type MobileTab = 'edit' | 'preview';

function ResumeBuilderInner() {
  const { data } = useResume();
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState<PreviewMode>('resume');
  const [mobileTab, setMobileTab] = useState<MobileTab>('edit');
  const [showCoverEditor, setShowCoverEditor] = useState(false);

  const handleExportPDF = () => {
    if (previewMode === 'cover-letter') {
      openCoverLetterPrintWindow(data);
    } else {
      openPrintWindow(data);
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
              Resume Builder
            </h1>
            <p className="text-gray-500 mt-0.5 text-sm">
              Build your ATS-optimized resume with live preview & AI analysis
            </p>
          </div>
        </div>
        <Toolbar onExportPDF={handleExportPDF} onAnalyze={() => setAnalysisOpen(true)} />
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
    </div>
  );
}

export default function ResumeBuilderPage() {
  return (
    <ResumeProvider>
      <ResumeBuilderInner />
    </ResumeProvider>
  );
}
