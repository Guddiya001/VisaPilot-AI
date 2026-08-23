'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  X, Sparkles, Loader2, CheckCircle2, AlertCircle,
  Target, Brain, FileText, BarChart3, Mail, TrendingUp,
  Award, Rocket, ArrowRight, Copy, ChevronDown, ChevronUp,
  Briefcase, Globe, Zap,
} from 'lucide-react';
import { aiApi } from '@/lib/api';
import type { GenerationPhase, ResumeData } from '../types';
import { GENERATION_PHASES } from '../types';

interface GenerateResumeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyResume: (result: GenerateResult) => void;
  initialJobDescription?: string;
  initialJobTitle?: string;
  initialCompanyName?: string;
}

interface GenerateResult {
  jdAnalysis: Record<string, unknown>;
  strategy: 'A' | 'B' | 'C';
  strategyReason: string;
  resumeData: Record<string, unknown>;
  atsScore: number;
  atsBreakdown: {
    keywordMatch: number;
    experienceMatch: number;
    skillsMatch: number;
    formattingScore: number;
    locationMatch: number;
    companyAlignment: number;
  };
  coverLetter: string;
  networkingTips: string[];
  interviewProbability: {
    atsPass: number;
    recruiterResponse: number;
    technicalInterview: number;
    offerProbability: number;
    expectedTimeline: string;
  };
  finalDecision: string;
  finalDecisionReason: string;
}

const STRATEGY_INFO: Record<string, { label: string; description: string; color: string }> = {
  A: { label: 'Backend Platform', description: 'Node.js, APIs, Distributed Systems, Cloud', color: 'from-blue-500 to-cyan-500' },
  B: { label: 'AI Platform', description: 'AI Agents, RAG, LangChain, LLM, MCP', color: 'from-purple-500 to-pink-500' },
  C: { label: 'Full-Stack', description: 'React, Next.js, Node.js, TypeScript, E2E', color: 'from-amber-500 to-orange-500' },
};

const DECISION_STYLES: Record<string, { bg: string; text: string; icon: typeof Rocket; label: string }> = {
  APPLY_TODAY: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-800', icon: Rocket, label: '🚀 APPLY TODAY' },
  APPLY_WITH_REFERRAL: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-800', icon: Globe, label: '🤝 APPLY WITH REFERRAL' },
  APPLY_AFTER_RESUME_FIX: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-800', icon: FileText, label: '📝 APPLY AFTER RESUME FIX' },
  SKIP_ROLE: { bg: 'bg-red-50 border-red-200', text: 'text-red-800', icon: X, label: '⏭️ SKIP ROLE' },
};

