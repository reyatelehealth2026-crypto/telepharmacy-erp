import { Module } from '@nestjs/common';
import { ComplianceService } from './compliance.service';
import { ComplianceController } from './compliance.controller';
import { AuditService } from './audit.service';
import { DatabaseModule } from '../../database/database.module';
import { LineModule } from '../line/line.module';

@Module({
  imports: [DatabaseModule, LineModule],
  providers: [ComplianceService, AuditService],
  controllers: [ComplianceController],
  exports: [ComplianceService, AuditService],
})
export class ComplianceModule {}
