import { JobSource, JobType, WorkMode } from '@visapilot/shared';
import type { CrawledJob, NormalizedJob } from './types';

export class JobNormalizer {
  normalize(crawled: CrawledJob): NormalizedJob {
    return {
      title: this.normalizeTitle(crawled.title),
      companyName: crawled.companyName.trim(),
      description: this.normalizeDescription(crawled.description),
      requirements: this.normalizeRequirements(crawled.requirements),
      responsibilities: crawled.responsibilities
        ? this.normalizeText(crawled.responsibilities)
        : undefined,
      location: this.normalizeLocation(crawled.location),
      country: crawled.country || this.inferCountry(crawled.location),
      remote: crawled.remote,
      workMode: this.normalizeWorkMode(crawled.workMode, crawled.location),
      type: this.normalizeJobType(crawled.type),
      salaryMin: crawled.salaryMin,
      salaryMax: crawled.salaryMax,
      salaryCurrency: crawled.salaryCurrency,
      source: crawled.source,
      sourceUrl: crawled.sourceUrl,
      applyUrl: crawled.applyUrl,
      skills: this.deduplicateSkills(crawled.skills),
      category: crawled.category,
      department: crawled.department,
      experienceLevel: this.normalizeExperienceLevel(
        crawled.experienceLevel,
        crawled.description,
      ),
      educationLevel: crawled.educationLevel,
      postedAt: crawled.postedAt,
      expiresAt: crawled.expiresAt,
      normalizedAt: new Date(),
    };
  }

  private normalizeTitle(title: string): string {
    return title
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[<>]/g, '');
  }

  private normalizeDescription(description: string): string {
    return this.normalizeText(description);
  }

  private normalizeRequirements(requirements: string): string {
    return this.normalizeText(requirements);
  }

  private normalizeText(text: string): string {
    return text
      .replace(/<[^>]*>/g, '')
      .replace(/&[a-z]+;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private normalizeLocation(location: string): string {
    return location
      .replace(/\([^)]*\)/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private inferCountry(location: string): string {
    const countryPatterns: Record<string, string> = {
      'united states': 'United States',
      'usa': 'United States',
      'u.s.a.': 'United States',
      'united kingdom': 'United Kingdom',
      'uk': 'United Kingdom',
      'canada': 'Canada',
      'australia': 'Australia',
      'germany': 'Germany',
      'france': 'France',
      'netherlands': 'Netherlands',
      'singapore': 'Singapore',
      'japan': 'Japan',
      'india': 'India',
      'switzerland': 'Switzerland',
      'sweden': 'Sweden',
      'denmark': 'Denmark',
      'norway': 'Norway',
      'finland': 'Finland',
      'ireland': 'Ireland',
      'spain': 'Spain',
      'italy': 'Italy',
      'china': 'China',
      'hong kong': 'Hong Kong',
      'uae': 'United Arab Emirates',
      'new zealand': 'New Zealand',
    };

    const lower = location.toLowerCase();
    for (const [pattern, country] of Object.entries(countryPatterns)) {
      if (lower.includes(pattern)) {
        return country;
      }
    }

    const parts = location.split(',').map((p) => p.trim());
    const lastPart = parts[parts.length - 1]?.toLowerCase() || '';
    if (lastPart && lastPart.length <= 3) {
      return lastPart.toUpperCase();
    }

    return 'Unknown';
  }

  private normalizeWorkMode(workMode: string, location: string): string {
    const lower = `${workMode} ${location}`.toLowerCase();

    if (lower.includes('remote') || lower.includes('work from home') || lower.includes('wfh')) {
      return WorkMode.REMOTE;
    }
    if (lower.includes('hybrid') || lower.includes('flexible')) {
      return WorkMode.HYBRID;
    }
    return WorkMode.ONSITE;
  }

  private normalizeJobType(type: string): string {
    const lower = type.toLowerCase();

    if (lower.includes('full') || lower.includes('permanent')) {
      return JobType.FULL_TIME;
    }
    if (lower.includes('part')) {
      return JobType.PART_TIME;
    }
    if (lower.includes('contract') || lower.includes('temp')) {
      return JobType.CONTRACT;
    }
    if (lower.includes('intern')) {
      return JobType.INTERNSHIP;
    }
    if (lower.includes('freelance')) {
      return JobType.FREELANCE;
    }
    return JobType.FULL_TIME;
  }

  private deduplicateSkills(skills: string[]): string[] {
    const seen = new Set<string>();
    return skills
      .map((s) => s.trim().toLowerCase())
      .filter((s) => {
        const lower = s.toLowerCase();
        if (seen.has(lower)) return false;
        seen.add(lower);
        return true;
      });
  }

  private normalizeExperienceLevel(
    level: string | undefined,
    description: string,
  ): string {
    if (level) return level;

    const lower = description.toLowerCase();
    if (lower.includes('entry') || lower.includes('junior') || lower.includes('graduate')) {
      return 'ENTRY';
    }
    if (lower.includes('senior') || lower.includes('lead') || lower.includes('principal')) {
      return 'SENIOR';
    }
    if (lower.includes('staff') || lower.includes('director') || lower.includes('head')) {
      return 'STAFF';
    }
    if (lower.includes('mid') || lower.includes('intermediate') || lower.includes('3 year')) {
      return 'MID';
    }
    return 'MID';
  }

  deduplicateJobs(
    jobs: NormalizedJob[],
    existingExternalIds: Set<string>,
  ): { unique: NormalizedJob[]; duplicates: NormalizedJob[] } {
    const seen = new Set<string>();
    const unique: NormalizedJob[] = [];
    const duplicates: NormalizedJob[] = [];

    for (const job of jobs) {
      const key = `${job.source}:${job.title.toLowerCase()}:${job.companyName.toLowerCase()}`;

      if (seen.has(key) || existingExternalIds.has(key)) {
        duplicates.push(job);
      } else {
        seen.add(key);
        unique.push(job);
      }
    }

    return { unique, duplicates };
  }
}

export const jobNormalizer = new JobNormalizer();
