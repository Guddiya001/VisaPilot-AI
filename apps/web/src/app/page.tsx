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
    <div className="space-y-8 animate-fade-in pb-10">
      {/* Welcome Section */}
      <div className="relative overflow-hidden rounded-3xl p-8 lg:p-12 text-white shadow-2xl shadow-primary-900/20">
        {/* Animated Background Layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900" />
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary-400/30 rounded-full blur-3xl animate-blob" />
        <div className="absolute top-12 -right-24 w-96 h-96 bg-visa-purple/30 rounded-full blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute -bottom-24 left-1/2 w-96 h-96 bg-visa-blue/30 rounded-full blur-3xl animate-blob animation-delay-4000" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-xl animate-slide-up">
            <h1 className="text-4xl lg:text-5xl font-extrabold mb-4 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-primary-100">
              {greeting}, Ashish! 👋
            </h1>
            <p className="text-primary-50/90 text-lg lg:text-xl font-medium leading-relaxed">
              Your AI-powered job search companion. Let&apos;s find your dream international role.
            </p>
          </div>
          <div className="hidden md:flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-5 py-3 shadow-xl animate-float">
            <div className="bg-white/20 p-2 rounded-xl">
              <Sparkles className="w-6 h-6 text-primary-100" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">AI Assistant</p>
              <p className="text-xs text-primary-200">Ready to help</p>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative z-10 mt-10 max-w-3xl animate-slide-up" style={{ animationDelay: '100ms' }}>
          <div className="flex flex-col sm:flex-row gap-3 p-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-inner">
            <div className="flex-1 relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50 group-focus-within:text-white transition-colors" />
              <input
                type="text"
                defaultValue="Search for newly posted senior software engineering jobs..."
                placeholder="Search jobs, companies, skills..."
                className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-transparent text-white placeholder-white/50 focus:outline-none focus:bg-white/10 transition-all font-medium"
              />
            </div>
            <button className="px-8 py-3.5 bg-white text-primary-700 rounded-xl font-bold hover:bg-primary-50 hover:scale-105 hover:shadow-lg transition-all duration-300">
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            className="bg-white/60 backdrop-blur-xl rounded-2xl p-6 border border-gray-100 hover:border-primary-200 shadow-sm hover:shadow-xl hover:shadow-primary-500/10 hover:-translate-y-1 transition-all duration-300 animate-slide-up"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-primary-50 to-primary-100/50 rounded-xl">
                <stat.icon className="w-6 h-6 text-primary-600" />
              </div>
              <span className="text-sm bg-green-50 text-green-600 px-2.5 py-1 rounded-full font-semibold border border-green-100/50">{stat.change}</span>
            </div>
            <div className="text-3xl font-extrabold text-gray-900 tracking-tight">{stat.value}</div>
            <div className="text-sm font-medium text-gray-500 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="animate-slide-up" style={{ animationDelay: '400ms' }}>
        <h2 className="text-xl font-bold text-gray-900 mb-5 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary-500" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
          {quickActions.map((action) => (
            <Link
              key={action.title}
              href={action.href}
              className="bg-white rounded-2xl p-6 border border-gray-100 hover:border-transparent hover:shadow-xl hover:shadow-gray-200/50 hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRight className="w-5 h-5 text-gray-300 -rotate-45" />
              </div>
              <div className={`w-12 h-12 ${action.color} bg-gradient-to-br from-white/20 to-black/20 rounded-xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                <action.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-gray-900 group-hover:text-primary-600 transition-colors">
                {action.title}
              </h3>
              <p className="text-sm text-gray-500 mt-1 font-medium">{action.description}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Jobs */}
      <div className="animate-slide-up" style={{ animationDelay: '500ms' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-gray-900">Recommended Jobs</h2>
          <Link
            href="/jobs"
            className="text-sm font-semibold text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 px-4 py-2 rounded-full flex items-center gap-1 transition-colors"
          >
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="space-y-4">
          {recentJobs.map((job, i) => (
            <div
              key={job.id}
              className="bg-white rounded-2xl p-5 lg:p-6 border border-gray-100 hover:border-primary-200 hover:shadow-xl hover:shadow-primary-500/5 transition-all duration-300 group animate-slide-up"
              style={{ animationDelay: `${500 + i * 100}ms` }}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex gap-4 lg:gap-5">
                  <div className="w-14 h-14 bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-2xl flex items-center justify-center text-gray-700 font-bold text-xl shadow-sm group-hover:scale-105 group-hover:shadow-md group-hover:border-primary-200 group-hover:text-primary-600 transition-all duration-300">
                    {job.company[0]}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900 group-hover:text-primary-600 transition-colors">{job.title}</h3>
                    <p className="text-sm font-medium text-gray-500 mt-1 flex items-center gap-2">
                      <span className="text-gray-900">{job.company}</span>
                      <span className="w-1 h-1 rounded-full bg-gray-300" />
                      {job.location}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      <span className="text-sm font-semibold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-md">{job.salary}</span>
                      {job.visaSponsorship && (
                        <span className="text-xs bg-green-50 text-green-700 px-2.5 py-1 rounded-md font-bold border border-green-200/50 flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          Visa Sponsorship
                        </span>
                      )}
                      <span className="text-xs font-medium text-gray-500 flex items-center gap-1 ml-1">
                        <Clock className="w-3.5 h-3.5" />
                        {job.postedAt}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-4 sm:gap-3 w-full sm:w-auto mt-2 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                  <div className="flex items-center gap-1.5 text-sm font-bold text-primary-700 bg-primary-50 px-3 py-1.5 rounded-full border border-primary-100">
                    <Sparkles className="w-4 h-4 text-primary-500" />
                    {job.matchScore}% Match
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all">
                      <Bookmark className="w-5 h-5" />
                    </button>
                    <button className="px-5 py-2 bg-gray-900 hover:bg-primary-600 text-white font-semibold text-sm rounded-xl transition-colors shadow-md hidden sm:block">
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

