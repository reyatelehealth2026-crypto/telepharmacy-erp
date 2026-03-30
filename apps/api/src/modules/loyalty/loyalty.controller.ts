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
import { LoyaltyService } from './loyalty.service';
import { RedeemPointsDto } from './dto/redeem-points.dto';
import { AdjustPointsDto } from './dto/adjust-points.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('loyalty')
@UseGuards(JwtAuthGuard)
export class LoyaltyPatientController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  @Get('me')
  getMyLoyalty(@CurrentUser() user: any) {
    return this.loyaltyService.getMyLoyalty(user.id);
  }

  @Post('redeem')
  redeemPoints(
    @CurrentUser() user: any,
    @Body() dto: RedeemPointsDto,
  ) {
    return this.loyaltyService.redeemPoints(user.id, dto);
  }

  @Get('transactions')
  getTransactions(
    @CurrentUser() user: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.loyaltyService.getTransactionHistory(user.id, page, limit);
  }
}

@Controller('staff/loyalty')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('pharmacist', 'super_admin', 'accounting')
export class LoyaltyStaffController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  @Post(':patientId/adjust')
  adjustPoints(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @CurrentUser() user: any,
    @Body() dto: AdjustPointsDto,
  ) {
    return this.loyaltyService.adjustPoints(patientId, dto.points, dto.reason, user.id);
  }

  @Get(':patientId')
  getPatientLoyalty(@Param('patientId', ParseUUIDPipe) patientId: string) {
    return this.loyaltyService.getMyLoyalty(patientId);
  }
}
