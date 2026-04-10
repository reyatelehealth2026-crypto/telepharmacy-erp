import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { IsArray, IsString, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ProductService } from './product.service';
import { ProductQueryDto } from './dto/product-query.dto';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces';

class SyncDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  codes?: string[];
}

class CreateProductDto {
  @IsString()
  nameTh!: string;

  @IsOptional()
  @IsString()
  nameEn?: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  genericName?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  drugClassification?: string;

  @IsOptional()
  sellPrice?: number;

  @IsOptional()
  comparePrice?: number;

  @IsOptional()
  @IsString()
  dosageForm?: string;

  @IsOptional()
  @IsString()
  strength?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  shortDescription?: string;

  @IsOptional()
  @IsString()
  howToUse?: string;

  @IsOptional()
  @IsString()
  warnings?: string;

  @IsOptional()
  requiresPrescription?: boolean;

  @IsOptional()
  requiresPharmacist?: boolean;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  stockQty?: number;

  @IsOptional()
  @IsString()
  status?: string;
}

class UpdateProductDto {
  @IsOptional() @IsString() nameTh?: string;
  @IsOptional() @IsString() nameEn?: string;
  @IsOptional() @IsString() genericName?: string;
  @IsOptional() @IsString() brand?: string;
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsString() drugClassification?: string;
  @IsOptional() sellPrice?: number;
  @IsOptional() comparePrice?: number;
  @IsOptional() memberPrice?: number;
  @IsOptional() @IsString() dosageForm?: string;
  @IsOptional() @IsString() strength?: string;
  @IsOptional() @IsString() unit?: string;
  @IsOptional() @IsString() shortDescription?: string;
  @IsOptional() @IsString() howToUse?: string;
  @IsOptional() @IsString() warnings?: string;
  @IsOptional() requiresPrescription?: boolean;
  @IsOptional() requiresPharmacist?: boolean;
  @IsOptional() @IsString() barcode?: string;
  @IsOptional() stockQty?: number;
  @IsOptional() isFeatured?: boolean;
  @IsOptional() isNew?: boolean;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
}

class SyncAllDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(9999)
  @Type(() => Number)
  maxCode?: number;
}

class SyncBatchDto {
  @IsInt()
  @Min(1)
  @Max(9999)
  @Type(() => Number)
  from!: number;

  @IsInt()
  @Min(1)
  @Max(9999)
  @Type(() => Number)
  to!: number;
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

  /**
   * Streaming SSE endpoint — emits progress events while syncing a numeric range.
   * Usage: POST /v1/products/sync-batch  body: { from: 1, to: 200 }
   * Events: data: <JSON>\n\n
   */
  @Roles('pharmacist', 'super_admin', 'pharmacist_tech')
  @Post('sync-batch')
  async syncBatch(@Body() body: SyncBatchDto, @Res() res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const send = (data: object) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    send({ type: 'start', from: body.from, to: body.to, total: body.to - body.from + 1 });

    try {
      const result = await this.productService.syncBatch(
        body.from,
        body.to,
        (event) => {
          send({ type: 'progress', ...event });
        },
      );
      send({ type: 'done', ...result });
    } catch (err) {
      send({ type: 'error', message: String(err) });
    }

    res.end();
  }

  @Roles('pharmacist', 'super_admin', 'pharmacist_tech')
  @Post('bulk-close-all')
  @HttpCode(HttpStatus.OK)
  bulkCloseAll() {
    return this.productService.bulkCloseAll();
  }

  @Roles('pharmacist', 'super_admin', 'pharmacist_tech')
  @Post('bulk-close-rx')
  @HttpCode(HttpStatus.OK)
  bulkCloseRx() {
    return this.productService.bulkCloseRx();
  }

  @Roles('pharmacist', 'super_admin', 'pharmacist_tech')
  @Get('odoo-status')
  checkOdooConnection() {
    return this.productService.checkOdooConnection();
  }

  // ── CRUD ────────────────────────────────────────────────────────────────

  @Roles('pharmacist', 'super_admin', 'pharmacist_tech')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateProductDto, @CurrentUser() user: RequestUser) {
    return this.productService.create(dto, user.id);
  }

  @Roles('pharmacist', 'super_admin', 'pharmacist_tech')
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateProductDto, @CurrentUser() user: RequestUser) {
    return this.productService.update(id, dto, user.id);
  }

  @Roles('pharmacist', 'super_admin', 'pharmacist_tech')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.productService.remove(id);
  }

  // ── Dynamic routes ───────────────────────────────────────────────────────

  @Public()
  @Get()
  findAll(@Query() query: ProductQueryDto) {
    return this.productService.findAll(query);
  }

  @Public()
  @Get(':identifier')
  findOne(@Param('identifier') identifier: string) {
    return this.productService.findOne(identifier, true);
  }

  @Public()
  @Get(':identifier/stock')
  getStock(@Param('identifier') identifier: string) {
    return this.productService.getStock(identifier);
  }
}
