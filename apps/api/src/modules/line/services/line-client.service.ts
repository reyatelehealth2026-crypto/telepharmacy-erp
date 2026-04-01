import { Injectable, Logger } from '@nestjs/common';
import { DynamicConfigService } from '../../health/dynamic-config.service';
import type {
  LineMessageObject,
  LineProfile,
  LineReplyMessagePayload,
  LineSendMessagePayload,
} from '../types/line-events.types';

const LINE_API_BASE = 'https://api.line.me/v2/bot';
const LINE_DATA_API_BASE = 'https://api-data.line.me/v2/bot';

@Injectable()
export class LineClientService {
  private readonly logger = new Logger(LineClientService.name);

  constructor(private readonly dynamicConfig: DynamicConfigService) {}

  private async getAccessToken(): Promise<string> {
    return this.dynamicConfig.resolve(
      'line.channelAccessToken',
      'LINE_CHANNEL_ACCESS_TOKEN',
    );
  }

  async replyMessage(
    replyToken: string,
    messages: LineMessageObject[],
  ): Promise<void> {
    const payload: LineReplyMessagePayload = { replyToken, messages };
    const res = await this.request('/message/reply', payload);
    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`Reply failed [${res.status}]: ${body}`);
    }
  }

  async pushMessage(to: string, messages: LineMessageObject[]): Promise<void> {
    const payload: LineSendMessagePayload = { to, messages };
    const res = await this.request('/message/push', payload);
    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`Push failed [${res.status}]: ${body}`);
    }
  }

  async getProfile(userId: string): Promise<LineProfile> {
    const accessToken = await this.getAccessToken();
    const res = await fetch(`${LINE_API_BASE}/profile/${userId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`Get profile failed [${res.status}]: ${body}`);
      throw new Error(`Failed to get LINE profile: ${res.status}`);
    }

    return res.json() as Promise<LineProfile>;
  }

  async getMessageContent(messageId: string): Promise<ArrayBuffer> {
    const accessToken = await this.getAccessToken();
    const res = await fetch(
      `${LINE_DATA_API_BASE}/message/${messageId}/content`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    if (!res.ok) {
      throw new Error(`Failed to get message content: ${res.status}`);
    }

    return res.arrayBuffer();
  }

  async multicast(
    to: string[],
    messages: LineMessageObject[],
  ): Promise<void> {
    const res = await this.request('/message/multicast', { to, messages });
    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`Multicast failed [${res.status}]: ${body}`);
    }
  }

  async broadcast(messages: LineMessageObject[]): Promise<void> {
    const res = await this.request('/message/broadcast', { messages });
    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`Broadcast failed [${res.status}]: ${body}`);
    }
  }

  private async request(path: string, body: unknown): Promise<Response> {
    const accessToken = await this.getAccessToken();
    return fetch(`${LINE_API_BASE}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });
  }
}
