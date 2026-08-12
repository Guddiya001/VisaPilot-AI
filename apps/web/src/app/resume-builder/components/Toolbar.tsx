'use client';

import React, { useRef } from 'react';
import { useResume } from '../context';
import { Printer, Sparkles, FileText, Trash2, Download, Upload } from 'lucide-react';

interface ToolbarProps {
  onExportPDF: () => void;
  onAnalyze: () => void;
}

export function Toolbar({ onExportPDF, onAnalyze }: ToolbarProps) {
  const { dispatch, exportJSON, importJSON } = useResume();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      dispatch({ type: 'CLEAR_ALL' });
    }
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
          importJSON(content);
        } catch (error) {
          alert('Failed to parse JSON file');
        }
      };
      reader.readAsText(file);
    }
    // Reset the input so the same file can be loaded again if needed
    if (e.target) {
      e.target.value = '';
    }
  };

  return (
    <div className="flex flex-row flex-wrap gap-2 items-center p-4 bg-white border-b border-gray-200">
      <button
        onClick={onExportPDF}
        className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors"
      >
        <Printer size={16} />
        <span className="text-sm font-medium">Export PDF</span>
      </button>

      <button
        onClick={onAnalyze}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
      >
        <Sparkles size={16} className="text-primary-600" />
        <span className="text-sm font-medium">AI Analyze</span>
      </button>

      <button
        onClick={() => dispatch({ type: 'LOAD_SAMPLE' })}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
      >
        <FileText size={16} />
        <span className="text-sm font-medium">Load Sample</span>
      </button>

      <button
        onClick={handleClearAll}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-red-600 rounded hover:bg-red-50 transition-colors ml-auto"
      >
        <Trash2 size={16} />
        <span className="text-sm font-medium">Clear All</span>
      </button>

      <button
        onClick={exportJSON}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
      >
        <Download size={16} />
        <span className="text-sm font-medium">Export JSON</span>
      </button>

      <button
        onClick={handleImportClick}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
      >
        <Upload size={16} />
        <span className="text-sm font-medium">Import JSON</span>
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
