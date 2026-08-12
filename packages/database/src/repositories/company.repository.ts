import { getPrismaClient } from '../client';
import { buildPaginationParams, calculatePaginationMeta } from '../utils';
import type { Company, PaginatedResult } from '@visapilot/shared';

const prisma = getPrismaClient();

export class CompanyRepository {
  async findById(id: string): Promise<Company | null> {
    const company = await prisma.company.findUnique({
      where: { id },
    });
    return company as unknown as Company | null;
  }

  async findByName(name: string): Promise<Company | null> {
    const company = await prisma.company.findFirst({
      where: {
        name: { contains: name, mode: 'insensitive' as const },
      },
    });
    return company as unknown as Company | null;
  }

  async findAll(page = 1, limit = 20): Promise<PaginatedResult<Company>> {
    const { skip, take } = buildPaginationParams(page, limit);

    const [data, total] = await Promise.all([
      prisma.company.findMany({
        skip,
        take,
        orderBy: { name: 'asc' },
      }),
      prisma.company.count(),
    ]);

    return {
      data: data as unknown as Company[],
      meta: calculatePaginationMeta(total, page, limit),
    };
  }

  async search(
    query: string,
    page = 1,
    limit = 20,
  ): Promise<PaginatedResult<Company>> {
    const { skip, take } = buildPaginationParams(page, limit);

    const where = {
      OR: [
        { name: { contains: query, mode: 'insensitive' as const } },
        { industry: { contains: query, mode: 'insensitive' as const } },
        { description: { contains: query, mode: 'insensitive' as const } },
      ],
    };

    const [data, total] = await Promise.all([
      prisma.company.findMany({
        where,
        skip,
        take,
        orderBy: { name: 'asc' },
      }),
      prisma.company.count({ where }),
    ]);

    return {
      data: data as unknown as Company[],
      meta: calculatePaginationMeta(total, page, limit),
    };
  }

  async create(data: {
    name: string;
    website?: string;
    description?: string;
    industry?: string;
    size?: string;
    headquarters?: string;
    locations?: string[];
    foundedYear?: number;
    linkedInUrl?: string;
    logoUrl?: string;
  }): Promise<Company> {
    const company = await prisma.company.create({
      data: {
        name: data.name,
        website: data.website,
        description: data.description,
        industry: data.industry,
        size: data.size,
        headquarters: data.headquarters,
        locations: data.locations || [],
        foundedYear: data.foundedYear,
        linkedInUrl: data.linkedInUrl,
        logoUrl: data.logoUrl,
      },
    });
    return company as unknown as Company;
  }

  async update(
    id: string,
    data: Partial<Company>,
  ): Promise<Company> {
    const company = await prisma.company.update({
      where: { id },
      data: {
        name: data.name,
        website: data.website,
        description: data.description,
        industry: data.industry,
        size: data.size,
        headquarters: data.headquarters,
        locations: data.locations,
        foundedYear: data.foundedYear,
        linkedInUrl: data.linkedInUrl,
        logoUrl: data.logoUrl,
        glassdoorRating: (data as any).glassdoorRating,
        visaSponsorshipPolicy: (data as any).visaSponsorshipPolicy,
      },
    });
    return company as unknown as Company;
  }

  async delete(id: string): Promise<void> {
    await prisma.company.delete({ where: { id } });
  }

  async getTopCompanies(limit = 10): Promise<Company[]> {
    const companies = await prisma.company.findMany({
      take: limit,
      orderBy: {
        jobs: {
          _count: 'desc',
        },
      },
    });
    return companies as unknown as Company[];
  }

  async findByVisaSponsorship(): Promise<Company[]> {
    const companies = await prisma.company.findMany({
      where: {
        visaSponsorshipPolicy: { not: null },
      },
      orderBy: { name: 'asc' },
    });
    return companies as unknown as Company[];
  }
}

export const companyRepository = new CompanyRepository();

