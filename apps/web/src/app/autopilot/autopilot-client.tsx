'use client';

import React, { useState, useTransition } from 'react';
import {
    AutopilotDashboardData,
    HaltedFieldItem,
    QaTemplateDTO,
    updateSemanticTemplateAction,
    deleteSemanticTemplateAction,
    resolveHaltedGateFactAction,
} from './actions';

interface AutopilotClientProps {
    initialData: AutopilotDashboardData;
}

export default function AutopilotClient({ initialData }: AutopilotClientProps) {
    const [isPending, startTransition] = useTransition();
    const [statusBanner, setStatusBanner] = useState<{
        type: 'success' | 'error';
        message: string;
    } | null>(null);

    // Search/filter state for qaSemanticMemory
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

    // Inline editing state for qaSemanticMemory
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editCategory, setEditCategory] = useState('');
    const [editNormalizedQuestion, setEditNormalizedQuestion] = useState('');
    const [editAnswerTemplate, setEditAnswerTemplate] = useState('');
    const [editMaxCharLimit, setEditMaxCharLimit] = useState<number>(600);

    // Inline resolution state for RED_MISSING_FACT / AMBER_LLM_DRAFT items
    const [factInputs, setFactInputs] = useState<Record<string, string>>({});
    const [saveToMemoryFlags, setSaveToMemoryFlags] = useState<
        Record<string, boolean>
    >({});

    const { telemetry, haltedFields, qaTemplates, recentAudits, activePersona } =
        initialData;

    const categories = [
        'ALL',
        ...Array.from(new Set(qaTemplates.map((t) => t.category))),
    ];

    const filteredTemplates = qaTemplates.filter((tpl) => {
        const matchesCategory =
            selectedCategory === 'ALL' || tpl.category === selectedCategory;
        const matchesSearch =
            !searchQuery.trim() ||
            tpl.normalizedQuestion
                .toLowerCase()
                .includes(searchQuery.toLowerCase()) ||
            tpl.answerTemplate.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    function beginEditTemplate(tpl: QaTemplateDTO) {
        setEditingId(tpl.id);
        setEditCategory(tpl.category);
        setEditNormalizedQuestion(tpl.normalizedQuestion);
        setEditAnswerTemplate(tpl.answerTemplate);
        setEditMaxCharLimit(tpl.maxCharLimit ?? 600);
        setStatusBanner(null);
    }

    function handleSaveTemplate(id: string) {
        startTransition(async () => {
            const result = await updateSemanticTemplateAction({
                id,
                category: editCategory,
                normalizedQuestion: editNormalizedQuestion,
                answerTemplate: editAnswerTemplate,
                maxCharLimit: editMaxCharLimit,
            });

            if (result.ok) {
                setEditingId(null);
                setStatusBanner({
                    type: 'success',
                    message:
                        'Updated semantic template and re-indexed 768-dim pgvector embedding.',
                });
            } else {
                setStatusBanner({
                    type: 'error',
                    message: result.error ?? 'Failed to update template.',
                });
            }
        });
    }

    function handleDeleteTemplate(id: string) {
        startTransition(async () => {
            const result = await deleteSemanticTemplateAction(id);
            if (result.ok) {
                setStatusBanner({
                    type: 'success',
                    message: 'Removed template from qaSemanticMemory.',
                });
            } else {
                setStatusBanner({
                    type: 'error',
                    message: result.error ?? 'Failed to delete template.',
                });
            }
        });
    }

    function handleResolveHaltedField(item: HaltedFieldItem) {
        const rowKey = `${item.auditId}:${item.fieldSignature}`;
        const verifiedValue = factInputs[rowKey] ?? '';
        const saveToSemanticMemory = saveToMemoryFlags[rowKey] ?? true;

        startTransition(async () => {
            const result = await resolveHaltedGateFactAction({
                auditId: item.auditId,
                fieldSignature: item.fieldSignature,
                missingFactKey: item.missingFactKey,
                verifiedValue,
                questionText: item.questionText,
                saveToSemanticMemory,
            });

            if (result.ok) {
                setFactInputs((prev) => ({ ...prev, [rowKey]: '' }));
                setStatusBanner({
                    type: 'success',
                    message: `Locked fact "${item.missingFactKey}" into persona ground truth. Application status: ${result.newStatus}.`,
                });
            } else {
                setStatusBanner({
                    type: 'error',
                    message: result.error ?? 'Failed to resolve safety gate.',
                });
            }
        });
    }

    const totalHits = Math.max(1, telemetry.totalFieldsResolved);
    const tier1Pct = Math.round((telemetry.tier1Hits / totalHits) * 100);
    const tier2Pct = Math.round((telemetry.tier2VectorHits / totalHits) * 100);
    const tier3Pct = Math.max(0, 100 - tier1Pct - tier2Pct);

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-6">
                    <div>
                        <div className="flex items-center gap-3">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                Zero-LLM-First Engine
                            </span>
                            {activePersona && (
                                <span className="text-xs text-slate-400">
                                    Active Persona:{' '}
                                    <strong className="text-slate-200">
                                        {activePersona.name}
                                    </strong>
                                </span>
                            )}
                        </div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mt-2">
                            VisaPilot Self-Learning Autopilot Control Center
                        </h1>
                        <p className="text-sm text-slate-400 mt-1">
                            Tier 1 (Deterministic) &rarr; Tier 2 (pgvector Cosine &ge; 0.90)
                            &rarr; Tier 3 (PII-Scrubbed &amp; Fact-Locked Fallback)
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <a
                            href="/autopilot/demo"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold shadow-md transition-all cursor-pointer"
                        >
                            <span>🧪 Test Extension on Simulator Form</span>
                        </a>
                    </div>
                </header>

                {/* Status Toast Banner */}
                {statusBanner && (
                    <div
                        role="status"
                        className={`p-4 rounded-lg border text-sm flex items-center justify-between ${statusBanner.type === 'success'
                                ? 'bg-emerald-950/60 border-emerald-700 text-emerald-200'
                                : 'bg-rose-950/60 border-rose-700 text-rose-200'
                            }`}
                    >
                        <span>{statusBanner.message}</span>
                        <button
                            type="button"
                            onClick={() => setStatusBanner(null)}
                            className="text-xs underline ml-4 opacity-80 hover:opacity-100"
                        >
                            Dismiss
                        </button>
                    </div>
                )}

                {/* Top Telemetry KPI Grid */}
                <section
                    aria-label="Tier Telemetry KPIs"
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4"
                >
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                        <p className="text-xs uppercase tracking-wider text-slate-400">
                            Zero-LLM Resolution
                        </p>
                        <p className="text-3xl font-bold text-emerald-400 mt-2">
                            {telemetry.zeroLlmResolutionRate}%
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                            Resolved via Tier 1 + Tier 2
                        </p>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                        <p className="text-xs uppercase tracking-wider text-emerald-400">
                            Tier 1: Exact DOM
                        </p>
                        <p className="text-3xl font-bold text-white mt-2">
                            {telemetry.tier1Hits}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                            GREEN_EXACT (0–5ms, 0 LLM)
                        </p>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                        <p className="text-xs uppercase tracking-wider text-sky-400">
                            Tier 2: pgvector Hits
                        </p>
                        <p className="text-3xl font-bold text-white mt-2">
                            {telemetry.tier2VectorHits}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                            BLUE_VECTOR_LEARNED (0 LLM)
                        </p>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                        <p className="text-xs uppercase tracking-wider text-amber-400">
                            Tier 3: Guarded LLM
                        </p>
                        <p className="text-3xl font-bold text-white mt-2">
                            {telemetry.tier3LlmCalls}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                            AMBER_LLM_DRAFT (PII-Scrubbed)
                        </p>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                        <p className="text-xs uppercase tracking-wider text-rose-400">
                            Halted Safety Gates
                        </p>
                        <p className="text-3xl font-bold text-rose-400 mt-2">
                            {telemetry.haltedGatesCount}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                            Awaiting Missing Fact Input
                        </p>
                    </div>
                </section>

                {/* Visual Distribution Bar */}
                <section className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                        <span>
                            Field Resolution Distribution ({telemetry.totalFieldsResolved}{' '}
                            total fields across {telemetry.totalApplications} applications)
                        </span>
                        <span>
                            Tier 1 ({tier1Pct}%) &bull; Tier 2 ({tier2Pct}%) &bull; Tier 3 (
                            {tier3Pct}%)
                        </span>
                    </div>
                    <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden flex">
                        <div
                            style={{ width: `${tier1Pct}%` }}
                            className="bg-emerald-500 h-full transition-all"
                            title={`Tier 1 Deterministic: ${tier1Pct}%`}
                        />
                        <div
                            style={{ width: `${tier2Pct}%` }}
                            className="bg-sky-500 h-full transition-all"
                            title={`Tier 2 pgvector: ${tier2Pct}%`}
                        />
                        <div
                            style={{ width: `${tier3Pct}%` }}
                            className="bg-amber-500 h-full transition-all"
                            title={`Tier 3 LLM Fallback: ${tier3Pct}%`}
                        />
                    </div>
                </section>

                {/* SECTION 1: RED_MISSING_FACT & AMBER_LLM_DRAFT Safety Gate Resolver */}
                <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                                Pre-Submit Safety Gate Queue (RED_MISSING_FACT / AMBER_LLM_DRAFT)
                            </h2>
                            <p className="text-xs text-slate-400 mt-0.5">
                                Applications halted by AutopilotStateMachine. Supplying a
                                verified value locks it into{' '}
                                <code className="text-slate-300">personas.lockedFacts</code> and
                                unlocks submission.
                            </p>
                        </div>
                        <span className="px-2.5 py-1 text-xs font-medium rounded-md bg-slate-800 text-slate-300">
                            {haltedFields.length} Blocked Field
                            {haltedFields.length === 1 ? '' : 's'}
                        </span>
                    </div>

                    {haltedFields.length === 0 ? (
                        <div className="p-6 text-center border border-dashed border-slate-800 rounded-lg text-sm text-slate-400">
                            All safety gates are clear. Zero applications are currently
                            blocked by missing facts.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {haltedFields.map((item) => {
                                const rowKey = `${item.auditId}:${item.fieldSignature}`;
                                const inputValue = factInputs[rowKey] ?? '';
                                const saveToVec = saveToMemoryFlags[rowKey] ?? true;

                                return (
                                    <div
                                        key={rowKey}
                                        className="p-4 rounded-lg bg-slate-950 border border-rose-900/60 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                                    >
                                        <div className="space-y-1 max-w-2xl">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span
                                                    className={`px-2 py-0.5 text-xs font-semibold rounded ${item.badge === 'RED_MISSING_FACT'
                                                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                                        }`}
                                                >
                                                    {item.badge}
                                                </span>
                                                <span className="text-sm font-semibold text-white">
                                                    {item.companyName} — {item.roleTitle}
                                                </span>
                                                <span className="text-xs text-slate-500">
                                                    ({item.domain})
                                                </span>
                                            </div>

                                            <p className="text-xs text-slate-300 font-medium">
                                                Prompt / Label: &ldquo;{item.questionText}&rdquo;
                                            </p>
                                            <p className="text-xs text-slate-400">
                                                Missing Fact Key:{' '}
                                                <code className="text-rose-300 bg-rose-950/60 px-1.5 py-0.5 rounded">
                                                    {item.missingFactKey}
                                                </code>{' '}
                                                &bull; Current Output:{' '}
                                                <code className="text-slate-300">
                                                    {item.currentValue}
                                                </code>
                                            </p>
                                        </div>

                                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 min-w-[340px]">
                                            <div className="flex-1 space-y-1.5">
                                                <input
                                                    type="text"
                                                    aria-label={`Verified value for ${item.missingFactKey}`}
                                                    placeholder={`Enter verified ${item.missingFactKey}...`}
                                                    value={inputValue}
                                                    onChange={(e) =>
                                                        setFactInputs((prev) => ({
                                                            ...prev,
                                                            [rowKey]: e.target.value,
                                                        }))
                                                    }
                                                    className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-md text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                                                />
                                                <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={saveToVec}
                                                        onChange={(e) =>
                                                            setSaveToMemoryFlags((prev) => ({
                                                                ...prev,
                                                                [rowKey]: e.target.checked,
                                                            }))
                                                        }
                                                        className="rounded border-slate-700 bg-slate-900 text-emerald-500"
                                                    />
                                                    Also embed into Tier 2 qaSemanticMemory
                                                </label>
                                            </div>

                                            <button
                                                type="button"
                                                disabled={isPending || !inputValue.trim()}
                                                onClick={() => handleResolveHaltedField(item)}
                                                className="px-4 py-2 text-xs font-semibold rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white transition shrink-0"
                                            >
                                                Lock Fact &amp; Unblock
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>

                {/* SECTION 2: Semantic Vector Memory Editor (qaSemanticMemory) */}
                <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-semibold text-white">
                                Tier 2 Semantic Memory Vault ({qaTemplates.length} Templates)
                            </h2>
                            <p className="text-xs text-slate-400 mt-0.5">
                                Supports dynamic hydration tokens:{' '}
                                <code className="text-sky-300">{'{{COMPANY_NAME}}'}</code>,{' '}
                                <code className="text-sky-300">{'{{ROLE_TITLE}}'}</code>, and{' '}
                                <code className="text-sky-300">{'{{YEARS_EXP}}'}</code>.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <select
                                aria-label="Filter templates by category"
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="px-3 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-md text-slate-200"
                            >
                                {categories.map((cat) => (
                                    <option key={cat} value={cat}>
                                        {cat === 'ALL' ? 'All Categories' : cat}
                                    </option>
                                ))}
                            </select>

                            <input
                                type="search"
                                placeholder="Search questions or templates..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="px-3 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-md text-slate-200 placeholder-slate-500 w-64"
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        {filteredTemplates.map((tpl) => {
                            const isEditing = editingId === tpl.id;
                            const charCount = isEditing
                                ? editAnswerTemplate.length
                                : tpl.answerTemplate.length;
                            const maxLimit = isEditing
                                ? editMaxCharLimit
                                : tpl.maxCharLimit ?? 600;
                            const isOverLimit = maxLimit > 0 && charCount > maxLimit;

                            return (
                                <div
                                    key={tpl.id}
                                    className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-3"
                                >
                                    {!isEditing ? (
                                        <>
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="px-2 py-0.5 text-xs font-medium rounded bg-sky-500/15 text-sky-300 border border-sky-500/30">
                                                            {tpl.category}
                                                        </span>
                                                        <span className="text-xs text-slate-400">
                                                            Used{' '}
                                                            <strong className="text-slate-200">
                                                                {tpl.usageCount}x
                                                            </strong>
                                                        </span>
                                                        <span className="text-xs text-slate-500">
                                                            &bull; {tpl.answerTemplate.length} /{' '}
                                                            {tpl.maxCharLimit ?? 600} chars
                                                        </span>
                                                    </div>
                                                    <p className="text-sm font-semibold text-white">
                                                        {tpl.normalizedQuestion}
                                                    </p>
                                                </div>

                                                <div className="flex items-center gap-2 shrink-0">
                                                    <button
                                                        type="button"
                                                        onClick={() => beginEditTemplate(tpl)}
                                                        className="px-3 py-1 text-xs font-medium rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={isPending}
                                                        onClick={() => handleDeleteTemplate(tpl.id)}
                                                        className="px-3 py-1 text-xs font-medium rounded bg-rose-950/60 hover:bg-rose-900/70 text-rose-300 border border-rose-800/50 transition"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </div>

                                            <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap bg-slate-900/70 p-3 rounded border border-slate-800/80">
                                                {tpl.answerTemplate}
                                            </p>
                                        </>
                                    ) : (
                                        <div className="space-y-3">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                <div>
                                                    <label className="block text-xs text-slate-400 mb-1">
                                                        Category
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={editCategory}
                                                        onChange={(e) => setEditCategory(e.target.value)}
                                                        className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded text-white"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-slate-400 mb-1">
                                                        Max Character Limit
                                                    </label>
                                                    <input
                                                        type="number"
                                                        value={editMaxCharLimit}
                                                        onChange={(e) =>
                                                            setEditMaxCharLimit(Number(e.target.value) || 600)
                                                        }
                                                        className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded text-white"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs text-slate-400 mb-1">
                                                    Normalized Question (re-embedded via nomic-embed-text
                                                    on save)
                                                </label>
                                                <input
                                                    type="text"
                                                    value={editNormalizedQuestion}
                                                    onChange={(e) =>
                                                        setEditNormalizedQuestion(e.target.value)
                                                    }
                                                    className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded text-white"
                                                />
                                            </div>

                                            <div>
                                                <div className="flex items-center justify-between text-xs mb-1">
                                                    <span className="text-slate-400">
                                                        Answer Template (use {'{{COMPANY_NAME}}'},{' '}
                                                        {'{{ROLE_TITLE}}'}, {'{{YEARS_EXP}}'})
                                                    </span>
                                                    <span
                                                        className={
                                                            isOverLimit
                                                                ? 'text-rose-400 font-semibold'
                                                                : 'text-slate-400'
                                                        }
                                                    >
                                                        {charCount} / {maxLimit} chars
                                                    </span>
                                                </div>
                                                <textarea
                                                    rows={4}
                                                    value={editAnswerTemplate}
                                                    onChange={(e) =>
                                                        setEditAnswerTemplate(e.target.value)
                                                    }
                                                    className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded text-white font-mono"
                                                />
                                            </div>

                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setEditingId(null)}
                                                    className="px-3 py-1.5 text-xs rounded bg-slate-800 text-slate-300 hover:bg-slate-700"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={isPending || isOverLimit}
                                                    onClick={() => handleSaveTemplate(tpl.id)}
                                                    className="px-4 py-1.5 text-xs font-semibold rounded bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white"
                                                >
                                                    Save &amp; Re-Embed Vector
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* SECTION 3: Recent Applications Audit Table */}
                <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
                    <h2 className="text-lg font-semibold text-white">
                        Application Submission &amp; Tier Audit Log
                    </h2>

                    {recentAudits.length === 0 ? (
                        <p className="text-xs text-slate-400">
                            No job submissions logged in applicationsAudit yet.
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="border-b border-slate-800 text-slate-400">
                                        <th className="py-2.5 pr-4">Company &amp; Role</th>
                                        <th className="py-2.5 px-4">ATS Domain</th>
                                        <th className="py-2.5 px-4">Tier 1 (Exact)</th>
                                        <th className="py-2.5 px-4">Tier 2 (Vector)</th>
                                        <th className="py-2.5 px-4">Tier 3 (LLM)</th>
                                        <th className="py-2.5 pl-4">Gate Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/70">
                                    {recentAudits.map((audit) => (
                                        <tr key={audit.id} className="hover:bg-slate-950/50">
                                            <td className="py-3 pr-4 font-medium text-white">
                                                {audit.companyName} — {audit.roleTitle}
                                            </td>
                                            <td className="py-3 px-4 text-slate-400">
                                                {audit.domain}
                                            </td>
                                            <td className="py-3 px-4 text-emerald-400 font-semibold">
                                                {audit.resolutionStats.tier1Hits}
                                            </td>
                                            <td className="py-3 px-4 text-sky-400 font-semibold">
                                                {audit.resolutionStats.tier2VectorHits}
                                            </td>
                                            <td className="py-3 px-4 text-amber-400 font-semibold">
                                                {audit.resolutionStats.tier3LlmCalls}
                                            </td>
                                            <td className="py-3 pl-4">
                                                <span
                                                    className={`px-2 py-0.5 rounded text-xs font-medium ${audit.status === 'HALTED_GATE'
                                                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                                            : audit.status === 'READY_TO_SUBMIT'
                                                                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                                                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                                        }`}
                                                >
                                                    {audit.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}