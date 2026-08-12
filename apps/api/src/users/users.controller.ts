import {
  Controller,
  Get,
  Put,
  Patch,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@CurrentUser('userId') userId: string) {
    return this.usersService.getProfile(userId);
  }

  @Put('profile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update user profile' })
  async updateProfile(
    @CurrentUser('userId') userId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.usersService.updateProfile(userId, body);
  }

  @Get('saved-jobs')
  @ApiOperation({ summary: 'Get saved jobs' })
  async getSavedJobs(@CurrentUser('userId') userId: string) {
    return this.usersService.getSavedJobs(userId);
  }

  @Get('resumes')
  @ApiOperation({ summary: 'Get user resumes' })
  async getResumes(@CurrentUser('userId') userId: string) {
    return this.usersService.getResumes(userId);
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get user analytics' })
  async getAnalytics(@CurrentUser('userId') userId: string) {
    return this.usersService.getAnalytics(userId);
  }
}

