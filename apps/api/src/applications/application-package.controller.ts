import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ApplicationPackageService } from './application-package.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Application Packages')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'applications', version: '1' })
export class ApplicationPackageController {
  constructor(
    private readonly packageService: ApplicationPackageService,
  ) {}

  @Post(':jobId/package')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate application package for a job' })
  async generatePackage(
    @Param('jobId') jobId: string,
    @Body()
    body: {
      jobDescription: string;
      jobTitle?: string;
      companyName?: string;
      strategy?: 'A' | 'B' | 'C' | 'auto';
      maxIterations?: number;
      targetScore?: number;
    },
    @CurrentUser('userId') userId: string,
  ) {
    const pkg = await this.packageService.generatePackage(
      userId,
      jobId,
      body.jobDescription,
      {
        jobTitle: body.jobTitle,
        companyName: body.companyName,
        strategy: body.strategy,
        maxIterations: body.maxIterations,
        targetScore: body.targetScore,
      },
    );

    return {
      success: true,
      data: pkg,
    };
  }

  @Get(':jobId/package')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get application package for a job' })
  async getPackage(
    @Param('jobId') jobId: string,
    @CurrentUser('userId') userId: string,
  ) {
    const pkg = await this.packageService.getPackageByJob(userId, jobId);
    if (!pkg) {
      throw new NotFoundException(`No package found for job ${jobId}`);
    }

    return {
      success: true,
      data: pkg,
    };
  }

  @Get('packages/all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all application packages for current user' })
  async getUserPackages(
    @CurrentUser('userId') userId: string,
  ) {
    const packages = await this.packageService.getUserPackages(userId);
    return {
      success: true,
      data: packages,
      total: packages.length,
    };
  }

  @Post(':jobId/package/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve application package for submission' })
  async approvePackage(
    @Param('jobId') jobId: string,
    @CurrentUser('userId') userId: string,
  ) {
    const pkg = await this.packageService.getPackageByJob(userId, jobId);
    if (!pkg) {
      throw new NotFoundException(`No package found for job ${jobId}`);
    }

    const approved = await this.packageService.approvePackage(pkg.id, userId);
    return {
      success: true,
      data: approved,
    };
  }

  @Post(':jobId/package/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit approved application package' })
  async submitPackage(
    @Param('jobId') jobId: string,
    @CurrentUser('userId') userId: string,
  ) {
    const pkg = await this.packageService.getPackageByJob(userId, jobId);
    if (!pkg) {
      throw new NotFoundException(`No package found for job ${jobId}`);
    }

    const submitted = await this.packageService.submitPackage(pkg.id);
    return {
      success: true,
      data: submitted,
    };
  }
}
