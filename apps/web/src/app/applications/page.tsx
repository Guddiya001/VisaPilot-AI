'use client';

import { Briefcase, Clock, CheckCircle, XCircle, ChevronRight } from 'lucide-react';

const applications = [
  { id: 1, company: 'Google', role: 'Senior Software Engineer', status: 'Applied', date: '2024-01-15', logo: 'G' },
  { id: 2, company: 'Spotify', role: 'Product Manager', status: 'Interview', date: '2024-01-12', logo: 'S' },
  { id: 3, company: 'Stripe', role: 'Data Scientist', status: 'Review', date: '2024-01-10', logo: 'S' },
  { id: 4, company: 'Shopify', role: 'DevOps Engineer', status: 'Rejected', date: '2024-01-08', logo: 'S' },
];

const statusColors: Record<string, string> = {
  Applied: 'bg-blue-100 text-blue-700',
  Interview: 'bg-purple-100 text-purple-700',
  Review: 'bg-amber-100 text-amber-700',
  Rejected: 'bg-red-100 text-red-700',
  Accepted: 'bg-green-100 text-green-700',
};

export default function ApplicationsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Applications</h1>
        <p className="text-gray-500 mt-1">Track your job applications</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: applications.length, icon: Briefcase, color: 'bg-blue-500' },
          { label: 'Active', value: applications.filter(a => a.status !== 'Rejected' && a.status !== 'Accepted').length, icon: Clock, color: 'bg-amber-500' },
          { label: 'Interviews', value: applications.filter(a => a.status === 'Interview').length, icon: CheckCircle, color: 'bg-purple-500' },
          { label: 'Rejected', value: applications.filter(a => a.status === 'Rejected').length, icon: XCircle, color: 'bg-red-500' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl p-5 border border-gray-100">
            <div className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center mb-3`}>
              <stat.icon className="w-5 h-5 text-white" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            <div className="text-sm text-gray-500">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100">
        {applications.map((app, i) => (
          <div key={app.id} className={`flex items-center justify-between p-5 ${i < applications.length - 1 ? 'border-b border-gray-100' : ''}`}>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg flex items-center justify-center text-primary-700 font-bold">
                {app.logo}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{app.role}</h3>
                <p className="text-sm text-gray-500">{app.company}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[app.status]}`}>{app.status}</span>
              <span className="text-xs text-gray-400">{app.date}</span>
              <ChevronRight className="w-5 h-5 text-gray-300" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

