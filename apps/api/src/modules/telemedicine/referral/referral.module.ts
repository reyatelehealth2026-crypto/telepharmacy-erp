import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ReferralController } from './referral.controller';
import { ReferralService } from './referral.service';
import { AuditModule } from '../audit/audit.module';
import { KycModule } from '../kyc/kyc.module';
import { DatabaseModule } from '../../../database/database.module';

@Module({
  imports: [ConfigModule, DatabaseModule, AuditModule, KycModule],
  controllers: [ReferralController],
  providers: [ReferralService],
  exports: [ReferralService],
})
export class ReferralModule {}
