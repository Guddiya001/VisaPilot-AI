'use client';

import { useResume } from '../context';
import { Plus, X } from 'lucide-react';

export default function SkillsForm() {
  const { data, dispatch } = useResume();
  const { skillsFlat: skills } = data;

  const inputClass = "w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm";

  return (
    <div className="bg-white p-6 rounded-xl border shadow-sm">
      <h2 className="text-xl font-semibold mb-2 text-gray-800">Skills</h2>
      <p className="text-sm text-gray-500 mb-6">
        Format as ATS-friendly flat lines. Example: <span className="font-medium text-gray-700">"Languages: JavaScript, TypeScript, Python"</span>
      </p>

      <div className="space-y-3">
        {skills.map((skill, index) => (
          <div key={index} className="flex items-center space-x-2">
            <input
              value={skill}
              onChange={e => dispatch({ type: 'UPDATE_SKILL_LINE', payload: { index, value: e.target.value } })}
              className={inputClass}
              placeholder="Category: Skill 1, Skill 2, Skill 3"
            />
            <button
              onClick={() => dispatch({ type: 'REMOVE_SKILL_LINE', payload: index })}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={() => dispatch({ type: 'ADD_SKILL_LINE', payload: '' })}
        className="mt-4 flex items-center space-x-1 text-sm text-primary-600 hover:text-primary-700 font-medium"
      >
        <Plus className="w-4 h-4" />
        <span>Add Skill Line</span>
      </button>
    </div>
  );
}
