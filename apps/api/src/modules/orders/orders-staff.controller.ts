import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  ParseUUIDPipe,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { ShipOrderDto } from './dto/ship-order.dto';
import { ShippingWebhookDto } from './dto/shipping-webhook.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('staff/orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('pharmacist', 'super_admin', 'pharmacist_tech', 'customer_service')
export class OrdersStaffController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  listOrders(
    @Query('status') status?: string,
    @Query('order_type') orderType?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.ordersService.listOrders({ status, orderType, page, limit });
  }

  @Get(':id')
  getOrder(@Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.getOrder(id);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Body('status') status: string,
  ) {
    return this.ordersService.updateOrderStatus(id, status, user.id);
  }

  @Post(':id/pack')
  packOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.ordersService.packOrder(id, user.id);
  }

  @Post(':id/ship')
  shipOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Body() dto: ShipOrderDto,
  ) {
    return this.ordersService.shipOrder(id, dto, user.id);
  }

  @Post(':id/deliver')
  markDelivered(@Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.markDelivered(id);
  }
}

@Controller('webhooks/shipping')
export class ShippingWebhookController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  handleWebhook(@Body() dto: ShippingWebhookDto) {
    return this.ordersService.handleShippingWebhook(dto);
  }
}
