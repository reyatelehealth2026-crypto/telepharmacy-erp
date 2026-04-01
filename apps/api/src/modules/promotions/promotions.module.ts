import { Module } from '@nestjs/common';
import { PromotionsService } from './promotions.service';
import { PromotionsController } from './promotions.controller';
import { PromotionsPublicController } from './promotions-public.controller';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [PromotionsService],
  controllers: [PromotionsController, PromotionsPublicController],
  exports: [PromotionsService],
})
export class PromotionsModule {}
