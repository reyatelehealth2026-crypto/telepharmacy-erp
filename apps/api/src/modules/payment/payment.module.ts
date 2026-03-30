import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { PaymentService, SLIP_OCR_QUEUE } from './payment.service';
import { PaymentPatientController, PaymentStaffController } from './payment.controller';
import { SlipOcrProcessor } from './slip-ocr.processor';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [
    DatabaseModule,
    BullModule.registerQueue({ name: SLIP_OCR_QUEUE }),
  ],
  providers: [PaymentService, SlipOcrProcessor],
  controllers: [PaymentPatientController, PaymentStaffController],
  exports: [PaymentService],
})
export class PaymentModule {}
