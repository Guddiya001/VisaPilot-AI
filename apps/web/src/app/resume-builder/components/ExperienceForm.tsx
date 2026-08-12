'use client';

import { useResume } from '../context';
import { Briefcase, Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { generateId } from '../types';

export default function ExperienceForm() {
  const { data, dispatch } = useResume();
  const { experience } = data;

  const inputClass = "w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm";
  const labelClass = "block text-xs font-medium text-gray-700 mb-1 mt-3";

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2 text-xl font-semibold text-gray-800 mb-4">
        <Briefcase className="w-6 h-6 text-primary-600" />
        <h2>Work Experience</h2>
      </div>

      {experience.map((exp, index) => (
        <div key={exp.id} className="bg-white p-6 rounded-xl border shadow-sm relative">
          <div className="absolute top-4 right-4 flex space-x-2">
            <button 
              onClick={() => {
                if (index > 0) {
                  dispatch({
                    type: 'REORDER_EXPERIENCE',
                    payload: { fromIndex: index, toIndex: index - 1 },
                  });
                }
              }}
              disabled={index === 0}
              className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 rounded-md hover:bg-gray-100"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
            <button 
              onClick={() => {
                if (index < experience.length - 1) {
                  dispatch({
                    type: 'REORDER_EXPERIENCE',
                    payload: { fromIndex: index, toIndex: index + 1 },
                  });
                }
              }}
              disabled={index === experience.length - 1}
              className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 rounded-md hover:bg-gray-100"
            >
              <ArrowDown className="w-4 h-4" />
            </button>
            <button 
              onClick={() => dispatch({ type: 'REMOVE_EXPERIENCE', payload: exp.id })}
              className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 mr-24">
            <div>
              <label className={labelClass}>Job Title</label>
              <input 
                value={exp.role} 
                onChange={e => dispatch({ type: 'UPDATE_EXPERIENCE', payload: { id: exp.id, data: { role: e.target.value } } })} 
                className={inputClass} placeholder="Software Engineer" 
              />
            </div>
            <div>
              <label className={labelClass}>Company</label>
              <input 
                value={exp.company} 
                onChange={e => dispatch({ type: 'UPDATE_EXPERIENCE', payload: { id: exp.id, data: { company: e.target.value } } })} 
                className={inputClass} placeholder="Tech Corp" 
              />
            </div>
            <div>
              <label className={labelClass}>Client (Optional)</label>
              <input 
                value={exp.client || ''} 
                onChange={e => dispatch({ type: 'UPDATE_EXPERIENCE', payload: { id: exp.id, data: { client: e.target.value } } })} 
                className={inputClass} placeholder="Client Name" 
              />
            </div>
            <div>
              <label className={labelClass}>Location</label>
              <input 
                value={exp.location} 
                onChange={e => dispatch({ type: 'UPDATE_EXPERIENCE', payload: { id: exp.id, data: { location: e.target.value } } })} 
                className={inputClass} placeholder="San Francisco, CA" 
              />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Period</label>
              <input 
                value={exp.period} 
                onChange={e => dispatch({ type: 'UPDATE_EXPERIENCE', payload: { id: exp.id, data: { period: e.target.value } } })} 
                className={inputClass} placeholder="Jan 2020 - Present" 
              />
            </div>
          </div>

          <div className="mt-4">
            <label className={labelClass}>Bullet Points</label>
            <div className="space-y-2 mt-1">
              {exp.bullets.map((bullet, bIndex) => (
                <div key={bIndex} className="flex space-x-2">
                  <span className="text-gray-400 mt-2">•</span>
                  <input
                    value={bullet}
                    onChange={e => dispatch({ type: 'UPDATE_BULLET', payload: { experienceId: exp.id, index: bIndex, value: e.target.value } })}
                    className={inputClass}
                    placeholder="Led development of..."
                  />
                  <button
                    onClick={() => dispatch({ type: 'REMOVE_BULLET', payload: { experienceId: exp.id, index: bIndex } })}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => dispatch({ type: 'ADD_BULLET', payload: { experienceId: exp.id } })}
                className="flex items-center space-x-1 text-sm text-primary-600 hover:text-primary-700 mt-2 font-medium"
              >
                <Plus className="w-4 h-4" />
                <span>Add Bullet</span>
              </button>
            </div>
          </div>
        </div>
      ))}

      <button
        onClick={() => dispatch({ type: 'ADD_EXPERIENCE', payload: {
          id: generateId(),
          role: '',
          company: '',
          location: '',
          period: '',
          bullets: ['']
        }})}
        className="w-full py-3 flex items-center justify-center space-x-2 bg-primary-50 text-primary-600 rounded-xl hover:bg-primary-100 transition-colors font-medium border border-primary-100"
      >
        <Plus className="w-5 h-5" />
        <span>Add Experience</span>
      </button>
    </div>
  );
}
