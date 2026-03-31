import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ComplianceMonitorService } from './compliance-monitor.service';
import { DocumentationGeneratorService } from './documentation-generator.service';
import { ComplianceController } from './compliance.controller';
import { DatabaseModule } from '../../../database/database.module';

@Module({
  imports: [DatabaseModule, ConfigModule],
  controllers: [ComplianceController],
  providers: [ComplianceMonitorService, DocumentationGeneratorService],
  exports: [ComplianceMonitorService, DocumentationGeneratorService],
})
export class ComplianceModule {}
