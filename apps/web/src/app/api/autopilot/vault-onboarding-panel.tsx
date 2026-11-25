'use client';

import React, { useState, useTransition } from 'react';
import {
    exportEncryptedSnapshotAction,
    importEncryptedSnapshotAction,
} from '../../autopilot/actions';

export default function VaultOnboardingPanel() {
    const [isPending, startTransition] = useTransition();
    const [passphrase, setPassphrase] = useState('');
    const [feedback, setFeedback] = useState<{
        type: 'success' | 'error';
        text: string;
    } | null>(null);

    async function handleResumeUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        startTransition(async () => {
            try {
                const res = await fetch('/api/persona/parse', {
                    method: 'POST',
                    body: formData,
                });
                const data = await res.json();
                if (!res.ok || !data.ok) {
                    setFeedback({
                        type: 'error',
                        text: data.error ?? 'Failed to parse resume.',
                    });
                    return;
                }
                setFeedback({
                    type: 'success',
                    text: `Extracted persona "${data.personaData.contactInfo.fullName}" (${data.personaData.workHistory.length} roles, ${data.personaData.skills.all.length} skills).`,
                });
            } catch (err) {
                setFeedback({
                    type: 'error',
                    text: err instanceof Error ? err.message : 'Upload failed.',
                });
            }
        });
    }

    function handleExportVault() {
        startTransition(async () => {
            const res = await exportEncryptedSnapshotAction(passphrase);
            if (!res.ok || !res.base64Archive) {
                setFeedback({
                    type: 'error',
                    text: res.error ?? 'Export failed.',
                });
                return;
            }

            const binary = atob(res.base64Archive);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = res.fileName ?? 'backup.visapilot.enc';
            link.click();
            URL.revokeObjectURL(url);

            setFeedback({
                type: 'success',
                text: `Exported AES-256-GCM snapshot (${res.fileName}).`,
            });
        });
    }

    function handleImportVault(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        startTransition(async () => {
            const arrayBuf = await file.arrayBuffer();
            const base64Archive = Buffer.from(arrayBuf).toString('base64');
            const res = await importEncryptedSnapshotAction(base64Archive, passphrase);

            if (!res.ok || !res.summary) {
                setFeedback({
                    type: 'error',
                    text: res.error ?? 'Import failed.',
                });
                return;
            }

            setFeedback({
                type: 'success',
                text: `Restored ${res.summary.personasRestored} persona(s), ${res.summary.selectorsRestored} selector(s), and ${res.summary.qaMemoriesRestored} Q&A vector(s).`,
            });
        });
    }

    return (
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div>
                    <h2 className="text-lg font-semibold text-white">
                        Resume Onboarding &amp; Encrypted Snapshot Vault (.visapilot.enc)
                    </h2>
                    <p className="text-xs text-slate-400">
                        Bootstrap your Persona from a PDF/DOCX resume or back up your
                        pgvector memory with AES-256-GCM encryption.
                    </p>
                </div>
            </div>

            {feedback && (
                <div
                    className={`p-3 rounded text-xs border ${feedback.type === 'success'
                            ? 'bg-emerald-950/60 border-emerald-700 text-emerald-200'
                            : 'bg-rose-950/60 border-rose-700 text-rose-200'
                        }`}
                >
                    {feedback.text}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Resume Upload Box */}
                <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                    <p className="text-xs font-semibold text-slate-200">
                        1. Bootstrap Persona from Resume (PDF / DOCX)
                    </p>
                    <input
                        type="file"
                        accept=".pdf,.docx,.txt"
                        disabled={isPending}
                        onChange={handleResumeUpload}
                        className="block w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-500"
                    />
                </div>

                {/* AES-256-GCM Export / Import Box */}
                <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-3">
                    <p className="text-xs font-semibold text-slate-200">
                        2. AES-256-GCM Memory Snapshot (.visapilot.enc)
                    </p>
                    <input
                        type="password"
                        placeholder="Enter vault passphrase (min 4 chars)..."
                        value={passphrase}
                        onChange={(e) => setPassphrase(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded text-white"
                    />
                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            type="button"
                            disabled={isPending || passphrase.trim().length < 4}
                            onClick={handleExportVault}
                            className="px-3 py-1.5 text-xs font-semibold rounded bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white"
                        >
                            Export .visapilot.enc
                        </button>

                        <label className="px-3 py-1.5 text-xs font-semibold rounded bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer">
                            Import .visapilot.enc
                            <input
                                type="file"
                                accept=".enc"
                                disabled={isPending || passphrase.trim().length < 4}
                                onChange={handleImportVault}
                                className="hidden"
                            />
                        </label>
                    </div>
                </div>
            </div>
        </section>
    );
}