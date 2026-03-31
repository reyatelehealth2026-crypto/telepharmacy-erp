import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { SystemConfigController } from './system-config.controller';
import { SystemConfigService } from './system-config.service';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController, SystemConfigController],
  providers: [SystemConfigService],
  exports: [SystemConfigService],
})
export class HealthModule {}
