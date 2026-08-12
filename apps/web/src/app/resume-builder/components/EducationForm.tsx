'use client';

import { useResume } from '../context';
import { Plus, Trash2 } from 'lucide-react';
import { generateId } from '../types';

export default function EducationForm() {
  const { data, dispatch } = useResume();
  const { education } = data;

  const inputClass = "w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm";
  const labelClass = "block text-xs font-medium text-gray-700 mb-1 mt-3";

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Education</h2>

      {education.map((edu) => (
        <div key={edu.id} className="bg-white p-6 rounded-xl border shadow-sm relative">
          <button 
            onClick={() => dispatch({ type: 'REMOVE_EDUCATION', payload: edu.id })}
            className="absolute top-4 right-4 p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 mr-10">
            <div>
              <label className={labelClass}>Degree / Program</label>
              <input 
                value={edu.degree} 
                onChange={e => dispatch({ type: 'UPDATE_EDUCATION', payload: { id: edu.id, data: { degree: e.target.value } } })} 
                className={inputClass} placeholder="B.S. Computer Science" 
              />
            </div>
            <div>
              <label className={labelClass}>School / University</label>
              <input 
                value={edu.school} 
                onChange={e => dispatch({ type: 'UPDATE_EDUCATION', payload: { id: edu.id, data: { school: e.target.value } } })} 
                className={inputClass} placeholder="University Name" 
              />
            </div>
            <div>
              <label className={labelClass}>Location</label>
              <input 
                value={edu.location} 
                onChange={e => dispatch({ type: 'UPDATE_EDUCATION', payload: { id: edu.id, data: { location: e.target.value } } })} 
                className={inputClass} placeholder="City, State" 
              />
            </div>
            <div>
              <label className={labelClass}>Year / Period</label>
              <input 
                value={edu.year} 
                onChange={e => dispatch({ type: 'UPDATE_EDUCATION', payload: { id: edu.id, data: { year: e.target.value } } })} 
                className={inputClass} placeholder="2018 - 2022" 
              />
            </div>
          </div>
        </div>
      ))}

      <button
        onClick={() => dispatch({ 
          type: 'ADD_EDUCATION', 
          payload: {
            id: generateId(),
            degree: '',
            school: '',
            location: '',
            year: ''
          }
        })}
        className="w-full py-3 flex items-center justify-center space-x-2 bg-primary-50 text-primary-600 rounded-xl hover:bg-primary-100 transition-colors font-medium border border-primary-100"
      >
        <Plus className="w-5 h-5" />
        <span>Add Education</span>
      </button>
    </div>
  );
}
