import { Module } from '@nestjs/common';
import { DrugInfoService } from './drug-info.service';
import { DrugInfoController } from './drug-info.controller';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [DrugInfoService],
  controllers: [DrugInfoController],
  exports: [DrugInfoService],
})
export class DrugInfoModule {}
