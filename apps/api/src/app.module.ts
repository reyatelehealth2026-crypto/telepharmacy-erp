import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bull';
import { appConfig, databaseConfig, jwtConfig, lineConfig, meilisearchConfig, odooConfig } from './config';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { LineModule } from './modules/line/line.module';
import { PatientModule } from './modules/patient/patient.module';
import { OdooModule } from './modules/odoo/odoo.module';
import { ProductModule } from './modules/product/product.module';
import { DrugSafetyModule } from './modules/drug-safety/drug-safety.module';
import { PrescriptionModule } from './modules/prescription/prescription.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { PaymentModule } from './modules/payment/payment.module';
import { OrdersModule } from './modules/orders/orders.module';
import { LoyaltyModule } from './modules/loyalty/loyalty.module';
import { ReportsModule } from './modules/reports/reports.module';
import { AdrModule } from './modules/adr/adr.module';
import { AdherenceModule } from './modules/adherence/adherence.module';
import { DrugInfoModule } from './modules/drug-info/drug-info.module';
import { ComplianceModule } from './modules/compliance/compliance.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig, lineConfig, meilisearchConfig, odooConfig],
    }),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 60 }],
    }),
    BullModule.forRoot({
      redis: { host: process.env.REDIS_HOST ?? 'localhost', port: parseInt(process.env.REDIS_PORT ?? '6379') },
    }),
    DatabaseModule,
    HealthModule,
    AuthModule,
    LineModule,
    PatientModule,
    OdooModule,
    ProductModule,
    DrugSafetyModule,
    PrescriptionModule,
    InventoryModule,
    PaymentModule,
    OrdersModule,
    LoyaltyModule,
    ReportsModule,
    AdrModule,
    AdherenceModule,
    DrugInfoModule,
    ComplianceModule,
    NotificationsModule,
  ],
})
export class AppModule {}
