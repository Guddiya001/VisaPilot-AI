import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { getPrismaClient } from '@visapilot/database';
import { ApplicationStatus } from '@visapilot/shared';

@Injectable()
export class ApplicationsService {
  private readonly logger = new Logger(ApplicationsService.name);
  private readonly db = getPrismaClient();

  // ─── Include shape reused across queries ───────────────────────────────────
  private readonly jobInclude = {
    job: {
      include: {
        company: true,
      },
    },
  } as const;

  // ─── GET ALL ───────────────────────────────────────────────────────────────
  async getAll(
    userId: string,
    params: { status?: string; page: number; limit: number },
  ) {
    const where = {
      userId,
      ...(params.status ? { status: params.status } : {}),
    };

    const [data, total] = await Promise.all([
      this.db.application.findMany({
        where,
        include: this.jobInclude,
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

  // ─── CREATE ────────────────────────────────────────────────────────────────
  async create(userId: string, jobId: string, notes?: string) {
    // Return existing application if already saved (upsert-like behaviour)
    const existing = await this.db.application.findUnique({
      where: { userId_jobId: { userId, jobId } },
      include: this.jobInclude,
    });

    if (existing) {
      this.logger.log(`Application already exists for user=${userId} job=${jobId}, returning existing`);
      return { success: true, data: existing };
    }

    const application = await this.db.application.create({
      data: {
        userId,
        jobId,
        status: ApplicationStatus.SAVED,
        notes,
        source: 'MANUAL',
        sourceUrl: '',
      },
      include: this.jobInclude,
    });

    this.logger.log(`Application created: ${application.id}`);
    return { success: true, data: application };
  }

  // ─── UPDATE STATUS ─────────────────────────────────────────────────────────
  async updateStatus(id: string, status: ApplicationStatus, userId: string) {
    const app = await this.db.application.findFirst({ where: { id, userId } });
    if (!app) throw new NotFoundException(`Application ${id} not found`);

    // Automatically set relevant date fields on status transitions
    const dateFields: Partial<{
      appliedAt: Date;
      interviewDate: Date;
      offerDate: Date;
      rejectionDate: Date;
    }> = {};

    if (
      status === ApplicationStatus.APPLIED &&
      !app.appliedAt
    ) {
      dateFields.appliedAt = new Date();
    }
    if (
      status === ApplicationStatus.INTERVIEWING &&
      !app.interviewDate
    ) {
      dateFields.interviewDate = new Date();
    }
    if (
      status === ApplicationStatus.OFFERED &&
      !app.offerDate
    ) {
      dateFields.offerDate = new Date();
    }
    if (
      (status === ApplicationStatus.REJECTED || status === ApplicationStatus.WITHDRAWN) &&
      !app.rejectionDate
    ) {
      dateFields.rejectionDate = new Date();
    }

    const updated = await this.db.application.update({
      where: { id },
      data: { status, ...dateFields },
      include: this.jobInclude,
    });

    this.logger.log(`Application ${id} status updated to ${status}`);
    return { success: true, data: updated };
  }

  // ─── GET BY ID ─────────────────────────────────────────────────────────────
  async getById(id: string, userId: string) {
    const app = await this.db.application.findFirst({
      where: { id, userId },
      include: this.jobInclude,
    });
    if (!app) throw new NotFoundException(`Application ${id} not found`);

    return { success: true, data: app };
  }

  // ─── STATS ─────────────────────────────────────────────────────────────────
  async getStats(userId: string) {
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
  async delete(id: string, userId: string) {
    const app = await this.db.application.findFirst({ where: { id, userId } });
    if (!app) throw new NotFoundException(`Application ${id} not found`);

    // Mark as WITHDRAWN rather than hard-deleting so history is preserved
    const updated = await this.db.application.update({
      where: { id },
      data: {
        status: ApplicationStatus.WITHDRAWN,
        rejectionDate: new Date(),
      },
    });

    this.logger.log(`Application ${id} withdrawn by user ${userId}`);
    return { success: true, data: updated };
  }
}
