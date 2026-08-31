import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_AUTO_APPLY } from '@visapilot/shared';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';
import { ApplicationPackageController } from './application-package.controller';
import { ApplicationPackageService } from './application-package.service';
import { AutoApplyController } from './auto-apply.controller';
import { AutoApplyService } from './auto-apply.service';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    AiModule,
    BullModule.registerQueue({
      name: QUEUE_AUTO_APPLY,
    }),
  ],
  controllers: [
    ApplicationsController,
    ApplicationPackageController,
    AutoApplyController,
  ],
  providers: [
    ApplicationsService,
    ApplicationPackageService,
    AutoApplyService,
  ],
  exports: [
    ApplicationsService,
    ApplicationPackageService,
    AutoApplyService,
  ],
})
export class ApplicationsModule {}

