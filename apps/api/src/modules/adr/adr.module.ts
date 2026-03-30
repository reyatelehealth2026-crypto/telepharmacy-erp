import { Module } from '@nestjs/common';
import { AdrService } from './adr.service';
import { AdrController } from './adr.controller';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [AdrService],
  controllers: [AdrController],
  exports: [AdrService],
})
export class AdrModule {}
