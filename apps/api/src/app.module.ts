import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { appConfig, databaseConfig, jwtConfig, lineConfig, odooConfig } from './config';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { LineModule } from './modules/line/line.module';
import { PatientModule } from './modules/patient/patient.module';
import { OdooModule } from './modules/odoo/odoo.module';
import { ProductModule } from './modules/product/product.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig, lineConfig, odooConfig],
    }),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 60 }],
    }),
    DatabaseModule,
    HealthModule,
    AuthModule,
    LineModule,
    PatientModule,
    OdooModule,
    ProductModule,
  ],
})
export class AppModule {}
