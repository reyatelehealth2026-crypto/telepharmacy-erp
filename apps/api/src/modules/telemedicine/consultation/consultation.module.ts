import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ConsultationController } from './consultation.controller';
import { ConsultationService } from './consultation.service';
import { AgoraService } from './agora.service';
import { ScopeModule } from '../scope/scope.module';
import { ConsentModule } from '../consent/consent.module';
import { TelemedicineAuditModule } from '../audit/audit.module';
import { DatabaseModule } from '../../../database/database.module';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    ScopeModule,
    ConsentModule,
    TelemedicineAuditModule,
  ],
  controllers: [ConsultationController],
  providers: [ConsultationService, AgoraService],
  exports: [ConsultationService, AgoraService],
})
export class ConsultationModule {}
