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
import { InventoryService } from './inventory.service';
import { ReceiveLotDto } from './dto/receive-lot.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('staff/inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('pharmacist', 'super_admin', 'pharmacist_tech')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  getStockOverview(
    @Query('category') category?: string,
    @Query('low_stock') lowStock?: string,
    @Query('expiring_within', new DefaultValuePipe(0), ParseIntPipe) expiringWithin?: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.inventoryService.getStockOverview({
      category,
      lowStock: lowStock === 'true',
      expiringWithin: expiringWithin && expiringWithin > 0 ? expiringWithin : undefined,
      page,
      limit,
    });
  }

  @Get('alerts')
  getAlerts(
    @Query('type') type?: string,
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days?: number,
  ) {
    if (type === 'low_stock') {
      return this.inventoryService.getLowStockAlerts();
    }
    return this.inventoryService.getExpiryAlerts(days);
  }

  @Get('movements')
  getMovements(
    @Query('product_id') productId?: string,
    @Query('lot_id') lotId?: string,
    @Query('movement_type') movementType?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.inventoryService.getMovementHistory({
      productId,
      lotId,
      movementType,
      page,
      limit,
    });
  }

  @Get('products/:productId/lots')
  getLotsByProduct(@Param('productId', ParseUUIDPipe) productId: string) {
    return this.inventoryService.getLotsByProduct(productId);
  }

  @Post('lots')
  receiveLot(
    @Body() dto: ReceiveLotDto,
    @CurrentUser() user: any,
  ) {
    return this.inventoryService.receiveLot(dto, user.id);
  }

  @Post('adjustments')
  adjustStock(
    @Body() dto: AdjustStockDto,
    @CurrentUser() user: any,
  ) {
    return this.inventoryService.recordMovement(dto, user.id);
  }

  @Post('write-off')
  writeOff(
    @Body() dto: AdjustStockDto,
    @CurrentUser() user: any,
  ) {
    const writeOffDto = { ...dto, movementType: 'write_off' };
    return this.inventoryService.recordMovement(writeOffDto, user.id);
  }
}
