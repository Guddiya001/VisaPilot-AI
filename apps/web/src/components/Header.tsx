'use client';

import { Bell, Search, Moon, Sun } from 'lucide-react';
import { useState } from 'react';

export function Header() {
  const [darkMode, setDarkMode] = useState(false);

  return (
    <header className="sticky top-0 z-30 bg-white/70 backdrop-blur-xl border-b border-gray-200/50 px-6 py-4 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
      <div className="flex items-center justify-between">
        {/* Search */}
        <div className="hidden md:flex items-center gap-2 flex-1 max-w-lg">
          <div className="relative w-full group">
            <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
              <Search className="w-4 h-4 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Search anything..."
              className="w-full pl-11 pr-4 py-2.5 bg-gray-50/50 hover:bg-gray-100/50 border border-gray-200/60 rounded-full text-sm focus:outline-none focus:ring-4 focus:ring-primary-500/20 focus:border-primary-500/50 focus:bg-white transition-all duration-300 shadow-sm"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <span className="text-xs text-gray-400 font-medium px-2 py-1 bg-white border border-gray-200 rounded-md shadow-sm">
                ⌘K
              </span>
            </div>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-4 ml-auto">
          {/* Dark Mode Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-full transition-all duration-300"
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* Notifications */}
          <button className="p-2.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-full transition-all duration-300 relative group">
            <Bell className="w-5 h-5 group-hover:animate-[wiggle_1s_ease-in-out_infinite]" />
            <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
          </button>

          {/* Avatar */}
          <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-md shadow-primary-500/20 cursor-pointer hover:scale-105 transition-transform duration-300 ring-2 ring-white">
            A
          </div>
        </div>
      </div>
    </header>
  );
}

