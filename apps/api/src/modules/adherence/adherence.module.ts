import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { AdherenceService, ADHERENCE_QUEUE } from './adherence.service';
import { AdherencePatientController, AdherenceStaffController } from './adherence.controller';
import { AdherenceReminderProcessor } from './adherence-reminder.processor';
import { DatabaseModule } from '../../database/database.module';
import { LineModule } from '../line/line.module';

@Module({
  imports: [
    DatabaseModule,
    LineModule,
    BullModule.registerQueue({ name: ADHERENCE_QUEUE }),
  ],
  providers: [AdherenceService, AdherenceReminderProcessor],
  controllers: [AdherencePatientController, AdherenceStaffController],
  exports: [AdherenceService],
})
export class AdherenceModule {}
