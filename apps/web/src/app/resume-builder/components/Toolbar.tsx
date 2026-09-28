'use client';

import React, { useRef } from 'react';
import { useResume } from '../context';
import { RESUME_PRESETS, ResumePresetId } from '../types';
import { Printer, Sparkles, FileText, Trash2, Download, Upload, Layers, Check } from 'lucide-react';

interface ToolbarProps {
  onExportPDF: () => void;
  onAnalyze: () => void;
  jobInfo?: { id: string; company: string; title: string; description: string; requirements: string } | null;
}

export function Toolbar({ onExportPDF, onAnalyze, jobInfo }: ToolbarProps) {
  const { data, dispatch, exportJSON, importJSON, activePreset, loadPreset } = useResume();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all resume data? This cannot be undone.')) {
      dispatch({ type: 'CLEAR_ALL' });
    }
  };

  // Fix: actually trigger a file download instead of just returning the JSON string
  const handleExportJSON = () => {
    const json = exportJSON();
    let dataToExport = json;
    
    // Save with Job JD for latter reference.
    if (jobInfo) {
      try {
        const parsed = JSON.parse(json);
        parsed.targetJobInfo = {
          jobId: jobInfo.id,
          companyName: jobInfo.company,
          jobTitle: jobInfo.title,
          description: jobInfo.description,
          requirements: jobInfo.requirements
        };
        dataToExport = JSON.stringify(parsed, null, 2);
      } catch (e) {
        console.error('Failed to parse and append job info to export JSON', e);
      }
    }

    const blob = new Blob([dataToExport], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const sanitize = (str: string) => str.trim().replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '');
    const candidateName = sanitize(data.basics.name) || 'Ashish_Kumar_Singh';
    const presetSuffix = activePreset !== 'master' ? `_${activePreset.toUpperCase()}` : '';
    const roleName = sanitize(jobInfo?.title || data.basics.title.split('|')[0].trim() || 'Software_Engineer');
    const companyName = jobInfo?.company && jobInfo.company.toLowerCase() !== 'company' ? sanitize(jobInfo.company) : '';
    const downloadName = companyName
      ? `${candidateName}_${roleName}${presetSuffix}_${companyName}_Resume.json`
      : `${candidateName}_${roleName}${presetSuffix}_Resume.json`;

    const a = document.createElement('a');
    a.href = url;
    a.download = downloadName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          const ok = importJSON(content);
          if (!ok) alert('Invalid resume JSON file. Please check the format.');
        } catch {
          alert('Failed to parse JSON file.');
        }
      };
      reader.readAsText(file);
    }
    if (e.target) e.target.value = '';
  };

  return (
    <div className="flex flex-col gap-2.5 px-4 py-3 bg-white border-b border-gray-100 shadow-sm">
      {/* Top row: Primary actions + Version Presets Selector */}
      <div className="flex flex-row flex-wrap gap-2 items-center justify-between">
        {/* Primary actions */}
        <div className="flex items-center gap-2">
          <button
            id="toolbar-export-pdf"
            onClick={onExportPDF}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-600 to-indigo-600 text-white text-sm font-semibold rounded-lg shadow-sm hover:from-primary-700 hover:to-indigo-700 transition-all hover:-translate-y-0.5"
          >
            <Printer size={15} />
            Export PDF
          </button>

          <button
            id="toolbar-ai-analyze"
            onClick={onAnalyze}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-semibold rounded-lg shadow-sm hover:from-violet-600 hover:to-purple-700 transition-all hover:-translate-y-0.5"
          >
            <Sparkles size={15} />
            ATS Score
          </button>
        </div>

        {/* 1-Click Version Switcher Pills */}
        <div className="flex items-center gap-1.5 bg-gray-50/90 p-1 rounded-xl border border-gray-200/90 shadow-inner">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider px-2 flex items-center gap-1">
            <Layers size={13} className="text-gray-400" />
            Resume Track:
          </span>
          <div className="flex items-center gap-1 flex-wrap">
            {RESUME_PRESETS.map((p) => {
              const isActive = activePreset === p.id;
              return (
                <button
                  key={p.id}
                  id={`toolbar-preset-${p.id}`}
                  onClick={() => loadPreset(p.id)}
                  title={`${p.label} (${p.badge}): ${p.tagline}`}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-white text-gray-900 shadow-sm border border-gray-200 font-bold ring-1 ring-black/5'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/80'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      p.id === 'frontend'
                        ? 'bg-amber-500'
                        : p.id === 'backend'
                        ? 'bg-blue-600'
                        : p.id === 'ai'
                        ? 'bg-purple-600'
                        : p.id === 'fde'
                        ? 'bg-emerald-600'
                        : 'bg-gray-700'
                    }`}
                  />
                  {p.label}
                  {isActive && (
                    <span className="ml-0.5 text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold flex items-center gap-0.5">
                      <Check size={10} /> Active
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Secondary actions: Export JSON, Import, Clear */}
        <div className="flex items-center gap-2">
          <button
            id="toolbar-export-json"
            onClick={handleExportJSON}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all"
          >
            <Download size={13} />
            Export JSON
          </button>

          <button
            id="toolbar-import-json"
            onClick={handleImportClick}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all"
          >
            <Upload size={13} />
            Import
          </button>

          <button
            id="toolbar-clear-all"
            onClick={handleClearAll}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-red-200 text-red-500 text-xs font-medium rounded-lg hover:bg-red-50 hover:border-red-300 transition-all"
          >
            <Trash2 size={13} />
            Clear
          </button>
        </div>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".json"
        className="hidden"
      />
    </div>
  );
}
