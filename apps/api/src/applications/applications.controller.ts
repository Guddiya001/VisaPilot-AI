import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ApplicationsService } from './applications.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ApplicationStatus } from '@visapilot/shared';

@ApiTags('Applications')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'applications', version: '1' })
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all applications' })
  async getAll(
    @CurrentUser('userId') userId: string,
    @Query('status') status?: string,
    @Query('resumeId') resumeId?: string,
    @Query('search') search?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ): Promise<any> {
    return this.applicationsService.getAll(userId, {
      status,
      resumeId,
      search,
      page: Number(page),
      limit: Number(limit),
    });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Save / create application' })
  async create(
    @CurrentUser('userId') userId: string,
    @Body()
    body: {
      jobId?: string;
      notes?: string;
      resumeVersionId?: string;
      coverLetterId?: string;
      status?: ApplicationStatus;
      companyName?: string;
      jobTitle?: string;
      location?: string;
      sourceUrl?: string;
    },
  ): Promise<any> {
    return this.applicationsService.create(userId, body);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get application statistics' })
  async getStats(@CurrentUser('userId') userId: string): Promise<any> {
    return this.applicationsService.getStats(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get application details' })
  async getById(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ): Promise<any> {
    return this.applicationsService.getById(id, userId);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update application details (resume, notes, dates, status)' })
  async update(
    @Param('id') id: string,
    @Body()
    body: {
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
    @CurrentUser('userId') userId: string,
  ): Promise<any> {
    return this.applicationsService.update(id, body, userId);
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update application status' })
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: ApplicationStatus },
    @CurrentUser('userId') userId: string,
  ): Promise<any> {
    return this.applicationsService.updateStatus(id, body.status, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Withdraw / delete application' })
  async delete(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ): Promise<any> {
    return this.applicationsService.delete(id, userId);
  }
}
