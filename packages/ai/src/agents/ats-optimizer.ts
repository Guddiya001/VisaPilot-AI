import { ollamaClient } from '../ollama/client';
import type { IAgent, AgentOutput } from '@visapilot/shared';
import type { AgentContext } from '../types';
import {
  AgentType,
  ATSMatchLevel,
  ATSOptimizationStopReason,
  ATS_SCORE_WEIGHTS,
  ATS_SCORE_MAX_TOTAL,
  ATS_MATCH_LEVEL_THRESHOLDS,
  MAX_ATS_ITERATIONS,
  TARGET_ATS_SCORE,
  SKILL_ALIASES,
} from '@visapilot/shared';
import type {
  ATSMatchScore,
  ATSScoreDimension,
  ATSIteration,
  ATSOptimizationResult,
  ATSOptimizationConfig,
  JDAnalysis,
} from '@visapilot/shared';

// ─── Helpers ───

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9+#. /]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Alias-aware skill matching.
 * Checks if `skill` (or any of its known aliases) appears in `text`.
 */
function skillInText(skill: string, text: string): boolean {
  const normSkill = normalizeText(skill);
  const normText = normalizeText(text);

  // Direct match
  if (normText.includes(normSkill)) return true;

  // Alias-based matching: look up aliases for this skill
  const aliases = SKILL_ALIASES[normSkill];
  if (aliases) {
    for (const alias of aliases) {
      if (normText.includes(normalizeText(alias))) return true;
    }
  }

  // Reverse alias check: maybe the text contains the canonical form and skill is an alias
  for (const [canonical, aliasList] of Object.entries(SKILL_ALIASES)) {
    const normCanonical = normalizeText(canonical);
    if ((aliasList as readonly string[]).map((a: string) => normalizeText(a)).includes(normSkill)) {
      if (normText.includes(normCanonical)) return true;
    }
  }

  return false;
}

function getMatchLevel(normalizedScore: number): ATSMatchLevel {
  if (normalizedScore >= ATS_MATCH_LEVEL_THRESHOLDS.EXCELLENT) return ATSMatchLevel.EXCELLENT;
  if (normalizedScore >= ATS_MATCH_LEVEL_THRESHOLDS.STRONG) return ATSMatchLevel.STRONG;
  if (normalizedScore >= ATS_MATCH_LEVEL_THRESHOLDS.GOOD) return ATSMatchLevel.GOOD;
  if (normalizedScore >= ATS_MATCH_LEVEL_THRESHOLDS.NEEDS_OPTIMIZATION) return ATSMatchLevel.NEEDS_OPTIMIZATION;
  return ATSMatchLevel.POOR;
}

function extractResumeText(resumeData: Record<string, unknown>): string {
  const parts: string[] = [];
  const basics = resumeData.basics as Record<string, string> | undefined;
  if (basics) {
    parts.push(basics.summary || '', basics.title || '');
  }
  const experience = resumeData.experience as Array<Record<string, unknown>> | undefined;
  if (experience) {
    for (const exp of experience) {
      parts.push(String(exp.role || ''));
      const bullets = exp.bullets as string[] | undefined;
      if (bullets) parts.push(...bullets);
    }
  }
  const skillsFlat = resumeData.skillsFlat as string[] | undefined;
  if (skillsFlat) parts.push(...skillsFlat);
  const projects = resumeData.projects as Array<Record<string, unknown>> | undefined;
  if (projects) {
    for (const proj of projects) {
      parts.push(String(proj.description || ''), String(proj.technologies || ''));
    }
  }
  const certificates = resumeData.certificates as string[] | undefined;
  if (certificates) parts.push(...certificates);
  const achievements = resumeData.achievements as string[] | undefined;
  if (achievements) parts.push(...achievements);
  return parts.join(' ');
}

