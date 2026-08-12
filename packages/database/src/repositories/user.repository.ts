import { Prisma } from '@prisma/client';
import { getPrismaClient } from '../client';
import { buildPaginationParams, calculatePaginationMeta } from '../utils';
import type { UserProfile, PaginatedResult } from '@visapilot/shared';

const prisma = getPrismaClient();

export class UserRepository {
  async findById(id: string): Promise<UserProfile | null> {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        experience: true,
        education: true,
        languages: true,
      },
    });
    return user as unknown as UserProfile | null;
  }

  async findByEmail(email: string): Promise<UserProfile | null> {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        experience: true,
        education: true,
        languages: true,
      },
    });
    return user as unknown as UserProfile | null;
  }

  async findAll(page = 1, limit = 20): Promise<PaginatedResult<UserProfile>> {
    const { skip, take } = buildPaginationParams(page, limit);

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          experience: true,
          education: true,
          languages: true,
        },
      }),
      prisma.user.count(),
    ]);

    return {
      data: data as unknown as UserProfile[],
      meta: calculatePaginationMeta(total, page, limit),
    };
  }

  async create(data: {
    email: string;
    passwordHash: string;
    name: string;
    role?: string;
  }): Promise<UserProfile> {
    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        name: data.name,
        role: data.role || 'USER',
        skills: [],
        preferredCountries: [],
        certifications: [],
      },
      include: {
        experience: true,
        education: true,
        languages: true,
      },
    });
    return user as unknown as UserProfile;
  }

  async update(
    id: string,
    data: Partial<UserProfile>,
  ): Promise<UserProfile> {
    const updateData: Prisma.UserUpdateInput = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.headline !== undefined) updateData.headline = data.headline;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.nationality !== undefined) updateData.nationality = data.nationality;
    if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;
    if (data.skills !== undefined) updateData.skills = data.skills;
    if (data.preferredCountries !== undefined) updateData.preferredCountries = data.preferredCountries;
    const extendedData = data as any;
    if (extendedData.summary !== undefined) updateData.summary = extendedData.summary;
    if (extendedData.certifications !== undefined) updateData.certifications = extendedData.certifications;

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        experience: true,
        education: true,
        languages: true,
      },
    });
    return user as unknown as UserProfile;
  }

  async updateRefreshToken(
    id: string,
    refreshToken: string | null,
  ): Promise<void> {
    await prisma.user.update({
      where: { id },
      data: { refreshToken },
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.user.delete({ where: { id } });
  }

  async countByRole(): Promise<Record<string, number>> {
    const result = await prisma.user.groupBy({
      by: ['role'],
      _count: { id: true },
    });

    return result.reduce(
      (acc, curr) => {
        acc[curr.role] = curr._count.id;
        return acc;
      },
      {} as Record<string, number>,
    );
  }
}

export const userRepository = new UserRepository();

