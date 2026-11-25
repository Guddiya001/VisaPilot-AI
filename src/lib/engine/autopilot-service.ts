/**
 * Autopilot Dashboard & Halted Gate Inspector Service
 * Provides analytics for Zero-LLM resolution, template management, and locked-facts gate unblocking.
 */

export interface AutopilotSummary {
  totalApplications: number;
  tier1Hits: number;
  tier2VectorHits: number;
  tier3LlmCalls: number;
  zeroLlmCallsSaved: number;
  zeroLlmPercentage: number;
}

export interface QaTemplateItem {
  id: string;
  category: string;
  rawQuestion: string;
  answerTemplate: string;
  usageCount: number;
  lastUsedAt: string;
}

export interface MissingFactReviewItem {
  id: string;
  fieldSignature: string;
  badge: 'RED_MISSING_FACT' | 'AMBER_LLM_DRAFT';
  requiredFactKey: string;
  questionContext: string;
  suggestedDefault?: string;
}

/**
 * Calculates metrics across application audit history
 */
export function calculateAutopilotStats(
  audits: Array<{
    id: string;
    resolutionStats: {
      tier1Hits?: number;
      tier2VectorHits?: number;
      tier3LlmCalls?: number;
    };
  }>
): AutopilotSummary {
  if (!audits || audits.length === 0) {
    return {
      totalApplications: 0,
      tier1Hits: 0,
      tier2VectorHits: 0,
      tier3LlmCalls: 0,
      zeroLlmCallsSaved: 0,
      zeroLlmPercentage: 100,
    };
  }

  let totalTier1 = 0;
  let totalTier2 = 0;
  let totalTier3 = 0;

  for (const audit of audits) {
    totalTier1 += audit.resolutionStats?.tier1Hits ?? 0;
    totalTier2 += audit.resolutionStats?.tier2VectorHits ?? 0;
    totalTier3 += audit.resolutionStats?.tier3LlmCalls ?? 0;
  }

  const zeroLlmHits = totalTier1 + totalTier2;
  const totalFields = zeroLlmHits + totalTier3;
  const zeroLlmPercentage =
    totalFields === 0
      ? 100
      : Math.round((zeroLlmHits / totalFields) * 1000) / 10;

  return {
    totalApplications: audits.length,
    tier1Hits: totalTier1,
    tier2VectorHits: totalTier2,
    tier3LlmCalls: totalTier3,
    zeroLlmCallsSaved: zeroLlmHits,
    zeroLlmPercentage,
  };
}

/**
 * Updates a template in-memory preserving token structures
 */
export function updateTemplateInMemory(
  templates: QaTemplateItem[],
  id: string,
  newTemplate: string
): QaTemplateItem[] {
  return templates.map((t) =>
    t.id === id
      ? {
          ...t,
          answerTemplate: newTemplate,
          lastUsedAt: new Date().toISOString(),
        }
      : t
  );
}

/**
 * Resolves a missing fact, updates lockedFacts, and unblocks the pre-submit safety gate
 */
export function resolveMissingFactInMemory(
  lockedFacts: Record<string, any>,
  factKey: string,
  factValue: any
): {
  updatedLockedFacts: Record<string, any>;
  gateStatus: 'GATE_UNLOCKED';
  message: string;
} {
  const updated = {
    ...lockedFacts,
    [factKey]: factValue,
  };

  return {
    updatedLockedFacts: updated,
    gateStatus: 'GATE_UNLOCKED',
    message: `Fact "${factKey}" successfully locked to profile. Safety gate unblocked.`,
  };
}
