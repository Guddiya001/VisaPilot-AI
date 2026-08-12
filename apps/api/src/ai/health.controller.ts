import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { ollamaClient } from '@visapilot/ai';

@ApiTags('Health')
@Controller({ path: 'health', version: '1' })
export class HealthController {
  @Public()
  @Get('ollama')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check Ollama connectivity and status' })
  async checkOllamaHealth() {
    try {
      const health = await ollamaClient.healthCheck();
      return {
        success: true,
        data: {
          status: health.available ? 'connected' : 'disconnected',
          available: health.available,
          modelLoaded: health.modelLoaded,
          models: health.models,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        data: {
          status: 'error',
          available: false,
          modelLoaded: false,
          models: [],
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  @Public()
  @Get('ping')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Simple ping to check API is running' })
  async ping() {
    return {
      success: true,
      data: {
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      },
    };
  }
}

