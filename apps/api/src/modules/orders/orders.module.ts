import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersPatientController } from './orders.controller';
import { OrdersStaffController, ShippingWebhookController } from './orders-staff.controller';
import { DatabaseModule } from '../../database/database.module';
import { InventoryModule } from '../inventory/inventory.module';
import { PaymentModule } from '../payment/payment.module';
import { LoyaltyModule } from '../loyalty/loyalty.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [DatabaseModule, InventoryModule, PaymentModule, LoyaltyModule, NotificationsModule, EventsModule],
  providers: [OrdersService],
  controllers: [OrdersPatientController, OrdersStaffController, ShippingWebhookController],
  exports: [OrdersService],
})
export class OrdersModule {}
