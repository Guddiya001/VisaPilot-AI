'use client';

import React, { createContext, useContext, useReducer, useEffect, useCallback, type ReactNode } from 'react';
import type { ResumeData, ResumeExperience, ResumeProject, ResumeEducation, CoverLetterData, GeneratedResumeResult } from './types';
import { SAMPLE_RESUME_DATA, EMPTY_RESUME_DATA, generateId } from './types';

// ─── Storage Key ───────────────────────────────────────────
const STORAGE_KEY = 'visapilot_resume_data';

// ─── Actions ───────────────────────────────────────────────
type ResumeAction =
  | { type: 'SET_ALL'; payload: ResumeData }
  | { type: 'SET_BASICS'; payload: Partial<ResumeData['basics']> }
  // Experience
  | { type: 'ADD_EXPERIENCE'; payload?: Partial<ResumeExperience> }
  | { type: 'UPDATE_EXPERIENCE'; payload: { id: string; data: Partial<ResumeExperience> } }
  | { type: 'REMOVE_EXPERIENCE'; payload: string }
  | { type: 'REORDER_EXPERIENCE'; payload: { fromIndex: number; toIndex: number } }
  | { type: 'ADD_BULLET'; payload: { experienceId: string } }
  | { type: 'UPDATE_BULLET'; payload: { experienceId: string; index: number; value: string } }
  | { type: 'REMOVE_BULLET'; payload: { experienceId: string; index: number } }
  // Skills
  | { type: 'SET_SKILLS'; payload: string[] }
  | { type: 'ADD_SKILL_LINE'; payload?: string }
  | { type: 'UPDATE_SKILL_LINE'; payload: { index: number; value: string } }
  | { type: 'REMOVE_SKILL_LINE'; payload: number }
  // Projects
  | { type: 'ADD_PROJECT'; payload?: Partial<ResumeProject> }
  | { type: 'UPDATE_PROJECT'; payload: { id: string; data: Partial<ResumeProject> } }
  | { type: 'REMOVE_PROJECT'; payload: string }
  // Education
  | { type: 'ADD_EDUCATION'; payload?: Partial<ResumeEducation> }
  | { type: 'UPDATE_EDUCATION'; payload: { id: string; data: Partial<ResumeEducation> } }
  | { type: 'REMOVE_EDUCATION'; payload: string }
  // Simple lists
  | { type: 'SET_CERTIFICATES'; payload: string[] }
  | { type: 'SET_ACHIEVEMENTS'; payload: string[] }
  | { type: 'SET_LANGUAGES'; payload: string[] }
  // Cover Letter
  | { type: 'SET_COVER_LETTER'; payload: CoverLetterData }
  // Tailor for Job
  | {
      type: 'TAILOR_FOR_JOB';
      payload: {
        summary: string;
        addedSkills: string[];
        coverLetter?: string;
        bulletImprovements?: Array<{ original: string; improved: string }>;
      };
    }
  // Full Resume Generation
  | { type: 'GENERATE_FULL_RESUME'; payload: GeneratedResumeResult }
  // Bulk
  | { type: 'LOAD_SAMPLE' }
  | { type: 'CLEAR_ALL' };

