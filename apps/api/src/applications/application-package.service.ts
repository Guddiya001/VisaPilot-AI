import { Injectable, Logger, Inject, NotFoundException } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import { getPrismaClient } from '@visapilot/database';
import type {
  ApplicationPackage,
  ATSMatchScore,
  ATSOptimizationResult,
  SkillMatchReport,
} from '@visapilot/shared';
import { ApplicationPackageStatus } from '@visapilot/shared';

/**
 * Application Package Service
 * Orchestrates the generation and management of application packages
 * (resume + cover letter + ATS score + skill match report).
 */
@Injectable()
export class ApplicationPackageService {
  private readonly logger = new Logger(ApplicationPackageService.name);

  constructor(
    private readonly aiService: AiService,
  ) {}

  private readonly db = getPrismaClient();

  /**
   * Generate a full application package for a job.
   */
  async generatePackage(
    userId: string,
    jobId: string,
    jobDescription: string,
    options?: {
      jobTitle?: string;
      companyName?: string;
      strategy?: 'A' | 'B' | 'C' | 'auto';
      maxIterations?: number;
      targetScore?: number;
    },
  ): Promise<ApplicationPackage> {
    this.logger.log(`[GeneratePackage] userId=${userId}, jobId=${jobId}`);

    // Check for existing package
    const existing = await this.getPackageByJob(userId, jobId);
    if (existing && existing.status === ApplicationPackageStatus.READY) {
      this.logger.log('[GeneratePackage] Returning existing READY package');
      return existing;
    }

    // Create a placeholder
    const pkg = await this.db.applicationPackage.create({
      data: {
        userId,
        jobId,
        status: ApplicationPackageStatus.GENERATING,
      },
    });

    try {
      // Call the AI service to generate the full package
      const result = await this.aiService.generateApplicationPackage({
        jobDescription,
        jobTitle: options?.jobTitle,
        companyName: options?.companyName,
        strategy: options?.strategy,
        maxIterations: options?.maxIterations,
        targetScore: options?.targetScore,
      });

      if (result.success && result.data) {
        const data = result.data as Record<string, unknown>;

        // Update the package with results
        const updated = await this.db.applicationPackage.update({
          where: { id: pkg.id },
          data: {
            tailoredResume: (data.resumeData as any) || {},
            coverLetter: data.coverLetter || '',
            atsMatchScore: (data.atsMatchScore as any) || {},
            skillMatchReport: (data.skillMatchReport as any) || {},
            iterationLog: (data.optimizationResult as any) || {},
            status: ApplicationPackageStatus.READY,
          },
        });

        this.logger.log(
          `[GeneratePackage] Package ready: id=${updated.id}`,
        );

        return updated as unknown as ApplicationPackage;
      }

      throw new Error('Application package generation failed');
    } catch (error) {
      await this.db.applicationPackage.update({
        where: { id: pkg.id },
        data: {
          status: ApplicationPackageStatus.FAILED,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      this.logger.error(
        `[GeneratePackage] Failed: ${error instanceof Error ? error.message : 'Unknown'}`,
      );
      throw error;
    }
  }

  /**
   * Get a package by ID.
   */
  async getPackage(packageId: string): Promise<ApplicationPackage | null> {
    const pkg = await this.db.applicationPackage.findUnique({
      where: { id: packageId },
    });
    return (pkg as unknown as ApplicationPackage) || null;
  }

  /**
   * Get a package by userId + jobId.
   */
  async getPackageByJob(userId: string, jobId: string): Promise<ApplicationPackage | null> {
    const pkg = await this.db.applicationPackage.findFirst({
      where: { userId, jobId },
      orderBy: { createdAt: 'desc' },
    });
    return (pkg as unknown as ApplicationPackage) || null;
  }

  /**
   * Get all packages for a user.
   */
  async getUserPackages(userId: string): Promise<ApplicationPackage[]> {
    const packages = await this.db.applicationPackage.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return packages as unknown as ApplicationPackage[];
  }

  /**
   * Approve a package for submission.
   */
  async approvePackage(packageId: string, userId: string): Promise<ApplicationPackage> {
    const pkg = await this.getPackage(packageId);
    if (!pkg) {
      throw new NotFoundException(`Package ${packageId} not found`);
    }
    if (pkg.userId !== userId) {
      throw new NotFoundException(`Package ${packageId} not found for user`);
    }
    if (pkg.status !== ApplicationPackageStatus.READY) {
      throw new Error(`Package ${packageId} is not in READY state (current: ${pkg.status})`);
    }

    const updated = await this.db.applicationPackage.update({
      where: { id: packageId },
      data: { status: ApplicationPackageStatus.APPROVED },
    });

    this.logger.log(`[ApprovePackage] Package ${packageId} approved by ${userId}`);
    return updated as unknown as ApplicationPackage;
  }

  /**
   * Mark a package as submitted.
   */
  async submitPackage(packageId: string): Promise<ApplicationPackage> {
    const pkg = await this.getPackage(packageId);
    if (!pkg) {
      throw new NotFoundException(`Package ${packageId} not found`);
    }
    if (pkg.status !== ApplicationPackageStatus.APPROVED) {
      throw new Error(`Package ${packageId} must be APPROVED before submission (current: ${pkg.status})`);
    }

    const updated = await this.db.applicationPackage.update({
      where: { id: packageId },
      data: { status: ApplicationPackageStatus.SUBMITTED },
    });

    this.logger.log(`[SubmitPackage] Package ${packageId} submitted`);
    return updated as unknown as ApplicationPackage;
  }
}