function ScoreGauge({ score, label, size = 'md' }: { score: number; label: string; size?: 'sm' | 'md' }) {
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const color = score >= 85 ? '#10b981' : score >= 70 ? '#f59e0b' : '#ef4444';
  const dim = size === 'sm' ? 80 : 100;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: dim, height: dim }}>
        <svg className="transform -rotate-90" width={dim} height={dim} viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" stroke="#e5e7eb" strokeWidth="8" fill="none" />
          <circle
            cx="50" cy="50" r="40"
            stroke={color} strokeWidth="8" fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-bold ${size === 'sm' ? 'text-lg' : 'text-2xl'}`} style={{ color }}>
            {score}
          </span>
        </div>
      </div>
      <span className={`text-center font-medium ${size === 'sm' ? 'text-xs' : 'text-xs'} text-gray-600`}>{label}</span>
    </div>
  );
}

function ProbabilityBar({ value, label, icon: Icon }: { value: number; label: string; icon: typeof TrendingUp }) {
  const color = value >= 70 ? 'bg-emerald-500' : value >= 45 ? 'bg-amber-500' : 'bg-red-400';
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 font-medium text-gray-700">
          <Icon className="w-3.5 h-3.5 text-gray-400" />
          {label}
        </span>
        <span className="font-bold text-gray-900">{value}%</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-out ${color}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export function GenerateResumeModal({
  isOpen,
  onClose,
  onApplyResume,
  initialJobDescription = '',
  initialJobTitle = '',
  initialCompanyName = '',
}: GenerateResumeModalProps) {
  const [jd, setJd] = useState(initialJobDescription);
  const [jobTitle, setJobTitle] = useState(initialJobTitle);
  const [companyName, setCompanyName] = useState(initialCompanyName);
  const [strategy, setStrategy] = useState<'A' | 'B' | 'C' | 'auto'>('auto');
  const [phase, setPhase] = useState<GenerationPhase>('idle');
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [error, setError] = useState('');
  const [showNetworking, setShowNetworking] = useState(false);

  // Sync props into state whenever the modal opens or initial values update.
  // useState only reads its argument once on mount, so async-loaded job info
  // would otherwise never appear in the modal fields.
  useEffect(() => {
    if (isOpen) {
      if (initialJobDescription) setJd(initialJobDescription);
      if (initialJobTitle) setJobTitle(initialJobTitle);
      if (initialCompanyName) setCompanyName(initialCompanyName);
      // Reset generation state so user gets a clean slate on re-open
      setPhase('idle');
      setResult(null);
      setError('');
    }
  }, [isOpen, initialJobDescription, initialJobTitle, initialCompanyName]);

  const startGeneration = useCallback(async () => {
    if (!jd.trim()) {
      setError('Please paste a job description.');
      return;
    }
    setError('');
    setResult(null);

    const phases: GenerationPhase[] = [
      'analyzing_jd', 'selecting_strategy', 'generating_resume',
      'scoring_ats', 'generating_cover_letter', 'calculating_probability',
      'final_decision',
    ];

    // Simulate phase progression while the API call runs
    let phaseIndex = 0;
    const phaseInterval = setInterval(() => {
      if (phaseIndex < phases.length) {
        setPhase(phases[phaseIndex]);
        phaseIndex++;
      }
    }, 2500);

    setPhase('analyzing_jd');

    try {
      const res = await aiApi.generateResume({
        jobDescription: jd,
        jobTitle: jobTitle || undefined,
        companyName: companyName || undefined,
        strategy: strategy === 'auto' ? undefined : strategy,
      });

      clearInterval(phaseInterval);

      if (res.success && res.data) {
        setResult(res.data as unknown as GenerateResult);
        setPhase('complete');
      } else {
        setError(res.error || 'Generation failed. Please try again.');
        setPhase('error');
      }
    } catch (err) {
      clearInterval(phaseInterval);
      setError('Network error. Please check your connection.');
      setPhase('error');
    }
  }, [jd, jobTitle, companyName, strategy]);

  if (!isOpen) return null;

  const isGenerating = phase !== 'idle' && phase !== 'complete' && phase !== 'error';
  const isComplete = phase === 'complete' && result;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden mx-4">
        {/* ─── Header ─── */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-900 via-primary-950 to-indigo-950 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
              <Sparkles className="w-5 h-5 text-yellow-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold">AI Resume Generator</h2>
              <p className="text-xs text-gray-300">10-Phase Elite Pipeline</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ─── Content ─── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* ─── INPUT PHASE ─── */}
          {phase === 'idle' && (
            <>
              {/* JD Input */}
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Job Title (optional)</label>
                    <input
                      type="text"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      placeholder="e.g. Senior Backend Engineer"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Company (optional)</label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. Stripe, Spotify"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Job Description <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={jd}
                    onChange={(e) => setJd(e.target.value)}
                    rows={10}
                    placeholder="Paste the full job description here..."
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all resize-y font-mono"
                  />
                  <p className="text-xs text-gray-400 mt-1">{jd.length} characters · Paste the complete JD for best results</p>
                </div>

                {/* Strategy Selection */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Resume Strategy</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(['auto', 'A', 'B', 'C'] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setStrategy(s)}
                        className={`px-3 py-2.5 rounded-lg border text-xs font-medium transition-all ${
                          strategy === s
                            ? 'border-primary-500 bg-primary-50 text-primary-700 ring-2 ring-primary-200'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {s === 'auto' ? (
                          <>
                            <Zap className="w-3.5 h-3.5 inline mr-1" />Auto-Detect
                          </>
                        ) : (
                          <>
                            <span className="font-bold">{s}:</span> {STRATEGY_INFO[s].label}
                          </>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}
            </>
          )}

          {/* ─── GENERATING PHASE ─── */}
          {isGenerating && (
            <div className="space-y-4 py-8">
              <div className="text-center mb-6">
                <Loader2 className="w-10 h-10 text-primary-600 animate-spin mx-auto mb-3" />
                <h3 className="text-lg font-bold text-gray-900">Generating Your Perfect Resume</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {jobTitle && companyName ? `For ${jobTitle} at ${companyName}` : 'Analyzing job description...'}
                </p>
              </div>

              <div className="max-w-md mx-auto space-y-3">
                {GENERATION_PHASES.map((p, idx) => {
                  const currentIdx = GENERATION_PHASES.findIndex(gp => gp.key === phase);
                  const isDone = idx < currentIdx;
                  const isCurrent = p.key === phase;

                  return (
                    <div
                      key={p.key}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-500 ${
                        isCurrent
                          ? 'bg-primary-50 border border-primary-200 shadow-sm'
                          : isDone
                          ? 'bg-emerald-50 border border-emerald-100'
                          : 'bg-gray-50 border border-gray-100 opacity-50'
                      }`}
                    >
                      <span className="text-lg">{isDone ? '✅' : isCurrent ? p.icon : '⬜'}</span>
                      <span className={`text-sm font-medium ${
                        isCurrent ? 'text-primary-700' : isDone ? 'text-emerald-700' : 'text-gray-400'
                      }`}>
                        {p.label}
                      </span>
                      {isCurrent && <Loader2 className="w-4 h-4 text-primary-500 animate-spin ml-auto" />}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ─── ERROR PHASE ─── */}
          {phase === 'error' && (
            <div className="text-center py-12 space-y-4">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
              <h3 className="text-lg font-bold text-gray-900">Generation Failed</h3>
              <p className="text-sm text-gray-500">{error || 'Something went wrong. Please try again.'}</p>
              <button
                onClick={() => { setPhase('idle'); setError(''); }}
                className="px-5 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {/* ─── RESULTS PHASE ─── */}
          {isComplete && result && (
            <div className="space-y-6 animate-fade-in">
              {/* Strategy Badge */}
              <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-slate-50 to-gray-50 rounded-xl border border-gray-200">
                <div className={`p-2 rounded-lg bg-gradient-to-r ${STRATEGY_INFO[result.strategy]?.color || 'from-gray-400 to-gray-500'}`}>
                  <Target className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Strategy {result.strategy}</div>
                  <div className="text-sm font-bold text-gray-900">
                    {STRATEGY_INFO[result.strategy]?.label || 'Custom'}: {result.strategyReason}
                  </div>
                </div>
              </div>

              {/* ATS Scores */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary-500" />
                  ATS Score Analysis
                </h4>
                <div className="flex items-center justify-center gap-6 flex-wrap">
                  <ScoreGauge score={result.atsScore} label="Overall ATS" />
                  <ScoreGauge score={result.atsBreakdown.keywordMatch} label="Keywords" size="sm" />
                  <ScoreGauge score={result.atsBreakdown.experienceMatch} label="Experience" size="sm" />
                  <ScoreGauge score={result.atsBreakdown.skillsMatch} label="Skills" size="sm" />
                  <ScoreGauge score={result.atsBreakdown.formattingScore} label="Formatting" size="sm" />
                  {result.atsBreakdown.locationMatch !== undefined && (
                    <ScoreGauge score={result.atsBreakdown.locationMatch} label="Location Fit" size="sm" />
                  )}
                  {result.atsBreakdown.companyAlignment !== undefined && (
                    <ScoreGauge score={result.atsBreakdown.companyAlignment} label="Company Fit" size="sm" />
                  )}
                </div>
              </div>

              {/* Interview Probability */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary-500" />
                  Interview Probability
                </h4>
                <div className="space-y-3">
                  <ProbabilityBar value={result.interviewProbability.atsPass} label="ATS Pass" icon={CheckCircle2} />
                  <ProbabilityBar value={result.interviewProbability.recruiterResponse} label="Recruiter Response" icon={Mail} />
                  <ProbabilityBar value={result.interviewProbability.technicalInterview} label="Technical Interview" icon={Brain} />
                  <ProbabilityBar value={result.interviewProbability.offerProbability} label="Offer Probability" icon={Award} />
                </div>
                <div className="mt-3 text-xs text-gray-500 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5" />
                  Expected Timeline: {result.interviewProbability.expectedTimeline}
                </div>
              </div>

              {/* Final Decision */}
              {(() => {
                const decisionStyle = DECISION_STYLES[result.finalDecision] || DECISION_STYLES.APPLY_AFTER_RESUME_FIX;
                return (
                  <div className={`rounded-xl border p-4 ${decisionStyle.bg}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{decisionStyle.label.split(' ')[0]}</span>
                      <div>
                        <div className={`text-sm font-bold ${decisionStyle.text}`}>
                          {decisionStyle.label.slice(decisionStyle.label.indexOf(' ') + 1)}
                        </div>
                        <p className={`text-xs mt-0.5 ${decisionStyle.text} opacity-80`}>{result.finalDecisionReason}</p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Networking Tips */}
              <div>
                <button
                  onClick={() => setShowNetworking(!showNetworking)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-white rounded-xl border border-gray-200 hover:border-primary-300 hover:shadow-sm transition-all text-sm font-medium text-gray-700"
                >
                  <span className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-primary-500" />
                    Networking & Outreach Tips ({result.networkingTips.length})
                  </span>
                  {showNetworking ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {showNetworking && (
                  <div className="mt-2 p-4 bg-white rounded-xl border border-gray-200 space-y-2 animate-slide-down">
                    {result.networkingTips.map((tip, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="text-primary-500 mt-0.5">•</span>
                        {tip}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Generated Resume Preview Summary */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary-500" />
                  Generated Resume Preview
                </h4>
                <div className="space-y-2 text-sm text-gray-700">
                  {(() => {
                    const rd = result.resumeData as Record<string, unknown> | undefined;
                    const basics = rd?.basics as Record<string, string> | undefined;
                    if (!rd || !basics) return null;
                    return (
                      <>
                        <p><strong>Title:</strong> {basics.title}</p>
                        <p><strong>Summary:</strong> {basics.summary?.slice(0, 200)}...</p>
                        <p><strong>Experience:</strong> {(rd.experience as unknown[])?.length || 0} roles</p>
                        <p><strong>Skills:</strong> {(rd.skillsFlat as string[])?.length || 0} categories</p>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Cover Letter Preview */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary-500" />
                  Generated Cover Letter
                </h4>
                <div className="text-sm text-gray-700 whitespace-pre-line leading-relaxed max-h-40 overflow-y-auto">
                  {result.coverLetter}
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(result.coverLetter)}
                  className="mt-2 text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" /> Copy to Clipboard
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ─── Footer ─── */}
        <div className="flex-shrink-0 px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-3">
          {phase === 'idle' && (
            <>
              <button onClick={onClose} className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors">
                Cancel
              </button>
              <button
                onClick={startGeneration}
                disabled={!jd.trim()}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 text-white font-bold text-sm rounded-lg shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                <Sparkles className="w-4 h-4 text-yellow-300" />
                Generate Optimized Resume
              </button>
            </>
          )}

          {isGenerating && (
            <p className="text-sm text-gray-500 w-full text-center">
              Pipeline running... This may take 20-60 seconds.
            </p>
          )}

          {isComplete && result && (
            <>
              <button
                onClick={() => { setPhase('idle'); setResult(null); }}
                className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg transition-colors"
              >
                Generate Again
              </button>
              <button
                onClick={() => onApplyResume(result)}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm rounded-lg shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5"
              >
                <ArrowRight className="w-4 h-4" />
                Apply to Resume Builder
              </button>
            </>
          )}

          {phase === 'error' && (
            <button onClick={onClose} className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 ml-auto transition-colors">
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
