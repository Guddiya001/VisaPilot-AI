import { ollamaClient } from '../ollama/client';
import type { IAgent, AgentOutput } from '@visapilot/shared';
import type { AgentContext } from '../types';
import { AgentType } from '@visapilot/shared';
import { VisaAnalysisSchema } from '../types';

export class VisaDetectionAgent implements IAgent {
  readonly name = 'Visa Detection Agent';
  readonly type = AgentType.VISA_DETECTION;

  // Keywords strongly indicating visa sponsorship
  private readonly visaPositiveKeywords = [
    'visa sponsorship',
    'sponsor visa',
    'work visa',
    'h1b',
    'h-1b',
    'h1-b',
    'tn visa',
    'green card',
    'visa transfer',
    'visa support',
    'visa assistance',
    'relocation support',
    'relocation assistance',
    'work authorization',
    'employment authorization',
    'global mobility',
    'international',
    'expat',
    'expatriate',
    'visa processing',
    'immigration support',
    'work permit',
    'sponsorship available',
    'we sponsor',
    'provides sponsorship',
  ];

  // Keywords indicating no visa sponsorship
  private readonly visaNegativeKeywords = [
    'no visa sponsorship',
    'cannot sponsor',
    'do not sponsor',
    'no sponsorship',
    'must have work authorization',
    'must have valid work permit',
    'us citizen only',
    'must be authorized to work',
    'no visa transfer',
    'without sponsorship',
    'currently authorized',
    'already authorized',
    'must hold valid visa',
    'must have permanent residency',
    'green card holder required',
    'must be a permanent resident',
    'citizen only',
    'no relocation',
    'no immigration support',
    'does not sponsor',
    'unable to sponsor',
    'not eligible for sponsorship',
  ];

  // Relocation keywords
  private readonly relocationKeywords = [
    'relocation assistance',
    'relocation package',
    'relocation support',
    'moving assistance',
    'relocation bonus',
    'relocation reimbursement',
    'temporary housing',
    'relocation provided',
    'relocation help',
    'relocation service',
    'settling-in support',
  ];

  validate(input: Record<string, unknown>): boolean {
    return !!(input.jobDescription || input.companyName);
  }

