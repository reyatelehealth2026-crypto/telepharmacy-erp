import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { CacheModule } from '@nestjs/cache-manager';
import { KycController } from './kyc.controller';
import { KycService } from './kyc.service';
import { AwsRekognitionService } from './aws-rekognition.service';
import { SmsService } from './sms.service';
import { EmailVerificationService } from './email.service';
import { MinioStorageService } from './minio.service';
import { RedisKycService } from './redis.service';
import { DatabaseModule } from '../../../database/database.module';

@Module({
  imports: [
    DatabaseModule,
    ConfigModule,
    JwtModule.register({}),
    CacheModule.register(),
  ],
  controllers: [KycController],
  providers: [
    KycService,
    AwsRekognitionService,
    SmsService,
    EmailVerificationService,
    MinioStorageService,
    RedisKycService,
  ],
  exports: [KycService],
})
export class KycModule {}
