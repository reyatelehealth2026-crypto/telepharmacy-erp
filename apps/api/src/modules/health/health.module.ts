import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { SystemConfigController } from './system-config.controller';
import { SystemConfigService } from './system-config.service';
import { DynamicConfigService } from './dynamic-config.service';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController, SystemConfigController],
  providers: [SystemConfigService, DynamicConfigService],
  exports: [SystemConfigService, DynamicConfigService],
})
export class HealthModule {}
