'use client';

import { useState } from 'react';
import { useResume } from '../context';
import { Briefcase, Plus, Trash2, ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
import { generateId } from '../types';

export default function ExperienceForm() {
  const { data, dispatch } = useResume();
  const { experience } = data;
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggle = (id: string) =>
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));

  const inputBase =
    'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all hover:border-gray-300';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-primary-100 rounded-md">
            <Briefcase className="w-4 h-4 text-primary-600" />
          </div>
          <h2 className="text-base font-semibold text-gray-800">Work Experience</h2>
          <span className="text-xs font-medium text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
            {experience.length}
          </span>
        </div>
      </div>

      {experience.length === 0 && (
        <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
          <Briefcase className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500 font-medium">No experience added yet</p>
          <p className="text-xs text-gray-400 mt-1">Click the button below to add your work history</p>
        </div>
      )}

      {experience.map((exp, index) => {
        const isCollapsed = collapsed[exp.id];
        return (
          <div
            key={exp.id}
            className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden transition-all"
          >
            {/* Card Header (always visible) */}
            <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-slate-50 to-white border-b border-gray-100">
              {/* Reorder buttons */}
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => index > 0 && dispatch({ type: 'REORDER_EXPERIENCE', payload: { fromIndex: index, toIndex: index - 1 } })}
                  disabled={index === 0}
                  className="p-0.5 text-gray-300 hover:text-gray-500 disabled:opacity-20 rounded transition-colors"
                  title="Move up"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => index < experience.length - 1 && dispatch({ type: 'REORDER_EXPERIENCE', payload: { fromIndex: index, toIndex: index + 1 } })}
                  disabled={index === experience.length - 1}
                  className="p-0.5 text-gray-300 hover:text-gray-500 disabled:opacity-20 rounded transition-colors"
                  title="Move down"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Index badge */}
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center">
                {index + 1}
              </span>

              {/* Title / collapse toggle */}
              <button
                onClick={() => toggle(exp.id)}
                className="flex-1 min-w-0 text-left"
              >
                <div className="text-sm font-semibold text-gray-800 truncate">
                  {exp.role || <span className="text-gray-400 italic">Untitled Role</span>}
                </div>
                {exp.company && (
                  <div className="text-xs text-gray-500 truncate">
                    {exp.company} · {exp.period || 'No dates'}
                  </div>
                )}
              </button>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => toggle(exp.id)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                  title={isCollapsed ? 'Expand' : 'Collapse'}
                >
                  {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => dispatch({ type: 'REMOVE_EXPERIENCE', payload: exp.id })}
                  className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Card Body (collapsible) */}
            {!isCollapsed && (
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Job Title *</label>
                    <input
                      value={exp.role}
                      onChange={(e) => dispatch({ type: 'UPDATE_EXPERIENCE', payload: { id: exp.id, data: { role: e.target.value } } })}
                      className={inputBase}
                      placeholder="Senior Software Engineer"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Company *</label>
                    <input
                      value={exp.company}
                      onChange={(e) => dispatch({ type: 'UPDATE_EXPERIENCE', payload: { id: exp.id, data: { company: e.target.value } } })}
                      className={inputBase}
                      placeholder="Tech Corp"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Client (Optional)</label>
                    <input
                      value={exp.client || ''}
                      onChange={(e) => dispatch({ type: 'UPDATE_EXPERIENCE', payload: { id: exp.id, data: { client: e.target.value } } })}
                      className={inputBase}
                      placeholder="End client name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Location</label>
                    <input
                      value={exp.location}
                      onChange={(e) => dispatch({ type: 'UPDATE_EXPERIENCE', payload: { id: exp.id, data: { location: e.target.value } } })}
                      className={inputBase}
                      placeholder="San Francisco, CA"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Period</label>
                    <input
                      value={exp.period}
                      onChange={(e) => dispatch({ type: 'UPDATE_EXPERIENCE', payload: { id: exp.id, data: { period: e.target.value } } })}
                      className={inputBase}
                      placeholder="Jan 2020 – Present"
                    />
                  </div>
                </div>

                {/* Bullet Points */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Bullet Points
                    </label>
                    <span className="text-xs text-gray-400">{exp.bullets.filter(Boolean).length} written</span>
                  </div>
                  <div className="space-y-2">
                    {exp.bullets.map((bullet, bIndex) => (
                      <div key={bIndex} className="flex items-start gap-2">
                        <GripVertical className="w-4 h-4 mt-2.5 text-gray-300 flex-shrink-0" />
                        <div className="flex-1 relative">
                          <span className="absolute left-3 top-2.5 text-gray-400 text-sm select-none">▸</span>
                          <input
                            value={bullet}
                            onChange={(e) => dispatch({ type: 'UPDATE_BULLET', payload: { experienceId: exp.id, index: bIndex, value: e.target.value } })}
                            className="w-full pl-7 pr-10 py-2 border border-gray-200 rounded-lg text-sm bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all hover:border-gray-300"
                            placeholder="Led development of X using Y, resulting in Z% improvement..."
                          />
                        </div>
                        <button
                          onClick={() => dispatch({ type: 'REMOVE_BULLET', payload: { experienceId: exp.id, index: bIndex } })}
                          className="p-2 mt-0.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors flex-shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => dispatch({ type: 'ADD_BULLET', payload: { experienceId: exp.id } })}
                    className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-primary-600 hover:text-primary-700 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Bullet
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Add Experience Button */}
      <button
        onClick={() =>
          dispatch({
            type: 'ADD_EXPERIENCE',
            payload: {
              id: generateId(),
              role: '',
              company: '',
              location: '',
              period: '',
              bullets: [''],
            },
          })
        }
        className="w-full py-3.5 flex items-center justify-center gap-2 border-2 border-dashed border-primary-200 text-primary-600 rounded-xl hover:border-primary-400 hover:bg-primary-50 transition-all font-semibold text-sm"
      >
        <Plus className="w-4 h-4" />
        Add Experience
      </button>
    </div>
  );
}
