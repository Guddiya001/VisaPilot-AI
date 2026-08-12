'use client';

import { Plus, X } from 'lucide-react';

interface ListSectionFormProps {
  items: string[];
  onChange: (items: string[]) => void;
  label: string;
  placeholder?: string;
}

export default function ListSectionForm({ items, onChange, label, placeholder }: ListSectionFormProps) {
  const inputClass = "w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm";

  const handleUpdate = (index: number, value: string) => {
    const newItems = [...items];
    newItems[index] = value;
    onChange(newItems);
  };

  const handleRemove = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    onChange(newItems);
  };

  const handleAdd = () => {
    onChange([...items, '']);
  };

  return (
    <div className="bg-white p-6 rounded-xl border shadow-sm">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">{label}</h2>

      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={index} className="flex items-center space-x-2">
            <input
              value={item}
              onChange={e => handleUpdate(index, e.target.value)}
              className={inputClass}
              placeholder={placeholder || `Enter ${label.toLowerCase()}...`}
            />
            <button
              onClick={() => handleRemove(index)}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={handleAdd}
        className="mt-4 flex items-center space-x-1 text-sm text-primary-600 hover:text-primary-700 font-medium"
      >
        <Plus className="w-4 h-4" />
        <span>Add Item</span>
      </button>
    </div>
  );
}
