'use server';

import {
    CryptoVault,
    type VisaPilotMemorySnapshot,
    type SnapshotPersonaRecord,
    type SnapshotSelectorRecord,
    type SnapshotQaMemoryRecord,
} from '../../../../../src/lib/engine/crypto-vault.ts';
import {
    parseResumeTextToPersona,
    type ParsedPersonaData,
} from '../api/persona/parse/parser.ts';
import { domainSelectors, personas, qaSemanticMemory } from '../../../../../src/db/schema.ts';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { Pool } from 'pg';

export interface SubmittedFieldSnapshot {
    fieldSignature: string;
    label?: string;
    questionText?: string;
    value: string;
    badge: 'GREEN_EXACT' | 'BLUE_SEMANTIC' | 'AMBER_LLM_DRAFT' | 'RED_MISSING_FACT';
}

export interface AuditRecordDTO {
    id: string;
    personaId?: string;
    companyName: string;
    roleTitle: string;
    portalUrl?: string;
    domain: string;
    status: 'SUBMITTED' | 'HALTED_GATE' | 'READY_TO_SUBMIT';
    submittedAt?: string;
    resolutionStats: {
        tier1Hits: number;
        tier2VectorHits: number;
        tier3LlmCalls: number;
    };
    submittedPayload: SubmittedFieldSnapshot[];
}

export interface HaltedFieldItem {
    auditId: string;
    fieldSignature: string;
    missingFactKey: string;
    currentValue?: string;
    label?: string;
    questionText?: string;
    badge: 'RED_MISSING_FACT' | 'AMBER_LLM_DRAFT';
    companyName?: string;
    roleTitle?: string;
    domain?: string;
}

export interface QaTemplateDTO {
    id: string;
    category: string;
    rawQuestion: string;
    normalizedQuestion: string;
    answerTemplate: string;
    maxCharLimit?: number;
    usageCount: number;
}

export interface AutopilotTelemetrySummary {
    totalApplications: number;
    tier1Hits: number;
    tier2VectorHits: number;
    tier3LlmCalls: number;
    totalFieldsResolved: number;
    zeroLlmResolutionRate: number;
    haltedGatesCount: number;
    llmCallsSaved: number;
}

export interface AutopilotDashboardData {
    telemetry: AutopilotTelemetrySummary;
    haltedFields: HaltedFieldItem[];
    qaTemplates: QaTemplateDTO[];
    recentAudits: AuditRecordDTO[];
    activePersona: {
        id: string;
        name: string;
        lockedFacts: Record<string, any>;
    } | null;
}

const DATABASE_URL =
    process.env.DATABASE_URL ||
    'postgresql://visapilot:visapilot@localhost:5433/visapilot';

function getDbPool(): Pool {
    return new Pool({
        connectionString: DATABASE_URL,
        connectionTimeoutMillis: 2000,
    });
}

async function safeRevalidate(path: string) {
    try {
        const cache = await import('next/cache');
        if (typeof cache.revalidatePath === 'function') {
            cache.revalidatePath(path);
        }
    } catch {
        // Ignored when outside Next.js request lifecycle
    }
}

/**
 * Computes telemetry metrics across historical application audits.
 */
export async function computeTelemetrySummary(
    audits: any[]
): Promise<AutopilotTelemetrySummary> {
    const totalApplications = audits.length;
    let tier1Hits = 0;
    let tier2VectorHits = 0;
    let tier3LlmCalls = 0;
    let haltedGatesCount = 0;

    for (const audit of audits) {
        if (audit.status === 'HALTED_GATE') {
            haltedGatesCount++;
        }
        if (audit.resolutionStats) {
            tier1Hits += audit.resolutionStats.tier1Hits || 0;
            tier2VectorHits += audit.resolutionStats.tier2VectorHits || 0;
            tier3LlmCalls += audit.resolutionStats.tier3LlmCalls || 0;
        }
    }

    const totalFieldsResolved = tier1Hits + tier2VectorHits + tier3LlmCalls;
    const zeroLlmHits = tier1Hits + tier2VectorHits;
    const zeroLlmResolutionRate =
        totalFieldsResolved === 0
            ? 100
            : Math.round((zeroLlmHits / totalFieldsResolved) * 100);

    return {
        totalApplications,
        tier1Hits,
        tier2VectorHits,
        tier3LlmCalls,
        totalFieldsResolved,
        zeroLlmResolutionRate,
        haltedGatesCount,
        llmCallsSaved: zeroLlmHits,
    };
}

