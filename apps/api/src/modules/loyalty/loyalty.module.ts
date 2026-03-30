import { Module } from '@nestjs/common';
import { LoyaltyService } from './loyalty.service';
import { LoyaltyPatientController, LoyaltyStaffController } from './loyalty.controller';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [LoyaltyService],
  controllers: [LoyaltyPatientController, LoyaltyStaffController],
  exports: [LoyaltyService],
})
export class LoyaltyModule {}
