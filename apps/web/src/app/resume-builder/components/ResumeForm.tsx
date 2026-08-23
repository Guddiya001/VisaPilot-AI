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
  { id: 'basics',          label: 'Basics',       icon: '👤' },
  { id: 'experience',      label: 'Experience',   icon: '💼' },
  { id: 'skills',          label: 'Skills',       icon: '🛠️' },
  { id: 'projects',        label: 'Projects',     icon: '🚀' },
  { id: 'education',       label: 'Education',    icon: '🎓' },
  { id: 'certifications',  label: 'Certs',        icon: '📜' },
  { id: 'achievements',    label: 'Wins',         icon: '🏆' },
  { id: 'languages',       label: 'Languages',    icon: '🌐' },
];

export function ResumeForm() {
  const [activeTab, setActiveTab] = useState('basics');
  const { data, dispatch } = useResume();

  return (
    <div className="flex flex-col h-full">
      {/* Tab Navigation */}
      <div className="flex-shrink-0 bg-white border-b border-gray-100 px-4 pt-3 pb-0">
        <div className="flex gap-1 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold whitespace-nowrap border-b-2 transition-all ${
                  isActive
                    ? 'border-primary-600 text-primary-700 bg-primary-50 rounded-t-lg'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-y-auto bg-gray-50 p-5">
        {activeTab === 'basics'          && <BasicInfoForm />}
        {activeTab === 'experience'      && <ExperienceForm />}
        {activeTab === 'skills'          && <SkillsForm />}
        {activeTab === 'projects'        && <ProjectsForm />}
        {activeTab === 'education'       && <EducationForm />}
        {activeTab === 'certifications'  && (
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
            placeholder="e.g. Led team that reduced infrastructure cost by 35%"
          />
        )}
        {activeTab === 'languages' && (
          <ListSectionForm
            label="Languages"
            items={data.languages}
            onChange={(items) => dispatch({ type: 'SET_LANGUAGES', payload: items })}
            placeholder="e.g. English – Native, Spanish – Intermediate"
          />
        )}
      </div>
    </div>
  );
}
