'use client';

import { Plus, X } from 'lucide-react';

interface ListSectionFormProps {
  items: string[];
  onChange: (items: string[]) => void;
  label: string;
  placeholder?: string;
}

const SECTION_ICONS: Record<string, string> = {
  Certifications: '📜',
  Achievements: '🏆',
  Languages: '🌐',
};

export default function ListSectionForm({ items, onChange, label, placeholder }: ListSectionFormProps) {
  const icon = SECTION_ICONS[label] ?? '📋';

  const handleUpdate = (index: number, value: string) => {
    const newItems = [...items];
    newItems[index] = value;
    onChange(newItems);
  };

  const handleRemove = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const handleAdd = () => {
    onChange([...items, '']);
  };

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-white">
          <span className="text-lg">{icon}</span>
          <h3 className="text-sm font-semibold text-gray-700">{label}</h3>
          <span className="ml-auto text-xs font-medium text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
            {items.length}
          </span>
        </div>

        <div className="p-5 space-y-3">
          {items.length === 0 && (
            <p className="text-sm text-gray-400 italic text-center py-4">
              No {label.toLowerCase()} added yet
            </p>
          )}

          {items.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="flex-shrink-0 text-gray-400 text-sm">▸</span>
              <input
                value={item}
                onChange={(e) => handleUpdate(index, e.target.value)}
                className="flex-1 px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all hover:border-gray-300"
                placeholder={placeholder ?? `Enter ${label.toLowerCase()}...`}
              />
              <button
                onClick={() => handleRemove(index)}
                className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}

          <button
            onClick={handleAdd}
            className="w-full mt-1 py-3 flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 text-gray-500 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all font-semibold text-sm"
          >
            <Plus className="w-4 h-4" />
            Add {label.replace(/s$/, '')}
          </button>
        </div>
      </div>
    </div>
  );
}
