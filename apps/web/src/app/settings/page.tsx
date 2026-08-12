'use client';

import { Bell, Shield, Globe, User, Palette, Key } from 'lucide-react';

const sections = [
  { title: 'Profile', desc: 'Manage your personal information', icon: User, color: 'bg-blue-500' },
  { title: 'Notifications', desc: 'Configure email and push notifications', icon: Bell, color: 'bg-amber-500' },
  { title: 'Privacy', desc: 'Control your data and privacy settings', icon: Shield, color: 'bg-purple-500' },
  { title: 'Preferences', desc: 'Language, currency, and region settings', icon: Globe, color: 'bg-emerald-500' },
  { title: 'Appearance', desc: 'Customize the look and feel', icon: Palette, color: 'bg-pink-500' },
  { title: 'API Keys', desc: 'Manage API keys and integrations', icon: Key, color: 'bg-indigo-500' },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your account and application preferences</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map((section) => (
          <div key={section.title} className="bg-white rounded-xl p-6 border border-gray-100 hover:shadow-md transition-all cursor-pointer">
            <div className={`w-12 h-12 ${section.color} rounded-lg flex items-center justify-center mb-4`}>
              <section.icon className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900">{section.title}</h3>
            <p className="text-sm text-gray-500 mt-1">{section.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

