import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LicenseController } from './license.controller';
import { LicenseVerifierService } from './license-verifier.service';
import { AuditModule } from '../audit/audit.module';
import { DatabaseModule } from '../../../database/database.module';

@Module({
  imports: [ConfigModule, DatabaseModule, AuditModule],
  controllers: [LicenseController],
  providers: [LicenseVerifierService],
  exports: [LicenseVerifierService],
})
export class LicenseModule {}
