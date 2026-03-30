import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import { patients, chatSessions, chatMessages } from '@telepharmacy/db';
import { DRIZZLE } from '../../../database/database.constants';
import { LineClientService } from './line-client.service';
import { FlexMessageService } from './flex-message.service';
import type {
  LineWebhookEvent,
  LineMessageEvent,
  LineFollowEvent,
  LineUnfollowEvent,
  LinePostbackEvent,
  LineTextMessage,
  LineImageMessage,
} from '../types/line-events.types';

@Injectable()
export class LineWebhookService {
  private readonly logger = new Logger(LineWebhookService.name);
  private readonly shopUrl: string;

  constructor(
    @Inject(DRIZZLE) private readonly db: any,
    private readonly lineClient: LineClientService,
    private readonly flexMessage: FlexMessageService,
    private readonly config: ConfigService,
  ) {
    this.shopUrl =
      this.config.get<string>('NEXT_PUBLIC_SHOP_URL') ?? 'https://shop.re-ya.com';
  }

  async processEvents(events: LineWebhookEvent[]): Promise<void> {
    await Promise.allSettled(
      events.map((event) => this.routeEvent(event)),
    );
  }

  private async routeEvent(event: LineWebhookEvent): Promise<void> {
    if (event.mode === 'standby') return;

    try {
      switch (event.type) {
        case 'message':
          await this.handleMessage(event);
          break;
        case 'follow':
          await this.handleFollow(event);
          break;
        case 'unfollow':
          await this.handleUnfollow(event);
          break;
        case 'postback':
          await this.handlePostback(event);
          break;
        default:
          this.logger.debug(`Unhandled event type: ${(event as any).type}`);
      }
    } catch (error) {
      this.logger.error(
        `Error processing ${event.type} event: ${error instanceof Error ? error.message : error}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  // ─── Message Handlers ──────────────────────────────────────────

  private async handleMessage(event: LineMessageEvent): Promise<void> {
    const userId = event.source.userId;
    if (!userId) return;

    const patient = await this.findOrCreatePatient(userId);

    switch (event.message.type) {
      case 'text':
        await this.handleTextMessage(event, patient);
        break;
      case 'image':
        await this.handleImageMessage(event, patient);
        break;
      case 'sticker':
        await this.handleStickerMessage(event);
        break;
      case 'location':
        await this.handleLocationMessage(event);
        break;
      default:
        this.logger.debug(`Unhandled message type: ${event.message.type}`);
    }
  }

  private async handleTextMessage(
    event: LineMessageEvent,
    patient: any,
  ): Promise<void> {
    const msg = event.message as LineTextMessage;
    const userId = event.source.userId!;

    const session = await this.getOrCreateChatSession(patient.id, userId);

    await this.db.insert(chatMessages).values({
      sessionId: session.id,
      role: 'user',
      content: msg.text,
      lineMessageId: msg.id,
      messageType: 'text',
    });

    await this.db
      .update(chatSessions)
      .set({
        messageCount: session.messageCount + 1,
        updatedAt: new Date(),
      })
      .where(eq(chatSessions.id, session.id));

    const text = msg.text.trim().toLowerCase();

    if (this.isGreeting(text)) {
      await this.lineClient.replyMessage(event.replyToken, [
        {
          type: 'text',
          text: `สวัสดีค่ะ คุณ${patient.firstName} 🙏\nRe-Ya Telepharmacy ยินดีให้บริการค่ะ\n\nพิมพ์ "เมนู" เพื่อดูบริการทั้งหมด`,
        },
      ]);
      return;
    }

    if (text === 'เมนู' || text === 'menu') {
      await this.sendMainMenu(event.replyToken);
      return;
    }

    if (text.includes('สั่งยา') || text.includes('ซื้อยา')) {
      await this.lineClient.replyMessage(event.replyToken, [
        {
          type: 'text',
          text: `เปิดร้านค้าเพื่อสั่งซื้อยาและผลิตภัณฑ์สุขภาพได้เลยค่ะ 🛒\n${this.shopUrl}`,
        },
      ]);
      return;
    }

    if (text.includes('ใบสั่งยา') || text === 'rx') {
      await this.lineClient.replyMessage(event.replyToken, [
        {
          type: 'text',
          text: `📋 ส่งรูปใบสั่งยามาได้เลยค่ะ\nหรือเปิดหน้าอัปโหลดที่:\n${this.shopUrl}/rx/upload`,
        },
      ]);
      return;
    }

    if (text.includes('ปรึกษา') || text.includes('เภสัชกร')) {
      await this.lineClient.replyMessage(event.replyToken, [
        {
          type: 'text',
          text: '💬 กรุณารอสักครู่ค่ะ กำลังเชื่อมต่อเภสัชกรให้...\nหากต้องการปรึกษาทันที กดลิงก์ด้านล่างค่ะ',
        },
      ]);
      return;
    }

    await this.lineClient.replyMessage(event.replyToken, [
      {
        type: 'text',
        text: `ขอบคุณสำหรับข้อความค่ะ 🙏\nเภสัชกรจะตอบกลับโดยเร็วที่สุดค่ะ\n\nพิมพ์ "เมนู" เพื่อดูบริการทั้งหมด`,
      },
    ]);
  }

  private async handleImageMessage(
    event: LineMessageEvent,
    patient: any,
  ): Promise<void> {
    const msg = event.message as LineImageMessage;
    const userId = event.source.userId!;

    const session = await this.getOrCreateChatSession(patient.id, userId);

    await this.db.insert(chatMessages).values({
      sessionId: session.id,
      role: 'user',
      content: '[รูปภาพ]',
      lineMessageId: msg.id,
      messageType: 'image',
      attachments: [
        {
          type: 'image',
          lineMessageId: msg.id,
          contentProvider: msg.contentProvider,
        },
      ],
    });

    await this.db
      .update(chatSessions)
      .set({
        messageCount: session.messageCount + 1,
        updatedAt: new Date(),
      })
      .where(eq(chatSessions.id, session.id));

    await this.lineClient.replyMessage(event.replyToken, [
      {
        type: 'text',
        text: '📷 ได้รับรูปภาพแล้วค่ะ\n\nหากเป็นใบสั่งยา เภสัชกรจะตรวจสอบและแจ้งผลให้ทราบค่ะ\nกรุณารอสักครู่นะคะ 🙏',
      },
    ]);
  }

  private async handleStickerMessage(
    event: LineMessageEvent,
  ): Promise<void> {
    await this.lineClient.replyMessage(event.replyToken, [
      { type: 'sticker', packageId: '11537', stickerId: '52002734' },
    ]);
  }

  private async handleLocationMessage(
    event: LineMessageEvent,
  ): Promise<void> {
    await this.lineClient.replyMessage(event.replyToken, [
      {
        type: 'text',
        text: '📍 ได้รับตำแหน่งแล้วค่ะ ขอบคุณค่ะ\nจะใช้สำหรับคำนวณค่าจัดส่งให้ค่ะ',
      },
    ]);
  }

  // ─── Follow / Unfollow ─────────────────────────────────────────

  private async handleFollow(event: LineFollowEvent): Promise<void> {
    const userId = event.source.userId;
    if (!userId) return;

    let displayName = 'ลูกค้า';
    try {
      const profile = await this.lineClient.getProfile(userId);
      displayName = profile.displayName;
    } catch {
      this.logger.warn(`Could not fetch profile for ${userId}`);
    }

    await this.findOrCreatePatient(userId, displayName);

    const welcomeMessage = this.flexMessage.welcome({
      displayName,
      shopUrl: this.shopUrl,
    });

    await this.lineClient.replyMessage(event.replyToken, [welcomeMessage]);
  }

  private async handleUnfollow(event: LineUnfollowEvent): Promise<void> {
    const userId = event.source.userId;
    if (!userId) return;

    this.logger.log(`User unfollowed: ${userId}`);
  }

  // ─── Postback Handler ─────────────────────────────────────────

  private async handlePostback(event: LinePostbackEvent): Promise<void> {
    const userId = event.source.userId;
    if (!userId) return;

    const params = new URLSearchParams(event.postback.data);
    const action = params.get('action');

    switch (action) {
      case 'consult':
        await this.lineClient.replyMessage(event.replyToken, [
          {
            type: 'text',
            text: '💬 กรุณาพิมพ์อาการหรือคำถามที่ต้องการปรึกษาเภสัชกรค่ะ\nเภสัชกรจะตอบกลับโดยเร็วที่สุดค่ะ',
          },
        ]);
        break;

      case 'menu':
        await this.sendMainMenu(event.replyToken);
        break;

      case 'track_order': {
        const orderId = params.get('order_id');
        await this.lineClient.replyMessage(event.replyToken, [
          {
            type: 'text',
            text: orderId
              ? `📦 ติดตามออเดอร์ได้ที่:\n${this.shopUrl}/orders/${orderId}`
              : `📦 ดูประวัติออเดอร์ได้ที่:\n${this.shopUrl}/orders`,
          },
        ]);
        break;
      }

      case 'rx_upload':
        await this.lineClient.replyMessage(event.replyToken, [
          {
            type: 'text',
            text: `📋 อัปโหลดใบสั่งยาได้ที่:\n${this.shopUrl}/rx/upload\n\nหรือส่งรูปใบสั่งยามาในแชทได้เลยค่ะ 📷`,
          },
        ]);
        break;

      case 'my_profile':
        await this.lineClient.replyMessage(event.replyToken, [
          {
            type: 'text',
            text: `👤 ดูและแก้ไขข้อมูลส่วนตัวได้ที่:\n${this.shopUrl}/profile`,
          },
        ]);
        break;

      default:
        this.logger.debug(`Unknown postback action: ${action}`);
        await this.lineClient.replyMessage(event.replyToken, [
          { type: 'text', text: 'ขอบคุณค่ะ 🙏' },
        ]);
    }
  }

  // ─── Helpers ───────────────────────────────────────────────────

  private async findOrCreatePatient(
    lineUserId: string,
    displayName?: string,
  ): Promise<any> {
    const [existing] = await this.db
      .select()
      .from(patients)
      .where(eq(patients.lineUserId, lineUserId))
      .limit(1);

    if (existing) return existing;

    const patientNo = await this.generatePatientNo();
    const [created] = await this.db
      .insert(patients)
      .values({
        lineUserId,
        patientNo,
        firstName: displayName ?? 'ผู้ใช้',
        lastName: '',
        lineLinkedAt: new Date(),
      })
      .returning();

    this.logger.log(`New patient created via LINE: ${patientNo}`);
    return created;
  }

  private async getOrCreateChatSession(
    patientId: string,
    lineUserId: string,
  ): Promise<any> {
    const [existing] = await this.db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.patientId, patientId))
      .where(eq(chatSessions.status, 'active'))
      .limit(1);

    if (existing) return existing;

    const [session] = await this.db
      .insert(chatSessions)
      .values({
        patientId,
        lineUserId,
        sessionType: 'bot',
        status: 'active',
        messageCount: 0,
      })
      .returning();

    return session;
  }

  private async sendMainMenu(replyToken: string): Promise<void> {
    const menuBubble = {
      type: 'bubble' as const,
      body: {
        type: 'box' as const,
        layout: 'vertical' as const,
        contents: [
          {
            type: 'text' as const,
            text: '📋 เมนูบริการ Re-Ya',
            weight: 'bold' as const,
            size: 'lg',
          },
          {
            type: 'text' as const,
            text: 'เลือกบริการที่ต้องการค่ะ',
            size: 'sm',
            color: '#999999',
            margin: 'md',
          },
        ],
      },
      footer: {
        type: 'box' as const,
        layout: 'vertical' as const,
        spacing: 'sm',
        contents: [
          {
            type: 'button' as const,
            style: 'primary' as const,
            color: '#1DB446',
            action: {
              type: 'uri' as const,
              label: '🛒 ร้านค้า',
              uri: this.shopUrl,
            },
          },
          {
            type: 'button' as const,
            style: 'secondary' as const,
            action: {
              type: 'postback' as const,
              label: '📋 อัปโหลดใบสั่งยา',
              data: 'action=rx_upload',
              displayText: 'อัปโหลดใบสั่งยา',
            },
          },
          {
            type: 'button' as const,
            style: 'secondary' as const,
            action: {
              type: 'postback' as const,
              label: '💬 ปรึกษาเภสัชกร',
              data: 'action=consult',
              displayText: 'ขอปรึกษาเภสัชกร',
            },
          },
          {
            type: 'button' as const,
            style: 'secondary' as const,
            action: {
              type: 'postback' as const,
              label: '📦 ติดตามออเดอร์',
              data: 'action=track_order',
              displayText: 'ติดตามออเดอร์',
            },
          },
          {
            type: 'button' as const,
            style: 'secondary' as const,
            action: {
              type: 'postback' as const,
              label: '👤 โปรไฟล์ของฉัน',
              data: 'action=my_profile',
              displayText: 'ดูโปรไฟล์',
            },
          },
        ],
      },
    };

    await this.lineClient.replyMessage(replyToken, [
      {
        type: 'flex',
        altText: 'เมนูบริการ Re-Ya Telepharmacy',
        contents: menuBubble,
      },
    ]);
  }

  private isGreeting(text: string): boolean {
    const greetings = [
      'สวัสดี',
      'หวัดดี',
      'ดีค่ะ',
      'ดีครับ',
      'hello',
      'hi',
      'hey',
      'ดี',
    ];
    return greetings.some((g) => text.startsWith(g));
  }

  private async generatePatientNo(): Promise<string> {
    const result = await this.db
      .select({ patientNo: patients.patientNo })
      .from(patients)
      .orderBy(patients.createdAt)
      .limit(1);

    if (result.length === 0) return 'PT-00001';

    const lastNo = result[0].patientNo ?? 'PT-00000';
    const num = parseInt(lastNo.replace('PT-', ''), 10) + 1;
    return `PT-${num.toString().padStart(5, '0')}`;
  }
}
