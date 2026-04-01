import { Module } from '@nestjs/common';
import { ContentService } from './content.service';
import { ContentController } from './content.controller';
import { ContentStaffController } from './content-staff.controller';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [ContentService],
  controllers: [ContentController, ContentStaffController],
  exports: [ContentService],
})
export class ContentModule {}
