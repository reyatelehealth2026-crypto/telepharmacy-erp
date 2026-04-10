import { Module } from '@nestjs/common';
import { ComplianceService } from './compliance.service';
import { ComplianceController } from './compliance.controller';
import { DatabaseModule } from '../../database/database.module';
import { LineModule } from '../line/line.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [DatabaseModule, LineModule, AuditModule],
  providers: [ComplianceService],
  controllers: [ComplianceController],
  exports: [ComplianceService, AuditModule],
})
export class ComplianceModule {}
