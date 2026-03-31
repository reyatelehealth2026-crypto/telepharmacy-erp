import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ConsentController } from './consent.controller';
import { EConsentService } from './consent.service';
import { PdfService } from './pdf.service';
import { MinioStorageService } from '../kyc/minio.service';
import { DatabaseModule } from '../../../database/database.module';

@Module({
  imports: [ConfigModule, DatabaseModule],
  controllers: [ConsentController],
  providers: [EConsentService, PdfService, MinioStorageService],
  exports: [EConsentService],
})
export class ConsentModule {}
