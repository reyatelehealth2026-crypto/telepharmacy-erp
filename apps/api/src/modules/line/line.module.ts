import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { LineController } from './line.controller';
import { LineStaffController } from './line-staff.controller';
import { LineWebhookService } from './services/line-webhook.service';
import { LineClientService } from './services/line-client.service';
import { FlexMessageService } from './services/flex-message.service';
import { RichMenuService } from './services/rich-menu.service';
import { BroadcastService, BROADCAST_QUEUE } from './services/broadcast.service';
import { SmartOrderParserService } from './services/smart-order-parser.service';
import { SentimentService } from './services/sentiment.service';
import { BroadcastProcessor } from './processors/broadcast.processor';
import { LineSignatureGuard } from './guards/line-signature.guard';

@Module({
  imports: [
    BullModule.registerQueue({ name: BROADCAST_QUEUE }),
  ],
  controllers: [LineController, LineStaffController],
  providers: [
    LineWebhookService,
    LineClientService,
    FlexMessageService,
    RichMenuService,
    BroadcastService,
    SmartOrderParserService,
    SentimentService,
    BroadcastProcessor,
    LineSignatureGuard,
  ],
  exports: [LineClientService, FlexMessageService, RichMenuService, BroadcastService],
})
export class LineModule {}
