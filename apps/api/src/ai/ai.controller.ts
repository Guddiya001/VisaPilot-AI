import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('AI')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'ai', version: '1' })
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Chat with AI assistant' })
  async chat(
    @Body() body: { message: string; context?: Record<string, unknown> },
    @CurrentUser('userId') userId: string,
  ) {
    return this.aiService.chat(userId, body.message, body.context);
  }

  @Post('analyze-resume')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Analyze resume against job description' })
  async analyzeResume(
    @Body() body: { resumeContent: string; jobDescription: string },
    @CurrentUser('userId') userId?: string,
  ) {
    return this.aiService.analyzeResume(body.resumeContent, body.jobDescription);
  }

  @Post('generate-cover-letter')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate cover letter' })
  async generateCoverLetter(
    @Body()
    body: {
      userName: string;
      jobTitle: string;
      companyName: string;
      jobDescription: string;
      skills: string[];
    },
    @CurrentUser('userId') userId?: string,
  ) {
    return this.aiService.generateCoverLetter(body);
  }

  @Post('optimize-resume')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Optimize resume for ATS' })
  async optimizeResume(
    @Body() body: { resumeContent: string; jobDescription: string },
    @CurrentUser('userId') userId?: string,
  ) {
    return this.aiService.optimizeResume(body.resumeContent, body.jobDescription);
  }

  @Post('tailor-resume')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Tailor resume specifically for a job description' })
  async tailorResume(
    @Body()
    body: {
      resumeData?: Record<string, unknown>;
      resumeContent?: string;
      jobTitle?: string;
      companyName?: string;
      jobDescription: string;
    },
    @CurrentUser('userId') userId?: string,
  ) {
    return this.aiService.tailorResume(body);
  }

  @Post('visa-analysis')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Analyze visa sponsorship for a job' })
  async analyzeVisa(
    @Body() body: { jobDescription: string; companyName: string },
    @CurrentUser('userId') userId?: string,
  ) {
    return this.aiService.analyzeVisa(body.jobDescription, body.companyName);
  }

  @Post('interview-prep')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate interview questions' })
  async interviewPrep(
    @Body() body: { jobDescription: string; companyName?: string },
    @CurrentUser('userId') userId?: string,
  ) {
    return this.aiService.interviewPrep(body.jobDescription, body.companyName);
  }

  @Post('generate-resume')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate a full optimized resume from a job description (10-phase pipeline)' })
  async generateResume(
    @Body()
    body: {
      jobDescription: string;
      jobTitle?: string;
      companyName?: string;
      strategy?: 'A' | 'B' | 'C' | 'auto';
    },
    @CurrentUser('userId') userId?: string,
  ) {
    return this.aiService.generateFullResume(body);
  }
}

