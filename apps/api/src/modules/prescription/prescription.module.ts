import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { PrescriptionService } from './prescription.service';
import { PrescriptionController, PatientPrescriptionController } from './prescription.controller';
import { PrescriptionOcrService, OCR_QUEUE } from './prescription-ocr.service';
import { PrescriptionOcrProcessor } from './prescription-ocr.processor';
import { PrescriptionSignatureService } from './prescription-signature.service';
import { DrugSafetyModule } from '../drug-safety/drug-safety.module';
import { DatabaseModule } from '../../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EventsModule } from '../events/events.module';
import { HealthModule } from '../health/health.module';
import { KycModule } from '../telemedicine/kyc/kyc.module';

@Module({
  imports: [
    DatabaseModule,
    DrugSafetyModule,
    BullModule.registerQueue({ name: OCR_QUEUE }),
    NotificationsModule,
    EventsModule,
    HealthModule,
    KycModule,
  ],
  providers: [PrescriptionService, PrescriptionOcrService, PrescriptionOcrProcessor, PrescriptionSignatureService],
  controllers: [PrescriptionController, PatientPrescriptionController],
  exports: [PrescriptionService, PrescriptionOcrService, PrescriptionSignatureService],
})
export class PrescriptionModule {}