/** Check if a bullet starts with a strong action verb */
function startsWithActionVerb(bullet: string): boolean {
  const actionVerbs = [
    'architected', 'built', 'created', 'designed', 'developed', 'delivered',
    'drove', 'engineered', 'established', 'executed', 'implemented', 'improved',
    'increased', 'integrated', 'launched', 'led', 'managed', 'migrated',
    'modernized', 'optimized', 'orchestrated', 'pioneered', 'reduced',
    'refactored', 'scaled', 'shipped', 'spearheaded', 'streamlined',
    'transformed', 'upgraded', 'automated', 'collaborated', 'configured',
    'consolidated', 'contributed', 'coordinated', 'customized', 'debugged',
    'defined', 'deployed', 'diagnosed', 'documented', 'eliminated',
    'enhanced', 'ensured', 'evaluated', 'expanded', 'facilitated',
    'formulated', 'generated', 'guided', 'handled', 'identified',
    'initiated', 'instrumented', 'introduced', 'investigated', 'iterated',
    'leveraged', 'maintained', 'mentored', 'monitored', 'negotiated',
    'overhauled', 'performed', 'planned', 'prepared', 'presented',
    'prioritized', 'programmed', 'proposed', 'provisioned', 'published',
    'rebuilt', 'recommended', 'redesigned', 'reengineered', 'researched',
    'resolved', 'restructured', 'revamped', 'reviewed', 'simplified',
    'solved', 'standardized', 'strengthened', 'supervised', 'supported',
    'tested', 'trained', 'troubleshot', 'unified', 'utilized', 'validated',
  ];
  const firstWord = bullet.trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, '');
  return actionVerbs.includes(firstWord);
}

/** Check if a bullet contains quantified metrics */
function hasQuantifiedMetrics(bullet: string): boolean {
  // Match numbers like 35%, 3x, 10K+, 99.99%, 15M+, 6+, etc.
  return /\d+[%xX+]|\d+\.\d+%|\d+[KkMmBb]\+?|\d+ ?(percent|times|users|teams|requests|services|clients|engineers|microservices)/.test(bullet);
}

// ═══════════════════════════════════════════════════════════
// ATS OPTIMIZER AGENT
// ═══════════════════════════════════════════════════════════

export class ATSOptimizerAgent implements IAgent {
  readonly name = 'ATS Optimizer Agent';
  readonly type = AgentType.ATS_OPTIMIZER;

  validate(input: Record<string, unknown>): boolean {
    return !!(input.resumeData && input.jdAnalysis);
  }

