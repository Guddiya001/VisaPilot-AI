'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  Briefcase,
  FileText,
  MessageSquare,
  TrendingUp,
  Globe,
  Shield,
  Sparkles,
  ArrowRight,
  Bookmark,
  Clock,
  CheckCircle,
} from 'lucide-react';

const stats = [
  { label: 'Jobs Found', value: '24,891', icon: Briefcase, change: '+12%' },
  { label: 'Visa Sponsors', value: '3,452', icon: Globe, change: '+8%' },
  { label: 'ATS Score Avg', value: '87%', icon: Shield, change: '+5%' },
  { label: 'Applications', value: '1,284', icon: TrendingUp, change: '+23%' },
];

const quickActions = [
  {
    title: 'Search Jobs',
    description: 'Find international jobs with visa sponsorship',
    icon: Search,
    href: '/jobs',
    color: 'bg-blue-500',
  },
  {
    title: 'AI Chat',
    description: 'Get personalized career advice',
    icon: MessageSquare,
    href: '/ai-chat',
    color: 'bg-purple-500',
  },
  {
    title: 'Resume Builder',
    description: 'Optimize your resume for ATS',
    icon: FileText,
    href: '/resume-builder',
    color: 'bg-emerald-500',
  },
  {
    title: 'Applications',
    description: 'Track your job applications',
    icon: Briefcase,
    href: '/applications',
    color: 'bg-amber-500',
  },
];

const recentJobs = [
  {
    id: 1,
    title: 'Senior Software Engineer',
    company: 'Google',
    location: 'Zurich, Switzerland',
    salary: '$180k - $250k',
    visaSponsorship: true,
    matchScore: 94,
    postedAt: '2 days ago',
  },
  {
    id: 2,
    title: 'Product Manager',
    company: 'Spotify',
    location: 'Berlin, Germany',
    salary: '$120k - $160k',
    visaSponsorship: true,
    matchScore: 88,
    postedAt: '3 days ago',
  },
  {
    id: 3,
    title: 'Data Scientist',
    company: 'Stripe',
    location: 'Dublin, Ireland',
    salary: '$150k - $200k',
    visaSponsorship: true,
    matchScore: 82,
    postedAt: '5 days ago',
  },
  {
    id: 4,
    title: 'DevOps Engineer',
    company: 'Shopify',
    location: 'Ottawa, Canada',
    salary: '$130k - $170k',
    visaSponsorship: false,
    matchScore: 76,
    postedAt: '1 week ago',
  },
];

export default function Home() {
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-2xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              {greeting}, Ashish! 👋
            </h1>
            <p className="text-primary-100 text-lg">
              Your AI-powered job search companion. Let&apos;s find your dream international role.
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2 bg-white/10 rounded-lg px-4 py-2">
            <Sparkles className="w-5 h-5" />
            <span className="text-sm">AI Assistant Ready</span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mt-6 max-w-2xl">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search jobs, companies, skills..."
                className="w-full pl-10 pr-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/30"
              />
            </div>
            <button className="px-6 py-3 bg-white text-primary-700 rounded-lg font-semibold hover:bg-primary-50 transition-colors">
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl p-5 border border-gray-100 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-primary-50 rounded-lg">
                <stat.icon className="w-5 h-5 text-primary-600" />
              </div>
              <span className="text-sm text-green-600 font-medium">{stat.change}</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.title}
              href={action.href}
              className="bg-white rounded-xl p-5 border border-gray-100 hover:shadow-md transition-all group"
            >
              <div className={`w-10 h-10 ${action.color} rounded-lg flex items-center justify-center mb-3`}>
                <action.icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                {action.title}
              </h3>
              <p className="text-sm text-gray-500 mt-1">{action.description}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Jobs */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recommended Jobs</h2>
          <Link
            href="/jobs"
            className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
          >
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="space-y-3">
          {recentJobs.map((job) => (
            <div
              key={job.id}
              className="bg-white rounded-xl p-5 border border-gray-100 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg flex items-center justify-center text-primary-700 font-bold text-lg">
                    {job.company[0]}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{job.title}</h3>
                    <p className="text-sm text-gray-500">
                      {job.company} &middot; {job.location}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-sm font-medium text-gray-700">{job.salary}</span>
                      {job.visaSponsorship && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                          Visa Sponsorship
                        </span>
                      )}
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {job.postedAt}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-1 text-sm font-semibold text-primary-600">
                    <CheckCircle className="w-4 h-4" />
                    {job.matchScore}% Match
                  </div>
                  <button className="p-2 text-gray-400 hover:text-primary-600 transition-colors">
                    <Bookmark className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

