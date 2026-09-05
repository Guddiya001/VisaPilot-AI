'use client';

import React, { useRef } from 'react';
import { useResume } from '../context';
import { Printer, Sparkles, FileText, Trash2, Download, Upload } from 'lucide-react';

interface ToolbarProps {
  onExportPDF: () => void;
  onAnalyze: () => void;
  jobInfo?: { id: string; company: string; title: string; description: string; requirements: string } | null;
}

export function Toolbar({ onExportPDF, onAnalyze, jobInfo }: ToolbarProps) {
  const { dispatch, exportJSON, importJSON } = useResume();
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
    
    // Save with Job JD for latter refence.
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
    const sanitize = (str: string) => str.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
    const a = document.createElement('a');
    a.href = url;
    a.download = jobInfo ? `Resume_${sanitize(jobInfo.title)}_${sanitize(jobInfo.company)}.json` : 'Resume.json';
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
    <div className="flex flex-row flex-wrap gap-2 items-center px-4 py-3 bg-white border-b border-gray-100 shadow-sm">
      {/* Primary actions */}
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

      <div className="w-px h-6 bg-gray-200 mx-1" />

      {/* Secondary actions */}
      <button
        id="toolbar-load-sample"
        onClick={() => dispatch({ type: 'LOAD_SAMPLE' })}
        className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all"
      >
        <FileText size={14} />
        Sample
      </button>

      <button
        id="toolbar-export-json"
        onClick={handleExportJSON}
        className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all"
      >
        <Download size={14} />
        Export JSON
      </button>

      <button
        id="toolbar-import-json"
        onClick={handleImportClick}
        className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all"
      >
        <Upload size={14} />
        Import
      </button>

      {/* Destructive — pushed to the right */}
      <button
        id="toolbar-clear-all"
        onClick={handleClearAll}
        className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-red-200 text-red-500 text-sm font-medium rounded-lg hover:bg-red-50 hover:border-red-300 transition-all ml-auto"
      >
        <Trash2 size={14} />
        Clear
      </button>

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
