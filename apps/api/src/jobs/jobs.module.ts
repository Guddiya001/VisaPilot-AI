import { Module } from '@nestjs/common';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { AIServiceModule } from '../ai/ai-service.module';
import { VisaIntelligenceService } from './intelligence/visa-intelligence.service';

@Module({
  imports: [AIServiceModule],
  controllers: [JobsController],
  providers: [JobsService, VisaIntelligenceService],
  exports: [JobsService, VisaIntelligenceService],
})
export class JobsModule {}