  async process(input: Record<string, unknown>): Promise<AgentOutput> {
    try {
      const context = input as unknown as AgentContext;
      const textToAnalyze = [
        context.jobDescription || '',
        context.companyName || '',
      ].join('\n');

      // Step 1: Rule-based keyword detection
      const keywordAnalysis = this.analyzeKeywords(textToAnalyze);

      // Step 2: AI-powered analysis
      const aiAnalysis = await this.analyzeWithAI(textToAnalyze);

      // Step 3: Combine results with weighted scoring
      const combinedAnalysis = this.combineAnalysis(keywordAnalysis, aiAnalysis);

      // Validate with schema
      const parsed = VisaAnalysisSchema.parse(combinedAnalysis);

      return {
        success: true,
        data: {
          ...parsed,
          keywordAnalysis,
          aiAnalysis,
          riskFactors: this.identifyRiskFactors(parsed),
        },
        confidence: parsed.confidence,
        metadata: {
          positiveKeywordsFound: keywordAnalysis.positiveMatches.length,
          negativeKeywordsFound: keywordAnalysis.negativeMatches.length,
          relocationKeywordsFound: keywordAnalysis.relocationMatches.length,
          aiConfidence: aiAnalysis.confidence,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Visa detection agent failed',
        confidence: 0,
      };
    }
  }

  private analyzeKeywords(text: string): {
    positiveMatches: string[];
    negativeMatches: string[];
    relocationMatches: string[];
    score: number;
  } {
    const lowerText = text.toLowerCase();

    const positiveMatches = this.visaPositiveKeywords.filter((keyword) =>
      lowerText.includes(keyword.toLowerCase()),
    );

    const negativeMatches = this.visaNegativeKeywords.filter((keyword) =>
      lowerText.includes(keyword.toLowerCase()),
    );

    const relocationMatches = this.relocationKeywords.filter((keyword) =>
      lowerText.includes(keyword.toLowerCase()),
    );

    // Calculate keyword score (-1 to 1)
    let score = 0;
    const posWeight = Math.min(positiveMatches.length * 0.3, 0.9);
    const negWeight = Math.min(negativeMatches.length * 0.4, 0.9);
    score = posWeight - negWeight;

    return {
      positiveMatches,
      negativeMatches,
      relocationMatches,
      score: Math.max(-1, Math.min(1, score)),
    };
  }

  private async analyzeWithAI(
    text: string,
  ): Promise<{
    sponsorsVisa: boolean;
    confidence: number;
    evidence: string[];
    visaTypes: string[];
    relocationSupport: boolean;
    notes: string;
  }> {
    const prompt = `Analyze this job description for visa sponsorship and relocation support.

Job Description:
${text.slice(0, 3000)}

Analyze the following and return as JSON:
1. sponsorsVisa: Does the company appear to sponsor work visas? (boolean)
2. confidence: Your confidence in this assessment (0-1)
3. evidence: List of specific textual evidence supporting your conclusion
4. visaTypes: What types of visas might be supported (array)
5. relocationSupport: Does the company offer relocation assistance? (boolean)
6. notes: Additional observations

Return ONLY valid JSON:`;

    try {
      const response = await ollamaClient.generateCompletion(prompt, {
        temperature: 0.1,
        maxTokens: 500,
      });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          sponsorsVisa: Boolean(parsed.sponsorsVisa),
          confidence: Number(parsed.confidence) || 0.5,
          evidence: Array.isArray(parsed.evidence) ? parsed.evidence : [],
          visaTypes: Array.isArray(parsed.visaTypes) ? parsed.visaTypes : [],
          relocationSupport: Boolean(parsed.relocationSupport),
          notes: String(parsed.notes || ''),
        };
      }
    } catch {
      // Fall through to default
    }

    return {
      sponsorsVisa: false,
      confidence: 0,
      evidence: [],
      visaTypes: [],
      relocationSupport: false,
      notes: 'AI analysis failed',
    };
  }

  private combineAnalysis(
    keyword: { score: number; positiveMatches: string[]; negativeMatches: string[]; relocationMatches: string[] },
    ai: { sponsorsVisa: boolean; confidence: number; relocationSupport: boolean; evidence: string[]; visaTypes: string[] },
  ): {
    sponsorsVisa: boolean;
    confidence: number;
    evidence: string[];
    visaTypes: string[];
    relocationSupport: boolean;
    notes: string;
  } {
    // Weighted combination: 40% keyword, 60% AI
    const keywordConfidence = Math.abs(keyword.score);
    const keywordResult = keyword.score > 0.2;
    const aiResult = ai.sponsorsVisa;

    const combinedConfidence =
      keywordConfidence * 0.4 + ai.confidence * 0.6;
    const sponsorsVisa = combinedConfidence > 0.5
      ? (keyword.score > 0 ? keywordResult : false) || aiResult
      : false;

    return {
      sponsorsVisa,
      confidence: combinedConfidence,
      evidence: [
        ...keyword.positiveMatches.map((m) => `Keyword match: "${m}"`),
        ...ai.evidence,
      ],
      visaTypes: ai.visaTypes,
      relocationSupport: keyword.relocationMatches.length > 0 || ai.relocationSupport,
      notes: `Keyword analysis: ${keyword.positiveMatches.length} positive, ${keyword.negativeMatches.length} negative matches. AI confidence: ${(ai.confidence * 100).toFixed(0)}%`,
    };
  }

  private identifyRiskFactors(
    analysis: Record<string, unknown>,
  ): string[] {
    const risks: string[] = [];
    const confidence = analysis.confidence as number;

    if (confidence < 0.6) {
      risks.push('Low confidence in visa sponsorship detection');
    }
    if (confidence < 0.3) {
      risks.push('Insufficient information to determine visa sponsorship');
    }

    return risks;
  }
}

export const visaDetectionAgent = new VisaDetectionAgent();

