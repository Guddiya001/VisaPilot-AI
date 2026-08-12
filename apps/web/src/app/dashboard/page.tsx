'use client';

import Link from 'next/link';
import { Briefcase, TrendingUp, Globe, Shield, ArrowRight, Clock, CheckCircle } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Overview of your job search activity</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Jobs Found', value: '24,891', icon: Briefcase, change: '+12%', color: 'bg-blue-50 text-blue-600' },
          { label: 'Visa Sponsors', value: '3,452', icon: Globe, change: '+8%', color: 'bg-emerald-50 text-emerald-600' },
          { label: 'ATS Score Avg', value: '87%', icon: Shield, change: '+5%', color: 'bg-purple-50 text-purple-600' },
          { label: 'Applications', value: '1,284', icon: TrendingUp, change: '+23%', color: 'bg-amber-50 text-amber-600' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl p-5 border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 ${stat.color} rounded-lg`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <span className="text-sm text-green-600 font-medium">{stat.change}</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <div className="space-y-4">
          {[
            { action: 'Applied to Senior Software Engineer at Google', time: '2 hours ago' },
            { action: 'Resume ATS score improved to 87%', time: '1 day ago' },
            { action: 'New job match: Product Manager at Spotify', time: '3 days ago' },
          ].map((activity, i) => (
            <div key={i} className="flex items-center gap-3 text-sm">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-gray-700">{activity.action}</span>
              <span className="text-gray-400 ml-auto">{activity.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

