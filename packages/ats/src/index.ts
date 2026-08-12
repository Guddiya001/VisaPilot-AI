import type { IATSAdapter, ATSAnalysis } from '@visapilot/shared';
import { ATSProvider } from '@visapilot/shared';

export class ATSService {
  private adapters: Map<ATSProvider, IATSAdapter> = new Map();

  registerAdapter(provider: ATSProvider, adapter: IATSAdapter): void {
    this.adapters.set(provider, adapter);
  }

  async calculateMatch(
    resumeContent: string,
    jobDescription: string,
    provider?: ATSProvider,
  ): Promise<ATSAnalysis> {
    // Extract keywords from both documents
    const resumeKeywords = this.extractKeywords(resumeContent);
    const jobKeywords = this.extractKeywords(jobDescription);

    // Calculate keyword match
    const matchedKeywords = jobKeywords.filter((kw) =>
      resumeKeywords.some((rk) => rk.toLowerCase() === kw.toLowerCase()),
    );
    const missingKeywords = jobKeywords.filter(
      (kw) => !matchedKeywords.includes(kw),
    );

    // Calculate scores
    const keywordMatch = jobKeywords.length > 0
      ? Math.round((matchedKeywords.length / jobKeywords.length) * 100)
      : 0;
    const skillsMatch = this.calculateSkillsMatch(resumeContent, jobDescription);
    const experienceMatch = this.calculateExperienceMatch(resumeContent, jobDescription);
    const educationMatch = this.calculateEducationMatch(resumeContent, jobDescription);

    // Calculate weighted overall score
    const overallScore = Math.round(
      keywordMatch * 0.35 + skillsMatch * 0.30 + experienceMatch * 0.25 + educationMatch * 0.10,
    );

    // Generate suggestions
    const suggestions: string[] = [];
    if (keywordMatch < 70) {
      suggestions.push(`Add missing keywords: ${missingKeywords.slice(0, 5).join(', ')}`);
    }
    if (skillsMatch < 70) {
      suggestions.push('Highlight relevant technical skills more prominently');
    }
    if (experienceMatch < 70) {
      suggestions.push('Quantify achievements with metrics and results');
    }

    return {
      jobId: '',
      resumeId: '',
      overallScore,
      keywordMatch,
      experienceMatch,
      educationMatch,
      skillsMatch,
      matchedKeywords,
      missingKeywords,
      suggestions,
      atsProvider: provider,
      formattingScore: this.calculateFormattingScore(resumeContent),
    };
  }

  private extractKeywords(text: string): string[] {
    const commonKeywords = [
      'javascript', 'typescript', 'python', 'java', 'react', 'angular',
      'vue', 'node', 'nodejs', 'aws', 'azure', 'gcp', 'docker',
      'kubernetes', 'sql', 'nosql', 'mongodb', 'postgresql', 'redis',
      'graphql', 'rest', 'api', 'microservices', 'devops', 'ci/cd',
      'git', 'agile', 'scrum', 'machine learning', 'ai', 'data science',
      'full-stack', 'frontend', 'backend', 'leadership', 'management',
    ];

    const lower = text.toLowerCase();
    return commonKeywords.filter((kw) => lower.includes(kw));
  }

  private calculateSkillsMatch(resumeContent: string, jobDescription: string): number {
    const resumeSkills = this.extractKeywords(resumeContent);
    const jobSkills = this.extractKeywords(jobDescription);

    if (jobSkills.length === 0) return 50;

    const matched = jobSkills.filter((s) =>
      resumeSkills.some((rs) => rs.includes(s) || s.includes(rs)),
    );

    return Math.round((matched.length / jobSkills.length) * 100);
  }

  private calculateExperienceMatch(resumeContent: string, _jobDescription: string): number {
    const yearPatterns = [
      /(\d+)\+?\s*(?:year|yr)s?\s*(?:of\s+)?experience/i,
      /(\d+)\+?\s*(?:year|yr)s?\s*(?:of\s+)?(?:industry|professional|relevant)\s+experience/i,
    ];

    let maxYears = 0;
    for (const pattern of yearPatterns) {
      const matches = resumeContent.matchAll(pattern);
      for (const match of matches) {
        const years = parseInt(match[1], 10);
        if (years > maxYears) maxYears = years;
      }
    }

    if (maxYears >= 5) return 90;
    if (maxYears >= 3) return 70;
    if (maxYears >= 1) return 50;
    return 30;
  }

  private calculateEducationMatch(resumeContent: string, _jobDescription: string): number {
    const hasDegree = /(bachelor|master|phd|b\.s\.|m\.s\.|b\.a\.|m\.a\.)/i.test(resumeContent);
    const hasRelevantField = /(computer science|engineering|mathematics|physics|data science)/i.test(resumeContent);

    if (hasDegree && hasRelevantField) return 90;
    if (hasDegree) return 70;
    return 40;
  }

  private calculateFormattingScore(content: string): number {
    let score = 100;

    // Check for common formatting issues
    if (content.includes('table') || content.includes('<table')) score -= 15;
    if (content.includes('column') || content.includes('columns')) score -= 10;
    if (content.includes('<!--') || content.includes('/*')) score -= 5;
    if (content.split('\n').length < 10) score -= 10;
    if (content.length < 500) score -= 10;

    return Math.max(0, score);
  }
}

export const atsService = new ATSService();