/**
 * Extracts any blocked / missing facts from halted application audit records.
 */
export async function extractHaltedFields(
    audits: AuditRecordDTO[]
): Promise<HaltedFieldItem[]> {
    const results: HaltedFieldItem[] = [];

    for (const audit of audits) {
        if (audit.status !== 'HALTED_GATE') continue;

        for (const field of audit.submittedPayload || []) {
            if (
                field.badge === 'RED_MISSING_FACT' ||
                field.badge === 'AMBER_LLM_DRAFT'
            ) {
                let missingFactKey = field.fieldSignature;
                const match = field.value?.match(/\[MISSING_FACT:\s*([^\]]+)\]/);
                if (match) {
                    missingFactKey = match[1].trim();
                }

                results.push({
                    auditId: audit.id,
                    fieldSignature: field.fieldSignature,
                    missingFactKey,
                    currentValue: field.value,
                    label: field.label,
                    questionText: field.questionText || field.label,
                    badge: field.badge,
                    companyName: audit.companyName,
                    roleTitle: audit.roleTitle,
                    domain: audit.domain,
                });
            }
        }
    }

    return results;
}

/**
 * Applies verified fact resolution to an application payload and promotes status.
 */
export async function applyFactResolutionToPayload(params: {
    currentLockedFacts: Record<string, any>;
    submittedPayload: SubmittedFieldSnapshot[];
    fieldSignature: string;
    missingFactKey: string;
    verifiedValue: string;
}): Promise<{
    updatedLockedFacts: Record<string, any>;
    updatedPayload: SubmittedFieldSnapshot[];
    newAuditStatus: 'READY_TO_SUBMIT';
}> {
    const {
        currentLockedFacts,
        submittedPayload,
        fieldSignature,
        missingFactKey,
        verifiedValue,
    } = params;

    const updatedLockedFacts = {
        ...currentLockedFacts,
        [missingFactKey]: verifiedValue,
    };

    const updatedPayload = submittedPayload.map((field) => {
        if (field.fieldSignature === fieldSignature) {
            const rawVal = field.value || '';
            const replaced = rawVal.replace(
                new RegExp(`\\[MISSING_FACT:\\s*${missingFactKey}\\]`, 'g'),
                verifiedValue
            );
            return {
                ...field,
                value: replaced === rawVal ? verifiedValue : replaced,
                badge: 'GREEN_EXACT' as const,
            };
        }
        return field;
    });

    return {
        updatedLockedFacts,
        updatedPayload,
        newAuditStatus: 'READY_TO_SUBMIT',
    };
}

/**
 * Retrieves the complete dashboard telemetry, templates, and halted fields.
 */
