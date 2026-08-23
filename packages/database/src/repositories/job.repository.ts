import { Prisma } from '@prisma/client';
import { getPrismaClient } from '../client';
import { buildPaginationParams, calculatePaginationMeta } from '../utils';
import type {
  Job,
  SearchFilters,
  PaginatedResult,
} from '@visapilot/shared';

const prisma = getPrismaClient();

/**
 * Country alias map — maps canonical names to all known variants.
 * Used to expand country filters so "United States" also matches "US", "USA", etc.
 */
const COUNTRY_ALIASES: Record<string, string[]> = {
  'united states': ['us', 'usa', 'united states', 'united states of america'],
  'united kingdom': ['uk', 'gb', 'united kingdom', 'great britain', 'england'],
  'germany': ['de', 'germany', 'deutschland'],
  'canada': ['ca', 'canada'],
  'australia': ['au', 'australia'],
  'netherlands': ['nl', 'netherlands', 'holland'],
  'ireland': ['ie', 'ireland'],
  'switzerland': ['ch', 'switzerland'],
  'singapore': ['sg', 'singapore'],
  'japan': ['jp', 'japan'],
  'uae': ['ae', 'uae', 'united arab emirates', 'dubai'],
  'new zealand': ['nz', 'new zealand'],
  'france': ['fr', 'france'],
  'sweden': ['se', 'sweden'],
  'norway': ['no', 'norway'],
  'india': ['in', 'india'],
  'poland': ['pl', 'poland'],
  'spain': ['es', 'spain'],
  'denmark': ['dk', 'denmark'],
  'finland': ['fi', 'finland'],
};

/**
 * Expand a country name to all its known aliases for broader matching.
 */
function expandCountryAliases(country: string): string[] {
  const lower = country.toLowerCase().trim();

  // Check if the input matches any canonical name or alias
  for (const [, aliases] of Object.entries(COUNTRY_ALIASES)) {
    if (aliases.includes(lower)) {
      return aliases;
    }
  }

  // No alias found — return the original value
  return [country];
}

export class JobRepository {
  async findById(id: string): Promise<Job | null> {
    const job = await prisma.job.findUnique({
      where: { id },
      include: { company: true },
    });
    return job as unknown as Job | null;
  }

  async findByExternalId(externalId: string): Promise<Job | null> {
    const job = await prisma.job.findFirst({
      where: { externalId },
      include: { company: true },
    });
    return job as unknown as Job | null;
  }

  async search(filters: SearchFilters): Promise<PaginatedResult<Job>> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const { skip, take } = buildPaginationParams(page, limit);

    const where: Prisma.JobWhereInput = {
      isActive: true,
    };

    if (filters.query) {
      // Split the query into individual words for broader matching
      const terms = filters.query
        .split(/\s+/)
        .map((t) => t.trim())
        .filter(Boolean);

      const searchTerms = terms.length > 1 ? terms : [filters.query];

      // Match any term in title, description, requirements, location, country,
      // company name, or skills (OR across all terms and fields)
      where.OR = searchTerms.flatMap((term) => [
        { title: { contains: term, mode: 'insensitive' as const } },
        { description: { contains: term, mode: 'insensitive' as const } },
        { requirements: { contains: term, mode: 'insensitive' as const } },
        { location: { contains: term, mode: 'insensitive' as const } },
        { country: { contains: term, mode: 'insensitive' as const } },
        { company: { name: { contains: term, mode: 'insensitive' as const } } },
        { skills: { hasSome: [term, term.toLowerCase(), term.toUpperCase(), term.charAt(0).toUpperCase() + term.slice(1).toLowerCase()] } },
      ]);
    }

