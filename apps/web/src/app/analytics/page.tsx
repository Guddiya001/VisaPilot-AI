'use client';

import { TrendingUp, BarChart3, PieChart, LineChart } from 'lucide-react';

export default function AnalyticsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500 mt-1">Track your job search performance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Applications/Week', value: '8.4', icon: BarChart3, color: 'bg-blue-500' },
          { label: 'Interview Rate', value: '24%', icon: PieChart, color: 'bg-purple-500' },
          { label: 'Response Time', value: '3.2 days', icon: LineChart, color: 'bg-amber-500' },
          { label: 'Offer Rate', value: '12%', icon: TrendingUp, color: 'bg-emerald-500' },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-xl p-5 border border-gray-100">
            <div className={`w-10 h-10 ${item.color} rounded-lg flex items-center justify-center mb-3`}>
              <item.icon className="w-5 h-5 text-white" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{item.value}</div>
            <div className="text-sm text-gray-500">{item.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Application Status</h3>
          <div className="space-y-3">
            {[
              { label: 'Applied', count: 45, pct: 45, color: 'bg-blue-500' },
              { label: 'Reviewed', count: 28, pct: 28, color: 'bg-amber-500' },
              { label: 'Interview', count: 18, pct: 18, color: 'bg-purple-500' },
              { label: 'Offer', count: 9, pct: 9, color: 'bg-emerald-500' },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700">{item.label}</span>
                  <span className="text-gray-500">{item.count} ({item.pct}%)</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Top Locations</h3>
          <div className="space-y-3">
            {[
              { city: 'Berlin, Germany', count: 12 },
              { city: 'London, UK', count: 10 },
              { city: 'Zurich, Switzerland', count: 8 },
              { city: 'Dublin, Ireland', count: 6 },
            ].map((loc) => (
              <div key={loc.city} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{loc.city}</span>
                <span className="text-sm font-semibold text-gray-900">{loc.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