// ─── Reducer ───────────────────────────────────────────────
function resumeReducer(state: ResumeData, action: ResumeAction): ResumeData {
  switch (action.type) {
    case 'SET_ALL':
      return { ...action.payload };

    case 'SET_BASICS':
      return { ...state, basics: { ...state.basics, ...action.payload } };

    // ─── Experience ───
    case 'ADD_EXPERIENCE':
      return {
        ...state,
        experience: [
          ...state.experience,
          {
            id: generateId(),
            role: '',
            company: '',
            location: '',
            period: '',
            bullets: [''],
            ...action.payload,
          },
        ],
      };

    case 'UPDATE_EXPERIENCE':
      return {
        ...state,
        experience: state.experience.map((exp) =>
          exp.id === action.payload.id ? { ...exp, ...action.payload.data } : exp
        ),
      };

    case 'REMOVE_EXPERIENCE':
      return { ...state, experience: state.experience.filter((exp) => exp.id !== action.payload) };

    case 'REORDER_EXPERIENCE': {
      const arr = [...state.experience];
      const [moved] = arr.splice(action.payload.fromIndex, 1);
      arr.splice(action.payload.toIndex, 0, moved);
      return { ...state, experience: arr };
    }

    case 'ADD_BULLET':
      return {
        ...state,
        experience: state.experience.map((exp) =>
          exp.id === action.payload.experienceId
            ? { ...exp, bullets: [...exp.bullets, ''] }
            : exp
        ),
      };

    case 'UPDATE_BULLET':
      return {
        ...state,
        experience: state.experience.map((exp) =>
          exp.id === action.payload.experienceId
            ? {
                ...exp,
                bullets: exp.bullets.map((b, i) =>
                  i === action.payload.index ? action.payload.value : b
                ),
              }
            : exp
        ),
      };

    case 'REMOVE_BULLET':
      return {
        ...state,
        experience: state.experience.map((exp) =>
          exp.id === action.payload.experienceId
            ? { ...exp, bullets: exp.bullets.filter((_, i) => i !== action.payload.index) }
            : exp
        ),
      };

    // ─── Skills ───
    case 'SET_SKILLS':
      return { ...state, skillsFlat: action.payload };

    case 'ADD_SKILL_LINE':
      return { ...state, skillsFlat: [...state.skillsFlat, action.payload ?? ''] };

    case 'UPDATE_SKILL_LINE':
      return {
        ...state,
        skillsFlat: state.skillsFlat.map((s, i) =>
          i === action.payload.index ? action.payload.value : s
        ),
      };

    case 'REMOVE_SKILL_LINE':
      return { ...state, skillsFlat: state.skillsFlat.filter((_, i) => i !== action.payload) };

    // ─── Projects ───
    case 'ADD_PROJECT':
      return {
        ...state,
        projects: [
          ...state.projects,
          {
            id: generateId(),
            name: '',
            description: '',
            technologies: '',
            ...action.payload,
          },
        ],
      };

    case 'UPDATE_PROJECT':
      return {
        ...state,
        projects: state.projects.map((p) =>
          p.id === action.payload.id ? { ...p, ...action.payload.data } : p
        ),
      };

    case 'REMOVE_PROJECT':
      return { ...state, projects: state.projects.filter((p) => p.id !== action.payload) };

    // ─── Education ───
    case 'ADD_EDUCATION':
      return {
        ...state,
        education: [
          ...state.education,
          {
            id: generateId(),
            degree: '',
            school: '',
            location: '',
            year: '',
            ...action.payload,
          },
        ],
      };

    case 'UPDATE_EDUCATION':
      return {
        ...state,
        education: state.education.map((e) =>
          e.id === action.payload.id ? { ...e, ...action.payload.data } : e
        ),
      };

    case 'REMOVE_EDUCATION':
      return { ...state, education: state.education.filter((e) => e.id !== action.payload) };

    // ─── Simple Lists ───
    case 'SET_CERTIFICATES':
      return { ...state, certificates: action.payload };

    case 'SET_ACHIEVEMENTS':
      return { ...state, achievements: action.payload };

    case 'SET_LANGUAGES':
      return { ...state, languages: action.payload };

    // ─── Cover Letter ───
    case 'SET_COVER_LETTER':
      return { ...state, coverLetter: action.payload };

    // ─── Tailor For Job ───
    case 'TAILOR_FOR_JOB': {
      const { summary, addedSkills, coverLetter, bulletImprovements } = action.payload;

      const existingSkillsLower = new Set(state.skillsFlat.map((s) => s.toLowerCase()));
      const newSkillsToAppend = (addedSkills || []).filter((s) => !existingSkillsLower.has(s.toLowerCase()));
      const updatedSkills = [...state.skillsFlat, ...newSkillsToAppend];

      let updatedExperience = state.experience;
      if (bulletImprovements && bulletImprovements.length > 0) {
        updatedExperience = state.experience.map((exp) => ({
          ...exp,
          bullets: exp.bullets.map((bullet) => {
            const match = bulletImprovements.find((imp) => imp.original && bullet.includes(imp.original));
            return match ? match.improved : bullet;
          }),
        }));
      }

      const updatedCoverLetter = coverLetter
        ? { ...state.coverLetter, body: coverLetter }
        : state.coverLetter;

      return {
        ...state,
        basics: {
          ...state.basics,
          summary: summary || state.basics.summary,
        },
        skillsFlat: updatedSkills,
        experience: updatedExperience,
        coverLetter: updatedCoverLetter,
      };
    }

    // ─── Full Resume Generation ───
    case 'GENERATE_FULL_RESUME': {
      const generated = action.payload.resumeData;
      // Replace cover letter paragraphs from the pipeline's cover letter text
      const coverParagraphs = action.payload.coverLetter
        ? action.payload.coverLetter.split('\n\n').filter(Boolean)
        : state.coverLetter.paragraphs;
      return {
        ...generated,
        coverLetter: { paragraphs: coverParagraphs },
      };
    }

    // ─── Bulk ───
    case 'LOAD_SAMPLE':
      return { ...SAMPLE_RESUME_DATA };

    case 'CLEAR_ALL':
      return { ...EMPTY_RESUME_DATA };

    default:
      return state;
  }
}

// ─── Context ───────────────────────────────────────────────
interface ResumeContextValue {
  data: ResumeData;
  dispatch: React.Dispatch<ResumeAction>;
  exportJSON: () => string;
  importJSON: (json: string) => boolean;
}

const ResumeContext = createContext<ResumeContextValue | null>(null);

// ─── Provider ──────────────────────────────────────────────
export function ResumeProvider({ children }: { children: ReactNode }) {
  const [data, dispatch] = useReducer(resumeReducer, SAMPLE_RESUME_DATA, (initial) => {
    // Try to load from localStorage on mount
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          // Merge with defaults to handle missing fields from older saves
          return { ...initial, ...parsed };
        }
      } catch {
        // Ignore parse errors, use default
      }
    }
    return initial;
  });

  // Auto-save to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // localStorage full or unavailable
    }
  }, [data]);

  const exportJSON = useCallback(() => {
    return JSON.stringify(data, null, 2);
  }, [data]);

  const importJSON = useCallback(
    (json: string): boolean => {
      try {
        const parsed = JSON.parse(json) as ResumeData;
        // Basic validation
        if (!parsed.basics || !parsed.experience) return false;
        dispatch({ type: 'SET_ALL', payload: { ...EMPTY_RESUME_DATA, ...parsed } });
        return true;
      } catch {
        return false;
      }
    },
    [dispatch]
  );

  return (
    <ResumeContext.Provider value={{ data, dispatch, exportJSON, importJSON }}>
      {children}
    </ResumeContext.Provider>
  );
}

// ─── Hook ──────────────────────────────────────────────────
export function useResume() {
  const ctx = useContext(ResumeContext);
  if (!ctx) throw new Error('useResume must be used within a ResumeProvider');
  return ctx;
}
