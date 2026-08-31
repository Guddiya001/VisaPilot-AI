import { Injectable, Logger, Inject, NotFoundException } from '@nestjs/common';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { getPrismaClient } from '@visapilot/database';
import type { AutoApplyJob, ApplicationPackage } from '@visapilot/shared';
import { AutoApplyStatus, QUEUE_AUTO_APPLY, ApplicationPackageStatus } from '@visapilot/shared';
import { ApplicationPackageService } from './application-package.service';

/**
 * Auto Apply Service
 * Manages the lifecycle of Auto Apply jobs, persisting them to the database,
 * and enqueueing them to the background worker.
 */
@Injectable()
export class AutoApplyService {
  private readonly logger = new Logger(AutoApplyService.name);

  constructor(
    @InjectQueue(QUEUE_AUTO_APPLY) private readonly autoApplyQueue: Queue,
    private readonly packageService: ApplicationPackageService,
  ) {}

  private readonly db = getPrismaClient();

  /**
   * Create an Auto Apply job from an approved Application Package and queue it.
   */
  async queueAutoApply(applicationPackageId: string, userId: string): Promise<AutoApplyJob> {
    this.logger.log(`[QueueAutoApply] pkgId=${applicationPackageId}, userId=${userId}`);

    // Verify package
    const pkg = await this.packageService.getPackage(applicationPackageId);
    if (!pkg) {
      throw new NotFoundException(`Application package ${applicationPackageId} not found`);
    }
    if (pkg.userId !== userId) {
      throw new NotFoundException(`Application package ${applicationPackageId} not found for user`);
    }

    if (pkg.status !== ApplicationPackageStatus.APPROVED && pkg.status !== ApplicationPackageStatus.SUBMITTED) {
        // Automatically approve it if it's READY.
        if (pkg.status === ApplicationPackageStatus.READY) {
            await this.packageService.approvePackage(applicationPackageId, userId);
        } else {
            throw new Error(`Application package must be READY or APPROVED to queue (current: ${pkg.status})`);
        }
    }

    // Check if there's already an active AutoApplyJob for this package
    const existing = await this.db.autoApplyJob.findFirst({
        where: {
            applicationPackageId,
            status: { in: [AutoApplyStatus.QUEUED, AutoApplyStatus.PACKAGE_GENERATING, AutoApplyStatus.SUBMITTING, AutoApplyStatus.AWAITING_APPROVAL] }
        }
    });

    if (existing) {
        return existing as unknown as AutoApplyJob;
    }

    // Create the job record in the database
    const jobRecord = await this.db.autoApplyJob.create({
      data: {
        userId,
        applicationPackageId,
        status: AutoApplyStatus.QUEUED,
        answers: {},
        logs: [],
      },
    });

    // Enqueue to BullMQ worker
    await this.autoApplyQueue.add('auto-apply', {
      autoApplyJobId: jobRecord.id,
      applicationPackageId,
      userId,
      jobId: pkg.jobId,
    });

    this.logger.log(`[QueueAutoApply] Queued AutoApplyJob ${jobRecord.id}`);
    return jobRecord as unknown as AutoApplyJob;
  }

  /**
   * Get status of an Auto Apply job
   */
  async getStatus(autoApplyJobId: string): Promise<AutoApplyJob | null> {
    const job = await this.db.autoApplyJob.findUnique({
      where: { id: autoApplyJobId },
      include: { applicationPackage: true }
    });
    return (job as unknown as AutoApplyJob) || null;
  }

  /**
   * Approve an Auto Apply job that requires input
   */
  async approve(autoApplyJobId: string, userId: string): Promise<AutoApplyJob> {
    const job = await this.db.autoApplyJob.findUnique({
      where: { id: autoApplyJobId }
    });
    
    if (!job) {
      throw new NotFoundException(`AutoApplyJob ${autoApplyJobId} not found`);
    }
    if (job.userId !== userId) {
      throw new NotFoundException(`AutoApplyJob ${autoApplyJobId} not found for user`);
    }
    if (job.status !== AutoApplyStatus.AWAITING_APPROVAL) {
      throw new Error(`AutoApplyJob must be in AWAITING_APPROVAL state (current: ${job.status})`);
    }

    const updated = await this.db.autoApplyJob.update({
      where: { id: autoApplyJobId },
      data: { status: AutoApplyStatus.QUEUED },
    });

    // Re-queue it
    await this.autoApplyQueue.add('auto-apply', {
        autoApplyJobId: updated.id,
        applicationPackageId: updated.applicationPackageId,
        userId,
        // Since we don't fetch jobId in the first query, just pass what we have; worker can fetch.
      });

    return updated as unknown as AutoApplyJob;
  }
}
