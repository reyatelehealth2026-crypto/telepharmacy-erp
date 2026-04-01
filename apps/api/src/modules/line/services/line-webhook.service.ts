import { Injectable, Inject, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import { patients, chatSessions, chatMessages } from '@telepharmacy/db';
import { chatWithPatientSync } from '@telepharmacy/ai';
import { DRIZZLE } from '../../../database/database.constants';
import { LineClientService } from './line-client.service';
import { FlexMessageService } from './flex-message.service';
import { SmartOrderParserService } from './smart-order-parser.service';
import { SentimentService } from './sentiment.service';
import { EventsService } from '../../events/events.service';
import { PrescriptionService } from '../../prescription/prescription.service';
import type {
  LineWebhookEvent,
  LineMessageEvent,
  LineFollowEvent,
  LineUnfollowEvent,
  LinePostbackEvent,
  LineTextMessage,
  LineImageMessage,
} from '../types/line-events.types';

/** Minimum OCR confidence to treat an image as a prescription */
const PRESCRIPTION_OCR_THRESHOLD = 0.4;

@Injectable()
export class LineWebhookService {
  private readonly logger = new Logger(LineWebhookService.name);
  private readonly shopUrl: string;

  constructor(
    @Inject(DRIZZLE) private readonly db: any,
    private readonly lineClient: LineClientService,
    private readonly flexMessage: FlexMessageService,
    private readonly smartOrderParser: SmartOrderParserService,
    private readonly sentimentService: SentimentService,
    private readonly config: ConfigService,
    @Optional() private readonly prescriptionService?: PrescriptionService,
    @Optional() private readonly eventsService?: EventsService,
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

    const [savedMsg] = await this.db.insert(chatMessages).values({
      sessionId: session.id,
      role: 'user',
      content: msg.text,
      lineMessageId: msg.id,
      messageType: 'text',
    }).returning();

    await this.db
      .update(chatSessions)
      .set({
        messageCount: session.messageCount + 1,
        updatedAt: new Date(),
      })
      .where(eq(chatSessions.id, session.id));

    // Emit real-time WebSocket event for admin inbox
    try {
      this.eventsService?.emitChatMessage({
        id: savedMsg.id,
        sessionId: session.id,
        patientId: patient.id,
        content: msg.text,
        role: 'user',
        messageType: 'text',
      });
    } catch (err) {
      this.logger.error(`Failed to emit chat:message for session ${session.id}`, (err as Error).stack);
    }

    // ── Sentiment Analysis (async, non-blocking reply) ──
    this.sentimentService.analyze(msg.text).then(async (sentiment) => {
      try {
        await this.sentimentService.storeSentiment(savedMsg.id, sentiment);

        if (await this.sentimentService.shouldEscalate(session.id)) {
          await this.sentimentService.escalateSession(
            session.id,
            `Auto-escalated: consecutive negative sentiment (${sentiment.label}/${sentiment.score})`,
          );
          // Notify patient
          await this.lineClient.pushMessage(userId, [
            {
              type: 'text',
              text: '🙏 ขออภัยในความไม่สะดวกค่ะ กำลังเชื่อมต่อเภสัชกรให้ดูแลเป็นพิเศษค่ะ',
            },
          ]);
        }
      } catch (err) {
        this.logger.error('Sentiment analysis error', err);
      }
    });

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

    // ── Smart Order Recognition (feature-flagged) ──
    const parsed = await this.smartOrderParser.parseMessage(msg.text);
    if (parsed && parsed.intent === 'buy_otc' && parsed.confidence >= 0.7 && parsed.entities.length > 0) {
      const entityList = parsed.entities
        .map((e) => `• ${e.productName}${e.quantity ? ` x${e.quantity}` : ''}${e.unit ? ` ${e.unit}` : ''}`)
        .join('\n');

      await this.lineClient.replyMessage(event.replyToken, [
        {
          type: 'text',
          text: `🛒 เข้าใจค่ะ คุณต้องการสั่ง:\n${entityList}\n\nเปิดร้านค้าเพื่อเพิ่มลงตะกร้าได้เลยค่ะ:\n${this.shopUrl}`,
        },
      ]);
      return;
    }

    if (parsed && parsed.intent === 'order_tracking') {
      await this.lineClient.replyMessage(event.replyToken, [
        {
          type: 'text',
          text: `📦 ติดตามออเดอร์ได้ที่:\n${this.shopUrl}/orders`,
        },
      ]);
      return;
    }

    // ── AI Chatbot Response → fallback to staff inbox ──
    await this.handleAiChatbotResponse(event, msg.text, session, patient);
  }

  /**
   * Try AI chatbot first. If AI confidence is below threshold or AI
   * explicitly says it can't handle (shouldTransfer), fall back to
   * the staff inbox message.
   */
  private async handleAiChatbotResponse(
    event: LineMessageEvent,
    text: string,
    session: any,
    _patient: any,
  ): Promise<void> {

    try {
      const aiResponse = await chatWithPatientSync(text, [], undefined);

      // Determine if AI can handle this query
      const aiCanHandle =
        !aiResponse.shouldTransfer &&
        aiResponse.message &&
        aiResponse.message.length > 0;

      if (aiCanHandle) {
        // Save AI response to chat
        await this.db.insert(chatMessages).values({
          sessionId: session.id,
          role: 'bot',
          content: aiResponse.message,
          messageType: 'text',
          aiModel: 'gemini-2.5-pro',
        });

        const replyMessages: any[] = [
          { type: 'text', text: aiResponse.message },
        ];

        // Add disclaimer if present
        if (aiResponse.disclaimer) {
          replyMessages.push({
            type: 'text',
            text: `⚠️ ${aiResponse.disclaimer}`,
          });
        }

        // If AI suggests transferring to pharmacist, add a button
        if (aiResponse.products && aiResponse.products.length > 0) {
          replyMessages.push({
            type: 'text',
            text: `🛒 ดูสินค้าแนะนำได้ที่:\n${this.shopUrl}/search`,
          });
        }

        await this.lineClient.replyMessage(event.replyToken, replyMessages);

        // Update session type to ai_assisted
        await this.db
          .update(chatSessions)
          .set({ sessionType: 'ai_assisted', updatedAt: new Date() })
          .where(eq(chatSessions.id, session.id));

        return;
      }
    } catch (err) {
      this.logger.error(`AI chatbot error: ${(err as Error).message}`);
    }

    // Fallback to staff inbox
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

    // ── Attempt prescription OCR ──
    try {
      const imageBuffer = await this.lineClient.getMessageContent(msg.id);
      const base64 = Buffer.from(imageBuffer).toString('base64');

      const { extractPrescription } = require('@telepharmacy/ai/ocr') as {
        extractPrescription: (b64: string, mime: string) => Promise<{ confidence: number; items: any[]; prescriber: { name: string } }>;
      };

      const ocrResult = await extractPrescription(base64, 'image/jpeg');

      if (
        ocrResult.confidence >= PRESCRIPTION_OCR_THRESHOLD &&
        ocrResult.items.length > 0 &&
        this.prescriptionService
      ) {
        // Prescription detected — create a record automatically
        const rx = await this.prescriptionService.create(patient.id, {
          source: 'line_chat',
          diagnosis: undefined,
          // Note: imageUrls not available directly from LINE content API,
          // the OCR processor will handle the image via the prescription record
        });

        const itemList = ocrResult.items
          .slice(0, 5)
          .map((item: any) => `• ${item.drugName}${item.strength ? ` ${item.strength}` : ''}`)
          .join('\n');

        await this.lineClient.replyMessage(event.replyToken, [
          {
            type: 'text',
            text: `📋 ตรวจพบใบสั่งยาค่ะ!\nหมายเลข: ${rx.rxNo}\n\nรายการยาที่พบ:\n${itemList}\n\nเภสัชกรจะตรวจสอบและยืนยันให้ค่ะ 💊`,
          },
          {
            type: 'text',
            text: `📱 ติดตามสถานะใบสั่งยาได้ที่:\n${this.shopUrl}/rx/${rx.id}`,
          },
        ]);

        this.logger.log(
          `Auto-created prescription ${rx.rxNo} from LINE image (confidence: ${ocrResult.confidence})`,
        );
        return;
      }
    } catch (err) {
      this.logger.error(`Prescription OCR attempt failed: ${(err as Error).message}`);
    }

    // Not a prescription or OCR failed — route to staff inbox
    await this.lineClient.replyMessage(event.replyToken, [
      {
        type: 'text',
        text: '📷 ได้รับรูปภาพแล้วค่ะ\nเภสัชกรจะตรวจสอบและตอบกลับโดยเร็วที่สุดค่ะ 🙏\n\nหากต้องการส่งใบสั่งยา กดที่:\n' +
          `${this.shopUrl}/rx/upload`,
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

    const patient = await this.findOrCreatePatient(userId, displayName);

    // Send welcome Flex Message with quick action buttons
    const welcomeMessage = this.flexMessage.welcome({
      displayName,
      shopUrl: this.shopUrl,
    });

    // Add registration prompt if patient hasn't completed profile
    const needsRegistration = !patient.phone || !patient.dateOfBirth;

    const messages: any[] = [welcomeMessage];

    if (needsRegistration) {
      messages.push({
        type: 'text',
        text: `📝 กรุณาลงทะเบียนข้อมูลเพื่อรับบริการที่ดียิ่งขึ้นค่ะ\n\n👤 ลงทะเบียนที่:\n${this.shopUrl}/profile/edit`,
      });
    }

    await this.lineClient.replyMessage(event.replyToken, messages);
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