  async process(input: Record<string, unknown>): Promise<AgentOutput> {
    try {
      const resumeData = input.resumeData as Record<string, unknown>;
      const jdAnalysis = input.jdAnalysis as JDAnalysis;
      const jobDescription = (input.jobDescription as string) || '';
      const candidateSkills = (input.candidateSkills as string[]) || [];
      const config: ATSOptimizationConfig = {
        maxIterations: (input.maxIterations as number) || MAX_ATS_ITERATIONS,
        targetScore: (input.targetScore as number) || TARGET_ATS_SCORE,
      };

      // Run the optimization loop
      const result = await this.runOptimizationLoop(
        resumeData,
        jdAnalysis,
        jobDescription,
        candidateSkills,
        config,
      );

      return {
        success: true,
        data: {
          optimizationResult: result.optimizationResult,
          optimizedResume: result.optimizedResume,
          finalScore: result.optimizationResult.finalScore,
        },
        confidence: 0.9,
        metadata: {
          iterationsRun: result.optimizationResult.iterations.length,
          initialScore: result.optimizationResult.initialScore,
          finalScore: result.optimizationResult.finalScore,
          improvement: result.optimizationResult.improvement,
          stoppedReason: result.optimizationResult.stoppedReason,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'ATS Optimizer agent failed',
        confidence: 0,
      };
    }
  }

  // ─── PUBLIC: Calculate detailed ATS score (7 dimensions) ───

  calculateDetailedATSScore(
    resumeData: Record<string, unknown>,
    jdAnalysis: JDAnalysis,
    jobDescription: string,
  ): ATSMatchScore {
    const resumeText = extractResumeText(resumeData);

    // 1. Required Skills (alias-aware)
    const requiredSkills = jdAnalysis.requiredSkills || [];
    const matchedRequired = requiredSkills.filter((s) => skillInText(s, resumeText));
    const missingRequired = requiredSkills.filter((s) => !skillInText(s, resumeText));
    const requiredScore = requiredSkills.length > 0
      ? Math.round((matchedRequired.length / requiredSkills.length) * ATS_SCORE_WEIGHTS.requiredSkills)
      : ATS_SCORE_WEIGHTS.requiredSkills;

    // 2. Preferred Skills (alias-aware)
    const preferredSkills = jdAnalysis.preferredSkills || [];
    const matchedPreferred = preferredSkills.filter((s) => skillInText(s, resumeText));
    const preferredScore = preferredSkills.length > 0
      ? Math.round((matchedPreferred.length / preferredSkills.length) * ATS_SCORE_WEIGHTS.preferredSkills)
      : ATS_SCORE_WEIGHTS.preferredSkills;

    // 3. Experience Match (improved: years + role + domain)
    const experienceScore = this.scoreExperienceMatch(resumeData, jdAnalysis);

    // 4. Keywords (expanded extraction + alias-aware matching)
    const jdKeywords = this.extractJDKeywords(jobDescription);
    const matchedKeywords = jdKeywords.filter((k) => skillInText(k, resumeText));
    const missingKeywords = jdKeywords.filter((k) => !skillInText(k, resumeText));
    const keywordsScore = jdKeywords.length > 0
      ? Math.round((matchedKeywords.length / jdKeywords.length) * ATS_SCORE_WEIGHTS.keywords)
      : ATS_SCORE_WEIGHTS.keywords;

    // 5. Responsibilities (improved: lower threshold + semantic)
    const responsibilitiesScore = this.scoreResponsibilities(resumeData, jdAnalysis);

    // 6. Education
    const educationScore = this.scoreEducation(resumeData, jdAnalysis);

    // 7. Formatting (improved: action verbs + metrics)
    const formattingScore = this.scoreFormatting(resumeData);

    // Aggregate
    const total = requiredScore + preferredScore + experienceScore + keywordsScore + responsibilitiesScore + educationScore + formattingScore;
    const normalizedScore = Math.min(100, Math.round((total / ATS_SCORE_MAX_TOTAL) * 100));

    return {
      requiredSkills: { score: requiredScore, max: ATS_SCORE_WEIGHTS.requiredSkills },
      preferredSkills: { score: preferredScore, max: ATS_SCORE_WEIGHTS.preferredSkills },
      experienceMatch: { score: experienceScore, max: ATS_SCORE_WEIGHTS.experienceMatch },
      keywords: { score: keywordsScore, max: ATS_SCORE_WEIGHTS.keywords },
      responsibilities: { score: responsibilitiesScore, max: ATS_SCORE_WEIGHTS.responsibilities },
      education: { score: educationScore, max: ATS_SCORE_WEIGHTS.education },
      formatting: { score: formattingScore, max: ATS_SCORE_WEIGHTS.formatting },
      total,
      maxTotal: ATS_SCORE_MAX_TOTAL,
      normalizedScore,
      matchLevel: getMatchLevel(normalizedScore),
      matchedSkills: [...new Set([...matchedRequired, ...matchedPreferred])],
      missingSkills: [...new Set(missingRequired)],
      matchedKeywords: [...new Set(matchedKeywords)],
      missingKeywords: [...new Set(missingKeywords)],
    };
  }

  // ─── PUBLIC: Run iterative optimization loop ───

  async runOptimizationLoop(
    resumeData: Record<string, unknown>,
    jdAnalysis: JDAnalysis,
    jobDescription: string,
    candidateSkills: string[],
    config: ATSOptimizationConfig,
  ): Promise<{ optimizationResult: ATSOptimizationResult; optimizedResume: Record<string, unknown> }> {
    let currentResume = JSON.parse(JSON.stringify(resumeData));
    const iterations: ATSIteration[] = [];

    // Initial score
    const initialATSScore = this.calculateDetailedATSScore(currentResume, jdAnalysis, jobDescription);
    const initialScore = initialATSScore.normalizedScore;

    let currentScore = initialScore;
    let stoppedReason: ATSOptimizationStopReason = ATSOptimizationStopReason.MAX_ITERATIONS;
    let consecutiveNoImprovement = 0;

    for (let i = 1; i <= config.maxIterations; i++) {
      // Check if target already reached
      if (currentScore >= config.targetScore) {
        stoppedReason = ATSOptimizationStopReason.TARGET_REACHED;
        break;
      }

      // Calculate what's missing
      const atsScore = this.calculateDetailedATSScore(currentResume, jdAnalysis, jobDescription);

      // Determine which keywords to add vs skip (integrity check)
      const candidateSkillsLower = candidateSkills.map((s) => s.toLowerCase());
      const addableKeywords: string[] = [];
      const skippedKeywords: Array<{ keyword: string; reason: string }> = [];

      for (const missing of atsScore.missingSkills) {
        const missingLower = missing.toLowerCase();
        // Check if the candidate actually has this skill (or a related one via aliases)
        const hasSkill = candidateSkillsLower.some(
          (cs) => cs.includes(missingLower) || missingLower.includes(cs),
        ) || this.candidateHasSkillViaAlias(missing, candidateSkills);
        if (hasSkill) {
          addableKeywords.push(missing);
        } else {
          skippedKeywords.push({
            keyword: missing,
            reason: `Candidate does not have ${missing} experience — cannot add without fabricating`,
          });
        }
      }

      // Also check missing keywords that candidate can add
      const addableKeywordTerms: string[] = [];
      for (const missing of atsScore.missingKeywords) {
        const missingLower = missing.toLowerCase();
        const hasSkill = candidateSkillsLower.some(
          (cs) => cs.includes(missingLower) || missingLower.includes(cs),
        ) || this.candidateHasSkillViaAlias(missing, candidateSkills);
        if (hasSkill) {
          addableKeywordTerms.push(missing);
        }
      }

      // Build dimension-level gaps for LLM
      const dimensionGaps = this.buildDimensionGaps(atsScore, jdAnalysis);

      // If nothing can be added and no keywords to reword, stop
      if (addableKeywords.length === 0 && addableKeywordTerms.length === 0 && dimensionGaps.length === 0) {
        iterations.push({
          iteration: i,
          score: currentScore,
          changes: ['No further truthful optimizations possible'],
          addedKeywords: [],
          skippedKeywords,
        });
        stoppedReason = ATSOptimizationStopReason.INTEGRITY_LIMIT;
        break;
      }

      // Optimize via LLM (with full ATS breakdown context)
      const optimized = await this.optimizeResumeIteration(
        currentResume,
        jdAnalysis,
        addableKeywords,
        [...new Set([...addableKeywordTerms])],
        atsScore,
        dimensionGaps,
      );

      if (optimized) {
        currentResume = optimized.resume;
        const newATSScore = this.calculateDetailedATSScore(currentResume, jdAnalysis, jobDescription);
        const newScore = newATSScore.normalizedScore;

        iterations.push({
          iteration: i,
          score: newScore,
          changes: optimized.changes,
          addedKeywords: optimized.addedKeywords,
          skippedKeywords,
        });

        // Check for no improvement (allow 2 consecutive no-improvement before stopping)
        if (newScore <= currentScore) {
          consecutiveNoImprovement++;
          if (consecutiveNoImprovement >= 2) {
            stoppedReason = ATSOptimizationStopReason.NO_IMPROVEMENT;
            currentScore = newScore;
            break;
          }
        } else {
          consecutiveNoImprovement = 0;
        }

        currentScore = newScore;
      } else {
        iterations.push({
          iteration: i,
          score: currentScore,
          changes: ['LLM optimization failed — keeping current version'],
          addedKeywords: [],
          skippedKeywords,
        });
        consecutiveNoImprovement++;
        if (consecutiveNoImprovement >= 2) {
          stoppedReason = ATSOptimizationStopReason.NO_IMPROVEMENT;
          break;
        }
      }
    }

    // Final check
    if (currentScore >= config.targetScore && stoppedReason === ATSOptimizationStopReason.MAX_ITERATIONS) {
      stoppedReason = ATSOptimizationStopReason.TARGET_REACHED;
    }

    return {
      optimizationResult: {
        iterations,
        initialScore,
        finalScore: currentScore,
        improvement: currentScore - initialScore,
        converged: currentScore >= config.targetScore,
        stoppedReason,
      },
      optimizedResume: currentResume,
    };
  }

  // ─── PRIVATE: Check candidate has skill via alias map ───

  private candidateHasSkillViaAlias(skill: string, candidateSkills: string[]): boolean {
    const normSkill = normalizeText(skill);
    const aliases = SKILL_ALIASES[normSkill] || [];
    const allVariants = [normSkill, ...(aliases as readonly string[]).map((a: string) => normalizeText(a))];

    for (const cs of candidateSkills) {
      const normCS = normalizeText(cs);
      for (const variant of allVariants) {
        if (normCS.includes(variant) || variant.includes(normCS)) return true;
      }
    }
    return false;
  }

  // ─── PRIVATE: Build dimension-level gap descriptions for LLM ───

  private buildDimensionGaps(atsScore: ATSMatchScore, jdAnalysis: JDAnalysis): string[] {
    const gaps: string[] = [];

    if (atsScore.requiredSkills.score < atsScore.requiredSkills.max) {
      gaps.push(`REQUIRED SKILLS GAP (${atsScore.requiredSkills.score}/${atsScore.requiredSkills.max}): Missing: ${atsScore.missingSkills.join(', ')}`);
    }
    if (atsScore.preferredSkills.score < atsScore.preferredSkills.max) {
      const preferredMissing = (jdAnalysis.preferredSkills || []).filter(s => !skillInText(s, ''));
      if (preferredMissing.length > 0) {
        gaps.push(`PREFERRED SKILLS GAP (${atsScore.preferredSkills.score}/${atsScore.preferredSkills.max})`);
      }
    }
    if (atsScore.keywords.score < atsScore.keywords.max) {
      gaps.push(`KEYWORDS GAP (${atsScore.keywords.score}/${atsScore.keywords.max}): Missing keywords: ${atsScore.missingKeywords.join(', ')}`);
    }
    if (atsScore.responsibilities.score < atsScore.responsibilities.max) {
      gaps.push(`RESPONSIBILITIES GAP (${atsScore.responsibilities.score}/${atsScore.responsibilities.max}): Resume bullets don't reflect enough JD responsibilities`);
    }
    if (atsScore.formatting.score < atsScore.formatting.max) {
      gaps.push(`FORMATTING GAP (${atsScore.formatting.score}/${atsScore.formatting.max}): Improve action verbs and add quantified metrics to bullets`);
    }

    return gaps;
  }

  // ─── PRIVATE: Score helpers ───

  private scoreExperienceMatch(resumeData: Record<string, unknown>, jdAnalysis: JDAnalysis): number {
    const experience = resumeData.experience as Array<Record<string, unknown>> | undefined;
    if (!experience || experience.length === 0) return 0;

    let score = 0;
    const maxScore = ATS_SCORE_WEIGHTS.experienceMatch;

    // 1. Role level alignment (0-6 pts)
    const roleLevel = (jdAnalysis.roleLevel || '').toLowerCase();
    const resumeRoles = experience.map((e) => String(e.role || '').toLowerCase());
    const seniorityTerms = ['senior', 'lead', 'staff', 'principal', 'architect', 'manager', 'director'];
    const hasMatchingSeniority = seniorityTerms.some(
      (term) => roleLevel.includes(term) && resumeRoles.some((r) => r.includes(term)),
    );
    if (hasMatchingSeniority) score += 6;
    else if (experience.length >= 2) score += 3; // Partial credit for having experience

    // 2. Years of experience alignment (0-6 pts)
    const yearsRequired = jdAnalysis.experienceYears || 5;
    // Estimate candidate years from number of experience entries and periods
    let estimatedYears = 0;
    for (const exp of experience) {
      const period = String(exp.period || '');
      if (period.toLowerCase().includes('present')) {
        estimatedYears += 2; // Assume at least 2 years for current role
      } else {
        estimatedYears += 1.5; // Assume avg 1.5 years per past role
      }
    }
    const yearsFit = Math.min(1.0, estimatedYears / yearsRequired);
    score += Math.round(yearsFit * 6);

    // 3. Number of relevant experience entries (0-4 pts)
    if (experience.length >= 3) score += 4;
    else if (experience.length >= 2) score += 3;
    else score += 1;

    // 4. Domain alignment (0-4 pts)
    const domainFocus = (jdAnalysis.domainFocus || []).map(d => d.toLowerCase());
    const resumeText = extractResumeText(resumeData).toLowerCase();
    const domainMatches = domainFocus.filter(d =>
      d.split(/\s+/).some(word => word.length >= 4 && resumeText.includes(word)),
    );
    if (domainMatches.length > 0) score += Math.min(4, domainMatches.length * 2);

    return Math.min(maxScore, score);
  }

  private scoreResponsibilities(resumeData: Record<string, unknown>, jdAnalysis: JDAnalysis): number {
    const responsibilities = jdAnalysis.keyResponsibilities || [];
    if (responsibilities.length === 0) return ATS_SCORE_WEIGHTS.responsibilities;

    const resumeText = extractResumeText(resumeData);
    let matchedCount = 0;

    for (const resp of responsibilities) {
      // Extract key terms from responsibility (words 3+ chars for broader matching)
      const terms = resp.split(/\s+/).filter((w) => w.length >= 3).map((w) => w.toLowerCase().replace(/[^a-z0-9]/g, ''));
      const uniqueTerms = [...new Set(terms)].filter(t => t.length >= 3);

      if (uniqueTerms.length === 0) {
        matchedCount++; // Empty responsibility = auto match
        continue;
      }

      const matched = uniqueTerms.filter((t) => resumeText.toLowerCase().includes(t)).length;

      // Lowered threshold: 20% of terms is enough (was 30%)
      if (matched / uniqueTerms.length >= 0.2) {
        matchedCount++;
      } else {
        // Semantic fallback: check if key action verbs from responsibility appear
        const actionVerbs = ['architect', 'design', 'build', 'scale', 'deploy', 'integrate',
          'implement', 'develop', 'optimize', 'manage', 'lead', 'create', 'engineer',
          'automate', 'monitor', 'configure', 'maintain', 'test', 'deliver', 'migrate'];
        const respLower = resp.toLowerCase();
        const resumeLower = resumeText.toLowerCase();
        const hasSharedVerb = actionVerbs.some(v => respLower.includes(v) && resumeLower.includes(v));
        if (hasSharedVerb) matchedCount += 0.5; // Partial credit
      }
    }

    return Math.round((matchedCount / responsibilities.length) * ATS_SCORE_WEIGHTS.responsibilities);
  }

  private scoreEducation(resumeData: Record<string, unknown>, _jdAnalysis: JDAnalysis): number {
    const education = resumeData.education as Array<Record<string, unknown>> | undefined;
    if (!education || education.length === 0) return 0;

    let score = 0;
    for (const edu of education) {
      const degree = String(edu.degree || '').toLowerCase();
      if (degree.includes('master') || degree.includes('mca') || degree.includes('m.s') || degree.includes('m.a') || degree.includes('m.tech') || degree.includes('mba')) {
        score = ATS_SCORE_WEIGHTS.education;
        break;
      }
      if (degree.includes('bachelor') || degree.includes('bca') || degree.includes('b.s') || degree.includes('b.a') || degree.includes('b.tech') || degree.includes('b.e')) {
        score = Math.max(score, Math.round(ATS_SCORE_WEIGHTS.education * 0.8));
      }
    }
    return score;
  }

  private scoreFormatting(resumeData: Record<string, unknown>): number {
    const maxScore = ATS_SCORE_WEIGHTS.formatting;
    let score = 0;
    const basics = resumeData.basics as Record<string, string> | undefined;
    const experience = resumeData.experience as Array<Record<string, unknown>> | undefined;

    // 1. Standard sections present (0-2 pts)
    let sectionCount = 0;
    if (basics?.summary && basics.summary.length > 20) sectionCount++;
    if (experience && experience.length > 0) sectionCount++;
    if (resumeData.education) sectionCount++;
    if (resumeData.skillsFlat) sectionCount++;

    if (sectionCount >= 4) score += 2;
    else if (sectionCount >= 3) score += 1;

    // 2. Action verbs in bullets (0-1.5 pts)
    if (experience) {
      const allBullets = experience.flatMap((e) => (e.bullets as string[]) || []);
      if (allBullets.length > 0) {
        const actionVerbCount = allBullets.filter(startsWithActionVerb).length;
        const actionVerbRatio = actionVerbCount / allBullets.length;
        if (actionVerbRatio >= 0.8) score += 1.5;
        else if (actionVerbRatio >= 0.5) score += 1;
        else if (actionVerbRatio >= 0.3) score += 0.5;
      }
    }

    // 3. Quantified metrics in bullets (0-1.5 pts)
    if (experience) {
      const allBullets = experience.flatMap((e) => (e.bullets as string[]) || []);
      if (allBullets.length > 0) {
        const metricsCount = allBullets.filter(hasQuantifiedMetrics).length;
        const metricsRatio = metricsCount / allBullets.length;
        if (metricsRatio >= 0.5) score += 1.5;
        else if (metricsRatio >= 0.3) score += 1;
        else if (metricsRatio >= 0.15) score += 0.5;
      }
    }

    return Math.min(maxScore, Math.round(score));
  }

  /**
   * Expanded JD keyword extraction.
   * Covers 150+ tech terms, frameworks, methodologies, and tools.
   */
  private extractJDKeywords(jobDescription: string): string[] {
    const techPatterns = [
      // Languages & Runtimes
      /\b(React(?:\.js)?|Next\.js|TypeScript|JavaScript|Node\.js|Python|Java|Go|Rust|Ruby|Scala|Kotlin|Swift|C\+\+|C#|PHP|Perl|Elixir|Haskell|Clojure|Dart|R)\b/gi,
      // Frameworks
      /\b(FastAPI|NestJS|Express\.js|Spring Boot|Django|Flask|Rails|Vue\.js|Angular|Svelte|Nuxt\.js|Gatsby|Remix|Astro|Fiber|Gin|Echo|Laravel|Symfony|ASP\.NET)\b/gi,
      // Databases
      /\b(PostgreSQL|MySQL|MongoDB|Redis|Elasticsearch|DynamoDB|Cassandra|Neo4j|CockroachDB|SQLite|MariaDB|Supabase|PlanetScale|Firestore|BigQuery|Snowflake|ClickHouse)\b/gi,
      // Cloud & DevOps
      /\b(AWS|GCP|Azure|Docker|Kubernetes|Terraform|Ansible|Pulumi|CloudFormation|Helm|ArgoCD|Istio|Consul|Vault|Packer)\b/gi,
      // CI/CD & Tools
      /\b(CI\/CD|GitHub Actions|GitLab CI|Jenkins|CircleCI|Travis CI|ArgoCD|Spinnaker|Flux|Tekton)\b/gi,
      // Messaging & Streaming
      /\b(Kafka|RabbitMQ|NATS|Pulsar|SQS|SNS|EventBridge|Kinesis)\b/gi,
      // Observability
      /\b(Datadog|Splunk|Grafana|Prometheus|New Relic|Jaeger|OpenTelemetry|ELK|Logstash|Kibana|PagerDuty)\b/gi,
      // AI/ML/GenAI
      /\b(LangChain|LangGraph|RAG|MCP|AI|ML|LLM|OpenAI|GPT|Gemini|Claude|Anthropic|Hugging Face|TensorFlow|PyTorch|scikit-learn|Transformers|BERT|Vector\s*(?:DB|database|databases|search)|Embeddings?|Prompt\s*Engineering|Tool\s*Calling|AI\s*Agents?|Agentic\s*AI|GenAI|Generative\s*AI|NLP|Computer\s*Vision|MLOps|LlamaIndex|CrewAI|AutoGen|Semantic\s*Kernel)\b/gi,
      // Architecture & Patterns
      /\b(Microservices|Monorepo|Event[\s-]Driven|CQRS|Domain[\s-]Driven|GraphQL|REST(?:ful)?|gRPC|WebSocket|Server[\s-]Sent|API[\s-]Gateway|Service\s*Mesh|Micro[\s-]?frontends?|Module\s*Federation)\b/gi,
      // Testing
      /\b(Jest|Cypress|Selenium|Playwright|Mocha|Chai|Vitest|Testing\s*Library|Puppeteer|k6|Locust|Artillery|TDD|BDD)\b/gi,
      // Methodologies
      /\b(Agile|Scrum|Kanban|XP|Lean|DevOps|SRE|Site\s*Reliability|Platform\s*Engineering|DevSecOps)\b/gi,
      // Security
      /\b(OAuth|JWT|SAML|SSO|RBAC|ABAC|mTLS|OWASP|SOC\s*2|GDPR|HIPAA|PCI[\s-]DSS)\b/gi,
    ];

    const keywords = new Set<string>();
    for (const pattern of techPatterns) {
      const matches = jobDescription.matchAll(pattern);
      for (const match of matches) {
        keywords.add(match[0]);
      }
    }
    return [...keywords];
  }

  // ─── PRIVATE: LLM-based resume optimization iteration (enhanced) ───

  private async optimizeResumeIteration(
    resumeData: Record<string, unknown>,
    jdAnalysis: JDAnalysis,
    addableSkills: string[],
    addableKeywords: string[],
    currentATSScore: ATSMatchScore,
    dimensionGaps: string[],
  ): Promise<{ resume: Record<string, unknown>; changes: string[]; addedKeywords: string[] } | null> {
    const basics = resumeData.basics as Record<string, string> | undefined;
    const experience = resumeData.experience as Array<Record<string, unknown>> | undefined;
    const skillsFlat = resumeData.skillsFlat as string[] | undefined;

    const prompt = `You are an ATS resume optimizer. Your ONLY goal is to maximize the ATS score to 100%.

CURRENT ATS SCORE BREAKDOWN:
- Required Skills: ${currentATSScore.requiredSkills.score}/${currentATSScore.requiredSkills.max}
- Preferred Skills: ${currentATSScore.preferredSkills.score}/${currentATSScore.preferredSkills.max}
- Experience Match: ${currentATSScore.experienceMatch.score}/${currentATSScore.experienceMatch.max}
- Keywords: ${currentATSScore.keywords.score}/${currentATSScore.keywords.max}
- Responsibilities: ${currentATSScore.responsibilities.score}/${currentATSScore.responsibilities.max}
- Education: ${currentATSScore.education.score}/${currentATSScore.education.max}
- Formatting: ${currentATSScore.formatting.score}/${currentATSScore.formatting.max}
- TOTAL: ${currentATSScore.normalizedScore}% (target: 100%)

DIMENSION GAPS TO FIX:
${dimensionGaps.length > 0 ? dimensionGaps.join('\n') : 'Minor gaps remaining — refine wording'}

CURRENT RESUME SUMMARY: ${basics?.summary || ''}
CURRENT SKILLS: ${(skillsFlat || []).join('; ')}
CURRENT EXPERIENCE BULLETS: ${(experience || []).flatMap((e) => (e.bullets as string[]) || []).slice(0, 15).join('\n')}

TARGET JOB: ${jdAnalysis.jobTitle} at ${jdAnalysis.companyName}
REQUIRED SKILLS: ${jdAnalysis.requiredSkills.join(', ')}
PREFERRED SKILLS: ${(jdAnalysis.preferredSkills || []).join(', ')}
KEY RESPONSIBILITIES: ${jdAnalysis.keyResponsibilities.join('; ')}

SKILLS TO NATURALLY INTEGRATE (candidate HAS these but they're underrepresented): ${addableSkills.join(', ')}
KEYWORDS TO ADD WHERE APPROPRIATE: ${addableKeywords.join(', ')}

CRITICAL RULES:
1. Do NOT fabricate any new experience, project, or achievement.
2. Only reword, reorganize, or emphasize existing content to include the missing skills/keywords.
3. Do NOT stuff keywords unnaturally.
4. Each skill/keyword must appear in a contextually appropriate place.
5. DUAL PLACEMENT: Every required skill must appear in BOTH the skills section AND at least one experience bullet.
6. Every bullet MUST start with a strong action verb (Architected, Built, Designed, Engineered, Led, etc.).
7. At least 50% of bullets must include quantified metrics (%, x improvement, numbers).
8. Keep the same number of experience entries and similar bullet count.
9. The professional summary must contain the exact job title, company name, and at least 4 required skills.

Return ONLY a valid JSON object:
{
  "improvedSummary": "optimized professional summary",
  "improvedSkillsFlat": ["Category: skill1, skill2, skill3"],
  "improvedBullets": {
    "exp-1": ["bullet1", "bullet2"],
    "exp-2": ["bullet1", "bullet2"]
  },
  "changes": ["description of each change made"],
  "addedKeywords": ["keywords that were successfully integrated"]
}`;

    try {
      const response = await ollamaClient.generateCompletion(prompt, {
        temperature: 0.3,
        maxTokens: 3000,
      });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;

      const parsed = JSON.parse(jsonMatch[0]);

      // Apply changes to a copy
      const optimized = JSON.parse(JSON.stringify(resumeData));

      if (parsed.improvedSummary && optimized.basics) {
        (optimized.basics as Record<string, string>).summary = String(parsed.improvedSummary);
      }

      if (Array.isArray(parsed.improvedSkillsFlat) && parsed.improvedSkillsFlat.length > 0) {
        optimized.skillsFlat = parsed.improvedSkillsFlat.map(String);
      }

      if (parsed.improvedBullets && typeof parsed.improvedBullets === 'object') {
        const expArray = optimized.experience as Array<Record<string, unknown>> | undefined;
        if (expArray) {
          for (const exp of expArray) {
            const expId = String(exp.id || '');
            const newBullets = parsed.improvedBullets[expId];
            if (Array.isArray(newBullets) && newBullets.length > 0) {
              exp.bullets = newBullets.map(String);
            }
          }
        }
      }

      return {
        resume: optimized,
        changes: Array.isArray(parsed.changes) ? parsed.changes.map(String) : ['Resume optimized'],
        addedKeywords: Array.isArray(parsed.addedKeywords) ? parsed.addedKeywords.map(String) : [],
      };
    } catch {
      return null;
    }
  }
}

export const atsOptimizerAgent = new ATSOptimizerAgent();
