import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  ParseUUIDPipe,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOtcOrderDto } from './dto/create-otc-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersPatientController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  createOtcOrder(
    @CurrentUser() user: any,
    @Body() dto: CreateOtcOrderDto,
  ) {
    return this.ordersService.createOtcOrder(user.id, dto);
  }

  @Get()
  listMyOrders(
    @CurrentUser() user: any,
    @Query('status') status?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit?: number,
  ) {
    return this.ordersService.listOrders({ patientId: user.id, status, page, limit });
  }

  @Get(':id')
  getMyOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.ordersService.getOrder(id, user.id);
  }

  @Post(':id/cancel')
  cancelOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Body('reason') reason: string,
  ) {
    return this.ordersService.cancelOrder(id, reason ?? 'Customer cancelled', user.id);
  }

  @Post(':id/reorder')
  reorder(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.ordersService.reorder(id, user.id);
  }
}
