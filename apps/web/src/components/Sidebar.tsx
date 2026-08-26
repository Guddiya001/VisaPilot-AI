'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Search,
  Briefcase,
  FileText,
  MessageSquare,
  BarChart3,
  Settings,
  Menu,
  X,
  Plane,
  LogIn,
} from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/' },
  { label: 'Job Search', icon: Search, href: '/jobs' },
  { label: 'Applications', icon: Briefcase, href: '/applications' },
  { label: 'Resume Builder', icon: FileText, href: '/resume-builder' },
  { label: 'AI Chat', icon: MessageSquare, href: '/ai-chat' },
  { label: 'Analytics', icon: BarChart3, href: '/analytics' },
  { label: 'Settings', icon: Settings, href: '/settings' },
  { label: 'Login', icon: LogIn, href: '/login' },
];

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white/70 backdrop-blur-xl border-r border-gray-200/50 flex flex-col transition-transform duration-300 shadow-[4px_0_24px_rgba(0,0,0,0.02)]',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        {/* Logo */}
        <div className="p-6 border-b border-gray-200/50">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/20 group-hover:scale-105 transition-transform duration-300">
              <Plane className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 tracking-tight">VisaPilot</h1>
              <p className="text-xs text-primary-600 font-medium tracking-wide">AI Career OS</p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={clsx(
                  'relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 group overflow-hidden',
                  isActive
                    ? 'text-primary-700'
                    : 'text-gray-500 hover:text-gray-900',
                )}
              >
                {isActive && (
                  <div className="absolute inset-0 bg-primary-50/80 rounded-xl -z-10" />
                )}
                <div className={clsx(
                  "absolute left-0 top-1/2 -translate-y-1/2 w-1 bg-primary-600 rounded-r-full transition-all duration-300",
                  isActive ? "h-6 opacity-100" : "h-0 opacity-0 group-hover:h-4 group-hover:opacity-50"
                )} />
                <item.icon className={clsx(
                  "w-5 h-5 transition-transform duration-300 group-hover:scale-110",
                  isActive ? "text-primary-600" : "text-gray-400 group-hover:text-gray-600"
                )} />
                <span className="z-10 translate-x-1 group-hover:translate-x-2 transition-transform duration-300">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Info */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-semibold text-sm">
              A
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">Ashish</p>
              <p className="text-xs text-gray-500 truncate">Premium Plan</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

