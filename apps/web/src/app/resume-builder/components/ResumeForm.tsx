'use client';

import { useState } from 'react';
import BasicInfoForm from './BasicInfoForm';
import ExperienceForm from './ExperienceForm';
import SkillsForm from './SkillsForm';
import ProjectsForm from './ProjectsForm';
import EducationForm from './EducationForm';
import ListSectionForm from './ListSectionForm';
import { useResume } from '../context';

const tabs = [
  { id: 'basics', label: 'Basics' },
  { id: 'experience', label: 'Experience' },
  { id: 'skills', label: 'Skills' },
  { id: 'projects', label: 'Projects' },
  { id: 'education', label: 'Education' },
  { id: 'certifications', label: 'Certifications' },
  { id: 'achievements', label: 'Achievements' },
  { id: 'languages', label: 'Languages' },
];

export function ResumeForm() {
  const [activeTab, setActiveTab] = useState('basics');
  const { data, dispatch } = useResume();

  return (
    <div className="flex flex-col h-full bg-gray-50 border-r">
      <div className="p-4 border-b bg-white">
        <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'basics' && <BasicInfoForm />}
        {activeTab === 'experience' && <ExperienceForm />}
        {activeTab === 'skills' && <SkillsForm />}
        {activeTab === 'projects' && <ProjectsForm />}
        {activeTab === 'education' && <EducationForm />}
        {activeTab === 'certifications' && (
          <ListSectionForm
            label="Certifications"
            items={data.certificates}
            onChange={(items) => dispatch({ type: 'SET_CERTIFICATES', payload: items })}
            placeholder="e.g. AWS Certified Solutions Architect"
          />
        )}
        {activeTab === 'achievements' && (
          <ListSectionForm
            label="Achievements"
            items={data.achievements}
            onChange={(items) => dispatch({ type: 'SET_ACHIEVEMENTS', payload: items })}
            placeholder="e.g. Winner of 2023 Hackathon"
          />
        )}
        {activeTab === 'languages' && (
          <ListSectionForm
            label="Languages"
            items={data.languages}
            onChange={(items) => dispatch({ type: 'SET_LANGUAGES', payload: items })}
            placeholder="e.g. English (Native), Spanish (Intermediate)"
          />
        )}
      </div>
    </div>
  );
}
