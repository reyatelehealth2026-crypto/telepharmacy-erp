import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { PromotionsService } from './promotions.service';
import { ValidateCouponDto } from './dto/validate-coupon.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class PromotionsPublicController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Post('validate-coupon')
  validateCoupon(
    @CurrentUser() user: any,
    @Body() dto: ValidateCouponDto,
  ) {
    return this.promotionsService.validateCoupon(
      dto.code,
      user.id,
      dto.orderAmount,
      dto.patientTier,
    );
  }
}
