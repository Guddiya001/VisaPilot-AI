import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { getPrismaClient } from '@visapilot/database';
import { ApplicationStatus } from '@visapilot/shared';

@Injectable()
export class ApplicationsService {
  private readonly logger = new Logger(ApplicationsService.name);
  private readonly db = getPrismaClient();

  // ─── Include shape reused across queries ───────────────────────────────────
  private readonly appInclude = {
    job: {
      include: {
        company: true,
      },
    },
    resumeVersion: {
      include: {
        resume: true,
      },
    },
    coverLetter: true,
  } as const;

  // ─── GET ALL ───────────────────────────────────────────────────────────────
  async getAll(
    userId: string,
    params: {
      status?: string;
      resumeId?: string;
      search?: string;
      page: number;
      limit: number;
    },
  ): Promise<any> {
    const where: Record<string, any> = {
      userId,
    };

    if (params.status) {
      where.status = params.status;
    }

    if (params.resumeId) {
      where.resumeVersion = {
        resumeId: params.resumeId,
      };
    }

    if (params.search) {
      where.OR = [
        { job: { title: { contains: params.search, mode: 'insensitive' } } },
        { job: { company: { name: { contains: params.search, mode: 'insensitive' } } } },
        { notes: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.db.application.findMany({
        where,
        include: this.appInclude,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      this.db.application.count({ where }),
    ]);

    return {
      success: true,
      data,
      meta: {
        total,
        page: params.page,
        limit: params.limit,
        totalPages: Math.ceil(total / params.limit),
      },
    };
  }

  // ─── CREATE / MANUAL ADD ────────────────────────────────────────────────────
  async create(
    userId: string,
    payload: {
      jobId?: string;
      notes?: string;
      resumeVersionId?: string;
      coverLetterId?: string;
      status?: ApplicationStatus;
      companyName?: string;
      jobTitle?: string;
      location?: string;
      sourceUrl?: string;
    } | string,
    optionalNotes?: string,
  ): Promise<any> {
    // Backwards compatibility with create(userId, jobId, notes)
    const data = typeof payload === 'string'
      ? { jobId: payload, notes: optionalNotes }
      : payload;

    let targetJobId = data.jobId;

    // If no jobId provided, create or find company and create a manual job
    if (!targetJobId) {
      if (!data.companyName || !data.jobTitle) {
        throw new NotFoundException('Either jobId or both companyName and jobTitle must be provided');
      }

      // Upsert company
      const company = await this.db.company.upsert({
        where: { name: data.companyName.trim() },
        create: {
          name: data.companyName.trim(),
          industry: 'Technology',
          locations: data.location ? [data.location] : ['Remote'],
        },
        update: {},
      });

      // Create manual job
      const manualJob = await this.db.job.create({
        data: {
          title: data.jobTitle.trim(),
          companyId: company.id,
          location: data.location || 'Remote',
          country: 'Global',
          description: `Custom tracked application for ${data.jobTitle} at ${data.companyName}.`,
          requirements: 'Standard role requirements',
          source: 'MANUAL',
          sourceUrl: data.sourceUrl || '',
          workMode: 'REMOTE',
          type: 'FULL_TIME',
          postedAt: new Date(),
        },
      });

      targetJobId = manualJob.id;
    }

    // Return existing application if already saved (upsert-like behaviour)
    const existing = await this.db.application.findUnique({
      where: { userId_jobId: { userId, jobId: targetJobId } },
      include: this.appInclude,
    });

    if (existing) {
      this.logger.log(`Application already exists for user=${userId} job=${targetJobId}`);
      if (data.resumeVersionId || data.notes || data.status) {
        return this.update(existing.id, {
          resumeVersionId: data.resumeVersionId,
          notes: data.notes,
          status: data.status,
        }, userId);
      }
      return { success: true, data: existing };
    }

    const application = await this.db.application.create({
      data: {
        userId,
        jobId: targetJobId,
        status: data.status || ApplicationStatus.SAVED,
        notes: data.notes,
        resumeVersionId: data.resumeVersionId,
        coverLetterId: data.coverLetterId,
        source: 'MANUAL',
        sourceUrl: data.sourceUrl || '',
      },
      include: this.appInclude,
    });

    this.logger.log(`Application created: ${application.id}`);
    return { success: true, data: application };
  }

  // ─── UPDATE (FULL) ─────────────────────────────────────────────────────────
  async update(
    id: string,
    data: {
      status?: ApplicationStatus;
      resumeVersionId?: string | null;
      coverLetterId?: string | null;
      notes?: string;
      appliedAt?: string | Date | null;
      interviewDate?: string | Date | null;
      offerDate?: string | Date | null;
      rejectionDate?: string | Date | null;
      rejectionReason?: string | null;
    },
    userId: string,
  ): Promise<any> {
    const app = await this.db.application.findFirst({ where: { id, userId } });
    if (!app) throw new NotFoundException(`Application ${id} not found`);

    const updateData: Record<string, any> = {};

    if (data.status !== undefined) updateData.status = data.status;
    if (data.resumeVersionId !== undefined) updateData.resumeVersionId = data.resumeVersionId;
    if (data.coverLetterId !== undefined) updateData.coverLetterId = data.coverLetterId;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.rejectionReason !== undefined) updateData.rejectionReason = data.rejectionReason;

    if (data.appliedAt !== undefined) {
      updateData.appliedAt = data.appliedAt ? new Date(data.appliedAt) : null;
    } else if (data.status === ApplicationStatus.APPLIED && !app.appliedAt) {
      updateData.appliedAt = new Date();
    }

    if (data.interviewDate !== undefined) {
      updateData.interviewDate = data.interviewDate ? new Date(data.interviewDate) : null;
    } else if (data.status === ApplicationStatus.INTERVIEWING && !app.interviewDate) {
      updateData.interviewDate = new Date();
    }

    if (data.offerDate !== undefined) {
      updateData.offerDate = data.offerDate ? new Date(data.offerDate) : null;
    } else if (data.status === ApplicationStatus.OFFERED && !app.offerDate) {
      updateData.offerDate = new Date();
    }

    if (data.rejectionDate !== undefined) {
      updateData.rejectionDate = data.rejectionDate ? new Date(data.rejectionDate) : null;
    } else if (
      (data.status === ApplicationStatus.REJECTED || data.status === ApplicationStatus.WITHDRAWN) &&
      !app.rejectionDate
    ) {
      updateData.rejectionDate = new Date();
    }

    const updated = await this.db.application.update({
      where: { id },
      data: updateData,
      include: this.appInclude,
    });

    this.logger.log(`Application ${id} updated for user ${userId}`);
    return { success: true, data: updated };
  }

  // ─── UPDATE STATUS ─────────────────────────────────────────────────────────
  async updateStatus(id: string, status: ApplicationStatus, userId: string): Promise<any> {
    return this.update(id, { status }, userId);
  }

  // ─── GET BY ID ─────────────────────────────────────────────────────────────
  async getById(id: string, userId: string): Promise<any> {
    const app = await this.db.application.findFirst({
      where: { id, userId },
      include: this.appInclude,
    });
    if (!app) throw new NotFoundException(`Application ${id} not found`);

    return { success: true, data: app };
  }

  // ─── STATS ─────────────────────────────────────────────────────────────────
  async getStats(userId: string): Promise<any> {
    const grouped = await this.db.application.groupBy({
      by: ['status'],
      where: { userId },
      _count: { id: true },
    });

    const byStatus: Record<string, number> = {};
    let total = 0;

    for (const row of grouped) {
      byStatus[row.status] = row._count.id;
      total += row._count.id;
    }

    const interviewing =
      (byStatus[ApplicationStatus.INTERVIEWING] ?? 0) +
      (byStatus[ApplicationStatus.OFFERED] ?? 0);
    const offered =
      (byStatus[ApplicationStatus.OFFERED] ?? 0) +
      (byStatus[ApplicationStatus.ACCEPTED] ?? 0);

    return {
      success: true,
      data: {
        total,
        byStatus,
        interviewRate: total > 0 ? (interviewing / total) * 100 : 0,
        offerRate: total > 0 ? (offered / total) * 100 : 0,
      },
    };
  }

  // ─── DELETE / WITHDRAW ─────────────────────────────────────────────────────
  async delete(id: string, userId: string): Promise<any> {
    const app = await this.db.application.findFirst({ where: { id, userId } });
    if (!app) throw new NotFoundException(`Application ${id} not found`);

    // Mark as WITHDRAWN rather than hard-deleting so history is preserved
    const updated = await this.db.application.update({
      where: { id },
      data: {
        status: ApplicationStatus.WITHDRAWN,
        rejectionDate: new Date(),
      },
      include: this.appInclude,
    });

    this.logger.log(`Application ${id} withdrawn by user ${userId}`);
    return { success: true, data: updated };
  }
}
