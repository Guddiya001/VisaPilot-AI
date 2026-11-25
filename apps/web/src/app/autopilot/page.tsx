import React from 'react';
import { getAutopilotDashboardData } from './actions';
import AutopilotClient from './autopilot-client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'VisaPilot Autopilot — Tier Telemetry & Memory Control Center',
  description:
    'Monitor Tier 1/2/3 Zero-LLM resolution metrics, edit pgvector Q&A templates, and unblock RED_MISSING_FACT safety gates.',
};

export default async function AutopilotPage() {
  const initialData = await getAutopilotDashboardData();

  return <AutopilotClient initialData={initialData} />;
}
