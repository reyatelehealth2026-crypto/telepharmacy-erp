import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScopeController } from './scope.controller';
import { ScopeValidatorService } from './scope-validator.service';
import { ScopeRulesService } from './scope-rules.service';
import { DatabaseModule } from '../../../database/database.module';
import { TelemedicineAuditService } from '../audit/audit.service';

@Module({
  imports: [ConfigModule, DatabaseModule],
  controllers: [ScopeController],
  providers: [ScopeValidatorService, ScopeRulesService, TelemedicineAuditService],
  exports: [ScopeValidatorService, ScopeRulesService],
})
export class ScopeModule {}
