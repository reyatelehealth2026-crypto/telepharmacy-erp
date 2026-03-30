import {
  Controller,
  Get,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('staff/reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('pharmacist', 'super_admin', 'accounting')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('summary')
  async getSummary(
    @Query('from') fromStr?: string,
    @Query('to') toStr?: string,
  ) {
    const { from, to } = this.parseDateRange(fromStr, toStr);
    return this.reportsService.getDashboardSummary(from, to);
  }

  @Get('daily-sales')
  async getDailySales(
    @Query('from') fromStr?: string,
    @Query('to') toStr?: string,
  ) {
    const { from, to } = this.parseDateRange(fromStr, toStr);
    return this.reportsService.getDailySales(from, to);
  }

  @Get('top-products')
  async getTopProducts(
    @Query('from') fromStr?: string,
    @Query('to') toStr?: string,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit?: number,
  ) {
    const { from, to } = this.parseDateRange(fromStr, toStr);
    return this.reportsService.getTopProducts(from, to, limit);
  }

  @Get('rx-volume')
  async getRxVolume(
    @Query('from') fromStr?: string,
    @Query('to') toStr?: string,
  ) {
    const { from, to } = this.parseDateRange(fromStr, toStr);
    return this.reportsService.getRxVolume(from, to);
  }

  @Get('interventions')
  async getInterventions(
    @Query('from') fromStr?: string,
    @Query('to') toStr?: string,
  ) {
    const { from, to } = this.parseDateRange(fromStr, toStr);
    return this.reportsService.getInterventionsByType(from, to);
  }

  @Get('low-stock')
  async getLowStock() {
    return this.reportsService.getLowStockSummary();
  }

  @Get('expiry')
  async getExpiry(
    @Query('days', new DefaultValuePipe(90), ParseIntPipe) days?: number,
  ) {
    return this.reportsService.getExpiryReport(days);
  }

  private parseDateRange(fromStr?: string, toStr?: string) {
    const now = new Date();
    const to = toStr ? new Date(toStr) : now;
    const from = fromStr
      ? new Date(fromStr)
      : new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
    return { from, to };
  }
}
