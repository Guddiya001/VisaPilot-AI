import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { HealthController } from './health.controller';
import { AiService } from './ai.service';
import { AIServiceModule } from './ai-service.module';

@Module({
  imports: [AIServiceModule],
  controllers: [AiController, HealthController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}

