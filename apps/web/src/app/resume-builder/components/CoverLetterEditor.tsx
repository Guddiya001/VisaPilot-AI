'use client';

import React, { useState } from 'react';
import { useResume } from '../context';
import { Plus, X, Wand2, Loader2 } from 'lucide-react';
// @ts-ignore
import { aiApi } from '@/lib/api';

export function CoverLetterEditor() {
  const { data, dispatch } = useResume();
  const [jobDescription, setJobDescription] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const paragraphs = data.coverLetter?.paragraphs || [];

  const updateParagraphs = (newParagraphs: string[]) => {
    dispatch({ type: 'SET_COVER_LETTER', payload: { paragraphs: newParagraphs } });
  };

  const handleChange = (index: number, value: string) => {
    const newP = [...paragraphs];
    newP[index] = value;
    updateParagraphs(newP);
  };

  const handleRemove = (index: number) => {
    const newP = [...paragraphs];
    newP.splice(index, 1);
    updateParagraphs(newP);
  };

  const handleAdd = () => {
    updateParagraphs([...paragraphs, '']);
  };

  const handleGenerate = async () => {
    if (!jobDescription || !companyName || !jobTitle) {
      alert('Please fill in Job Title, Company Name, and Job Description for AI generation.');
      return;
    }

    setIsGenerating(true);
    try {
      const skills = data.skillsFlat;
      const result = await aiApi.generateCoverLetter({
        userName: data.basics.name || 'Applicant',
        jobTitle,
        companyName,
        jobDescription,
        skills
      });
      
      if (result && (result as any).paragraphs) {
        updateParagraphs((result as any).paragraphs);
      } else if (typeof result === 'string') {
        // Fallback if API returns raw string
        updateParagraphs((result as any).split('\n').filter((p: string) => p.trim() !== ''));
      } else {
        // Mock fallback
        updateParagraphs([
          `Dear Hiring Manager at ${companyName},`,
          `I am writing to express my strong interest in the ${jobTitle} position.`,
          `With my background in ${skills.join(', ').substring(0, 50)}..., I am confident in my ability to contribute effectively.`,
          `Thank you for your time and consideration.`,
          `Sincerely,`,
          `${data.basics.name}`
        ]);
      }
    } catch (error) {
      console.error('Failed to generate cover letter:', error);
      alert('Failed to generate cover letter. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Wand2 size={20} className="text-primary-600" />
          AI Cover Letter Generator
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Target Job Title</label>
            <input
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g. Frontend Engineer"
              className="p-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Company Name</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Acme Corp"
              className="p-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1 md:col-span-2">
            <label className="text-sm font-medium text-gray-700">Job Description Snippet</label>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the key requirements..."
              className="p-2 border border-gray-300 rounded h-20 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm resize-none"
            />
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={isGenerating || !jobDescription || !companyName || !jobTitle}
          className="w-full flex items-center justify-center gap-2 py-2 bg-primary-50 text-primary-700 border border-primary-200 rounded font-medium hover:bg-primary-100 transition-colors disabled:opacity-50"
        >
          {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Wand2 size={18} />}
          {isGenerating ? 'Generating...' : 'Generate with AI'}
        </button>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex flex-col gap-4">
        <h3 className="text-lg font-semibold text-gray-800">Cover Letter Content</h3>
        
        {paragraphs.map((p, idx) => (
          <div key={idx} className="flex gap-2 items-start relative group">
            <textarea
              value={p}
              onChange={(e) => handleChange(idx, e.target.value)}
              className="flex-1 p-3 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm min-h-[80px]"
            />
            <button
              onClick={() => handleRemove(idx)}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
              title="Remove paragraph"
            >
              <X size={18} />
            </button>
          </div>
        ))}

        <button
          onClick={handleAdd}
          className="flex items-center gap-2 py-3 px-4 border-2 border-dashed border-gray-300 rounded text-gray-500 hover:bg-gray-50 hover:border-primary-300 hover:text-primary-600 transition-all font-medium text-sm justify-center"
        >
          <Plus size={18} /> Add Paragraph
        </button>
      </div>
    </div>
  );
}
