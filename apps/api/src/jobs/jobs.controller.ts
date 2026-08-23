import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
  Sse,
  MessageEvent,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { JobsService } from './jobs.service';
import { VisaIntelligenceService } from './intelligence/visa-intelligence.service';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Jobs')
@Controller({ path: 'jobs', version: '1' })
export class JobsController {
  constructor(
    private readonly jobsService: JobsService,
    private readonly visaIntelligenceService: VisaIntelligenceService,
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Search jobs with filters' })
  @ApiQuery({ name: 'query', required: false })
  @ApiQuery({ name: 'country', required: false })
  @ApiQuery({ name: 'remote', required: false })
  @ApiQuery({ name: 'visaSponsorship', required: false })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async search(
    @Query('query') query?: string,
    @Query('country') country?: string,
    @Query('remote') remote?: string,
    @Query('visaSponsorship') visaSponsorship?: string,
    @Query('userId') userId?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.jobsService.search({
      query,
      country,
      remote: remote !== undefined ? remote === 'true' : undefined,
      visaSponsorship,
      userId,
      page: Number(page),
      limit: Number(limit),
    });
  }

  @Sse('stream')
  @Public()
  @ApiOperation({ summary: 'Stream jobs incrementally as they are found' })
  @ApiQuery({ name: 'query', required: false })
  @ApiQuery({ name: 'country', required: false })
  @ApiQuery({ name: 'remote', required: false })
  @ApiQuery({ name: 'visaSponsorship', required: false })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  streamJobs(
    @Query('query') query?: string,
    @Query('country') country?: string,
    @Query('remote') remote?: string,
    @Query('visaSponsorship') visaSponsorship?: string,
    @Query('userId') userId?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ): Observable<MessageEvent> {
    return new Observable<MessageEvent>((subscriber) => {
      (async () => {
        try {
          const stream = this.jobsService.streamSearch({
            query,
            country,
            remote: remote !== undefined ? remote === 'true' : undefined,
            visaSponsorship,
            userId,
            page: Number(page),
            limit: Number(limit),
          });
          
          for await (const chunk of stream) {
            subscriber.next({ data: chunk } as MessageEvent);
          }
        } catch (error) {
          subscriber.error(error);
        } finally {
          subscriber.complete();
        }
      })();
    });
  }

  @Get('intelligence/matches')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get personalized, ranked job matches using Visa Intelligence Engine' })
  @ApiQuery({ name: 'limit', required: false })
  async getIntelligenceMatches(
    @CurrentUser('userId') userId: string,
    @Query('limit') limit = 20,
  ) {
    if (!userId) {
      throw new Error('User ID is required to fetch personalized matches');
    }
    const profile = await this.visaIntelligenceService.buildCandidateProfile(userId);
    const jobs = await this.visaIntelligenceService.discoverAndRankJobs(profile, Number(limit));
    return {
      success: true,
      data: jobs,
      meta: {
        total: jobs.length,
        profile,
      }
    };
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get job details by ID' })
  async getById(@Param('id') id: string) {
    return this.jobsService.findById(id);
  }

  @Post(':id/save')
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Save a job to user profile' })
  async saveJob(
    @Param('id') jobId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.jobsService.saveJob(userId, jobId);
  }

  @Get(':id/similar')
  @Public()
  @ApiOperation({ summary: 'Get similar jobs' })
  async getSimilar(@Param('id') id: string) {
    return this.jobsService.findSimilar(id);
  }
}
