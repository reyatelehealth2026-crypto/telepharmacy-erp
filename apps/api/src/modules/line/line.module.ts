import { Module } from '@nestjs/common';
import { LineController } from './line.controller';
import { LineWebhookService } from './services/line-webhook.service';
import { LineClientService } from './services/line-client.service';
import { FlexMessageService } from './services/flex-message.service';
import { LineSignatureGuard } from './guards/line-signature.guard';

@Module({
  controllers: [LineController],
  providers: [
    LineWebhookService,
    LineClientService,
    FlexMessageService,
    LineSignatureGuard,
  ],
  exports: [LineClientService, FlexMessageService],
})
export class LineModule {}
