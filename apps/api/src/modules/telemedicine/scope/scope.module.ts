import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScopeController } from './scope.controller';
import { ScopeValidatorService } from './scope-validator.service';
import { ScopeRulesService } from './scope-rules.service';
import { DatabaseModule } from '../../../database/database.module';
import { TelemedicineAuditModule } from '../audit/audit.module';

@Module({
  imports: [ConfigModule, DatabaseModule, TelemedicineAuditModule],
  controllers: [ScopeController],
  providers: [ScopeValidatorService, ScopeRulesService],
  exports: [ScopeValidatorService, ScopeRulesService],
})
export class ScopeModule {}
