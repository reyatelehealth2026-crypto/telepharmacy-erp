import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PdpaService } from './pdpa.service';
import { PdpaController } from './pdpa.controller';
import { DatabaseModule } from '../../../database/database.module';
import { TelemedicineAuditModule } from '../audit/audit.module';

@Module({
  imports: [DatabaseModule, ConfigModule, TelemedicineAuditModule],
  controllers: [PdpaController],
  providers: [PdpaService],
  exports: [PdpaService],
})
export class PdpaModule {}
