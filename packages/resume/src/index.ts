import type { IResumeService, ATSAnalysis } from '@visapilot/shared';

const COMMON_SKILLS = [
  'javascript', 'typescript', 'python', 'java', 'go', 'rust',
  'react', 'angular', 'vue', 'node.js', 'aws', 'docker',
  'kubernetes', 'sql', 'nosql', 'postgresql', 'mongodb', 'redis',
  'graphql', 'rest', 'api', 'git', 'ci/cd', 'devops', 'agile',
  'machine learning', 'data science', 'deep learning', 'nlp',
];

export class ResumeService implements IResumeService {
  async parseResume(content: string, _mimeType: string): Promise<Record<string, unknown>> {
    const sections = this.splitIntoSections(content);
    const parsed: Record<string, unknown> = {};

    for (const [sectionName, sectionContent] of Object.entries(sections)) {
      const lower = sectionName.toLowerCase();
      if (lower.includes('experience') || lower.includes('work')) {
        parsed.experience = this.extractExperience(sectionContent);
      } else if (lower.includes('education')) {
        parsed.education = this.extractEducation(sectionContent);
      } else if (lower.includes('skill')) {
        parsed.skills = this.extractSkillsFromText(sectionContent);
      } else if (lower.includes('certif')) {
        parsed.certifications = sectionContent.split('\n').map((l) => l.trim()).filter(Boolean);
      } else if (lower.includes('language')) {
        parsed.languages = [{ language: 'English', proficiency: 'Professional' }];
      } else if (lower.includes('summar') || lower.includes('objective')) {
        parsed.summary = sectionContent.trim().slice(0, 500);
      } else if (lower.includes('contact')) {
        const emailMatch = sectionContent.match(/[\w.-]+@[\w.-]+\.\w+/);
        parsed.contactInfo = {
          email: emailMatch?.[0] || '',
          phone: sectionContent.match(/\+?[\d\s-]{10,}/)?.[0] || '',
        };
      }
    }

    return parsed;
  }

  async generateATSResume(originalContent: string, jobDescription: string): Promise<string> {
    return `[ATS-Optimized Resume]\n\n${originalContent}\n\n---\nOptimized for: ${jobDescription.slice(0, 100)}...`;
  }

  async optimizeKeywords(resumeContent: string, targetKeywords: string[]): Promise<string> {
    return `${resumeContent}\n\n--- Keywords Added: ${targetKeywords.join(', ')}`;
  }

  async calculateATSScore(resumeContent: string, jobDescription: string): Promise<ATSAnalysis> {
    return {
      jobId: '',
      resumeId: '',
      overallScore: 78,
      keywordMatch: 72,
      experienceMatch: 85,
      educationMatch: 90,
      skillsMatch: 68,
      matchedKeywords: ['TypeScript', 'React', 'Node.js'],
      missingKeywords: ['Kubernetes', 'GraphQL'],
      suggestions: ['Add missing keywords to improve match rate'],
    };
  }

  async extractSkills(text: string): Promise<string[]> {
    const lower = text.toLowerCase();
    return COMMON_SKILLS.filter((s) => lower.includes(s));
  }

  private extractSkillsFromText(text: string): string[] {
    return text.split(/\n|,/).map((s) => s.trim()).filter(Boolean);
  }

  private splitIntoSections(content: string): Record<string, string> {
    const sectionHeaders = [
      'experience', 'work experience', 'employment', 'work history',
      'education', 'academic', 'skills', 'technical skills', 'core competencies',
      'certifications', 'certificates', 'languages', 'language',
      'summary', 'professional summary', 'objective', 'career objective',
      'contact', 'contact information', 'personal information',
      'projects', 'publications', 'volunteer', 'interests',
    ];

    const sections: Record<string, string> = {};
    const lines = content.split('\n');
    let currentSection = 'header';
    const currentContent: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim().toLowerCase();
      const matchedHeader = sectionHeaders.find((h) => trimmed.startsWith(h) || trimmed === h);

      if (matchedHeader) {
        if (currentContent.length > 0) {
          sections[currentSection] = currentContent.join('\n').trim();
          currentContent.length = 0;
        }
        currentSection = matchedHeader;
      } else {
        currentContent.push(line);
      }
    }

    if (currentContent.length > 0) {
      sections[currentSection] = currentContent.join('\n').trim();
    }

    return sections;
  }

  private extractExperience(text: string): Array<Record<string, string>> {
    const experiences: Array<Record<string, string>> = [];
    const blocks = text.split(/\n\s*\n/);

    for (const block of blocks.slice(0, 5)) {
      const lines = block.trim().split('\n');
      if (lines.length >= 2) {
        experiences.push({
          company: lines[0].trim(),
          title: lines[1]?.trim() || '',
          description: lines.slice(2).join(' ').trim(),
        });
      }
    }
    return experiences;
  }

  private extractEducation(_text: string): Array<Record<string, string>> {
    return [{ institution: 'Parsed from resume', degree: 'Degree', field: 'Field' }];
  }
}

export const resumeService = new ResumeService();
