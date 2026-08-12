import { getPrismaClient } from '../client';
import { buildPaginationParams, calculatePaginationMeta } from '../utils';
import type { Application, PaginatedResult } from '@visapilot/shared';

const prisma = getPrismaClient();

export class ApplicationRepository {
  async findById(id: string): Promise<Application | null> {
    const app = await prisma.application.findUnique({
      where: { id },
      include: {
        job: { include: { company: true } },
        resumeVersion: true,
        coverLetter: true,
      },
    });
    return app as unknown as Application | null;
  }

  async findByUserAndJob(
    userId: string,
    jobId: string,
  ): Promise<Application | null> {
    const app = await prisma.application.findFirst({
      where: { userId, jobId },
      include: {
        job: { include: { company: true } },
        resumeVersion: true,
        coverLetter: true,
      },
    });
    return app as unknown as Application | null;
  }

  async findByUser(
    userId: string,
    page = 1,
    limit = 20,
    status?: string,
  ): Promise<PaginatedResult<Application>> {
    const { skip, take } = buildPaginationParams(page, limit);

    const where: any = { userId };
    if (status) {
      where.status = status;
    }

    const [data, total] = await Promise.all([
      prisma.application.findMany({
        where,
        include: {
          job: { include: { company: true } },
          resumeVersion: true,
          coverLetter: true,
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.application.count({ where }),
    ]);

    return {
      data: data as unknown as Application[],
      meta: calculatePaginationMeta(total, page, limit),
    };
  }

  async create(data: {
    userId: string;
    jobId: string;
    source: string;
    sourceUrl: string;
    status?: string;
    notes?: string;
  }): Promise<Application> {
    const app = await prisma.application.create({
      data: {
        userId: data.userId,
        jobId: data.jobId,
        source: data.source,
        sourceUrl: data.sourceUrl,
        status: data.status || 'SAVED',
        notes: data.notes,
      },
      include: {
        job: { include: { company: true } },
      },
    });
    return app as unknown as Application;
  }

  async updateStatus(
    id: string,
    status: string,
    additional?: Partial<Application>,
  ): Promise<Application> {
    const updateData: any = { status };

    if (status === 'APPLIED' && !additional?.appliedAt) {
      updateData.appliedAt = new Date();
    }
    if (status === 'REJECTED') {
      updateData.rejectionDate = new Date();
      if (additional?.rejectionReason) {
        updateData.rejectionReason = additional.rejectionReason;
      }
    }
    if (status === 'OFFERED' || status === 'ACCEPTED') {
      updateData.offerDate = new Date();
    }
    if (additional?.interviewDate) {
      updateData.interviewDate = additional.interviewDate;
    }
    if (additional?.notes) {
      updateData.notes = additional.notes;
    }

    const app = await prisma.application.update({
      where: { id },
      data: updateData,
      include: {
        job: { include: { company: true } },
        resumeVersion: true,
        coverLetter: true,
      },
    });
    return app as unknown as Application;
  }

  async update(
    id: string,
    data: Partial<Application>,
  ): Promise<Application> {
    const app = await prisma.application.update({
      where: { id },
      data: {
        status: data.status,
        notes: data.notes,
        resumeVersionId: (data as any).resumeVersionId,
        coverLetterId: (data as any).coverLetterId,
        interviewDate: data.interviewDate,
      },
      include: {
        job: { include: { company: true } },
        resumeVersion: true,
        coverLetter: true,
      },
    });
    return app as unknown as Application;
  }

  async delete(id: string): Promise<void> {
    await prisma.application.delete({ where: { id } });
  }

  async getStats(userId: string): Promise<{
    total: number;
    saved: number;
    applied: number;
    interviewing: number;
    offered: number;
    rejected: number;
  }> {
    const apps = await prisma.application.findMany({
      where: { userId },
      select: { status: true },
    });

    const stats = {
      total: apps.length,
      saved: 0,
      applied: 0,
      interviewing: 0,
      offered: 0,
      rejected: 0,
    };

    for (const app of apps) {
      switch (app.status) {
        case 'SAVED':
          stats.saved++;
          break;
        case 'APPLIED':
        case 'SCREENING':
          stats.applied++;
          break;
        case 'INTERVIEWING':
          stats.interviewing++;
          break;
        case 'OFFERED':
        case 'ACCEPTED':
          stats.offered++;
          break;
        case 'REJECTED':
          stats.rejected++;
          break;
      }
    }

    return stats;
  }
}

export const applicationRepository = new ApplicationRepository();

