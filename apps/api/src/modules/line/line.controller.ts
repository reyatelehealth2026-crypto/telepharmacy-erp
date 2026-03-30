import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
  Req,
} from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { LineSignatureGuard } from './guards/line-signature.guard';
import { SkipResponseWrap } from './decorators/skip-response-wrap.decorator';
import { LineWebhookService } from './services/line-webhook.service';
import { LineClientService } from './services/line-client.service';
import { FlexMessageService } from './services/flex-message.service';
import type { LineWebhookBody, LineMessageObject } from './types/line-events.types';

@Controller('line')
export class LineController {
  private readonly logger = new Logger(LineController.name);

  constructor(
    private readonly webhookService: LineWebhookService,
    private readonly lineClient: LineClientService,
    private readonly flexMessage: FlexMessageService,
  ) {}

  /**
   * LINE Messaging API webhook endpoint.
   * LINE Platform sends events here; must return 200 immediately.
   */
  @Public()
  @SkipResponseWrap()
  @UseGuards(LineSignatureGuard)
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async webhook(@Body() body: LineWebhookBody): Promise<Record<string, never>> {
    const eventCount = body.events?.length ?? 0;
    this.logger.log(`Webhook received: ${eventCount} event(s)`);

    if (eventCount > 0) {
      // Fire-and-forget — don't block the 200 response
      this.webhookService.processEvents(body.events).catch((err) => {
        this.logger.error('Webhook processing error', err);
      });
    }

    return {};
  }

  /**
   * Internal endpoint to push a LINE message to a user.
   * Protected by JWT (staff only in production).
   */
  @Post('send')
  @HttpCode(HttpStatus.OK)
  async sendMessage(
    @Body() body: { to: string; type: string; altText?: string; message: unknown },
  ) {
    let messages: LineMessageObject[];

    if (body.type === 'flex') {
      messages = [
        {
          type: 'flex',
          altText: body.altText ?? 'ข้อความจาก Re-Ya',
          contents: body.message as any,
        },
      ];
    } else {
      messages = [
        { type: 'text', text: typeof body.message === 'string' ? body.message : JSON.stringify(body.message) },
      ];
    }

    await this.lineClient.pushMessage(body.to, messages);
    return { sent: true };
  }

  /**
   * Internal endpoint for broadcast messages.
   */
  @Post('broadcast')
  @HttpCode(HttpStatus.OK)
  async broadcast(
    @Body() body: { message: unknown; altText?: string },
  ) {
    const messages: LineMessageObject[] = [
      {
        type: 'flex',
        altText: body.altText ?? 'ข้อความจาก Re-Ya',
        contents: body.message as any,
      },
    ];

    await this.lineClient.broadcast(messages);
    return { sent: true };
  }
}
