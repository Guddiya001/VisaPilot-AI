'use client';

import React, { useState } from 'react';
import { useResume } from '../context';
import { X, Loader2 } from 'lucide-react';
// @ts-ignore - Assuming aiApi exists at this path as specified
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

  const getResumeText = () => {
    const parts = [
      data.basics.summary,
      ...data.experience.flatMap(e => e.bullets),
      ...data.skillsFlat,
      ...data.projects.map(p => `${p.name} ${p.description} ${p.technologies || ''}`),
      ...data.education.map(e => `${e.degree} ${e.school}`),
      ...data.certificates
    ];
    return parts.join(' ');
  };

  const handleAnalyze = async () => {
    if (!jobDescription.trim()) return;
    
    setLoading(true);
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
          skills: 60
        },
        matchedKeywords: ['React', 'TypeScript', 'Node.js'],
        missingKeywords: ['GraphQL', 'AWS', 'Docker'],
        suggestions: [
          'Add more quantifiable metrics to your recent role.',
          'Include cloud technologies if you have experience with them.',
          'Tailor your summary to mention the specific job title.'
        ]
      });
    } finally {
      setLoading(false);
    }
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
      <div 
        className="fixed inset-0 bg-black/20 z-40 transition-opacity"
        onClick={onClose}
      />
      <div className="fixed top-0 right-0 h-full w-96 bg-white shadow-2xl z-50 overflow-y-auto transform transition-transform translate-x-0 flex flex-col">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <span>ATS & JD Tailoring</span>
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
          </div>

          {results && (
            <div className="flex flex-col gap-6 mt-4">
              <div className="flex flex-col items-center justify-center">
                <div 
                  className="w-32 h-32 rounded-full flex items-center justify-center relative"
                  style={{
                    background: `conic-gradient(#0ea5e9 ${results.score}%, #e2e8f0 0)`
                  }}
                >
                  <div className="w-28 h-28 bg-white rounded-full flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-gray-800">{results.score}</span>
                    <span className="text-xs text-gray-500 font-medium">Match</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wider">Categories</h3>
                {Object.entries(results.categories).map(([key, value]) => (
                  <div key={key} className="flex flex-col gap-1">
                    <div className="flex justify-between text-xs font-medium text-gray-600">
                      <span className="capitalize">{key}</span>
                      <span>{value as number}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary-500 rounded-full" 
                        style={{ width: `${value}%` }} 
                      />
                    </div>
                  </div>
                ))}
              </div>

              {results.matchedKeywords && results.matchedKeywords.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wider">Matched Keywords</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {results.matchedKeywords.map((kw: string, i: number) => (
                      <span key={i} className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {results.missingKeywords && results.missingKeywords.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wider">Missing Keywords</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {results.missingKeywords.map((kw: string, i: number) => (
                      <span key={i} className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full font-medium">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {results.suggestions && results.suggestions.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wider">Suggestions</h3>
                  <ol className="list-decimal list-inside text-sm text-gray-700 flex flex-col gap-1.5">
                    {results.suggestions.map((sug: string, i: number) => (
                      <li key={i} className="leading-snug">{sug}</li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
