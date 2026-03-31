import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../../../database/database.module';
import { TelemedicineAuditService } from './audit.service';
import { AuditReportService } from './audit-report.service';
import { AuditController } from './audit.controller';

@Module({
  imports: [ConfigModule, DatabaseModule],
  controllers: [AuditController],
  providers: [TelemedicineAuditService, AuditReportService],
  exports: [TelemedicineAuditService],
})
export class TelemedicineAuditModule {}
