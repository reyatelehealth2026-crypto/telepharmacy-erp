import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { IsArray, IsString, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ProductService } from './product.service';
import { ProductQueryDto } from './dto/product-query.dto';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

class SyncDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  codes?: string[];
}

class SyncAllDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(9999)
  @Type(() => Number)
  maxCode?: number;
}

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  // ── Static routes first (must come before :id) ───────────────────────────

  @Roles('pharmacist', 'super_admin', 'pharmacist_tech')
  @Post('sync')
  @HttpCode(HttpStatus.OK)
  syncFromOdoo(@Body() body: SyncDto) {
    return this.productService.syncFromOdoo(body.codes);
  }

  @Roles('pharmacist', 'super_admin', 'pharmacist_tech')
  @Post('sync-all')
  @HttpCode(HttpStatus.OK)
  syncAllFromOdoo(@Body() body: SyncAllDto) {
    return this.productService.syncAllFromOdoo(body.maxCode ?? 1000);
  }

  @Roles('pharmacist', 'super_admin', 'pharmacist_tech')
  @Get('odoo-status')
  checkOdooConnection() {
    return this.productService.checkOdooConnection();
  }

  // ── Dynamic routes ───────────────────────────────────────────────────────

  @Public()
  @Get()
  findAll(@Query() query: ProductQueryDto) {
    return this.productService.findAll(query);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.productService.findOne(id, true);
  }

  @Public()
  @Get(':id/stock')
  getStock(@Param('id', ParseUUIDPipe) id: string) {
    return this.productService.getStock(id);
  }
}
