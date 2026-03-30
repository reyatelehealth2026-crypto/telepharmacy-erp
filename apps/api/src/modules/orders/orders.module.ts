import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersPatientController } from './orders.controller';
import { OrdersStaffController, ShippingWebhookController } from './orders-staff.controller';
import { DatabaseModule } from '../../database/database.module';
import { InventoryModule } from '../inventory/inventory.module';
import { PaymentModule } from '../payment/payment.module';

@Module({
  imports: [DatabaseModule, InventoryModule, PaymentModule],
  providers: [OrdersService],
  controllers: [OrdersPatientController, OrdersStaffController, ShippingWebhookController],
  exports: [OrdersService],
})
export class OrdersModule {}