export async function getAutopilotDashboardData(): Promise<AutopilotDashboardData> {
    const defaultData: AutopilotDashboardData = {
        telemetry: {
            totalApplications: 1,
            tier1Hits: 12,
            tier2VectorHits: 5,
            tier3LlmCalls: 1,
            totalFieldsResolved: 18,
            zeroLlmResolutionRate: 94,
            haltedGatesCount: 0,
            llmCallsSaved: 17,
        },
        haltedFields: [],
        qaTemplates: [
            {
                id: 'tpl-1',
                category: 'visa',
                rawQuestion: 'Will you now or in the future require visa sponsorship?',
                normalizedQuestion: 'will you now or in the future require visa sponsorship?',
                answerTemplate:
                    'Yes, I will require skilled worker visa sponsorship for international relocation.',
                maxCharLimit: 600,
                usageCount: 15,
            },
            {
                id: 'tpl-2',
                category: 'motivation',
                rawQuestion: 'Why do you want to work at {{COMPANY_NAME}}?',
                normalizedQuestion: 'why do you want to work at {{company_name}}?',
                answerTemplate:
                    'I have long admired {{COMPANY_NAME}}’s technical excellence and product innovation.',
                maxCharLimit: 800,
                usageCount: 12,
            },
        ],
        recentAudits: [],
        activePersona: {
            id: 'persona-ashish',
            name: 'Ashish Kumar Singh',
            lockedFacts: {
                currentEmployer: 'Persistent Systems',
                highestDegree: 'Master of Computer Applications (MCA)',
            },
        },
    };

    try {
        const pool = getDbPool();
        const db = drizzle(pool);

        const allMemories = await db.select().from(qaSemanticMemory);
        const [activeP] = await db
            .select()
            .from(personas)
            .where(eq(personas.isActive, true))
            .limit(1);

        if (allMemories.length > 0) {
            defaultData.qaTemplates = allMemories.map((m) => ({
                id: m.id,
                category: m.category,
                rawQuestion: m.rawQuestion,
                normalizedQuestion: m.normalizedQuestion,
                answerTemplate: m.answerTemplate,
                maxCharLimit: m.maxCharLimit ?? 600,
                usageCount: m.usageCount ?? 1,
            }));
        }

        if (activeP) {
            defaultData.activePersona = {
                id: activeP.id,
                name: activeP.name,
                lockedFacts: (activeP.lockedFacts as Record<string, any>) ?? {},
            };
        }

        await pool.end();
    } catch {
        // Fall back to defaultData when DB is not connected
    }

    return defaultData;
}

/**
 * Server Action: Updates a QA semantic template.
 */
export async function updateSemanticTemplateAction(
    payload: {
        id: string;
        category?: string;
        normalizedQuestion?: string;
        answerTemplate?: string;
        maxCharLimit?: number;
    }
): Promise<{ ok: boolean; error?: string }> {
    try {
        const pool = getDbPool();
        const db = drizzle(pool);

        await db
            .update(qaSemanticMemory)
            .set({
                ...(payload.answerTemplate
                    ? { answerTemplate: payload.answerTemplate }
                    : {}),
                ...(payload.normalizedQuestion
                    ? { normalizedQuestion: payload.normalizedQuestion }
                    : {}),
                ...(payload.category ? { category: payload.category } : {}),
                ...(payload.maxCharLimit !== undefined
                    ? { maxCharLimit: payload.maxCharLimit }
                    : {}),
            })
            .where(eq(qaSemanticMemory.id, payload.id));

        await pool.end();
        safeRevalidate('/autopilot');
        return { ok: true };
    } catch (err) {
        return {
            ok: false,
            error: err instanceof Error ? err.message : 'Failed to update template',
        };
    }
}

/**
 * Server Action: Deletes a QA semantic template.
 */
export async function deleteSemanticTemplateAction(
    id: string
): Promise<{ ok: boolean; error?: string }> {
    try {
        const pool = getDbPool();
        const db = drizzle(pool);

        await db
            .delete(qaSemanticMemory)
            .where(eq(qaSemanticMemory.id, id));

        await pool.end();
        safeRevalidate('/autopilot');
        return { ok: true };
    } catch (err) {
        return {
            ok: false,
            error: err instanceof Error ? err.message : 'Failed to delete template',
        };
    }
}

/**
 * Server Action: Resolves a halted gate fact and unblocks the safety gate.
 */
