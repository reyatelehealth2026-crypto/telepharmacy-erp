import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { OdooModule } from '../odoo/odoo.module';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule, OdooModule],
  providers: [ProductService],
  controllers: [ProductController],
  exports: [ProductService],
})
export class ProductModule {}
