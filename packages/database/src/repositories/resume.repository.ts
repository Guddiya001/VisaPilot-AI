import { getPrismaClient } from '../client';
import type { Resume } from '@visapilot/shared';

const prisma = getPrismaClient();

export class ResumeRepository {
  async findById(id: string): Promise<Resume | null> {
    const resume = await prisma.resume.findUnique({
      where: { id },
      include: {
        versions: {
          orderBy: { version: 'desc' },
        },
      },
    });
    return resume as unknown as Resume | null;
  }

  async findByUser(userId: string): Promise<Resume[]> {
    const resumes = await prisma.resume.findMany({
      where: { userId },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
    return resumes as unknown as Resume[];
  }

  async findDefaultByUser(userId: string): Promise<Resume | null> {
    const resume = await prisma.resume.findFirst({
      where: { userId, isDefault: true },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });
    return resume as unknown as Resume | null;
  }

  async create(data: {
    userId: string;
    title: string;
    summary?: string;
    skills?: string[];
    certifications?: string[];
  }): Promise<Resume> {
    const resume = await prisma.resume.create({
      data: {
        userId: data.userId,
        title: data.title,
        summary: data.summary,
        skills: data.skills || [],
        certifications: data.certifications || [],
      },
      include: {
        versions: true,
      },
    });

    // Create initial version
    await prisma.resumeVersion.create({
      data: {
        resumeId: resume.id,
        version: 1,
        content: '',
        changes: 'Initial version',
      },
    });

    return resume as unknown as Resume;
  }

  async update(
    id: string,
    data: Partial<Resume>,
  ): Promise<Resume> {
    const resume = await prisma.resume.update({
      where: { id },
      data: {
        title: data.title,
        summary: data.summary,
        skills: data.skills,
        certifications: (data as any).certifications,
        atsScore: (data as any).atsScore,
        status: (data as any).status,
        isDefault: (data as any).isDefault,
      },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });
    return resume as unknown as Resume;
  }

  async createVersion(data: {
    resumeId: string;
    content: string;
    parsedData?: Record<string, unknown>;
    fileUrl?: string;
    storageKey?: string;
    mimeType?: string;
    fileSize?: number;
    changes?: string;
  }): Promise<void> {
    const lastVersion = await prisma.resumeVersion.findFirst({
      where: { resumeId: data.resumeId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });

    await prisma.resumeVersion.create({
      data: {
        resumeId: data.resumeId,
        version: (lastVersion?.version ?? 0) + 1,
        content: data.content,
        parsedData: data.parsedData as any,
        fileUrl: data.fileUrl,
        storageKey: data.storageKey,
        mimeType: data.mimeType,
        fileSize: data.fileSize,
        changes: data.changes,
      },
    });
  }

  async setDefault(id: string, userId: string): Promise<void> {
    await prisma.resume.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });

    await prisma.resume.update({
      where: { id },
      data: { isDefault: true },
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.resume.delete({ where: { id } });
  }
}

export const resumeRepository = new ResumeRepository();

