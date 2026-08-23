'use client';

import { useResume } from '../context';
import { Plus, Trash2, GraduationCap } from 'lucide-react';
import { generateId } from '../types';

export default function EducationForm() {
  const { data, dispatch } = useResume();
  const { education } = data;

  const inputBase =
    'w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all hover:border-gray-300';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5 mb-1">
        <div className="p-1.5 bg-teal-100 rounded-md">
          <GraduationCap className="w-4 h-4 text-teal-600" />
        </div>
        <h2 className="text-base font-semibold text-gray-800">Education</h2>
        <span className="text-xs font-medium text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
          {education.length}
        </span>
      </div>

      {education.length === 0 && (
        <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
          <GraduationCap className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500 font-medium">No education added yet</p>
        </div>
      )}

      {education.map((edu, index) => (
        <div
          key={edu.id}
          className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
        >
          {/* Card header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-white">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-teal-100 text-teal-700 text-xs font-bold flex items-center justify-center">
              {index + 1}
            </span>
            <span className="flex-1 text-sm font-semibold text-gray-700 truncate">
              {edu.degree || <span className="text-gray-400 italic font-normal">Untitled Degree</span>}
            </span>
            <button
              onClick={() => dispatch({ type: 'REMOVE_EDUCATION', payload: edu.id })}
              className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card body */}
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Degree / Program *
              </label>
              <input
                value={edu.degree}
                onChange={(e) =>
                  dispatch({ type: 'UPDATE_EDUCATION', payload: { id: edu.id, data: { degree: e.target.value } } })
                }
                className={inputBase}
                placeholder="Bachelor of Computer Science"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                School / University *
              </label>
              <input
                value={edu.school}
                onChange={(e) =>
                  dispatch({ type: 'UPDATE_EDUCATION', payload: { id: edu.id, data: { school: e.target.value } } })
                }
                className={inputBase}
                placeholder="University Name"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Location
              </label>
              <input
                value={edu.location ?? ''}
                onChange={(e) =>
                  dispatch({ type: 'UPDATE_EDUCATION', payload: { id: edu.id, data: { location: e.target.value } } })
                }
                className={inputBase}
                placeholder="City, Country"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Year / Period
              </label>
              <input
                value={edu.year ?? ''}
                onChange={(e) =>
                  dispatch({ type: 'UPDATE_EDUCATION', payload: { id: edu.id, data: { year: e.target.value } } })
                }
                className={inputBase}
                placeholder="2018 – 2022"
              />
            </div>
          </div>
        </div>
      ))}

      <button
        onClick={() =>
          dispatch({
            type: 'ADD_EDUCATION',
            payload: { id: generateId(), degree: '', school: '', location: '', year: '' },
          })
        }
        className="w-full py-3.5 flex items-center justify-center gap-2 border-2 border-dashed border-teal-200 text-teal-600 rounded-xl hover:border-teal-400 hover:bg-teal-50 transition-all font-semibold text-sm"
      >
        <Plus className="w-4 h-4" />
        Add Education
      </button>
    </div>
  );
}
