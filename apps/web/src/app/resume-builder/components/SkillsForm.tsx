'use client';

import { useResume } from '../context';
import { Plus, X, Lightbulb } from 'lucide-react';

export default function SkillsForm() {
  const { data, dispatch } = useResume();
  const { skillsFlat: skills } = data;

  return (
    <div className="space-y-4">
      {/* Header card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-white">
          <div className="p-1.5 bg-amber-100 rounded-md">
            <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-700">Core Skills</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Use ATS-friendly grouped lines — e.g. <strong className="text-gray-600">"Languages: JavaScript, Python, Go"</strong>
            </p>
          </div>
        </div>

        <div className="p-5 space-y-3">
          {skills.length === 0 && (
            <p className="text-sm text-gray-400 italic text-center py-4">
              No skills added yet. Click below to start.
            </p>
          )}
          {skills.map((skill, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary-100 text-primary-700 text-[10px] font-bold flex items-center justify-center">
                {index + 1}
              </span>
              <input
                value={skill}
                onChange={(e) =>
                  dispatch({ type: 'UPDATE_SKILL_LINE', payload: { index, value: e.target.value } })
                }
                className="flex-1 px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all hover:border-gray-300"
                placeholder="Category: Skill 1, Skill 2, Skill 3"
              />
              <button
                onClick={() => dispatch({ type: 'REMOVE_SKILL_LINE', payload: index })}
                className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}

          <button
            onClick={() => dispatch({ type: 'ADD_SKILL_LINE', payload: '' })}
            className="w-full mt-2 py-3 flex items-center justify-center gap-2 border-2 border-dashed border-primary-200 text-primary-600 rounded-xl hover:border-primary-400 hover:bg-primary-50 transition-all font-semibold text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Skill Group
          </button>
        </div>
      </div>
    </div>
  );
}
