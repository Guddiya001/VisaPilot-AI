'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Sparkles, Shield, CheckCircle, AlertTriangle } from 'lucide-react';

export default function AutopilotDemoPage() {
  const [submitted, setSubmitted] = useState(false);
  const [workEntries, setWorkEntries] = useState<number[]>([0]);

  const handleAddWork = () => {
    setWorkEntries((prev) => [...prev, prev.length]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between">
          <Link
            href="/autopilot"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Autopilot Control Center
          </Link>
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
            Simulator Sandbox
          </span>
        </div>

        {/* Instructions Card */}
        <div className="bg-gradient-to-r from-blue-900/40 via-purple-900/20 to-slate-900 border border-blue-500/30 rounded-xl p-5 shadow-lg shadow-blue-500/5">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div className="space-y-2 text-sm">
              <h2 className="font-semibold text-slate-100 text-base">
                ⚡ Chrome MV3 Extension Live Test Portal
              </h2>
              <p className="text-slate-300 leading-relaxed">
                This page simulates a standard <strong>Workday / Greenhouse</strong> job application DOM.
                You can test the Chrome Extension directly on this page:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-slate-400">
                <li>
                  Click the <strong>⚡ VisaPilot pill</strong> in the bottom-right corner, OR open the{' '}
                  <strong>Chrome Side Panel</strong>.
                </li>
                <li>
                  Click <strong>&quot;🚀 Execute Autopilot&quot;</strong>.
                </li>
                <li>
                  Watch Autopilot scan the form, auto-fill standard inputs with 100% Zero-LLM (Tier 1/2),
                  expand 3 work histories, attach your PDF resume, and halt safely on unverified facts!
                </li>
              </ol>
            </div>
          </div>
        </div>

        {submitted && (
          <div className="bg-emerald-950/60 border border-emerald-500/40 rounded-xl p-4 flex items-center gap-3 text-emerald-300">
            <CheckCircle className="w-5 h-5 shrink-0" />
            <div className="text-sm font-medium">
              Application submitted successfully! Autopilot completed full lifecycle.
            </div>
          </div>
        )}

        {/* Application Form */}
        <form
          id="job-application-form"
          onSubmit={handleSubmit}
          className="bg-slate-900 border border-slate-800 rounded-xl p-6 sm:p-8 space-y-6 shadow-xl"
        >
          <div className="border-b border-slate-800 pb-4">
            <h1 className="text-xl font-bold text-slate-100">
              Apply for Senior Staff AI Engineer @ Stripe
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Simulated Greenhouse / Workday Application Portal (Supports Chrome Extension DOM scanning)
            </p>
          </div>

          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
              1. Candidate Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1" htmlFor="first_name">
                  First Name *
                </label>
                <input
                  id="first_name"
                  name="first_name"
                  data-automation-id="legalNameSection_firstName"
                  required
                  placeholder="e.g. Ashish"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1" htmlFor="last_name">
                  Last Name *
                </label>
                <input
                  id="last_name"
                  name="last_name"
                  data-automation-id="legalNameSection_lastName"
                  required
                  placeholder="e.g. Singh"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1" htmlFor="email">
                  Email Address *
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  data-automation-id="email"
                  required
                  placeholder="e.g. ashish@example.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1" htmlFor="phone">
                  Phone Number
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  data-automation-id="phone-number"
                  placeholder="+1 (555) 000-0000"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1" htmlFor="linkedin_url">
                  LinkedIn Profile URL
                </label>
                <input
                  id="linkedin_url"
                  name="linkedin_url"
                  data-automation-id="linkedin-question"
                  placeholder="https://linkedin.com/in/..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1" htmlFor="github_url">
                  GitHub Profile URL
                </label>
                <input
                  id="github_url"
                  name="github_url"
                  data-automation-id="github-question"
                  placeholder="https://github.com/..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Work History Section (Repeater) */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
                2. Employment History (Repeater Automation)
              </h3>
              <span className="text-xs text-slate-500">Auto-expanded by Autopilot</span>
            </div>

            <div
              className="work-history-section space-y-3"
              data-automation-id="workExperienceSection"
            >
              {workEntries.map((idx) => (
                <div
                  key={idx}
                  className="work-entry p-3 bg-slate-950/70 border border-slate-800 rounded-lg space-y-2"
                >
                  <div className="text-xs font-medium text-slate-400">Position #{idx + 1}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      className="company w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                      name={`company_${idx}`}
                      placeholder="Company Name"
                    />
                    <input
                      className="title w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                      name={`title_${idx}`}
                      placeholder="Role Title"
                    />
                  </div>
                </div>
              ))}

              <button
                type="button"
                id="add-work"
                data-automation-id="add-work-experience"
                onClick={handleAddWork}
                className="w-full py-2 border border-dashed border-slate-700 hover:border-slate-500 text-xs text-slate-400 hover:text-slate-200 rounded-lg transition-colors"
              >
                + Add Another Experience
              </button>
            </div>
          </div>

          {/* Resume Upload */}
          <div className="space-y-2 pt-4 border-t border-slate-800">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
              3. Resume / CV Attachment
            </h3>
            <label
              htmlFor="resume-upload"
              className="block text-xs font-medium text-slate-400 mb-1"
            >
              Upload PDF (Autopilot pulls automatically from Local Vault API)
            </label>
            <input
              type="file"
              id="resume-upload"
              name="resume"
              accept=".pdf,.doc,.docx"
              className="block w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer bg-slate-950 p-2 border border-slate-800 rounded-lg"
            />
          </div>

          {/* Q&A & Safety Gate Section */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
              4. Additional Questions & Safety Gate Verification
            </h3>

            {/* Semantic Memory Match */}
            <div>
              <label
                htmlFor="why_stripe"
                className="block text-xs font-medium text-slate-400 mb-1"
              >
                Why are you interested in joining Stripe as a Senior Staff AI Engineer?
              </label>
              <textarea
                id="why_stripe"
                name="why_stripe"
                data-question="Why are you interested in joining {{COMPANY_NAME}} as a {{ROLE_TITLE}}?"
                rows={3}
                placeholder="Autopilot populates this from semantic memory (Tier 2 learned template)..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Missing Fact - Triggers Safety Gate */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="dod_clearance"
                  className="block text-xs font-medium text-amber-400"
                >
                  Active DoD Clearance ID (Security Clearance) *
                </label>
                <span className="inline-flex items-center gap-1 text-[10px] text-red-400 bg-red-950/60 border border-red-500/30 px-2 py-0.5 rounded">
                  <Shield className="w-3 h-3" /> Safety Gate Trigger
                </span>
              </div>
              <input
                id="dod_clearance"
                name="dod_clearance"
                data-question="Active DoD Clearance ID"
                required
                placeholder="Autopilot marks this RED_MISSING_FACT and safely halts auto-submit..."
                className="w-full bg-slate-950 border border-amber-900/40 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Because this requires an unverified locked fact, Autopilot will halt and request human approval before submission.
              </p>
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-6 border-t border-slate-800 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              Form protected by VisaPilot Pre-Submit Safety Gate
            </div>
            <button
              type="submit"
              id="submit-btn"
              data-automation-id="submit-button"
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
            >
              Submit Application
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
