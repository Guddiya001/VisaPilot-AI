import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ApplicationsService } from './applications.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApplicationStatus } from '@visapilot/shared';

@ApiTags('Applications')
@ApiBearerAuth('JWT-auth')
@Controller({ path: 'applications', version: '1' })
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all applications' })
  async getAll(
    @CurrentUser('userId') userId: string,
    @Query('status') status?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.applicationsService.getAll(userId, { status, page: Number(page), limit: Number(limit) });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create application' })
  async create(
    @CurrentUser('userId') userId: string,
    @Body() body: { jobId: string; notes?: string },
  ) {
    return this.applicationsService.create(userId, body.jobId, body.notes);
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update application status' })
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: ApplicationStatus },
    @CurrentUser('userId') userId: string,
  ) {
    return this.applicationsService.updateStatus(id, body.status, userId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get application statistics' })
  async getStats(@CurrentUser('userId') userId: string) {
    return this.applicationsService.getStats(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get application details' })
  async getById(@Param('id') id: string, @CurrentUser('userId') userId: string) {
    return this.applicationsService.getById(id, userId);
  }
}

