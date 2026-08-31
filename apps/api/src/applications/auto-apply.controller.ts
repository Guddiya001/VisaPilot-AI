import {
  Controller,
  Post,
  Get,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AutoApplyService } from './auto-apply.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Auto Apply')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'auto-apply', version: '1' })
export class AutoApplyController {
  constructor(
    private readonly autoApplyService: AutoApplyService,
  ) {}

  @Post(':packageId/queue')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Queue an application package for auto-apply' })
  async queueAutoApply(
    @Param('packageId') packageId: string,
    @CurrentUser('userId') userId: string,
  ) {
    const job = await this.autoApplyService.queueAutoApply(packageId, userId);
    return {
      success: true,
      data: job,
    };
  }

  @Get(':jobId/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get status of an auto-apply job' })
  async getStatus(
    @Param('jobId') jobId: string,
    @CurrentUser('userId') userId: string,
  ) {
    const job = await this.autoApplyService.getStatus(jobId);
    if (!job) {
      throw new NotFoundException(`AutoApplyJob ${jobId} not found`);
    }
    // Verify user owns the job
    if (job.userId !== userId) {
        throw new NotFoundException(`AutoApplyJob ${jobId} not found`);
    }

    return {
      success: true,
      data: job,
    };
  }

  @Post(':jobId/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve an auto-apply job that requires input' })
  async approve(
    @Param('jobId') jobId: string,
    @CurrentUser('userId') userId: string,
  ) {
    const job = await this.autoApplyService.approve(jobId, userId);
    return {
      success: true,
      data: job,
    };
  }
}