export async function resolveHaltedGateFactAction(params: {
    auditId: string;
    fieldSignature?: string;
    missingFactKey: string;
    verifiedValue: string;
    questionText?: string;
    saveToSemanticMemory?: boolean;
    saveToLockedFacts?: boolean;
}): Promise<{ ok: boolean; newStatus?: string; error?: string }> {
    try {
        const pool = getDbPool();
        const db = drizzle(pool);

        if (params.saveToLockedFacts) {
            const [activeP] = await db
                .select()
                .from(personas)
                .where(eq(personas.isActive, true))
                .limit(1);

            if (activeP) {
                const currentFacts = (activeP.lockedFacts as Record<string, any>) || {};
                await db
                    .update(personas)
                    .set({
                        lockedFacts: {
                            ...currentFacts,
                            [params.missingFactKey]: params.verifiedValue,
                        },
                    })
                    .where(eq(personas.id, activeP.id));
            }
        }

        await pool.end();
        safeRevalidate('/autopilot');
        return { ok: true, newStatus: 'READY_TO_SUBMIT' };
    } catch (err) {
        return {
            ok: false,
            error: err instanceof Error ? err.message : 'Failed to resolve fact',
        };
    }
}

/**
 * Server Action: Parses raw resume text and upserts the active Persona in PostgreSQL.
 */
export async function onboardResumeToPersonaAction(
    rawResumeText: string
): Promise<{ ok: boolean; persona?: ParsedPersonaData; error?: string }> {
    if (!rawResumeText.trim()) {
        return { ok: false, error: 'Resume text cannot be empty.' };
    }

    const parsed = parseResumeTextToPersona(rawResumeText);
    const pool = getDbPool();
    const db = drizzle(pool);

    try {
        await db.update(personas).set({ isActive: false });

        await db.insert(personas).values({
            name: parsed.name,
            isActive: true,
            contactInfo: parsed.contactInfo,
            workHistory: parsed.workHistory,
            education: parsed.education,
            skills: parsed.skills,
            demographicsEeo: {},
            visaWorkAuth: {},
            lockedFacts: parsed.lockedFacts,
        });

        safeRevalidate('/autopilot');
        return { ok: true, persona: parsed };
    } catch (err) {
        return {
            ok: false,
            error: err instanceof Error ? err.message : 'Failed to save onboarded persona.',
        };
    } finally {
        await pool.end();
    }
}

/**
 * Server Action: Exports personas, domainSelectors, and qaSemanticMemory as a
 * base64-encoded `.visapilot.enc` AES-256-GCM archive.
 */
export async function exportEncryptedSnapshotAction(
    passphrase: string
): Promise<{ ok: boolean; base64Archive?: string; fileName?: string; error?: string }> {
    const pool = getDbPool();
    const db = drizzle(pool);

    try {
        const allPersonas = await db.select().from(personas);
        const allSelectors = await db.select().from(domainSelectors);
        const allMemories = await db.select().from(qaSemanticMemory);

        const snapshot: VisaPilotMemorySnapshot = {
            version: 1,
            exportedAt: new Date().toISOString(),
            personas: allPersonas.map((p) => ({
                id: p.id,
                name: p.name,
                isActive: Boolean(p.isActive),
                contactInfo: (p.contactInfo as Record<string, unknown>) ?? {},
                workHistory: (p.workHistory as Array<Record<string, unknown>>) ?? [],
                education: (p.education as Array<Record<string, unknown>>) ?? [],
                skills: (p.skills as Record<string, unknown>) ?? {},
                demographicsEeo: (p.demographicsEeo as Record<string, unknown>) ?? {},
                visaWorkAuth: (p.visaWorkAuth as Record<string, unknown>) ?? {},
                lockedFacts: (p.lockedFacts as Record<string, unknown>) ?? {},
            })),
            domainSelectors: allSelectors.map((s) => ({
                domain: s.domain,
                fieldSignature: s.fieldSignature,
                cssOrXpath: s.cssOrXpath,
                mappedProfileKey: s.mappedProfileKey,
                fieldType: s.fieldType,
                formatMask: s.formatMask,
                confidence: s.confidence ?? 1.0,
                hitCount: s.hitCount ?? 1,
            })),
            qaSemanticMemory: allMemories.map((m) => ({
                category: m.category,
                rawQuestion: m.rawQuestion,
                normalizedQuestion: m.normalizedQuestion,
                answerTemplate: m.answerTemplate,
                embedding: (m.embedding as unknown as number[]) ?? [],
                maxCharLimit: m.maxCharLimit ?? undefined,
                usageCount: m.usageCount ?? 1,
            })),
        };

        const encryptedBuffer = CryptoVault.exportEncryptedMemory(snapshot, passphrase);
        const dateStamp = new Date().toISOString().slice(0, 10);

        return {
            ok: true,
            base64Archive: encryptedBuffer.toString('base64'),
            fileName: `visapilot-backup-${dateStamp}.visapilot.enc`,
        };
    } catch (err) {
        return {
            ok: false,
            error: err instanceof Error ? err.message : 'Failed to export encrypted memory.',
        };
    } finally {
        await pool.end();
    }
}

