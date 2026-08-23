import { Injectable, Logger } from '@nestjs/common';
import {
  CandidateProfile,
  Job,
  COUNTRY_PRIORITY_TIERS,
  VisaSponsorshipStatus,
} from '@visapilot/shared';
import { userRepository, jobRepository } from '@visapilot/database';
import { ollamaClient } from '@visapilot/ai';
import { crawlerService } from '@visapilot/crawler';

@Injectable()
export class VisaIntelligenceService {
  private readonly logger = new Logger(VisaIntelligenceService.name);

  async buildCandidateProfile(userId: string): Promise<CandidateProfile> {
    const user = await userRepository.findById(userId);
    
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    const targetCountries = user.preferredCountries?.length 
      ? user.preferredCountries 
      : ['United States', 'United Kingdom', 'Canada', 'Germany', 'Australia'];

    // Gather all skills from user and experiences
    const skillsSet = new Set<string>(user.skills || []);
    user.experience?.forEach(exp => {
      exp.skills?.forEach(s => skillsSet.add(s));
    });

    // Default configuration for Visa requirements
    return {
      currentCountry: user.location,
      targetRoles: ['Software Engineer', 'Senior Software Engineer', 'Full-Stack Engineer'], // Default roles, ideally extracted from resume
      skills: Array.from(skillsSet),
      targetCountries,
      visaRequirements: {
        requiresSponsorship: true,
        h1b: targetCountries.includes('United States'),
        h1bTransfer: false,
        o1: false,
        euBlueCard: targetCountries.some(c => ['Germany', 'Netherlands', 'France'].includes(c)),
        skilledWorkerUK: targetCountries.includes('United Kingdom'),
        australia482: targetCountries.includes('Australia'),
        australia186: targetCountries.includes('Australia'),
        irelandCriticalSkills: targetCountries.includes('Ireland'),
        netherlandsHSM: targetCountries.includes('Netherlands'),
      },
      relocation: {
        willing: true,
        targetTimelineMonths: 3,
      },
    };
  }

  async discoverAndRankJobs(profile: CandidateProfile, limit = 50): Promise<any[]> {
    this.logger.log(`Discovering jobs from WEB for profile with ${profile.skills.length} skills in ${profile.targetCountries.join(', ')}`);
    
    // Step 1: Discover jobs from web using Candidate Profile
    const searchPromises = profile.targetRoles.map(role => 
      crawlerService.searchJobs({
        query: role,
        countries: profile.targetCountries,
        skills: profile.skills,
        limit: 15,
      })
    );

    let jobs: any[] = [];
    try {
      const resultsArray = await Promise.all(searchPromises);
      resultsArray.forEach(res => {
        if (res.jobs) jobs.push(...res.jobs);
      });
    } catch (err) {
      this.logger.error(`Crawler search failed in discoverAndRankJobs:`, err);
    }

    // Step 2: Deduplicate
    const uniqueJobs = this.deduplicate(jobs);

    // Step 3: Score and Rank
    const scoredJobs = uniqueJobs.map(job => {
      const jobForScoring: any = { ...job, company: { name: job.companyName } };
      const score = this.scoreJob(jobForScoring, profile);
      return { ...job, matchScore: score };
    });

    scoredJobs.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
    
    const finalJobs = scoredJobs.slice(0, limit);

    return finalJobs.map(job => ({
      title: job.title,
      company: job.companyName,
      location: job.location,
      url: job.sourceUrl || job.applyUrl || '',
      source: {
        type: 'WEB',
        url: job.sourceUrl || job.applyUrl || '',
        fetchedAt: new Date().toISOString()
      },
      visa: job.visaSponsorshipData ? {
        status: job.visaSponsorshipData.status,
        type: job.visaSponsorshipData.type,
        evidence: job.visaSponsorshipData.evidence
      } : undefined,
      semanticMatch: job.matchScore || 0
    }));
  }

