import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { KycModule } from './kyc/kyc.module';
import { AuditModule } from './audit/audit.module';
import { telemedicineConfig } from '../../config/telemedicine.config';

@Module({
  imports: [
    ConfigModule.forFeature(telemedicineConfig),
    KycModule,
    AuditModule,
  ],
  exports: [KycModule, AuditModule],
})
export class TelemedicineModule {}
