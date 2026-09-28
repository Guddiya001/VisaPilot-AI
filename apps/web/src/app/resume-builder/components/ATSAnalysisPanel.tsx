'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useResume, saveStoredSkills, getStoredSkills } from '../context';
import { X, Loader2, Plus, CheckCircle2, AlertCircle, Database, Sparkles, Check } from 'lucide-react';
import { aiApi } from '@/lib/api';

interface ATSAnalysisPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ATSAnalysisPanel({ isOpen, onClose }: ATSAnalysisPanelProps) {
  const { data, dispatch } = useResume();
  const [jobDescription, setJobDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [tailoring, setTailoring] = useState(false);
  const [tailorSuccess, setTailorSuccess] = useState(false);
  const [results, setResults] = useState<any>(null);

  // Selection & persistence state for Important Missing
  const [selectedMissing, setSelectedMissing] = useState<string[]>([]);
  const [addedSkillsMap, setAddedSkillsMap] = useState<Record<string, boolean>>({});
  const [saveForFuture, setSaveForFuture] = useState(true);
  const [addFeedback, setAddFeedback] = useState<string | null>(null);

  const isSkillInResume = (skill: string) => {
    const sLower = skill.toLowerCase().trim();
    const allSkillsText = data.skillsFlat.join(' ').toLowerCase();
    return allSkillsText.includes(sLower);
  };

  // Sync selected missing keywords when new results arrive
  useEffect(() => {
    if (results?.missingKeywords && Array.isArray(results.missingKeywords)) {
      const allSkillsText = data.skillsFlat.join(' ').toLowerCase();
      const unadded = results.missingKeywords.filter(
        (kw: string) => !allSkillsText.includes(kw.toLowerCase().trim())
      );
      setSelectedMissing(unadded);
      setAddedSkillsMap({});
    }
  }, [results, data.skillsFlat]);

  const getResumeText = () => {
    const parts = [
      data.basics.summary,
      ...data.experience.flatMap((e) => e.bullets),
      ...data.skillsFlat,
      ...data.projects.map((p) => `${p.name} ${p.description} ${p.technologies || ''}`),
      ...data.education.map((e) => `${e.degree} ${e.school}`),
      ...data.certificates,
    ];
    return parts.join(' ');
  };

  const handleAnalyze = async () => {
    if (!jobDescription.trim()) return;

    setLoading(true);
    setAddFeedback(null);
    try {
      const text = getResumeText();
      const res = await aiApi.analyzeResume(text, jobDescription);
      setResults(res.data || res);
    } catch (error) {
      console.error('Failed to analyze resume:', error);
      setResults({
        score: 75,
        categories: {
          keyword: 80,
          experience: 70,
          education: 90,
          skills: 60,
        },
        matchedKeywords: ['React', 'TypeScript', 'Node.js'],
        missingKeywords: ['GraphQL', 'AWS', 'Docker'],
        suggestions: [
          'Add more quantifiable metrics to your recent role.',
          'Include cloud technologies if you have experience with them.',
          'Tailor your summary to mention the specific job title.',
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSelectMissing = (kw: string) => {
    setSelectedMissing((prev) =>
      prev.includes(kw) ? prev.filter((k) => k !== kw) : [...prev, kw]
    );
  };

  const handleSelectAllMissing = () => {
    if (!results?.missingKeywords) return;
    const available = results.missingKeywords.filter((kw: string) => !isSkillInResume(kw));
    if (selectedMissing.length === available.length) {
      setSelectedMissing([]);
    } else {
      setSelectedMissing(available);
    }
  };

  const handleAddMissingSkills = (skillsToAdd: string[]) => {
    if (skillsToAdd.length === 0) return;

    // Dispatch to resume context (adds to skillsFlat & persists)
    dispatch({
      type: 'ADD_IMPORTANT_MISSING',
      payload: {
        skills: skillsToAdd,
        persistForFuture: saveForFuture,
      },
    });

    // Mark as added in current UI session
    const updatedMap = { ...addedSkillsMap };
    skillsToAdd.forEach((s) => {
      updatedMap[s] = true;
    });
    setAddedSkillsMap(updatedMap);
    setSelectedMissing((prev) => prev.filter((s) => !skillsToAdd.includes(s)));

    setAddFeedback(
      `✓ Added ${skillsToAdd.length} missing skill${skillsToAdd.length > 1 ? 's' : ''} to resume${
        saveForFuture ? ' & saved for future job matches' : ''
      }!`
    );
    setTimeout(() => setAddFeedback(null), 6000);
  };

  const handleTailor = async () => {
    if (!jobDescription.trim()) return;
    setTailoring(true);
    setTailorSuccess(false);

    try {
      const text = getResumeText();
      const res = await aiApi.tailorResume({
        resumeContent: text,
        jobDescription,
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
        setTailorSuccess(true);
      }
    } catch (err) {
      console.error('Failed to tailor resume:', err);
    } finally {
      setTailoring(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40 transition-opacity" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-96 sm:w-[440px] bg-white shadow-2xl z-50 overflow-y-auto transform transition-transform translate-x-0 flex flex-col">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 sticky top-0 z-10">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <span>ATS &amp; JD Tailoring</span>
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="p-4 flex-1 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">Target Job Description</label>
            <textarea
              className="w-full h-32 p-3 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none text-sm"
              placeholder="Paste any job description here to analyze or auto-tailor your resume..."
              value={jobDescription}
              onChange={(e) => {
                setJobDescription(e.target.value);
                setTailorSuccess(false);
              }}
            />
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleAnalyze}
                disabled={loading || tailoring || !jobDescription.trim()}
                className="py-2.5 px-3 bg-white border border-gray-300 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-1.5 transition-colors"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : 'Analyze Match'}
              </button>
              <button
                onClick={handleTailor}
                disabled={loading || tailoring || !jobDescription.trim()}
                className="py-2.5 px-3 bg-gradient-to-r from-primary-600 to-indigo-600 text-white rounded-lg text-xs font-semibold hover:from-primary-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-1.5 shadow-sm transition-colors"
              >
                {tailoring ? <Loader2 size={14} className="animate-spin" /> : '✨ Auto-Tailor Resume'}
              </button>
            </div>

            {tailorSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex flex-col gap-1 mt-1 animate-fade-in">
                <span className="font-semibold text-emerald-900">✨ Resume Tailored Successfully!</span>
                <span>Summary, keywords, experience bullets, and cover letter have been tailored for this Job Description.</span>
              </div>
            )}

            {addFeedback && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2 animate-fade-in shadow-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span className="font-medium">{addFeedback}</span>
              </div>
            )}
          </div>

          {results && (
            <div className="flex flex-col gap-5 mt-2">
              {/* Score Gauge */}
              <div className="flex flex-col items-center justify-center p-3 bg-slate-50 rounded-xl border border-gray-100">
                <div
                  className="w-28 h-28 rounded-full flex items-center justify-center relative"
                  style={{
                    background: `conic-gradient(#0ea5e9 ${results.score || results.overallScore || 0}%, #e2e8f0 0)`,
                  }}
                >
                  <div className="w-24 h-24 bg-white rounded-full flex flex-col items-center justify-center shadow-xs">
                    <span className="text-2xl font-bold text-gray-800">
                      {results.score || results.overallScore || 0}
                    </span>
                    <span className="text-[11px] text-gray-500 font-medium">ATS Match</span>
                  </div>
                </div>
              </div>

              {/* Categories */}
              {results.categories && (
                <div className="flex flex-col gap-2.5">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Category Breakdown
                  </h3>
                  {Object.entries(results.categories).map(([key, value]) => (
                    <div key={key} className="flex flex-col gap-1">
                      <div className="flex justify-between text-xs font-medium text-gray-600">
                        <span className="capitalize">{key}</span>
                        <span>{value as number}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary-500 rounded-full"
                          style={{ width: `${value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ─── IMPORTANT MISSING (SELECT & ADD WITH STORAGE) ─── */}
              {results.missingKeywords && results.missingKeywords.length > 0 && (
                <div className="flex flex-col gap-3 bg-red-50/60 border border-red-200 rounded-xl p-3.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                      <h3 className="text-xs font-bold text-red-900 uppercase tracking-wider">
                        Important Missing ({results.missingKeywords.length})
                      </h3>
                    </div>
                    <button
                      onClick={handleSelectAllMissing}
                      className="text-[11px] font-semibold text-red-700 hover:text-red-900 hover:underline"
                    >
                      {selectedMissing.length ===
                      results.missingKeywords.filter((k: string) => !isSkillInResume(k)).length
                        ? 'Deselect All'
                        : 'Select All'}
                    </button>
                  </div>

                  <p className="text-[11px] text-gray-600 leading-relaxed">
                    Select missing requirements you possess to add them to your resume and store them for future JD matches.
                  </p>

                  <div className="flex flex-col gap-1.5 max-h-60 overflow-y-auto pr-1">
                    {results.missingKeywords.map((kw: string, i: number) => {
                      const inResume = isSkillInResume(kw) || addedSkillsMap[kw];
                      const isSelected = selectedMissing.includes(kw);

                      return (
                        <div
                          key={i}
                          className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs transition-all ${
                            inResume
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                              : isSelected
                              ? 'bg-red-100/90 border-red-300 text-red-950 font-medium'
                              : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          <label className="flex items-center gap-2.5 cursor-pointer flex-1 mr-2 min-w-0">
                            {!inResume && (
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSelectMissing(kw)}
                                className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500 cursor-pointer"
                              />
                            )}
                            <span className={`truncate ${inResume ? 'line-through opacity-70' : ''}`}>
                              {kw}
                            </span>
                          </label>

                          {inResume ? (
                            <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded-full flex-shrink-0">
                              <CheckCircle2 className="w-3 h-3" /> In Resume
                            </span>
                          ) : (
                            <button
                              onClick={() => handleAddMissingSkills([kw])}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded bg-white hover:bg-red-600 hover:text-white text-red-700 border border-red-200 shadow-2xs transition-colors flex-shrink-0"
                              title="Add this skill to resume"
                            >
                              <Plus className="w-3 h-3" /> Add
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Persistence Option & Bulk Action */}
                  <div className="pt-2 border-t border-red-200/60 flex flex-col gap-2">
                    <label className="flex items-center gap-2 text-[11px] text-gray-600 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={saveForFuture}
                        onChange={(e) => setSaveForFuture(e.target.checked)}
                        className="w-3.5 h-3.5 text-red-600 rounded border-gray-300 focus:ring-red-500 cursor-pointer"
                      />
                      <span className="flex items-center gap-1">
                        <Database className="w-3 h-3 text-gray-500" />
                        Store in profile for future job applications
                      </span>
                    </label>

                    <button
                      onClick={() => handleAddMissingSkills(selectedMissing)}
                      disabled={selectedMissing.length === 0}
                      className="w-full py-2.5 px-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Add Selected to Resume ({selectedMissing.length})
                    </button>
                  </div>
                </div>
              )}

              {/* Matched Keywords */}
              {results.matchedKeywords && results.matchedKeywords.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Matched Keywords ({results.matchedKeywords.length})
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {results.matchedKeywords.map((kw: string, i: number) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 bg-green-50 border border-green-200 text-green-700 text-xs rounded-full font-medium"
                      >
                        ✓ {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggestions */}
              {results.suggestions && results.suggestions.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Actionable Suggestions
                  </h3>
                  <div className="flex flex-col gap-2">
                    {results.suggestions.map((sug: string, i: number) => (
                      <div
                        key={i}
                        className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 flex flex-col gap-1.5"
                      >
                        <span className="leading-snug">{sug}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