  // Fast heuristic scoring fallback
  scoreJob(job: Job, profile: CandidateProfile): number {
    let score = 0;

    // 1. Country Priority Tier (Tier 0 is best)
    const country = job.country || 'Remote worldwide';
    const tier = Object.entries(COUNTRY_PRIORITY_TIERS).find(([key]) => country.toLowerCase().includes(key.toLowerCase()))?.[1] ?? 3;
    
    score += (4 - tier) * 10;

    // 2. Visa Sponsorship Status
    if (profile.visaRequirements.requiresSponsorship) {
      if (job.visaSponsorship === VisaSponsorshipStatus.SPONSORS) {
        score += 50; 
      } else if (job.visaSponsorship === VisaSponsorshipStatus.CASE_BY_CASE) {
        score += 20;
      } else if (job.visaSponsorship === VisaSponsorshipStatus.DOES_NOT_SPONSOR) {
        score -= 50; 
      }
    }

    // 3. Job Freshness
    const now = new Date();
    const postedAt = job.postedAt ? new Date(job.postedAt) : now;
    const diffDays = Math.floor((now.getTime() - postedAt.getTime()) / (1000 * 3600 * 24));

    if (diffDays <= 1) score += 20;
    else if (diffDays <= 3) score += 15;
    else if (diffDays <= 7) score += 10;
    else if (diffDays <= 14) score += 5;
    else if (diffDays > 30) score -= 10;

    // 4. Skills Match
    if (job.skills && job.skills.length > 0) {
      const matchedSkills = job.skills.filter(s => profile.skills.some(ps => ps.toLowerCase() === s.toLowerCase()));
      const matchRatio = matchedSkills.length / job.skills.length;
      score += Math.floor(matchRatio * 20);
    }

    return Math.max(0, score);
  }

  // LLM-based intelligent scoring
  async scoreJobWithAI(job: Job, profile: CandidateProfile): Promise<{
    matchScore: number;
    skillMatch: number;
    experienceMatch: number;
    visaMatch: number;
    locationMatch: number;
    overallReason: string;
  }> {
    const prompt = `Evaluate the match between this job description and the candidate's profile.

Candidate Profile:
- Skills: ${profile.skills.join(', ')}
- Target Roles: ${profile.targetRoles.join(', ')}
- Target Countries: ${profile.targetCountries.join(', ')}
- Requires Visa Sponsorship: ${profile.visaRequirements.requiresSponsorship ? 'Yes' : 'No'}

Job Details:
- Title: ${job.title}
- Company: ${job.company?.name || 'Unknown'}
- Location: ${job.location}, ${job.country}
- Visa Status: ${job.visaSponsorship}
- Description: ${job.description.substring(0, 2000)}

Calculate match scores (0-100) and provide a JSON response matching this exact structure:
{
  "matchScore": 94,
  "skillMatch": 96,
  "experienceMatch": 95,
  "visaMatch": 100,
  "locationMatch": 90,
  "overallReason": "Strong React/TypeScript/Node.js alignment with required seniority and H-1B sponsorship."
}

Ensure the overall matchScore uses weights similar to: 30% Skill, 20% Experience, 25% Visa, 10% Location, 15% Other.
Return ONLY valid JSON.
`;

    try {
      const response = await ollamaClient.generateCompletion(prompt, {
        temperature: 0.1,
        maxTokens: 500,
      });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          matchScore: Number(parsed.matchScore) || 0,
          skillMatch: Number(parsed.skillMatch) || 0,
          experienceMatch: Number(parsed.experienceMatch) || 0,
          visaMatch: Number(parsed.visaMatch) || 0,
          locationMatch: Number(parsed.locationMatch) || 0,
          overallReason: String(parsed.overallReason || 'Scored successfully.'),
        };
      }
    } catch (e) {
      this.logger.warn(`Failed to score job with AI:`, e);
    }

    // Fallback to heuristic
    const heuristicScore = Math.min(100, this.scoreJob(job, profile));
    return {
      matchScore: heuristicScore,
      skillMatch: heuristicScore,
      experienceMatch: heuristicScore,
      visaMatch: heuristicScore,
      locationMatch: heuristicScore,
      overallReason: 'Heuristic fallback score.',
    };
  }

  deduplicate(jobs: any[]): any[] {
    const unique = new Map<string, any>();

    for (const job of jobs) {
      const companyName = job.company?.name || 'unknown';
      const key = job.externalId || `${companyName.toLowerCase()}-${job.title.toLowerCase()}`;
      
      if (!unique.has(key)) {
        unique.set(key, job);
      } else {
        const existing = unique.get(key)!;
        if (new Date(job.postedAt) > new Date(existing.postedAt)) {
          unique.set(key, job);
        }
      }
    }

    return Array.from(unique.values());
  }
}