    if (filters.countries && filters.countries.length > 0) {
      // Expand each country to all known aliases for broader matching
      const expandedCountries = filters.countries.flatMap(expandCountryAliases);
      const uniqueCountries = [...new Set(expandedCountries)];

      // Use OR with case-insensitive contains for each alias
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
        {
          OR: uniqueCountries.map((c) => ({
            country: { contains: c, mode: 'insensitive' as const },
          })),
        },
      ];
    }

    if (filters.cities && filters.cities.length > 0) {
      where.location = { in: filters.cities };
    }

    if (filters.remote !== undefined) {
      where.remote = filters.remote;
    }

    if (filters.workMode && filters.workMode.length > 0) {
      where.workMode = { in: filters.workMode as string[] };
    }

    if (filters.types && filters.types.length > 0) {
      where.type = { in: filters.types as string[] };
    }

    if (filters.salaryMin !== undefined) {
      where.salaryMin = { gte: filters.salaryMin };
    }

    if (filters.salaryMax !== undefined) {
      where.salaryMax = { lte: filters.salaryMax };
    }

    if (filters.visaSponsorship) {
      where.visaSponsorship = filters.visaSponsorship as string;
    }

    if (filters.sources && filters.sources.length > 0) {
      where.source = { in: filters.sources as string[] };
    }

    if (filters.skills && filters.skills.length > 0) {
      where.skills = { hasSome: filters.skills };
    }

    if (filters.experienceLevel && filters.experienceLevel.length > 0) {
      where.experienceLevel = { in: filters.experienceLevel };
    }

    if (filters.postedWithinDays) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - filters.postedWithinDays);
      where.postedAt = { gte: cutoffDate };
    }

    const orderBy: Prisma.JobOrderByWithRelationInput = {
      postedAt: 'desc',
    };

    const [data, total] = await Promise.all([
      prisma.job.findMany({
        where,
        include: { company: true },
        skip,
        take,
        orderBy,
      }),
      prisma.job.count({ where }),
    ]);

    return {
      data: data as unknown as Job[],
      meta: calculatePaginationMeta(total, page, limit),
    };
  }

  async create(data: Partial<Job>): Promise<Job> {
    const job = await prisma.job.create({
      data: {
        title: data.title!,
        companyId: (data as any).companyId,
        description: data.description!,
        requirements: data.requirements || '',
        responsibilities: data.responsibilities,
        location: data.location!,
        country: data.country!,
        remote: data.remote ?? false,
        workMode: data.workMode || 'ONSITE',
        type: data.type || 'FULL_TIME',
        salaryMin: data.salaryMin,
        salaryMax: data.salaryMax,
        salaryCurrency: data.salaryCurrency,
        source: data.source!,
        sourceUrl: data.sourceUrl!,
        applyUrl: (data as any).applyUrl,
        visaSponsorship: data.visaSponsorship || 'UNKNOWN',
        visaNotes: data.visaNotes,
        atsProvider: (data as any).atsProvider,
        skills: data.skills || [],
        category: data.category,
        department: data.department,
        experienceLevel: data.experienceLevel,
        postedAt: data.postedAt || new Date(),
        expiresAt: data.expiresAt,
        externalId: data.externalId,
      },
      include: { company: true },
    });
    return job as unknown as Job;
  }

  async update(id: string, data: Partial<Job>): Promise<Job> {
    const job = await prisma.job.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        requirements: data.requirements,
        responsibilities: data.responsibilities,
        location: data.location,
        country: data.country,
        remote: data.remote,
        workMode: data.workMode,
        type: data.type,
        salaryMin: data.salaryMin,
        salaryMax: data.salaryMax,
        salaryCurrency: data.salaryCurrency,
        source: data.source,
        sourceUrl: data.sourceUrl,
        visaSponsorship: data.visaSponsorship,
        visaNotes: data.visaNotes,
        skills: data.skills,
        category: data.category,
        department: data.department,
        experienceLevel: data.experienceLevel,
        isActive: (data as any).isActive,
      },
      include: { company: true },
    });
    return job as unknown as Job;
  }

  async delete(id: string): Promise<void> {
    await prisma.job.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async hardDelete(id: string): Promise<void> {
    await prisma.job.delete({ where: { id } });
  }

  async findSimilar(jobId: string, limit = 10): Promise<Job[]> {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: { skills: true, category: true },
    });

    if (!job) {
      return [];
    }

    const similar = await prisma.job.findMany({
      where: {
        id: { not: jobId },
        isActive: true,
        OR: [
          { skills: { hasSome: job.skills } },
          { category: job.category },
        ],
      },
      include: { company: true },
      take: limit,
      orderBy: { postedAt: 'desc' },
    });

    return similar as unknown as Job[];
  }

  async countBySource(): Promise<Record<string, number>> {
    const result = await prisma.job.groupBy({
      by: ['source'],
      _count: { id: true },
      where: { isActive: true },
    });

    return result.reduce(
      (acc, curr) => {
        acc[curr.source] = curr._count.id;
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  async getRecentJobs(hours = 24): Promise<Job[]> {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - hours);

    const jobs = await prisma.job.findMany({
      where: {
        isActive: true,
        createdAt: { gte: cutoffDate },
      },
      include: { company: true },
      orderBy: { createdAt: 'desc' },
    });

    return jobs as unknown as Job[];
  }
}

export const jobRepository = new JobRepository();

