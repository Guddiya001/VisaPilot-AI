'use client';

import { useResume } from '../context';
import { Plus, Trash2, Rocket, Code } from 'lucide-react';
import { generateId } from '../types';

export default function ProjectsForm() {
  const { data, dispatch } = useResume();
  const { projects } = data;

  const inputBase =
    'w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all hover:border-gray-300';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5 mb-1">
        <div className="p-1.5 bg-orange-100 rounded-md">
          <Rocket className="w-4 h-4 text-orange-600" />
        </div>
        <h2 className="text-base font-semibold text-gray-800">Selected Projects</h2>
        <span className="text-xs font-medium text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
          {projects.length}
        </span>
      </div>

      {projects.length === 0 && (
        <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
          <Rocket className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500 font-medium">No projects added yet</p>
          <p className="text-xs text-gray-400 mt-1">Showcase 2–4 relevant projects</p>
        </div>
      )}

      {projects.map((proj, index) => (
        <div
          key={proj.id}
          className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
        >
          {/* Card header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-white">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-100 text-orange-700 text-xs font-bold flex items-center justify-center">
              {index + 1}
            </span>
            <span className="flex-1 text-sm font-semibold text-gray-700 truncate">
              {proj.name || <span className="text-gray-400 italic font-normal">Untitled Project</span>}
            </span>
            <button
              onClick={() => dispatch({ type: 'REMOVE_PROJECT', payload: proj.id })}
              className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card body */}
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Project Name *
                </label>
                <input
                  value={proj.name}
                  onChange={(e) =>
                    dispatch({ type: 'UPDATE_PROJECT', payload: { id: proj.id, data: { name: e.target.value } } })
                  }
                  className={inputBase}
                  placeholder="AI Workflow Orchestration"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  <Code className="inline w-3 h-3 mr-1" />
                  Technologies
                </label>
                <input
                  value={proj.technologies ?? ''}
                  onChange={(e) =>
                    dispatch({ type: 'UPDATE_PROJECT', payload: { id: proj.id, data: { technologies: e.target.value } } })
                  }
                  className={inputBase}
                  placeholder="React, Node.js, PostgreSQL"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Description
              </label>
              <textarea
                value={proj.description}
                onChange={(e) =>
                  dispatch({ type: 'UPDATE_PROJECT', payload: { id: proj.id, data: { description: e.target.value } } })
                }
                className={`${inputBase} h-24 resize-none`}
                placeholder="Describe the project, your role, and the impact achieved..."
              />
            </div>
          </div>
        </div>
      ))}

      <button
        onClick={() =>
          dispatch({
            type: 'ADD_PROJECT',
            payload: { id: generateId(), name: '', description: '', technologies: '' },
          })
        }
        className="w-full py-3.5 flex items-center justify-center gap-2 border-2 border-dashed border-orange-200 text-orange-600 rounded-xl hover:border-orange-400 hover:bg-orange-50 transition-all font-semibold text-sm"
      >
        <Plus className="w-4 h-4" />
        Add Project
      </button>
    </div>
  );
}
