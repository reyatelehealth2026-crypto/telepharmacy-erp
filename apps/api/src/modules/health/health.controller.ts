import { Controller, Get, Inject } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import {
  HealthCheck,
  HealthCheckService,
  HealthCheckResult,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { sql } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.constants';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    @Inject(DRIZZLE) private readonly db: any,
  ) {}

  @Public()
  @Get()
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version ?? '0.0.0',
    };
  }

  @Public()
  @Get('ready')
  @HealthCheck()
  async readiness(): Promise<HealthCheckResult> {
    return this.health.check([
      async (): Promise<HealthIndicatorResult> => {
        try {
          await this.db.execute(sql`SELECT 1`);
          return { database: { status: 'up' } };
        } catch {
          return { database: { status: 'down' } };
        }
      },
    ]);
  }
}