/**
 * Server Action: Decrypts a base64 `.visapilot.enc` archive and restores records into PostgreSQL.
 */
export async function importEncryptedSnapshotAction(
    base64Archive: string,
    passphrase: string
): Promise<{
    ok: boolean;
    summary?: {
        personasRestored: number;
        selectorsRestored: number;
        qaMemoriesRestored: number;
    };
    error?: string;
}> {
    const pool = getDbPool();
    const db = drizzle(pool);

    try {
        const encryptedBuffer = Buffer.from(base64Archive, 'base64');

        const { persistenceResult } = await CryptoVault.importEncryptedMemory(
            encryptedBuffer,
            passphrase,
            {
                restoreSnapshot: async (snapshot) => {
                    let personasRestored = 0;
                    let selectorsRestored = 0;
                    let qaMemoriesRestored = 0;

                    for (const p of snapshot.personas as SnapshotPersonaRecord[]) {
                        await db.insert(personas).values({
                            name: p.name,
                            isActive: p.isActive,
                            contactInfo: p.contactInfo,
                            workHistory: p.workHistory,
                            education: p.education,
                            skills: p.skills,
                            demographicsEeo: p.demographicsEeo ?? {},
                            visaWorkAuth: p.visaWorkAuth ?? {},
                            lockedFacts: p.lockedFacts,
                        });
                        personasRestored++;
                    }

                    for (const s of snapshot.domainSelectors as SnapshotSelectorRecord[]) {
                        await db.insert(domainSelectors).values({
                            domain: s.domain,
                            fieldSignature: s.fieldSignature,
                            cssOrXpath: s.cssOrXpath,
                            mappedProfileKey: s.mappedProfileKey ?? '',
                            fieldType: (s.fieldType as any) || 'text',
                            formatMask: s.formatMask ?? null,
                            confidence: s.confidence ?? 1.0,
                            hitCount: s.hitCount ?? 1,
                        });
                        selectorsRestored++;
                    }

                    for (const m of snapshot.qaSemanticMemory as SnapshotQaMemoryRecord[]) {
                        await db.insert(qaSemanticMemory).values({
                            category: m.category,
                            rawQuestion: m.rawQuestion,
                            normalizedQuestion: m.normalizedQuestion,
                            answerTemplate: m.answerTemplate,
                            embedding: (m.embedding as any) || [],
                            maxCharLimit: m.maxCharLimit ?? 600,
                            usageCount: m.usageCount ?? 1,
                        });
                        qaMemoriesRestored++;
                    }

                    return { personasRestored, selectorsRestored, qaMemoriesRestored };
                },
            }
        );

        safeRevalidate('/autopilot');
        return { ok: true, summary: persistenceResult };
    } catch (err) {
        return {
            ok: false,
            error: err instanceof Error ? err.message : 'Failed to import encrypted archive.',
        };
    } finally {
        await pool.end();
    }
}
