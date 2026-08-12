'use client';

import { useResume } from '../context';
import { Plus, Trash2 } from 'lucide-react';
import { generateId } from '../types';

export default function ProjectsForm() {
  const { data, dispatch } = useResume();
  const { projects } = data;

  const inputClass = "w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm";
  const labelClass = "block text-xs font-medium text-gray-700 mb-1 mt-3";

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Projects</h2>

      {projects.map((proj) => (
        <div key={proj.id} className="bg-white p-6 rounded-xl border shadow-sm relative">
          <button 
            onClick={() => dispatch({ type: 'REMOVE_PROJECT', payload: proj.id })}
            className="absolute top-4 right-4 p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 mr-10">
            <div>
              <label className={labelClass}>Project Name</label>
              <input 
                value={proj.name} 
                onChange={e => dispatch({ type: 'UPDATE_PROJECT', payload: { id: proj.id, data: { name: e.target.value } } })} 
                className={inputClass} placeholder="E-commerce Platform" 
              />
            </div>
            <div>
              <label className={labelClass}>Technologies (comma separated)</label>
              <input 
                value={proj.technologies} 
                onChange={e => dispatch({ type: 'UPDATE_PROJECT', payload: { id: proj.id, data: { technologies: e.target.value } } })} 
                className={inputClass} placeholder="React, Node.js, MongoDB" 
              />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Description</label>
              <textarea 
                value={proj.description} 
                onChange={e => dispatch({ type: 'UPDATE_PROJECT', payload: { id: proj.id, data: { description: e.target.value } } })} 
                className={`${inputClass} h-24 resize-none`} placeholder="Describe the project, your role, and achievements..." 
              />
            </div>
          </div>
        </div>
      ))}

      <button
        onClick={() => dispatch({ type: 'ADD_PROJECT', payload: {
          id: generateId(),
          name: '',
          description: '',
          technologies: ''
        }})}
        className="w-full py-3 flex items-center justify-center space-x-2 bg-primary-50 text-primary-600 rounded-xl hover:bg-primary-100 transition-colors font-medium border border-primary-100"
      >
        <Plus className="w-5 h-5" />
        <span>Add Project</span>
      </button>
    </div>
  );
}
