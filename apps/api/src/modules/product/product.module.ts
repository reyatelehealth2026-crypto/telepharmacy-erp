import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { MeilisearchService } from './meilisearch.service';
import { OdooModule } from '../odoo/odoo.module';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule, OdooModule],
  providers: [ProductService, MeilisearchService],
  controllers: [ProductController],
  exports: [ProductService, MeilisearchService],
})
export class ProductModule {}
