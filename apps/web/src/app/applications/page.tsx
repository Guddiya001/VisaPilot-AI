'use client';

import React, { useEffect, useState } from 'react';
import { applicationsApi, authApi } from '@/lib/api';
import { KanbanBoard, Application, ApplicationStatus } from './components/KanbanBoard';
import { Loader2, LayoutDashboard } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ApplicationsPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = authApi.getToken();
    if (!token) {
      // In a real app, we'd redirect to login, but for now we'll just show an error
      // router.push('/login');
      setError('Please log in to view your applications.');
      setLoading(false);
      return;
    }

    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await applicationsApi.getAll();

      if (res.success && res.data) {
        setApplications(res.data.data as Application[]);
      } else {
        setError(res.error || 'Failed to load applications');
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred while loading applications.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (id: string, newStatus: ApplicationStatus) => {
    setApplications((prev) =>
      prev.map((app) => (app.id === id ? { ...app, status: newStatus } : app))
    );
  };

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="flex items-center gap-3 text-primary-600 bg-primary-50 px-6 py-3 rounded-full shadow-sm border border-primary-100">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm font-medium">Loading applications...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="bg-red-50 text-red-600 p-6 rounded-xl border border-red-100 text-center max-w-md">
          <h3 className="font-semibold text-lg mb-2">Authentication Required</h3>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in h-full flex flex-col min-h-screen">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <LayoutDashboard className="w-6 h-6 text-primary-600" />
          Job Applications
        </h1>
        <p className="text-gray-500 mt-1">
          Track your job applications and move them across stages.
        </p>
      </div>

      <div className="flex-1 min-h-0 bg-white rounded-xl border border-gray-100 shadow-sm p-4 overflow-hidden">
        <KanbanBoard applications={applications} onStatusChange={handleStatusChange} />
      </div>
    </div>
  );
}

