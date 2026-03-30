import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentPatientController, PaymentStaffController } from './payment.controller';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [PaymentService],
  controllers: [PaymentPatientController, PaymentStaffController],
  exports: [PaymentService],
})
export class PaymentModule {}
