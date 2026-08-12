'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('demo@visapilot.ai');
  const [password, setPassword] = useState('demo1234');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);

    const result = await authApi.login(email, password);

    if (!result.success || !result.data?.accessToken) {
      setError(result.error || 'Login failed. Please check your credentials.');
      setLoading(false);
      return;
    }

    authApi.setToken(result.data.accessToken);
    router.push('/');
  }

  return (
    <div className="max-w-3xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
      <div className="bg-white shadow-md rounded-3xl border border-gray-100 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          <div className="p-10 bg-primary-600 text-white flex flex-col justify-center gap-6">
            <div>
              <h1 className="text-3xl font-semibold">Welcome back</h1>
              <p className="mt-3 text-sm text-primary-100">
                Sign in to access the AI career assistant and personalized job tools.
              </p>
            </div>
            <div className="rounded-3xl bg-white/10 p-5 text-sm text-primary-100">
              <p className="font-semibold">Demo account</p>
              <p className="mt-2">Email: demo@visapilot.ai</p>
              <p>Password: demo1234</p>
            </div>
          </div>

          <div className="p-10">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">Login</h2>
                <p className="mt-2 text-sm text-gray-500">Enter your credentials to continue.</p>
              </div>
              <Link href="/" className="text-sm text-primary-600 hover:text-primary-700">
                Back home
              </Link>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {error && (
                <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
