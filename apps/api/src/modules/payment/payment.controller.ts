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
import { PaymentService } from './payment.service';
import { UploadSlipDto } from './dto/upload-slip.dto';
import { VerifySlipDto } from './dto/verify-slip.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('orders')
export class PaymentPatientController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post(':orderId/slip')
  @UseGuards(JwtAuthGuard)
  uploadSlip(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @CurrentUser() user: any,
    @Body() dto: UploadSlipDto,
  ) {
    return this.paymentService.uploadSlip(orderId, user.id, dto.slipImageUrl);
  }
}

@Controller('staff/orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('pharmacist', 'super_admin', 'pharmacist_tech', 'accounting')
export class PaymentStaffController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get('pending-slip')
  getPendingSlipOrders(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.paymentService.getPendingSlipOrders(page, limit);
  }

  @Post(':orderId/verify-slip')
  verifySlip(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @CurrentUser() user: any,
    @Body() dto: VerifySlipDto,
  ) {
    return this.paymentService.manualVerifySlipByOrder(orderId, user.id, dto);
  }

  @Post(':orderId/refund')
  processRefund(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() body: { amount: number; reason: string },
  ) {
    return this.paymentService.processRefundByOrder(orderId, body.amount, body.reason);
  }
}
