import { Injectable, Inject, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, eq, sql } from 'drizzle-orm';
import { patients, chatSessions, chatMessages } from '@telepharmacy/db';
import { chatWithPatientSync } from '@telepharmacy/ai';
import { DRIZZLE } from '../../../database/database.constants';
import { LineClientService } from './line-client.service';
import { FlexMessageService } from './flex-message.service';
import { SmartOrderParserService } from './smart-order-parser.service';
import { SentimentService } from './sentiment.service';
import { LineContactJourneyService } from './line-contact-journey.service';
import { LineWebhookLogService } from './line-webhook-log.service';
import { LineAutomationService } from './line-automation.service';
import { AuditService } from '../../audit/audit.service';
import { EventsService } from '../../events/events.service';
import { PrescriptionService } from '../../prescription/prescription.service';
import { DynamicConfigService } from '../../health/dynamic-config.service';
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
    private readonly journeyService: LineContactJourneyService,
    private readonly webhookLogService: LineWebhookLogService,
    private readonly lineAutomation: LineAutomationService,
    private readonly auditService: AuditService,
    private readonly config: ConfigService,
    private readonly dynamicConfig: DynamicConfigService,
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

  /**
   * Re-process a failed webhook from stored payload. Creates a new log row (audit via replayedFromEventId).
   */
  async replayFailedEvent(sourceEventId: string, staffId: string) {
    const row = await this.webhookLogService.createReplayFromFailed(sourceEventId, staffId);
    await this.auditService.log({
      tableName: 'line_webhook_events',
      recordId: row.id,
      action: 'line_webhook_replay',
      newValues: { sourceEventId, replayEventId: row.id },
      changedBy: staffId,
    });
    const event = row.payload as LineWebhookEvent;
    await this.runProcessingPipeline(event, row.id);
    return this.webhookLogService.getEvent(row.id);
  }

  private async routeEvent(event: LineWebhookEvent): Promise<void> {
    if (event.mode === 'standby') return;

    const loggedEvent = await this.webhookLogService.beginProcessing(event);

    if (loggedEvent.duplicate) {
      this.logger.debug(`Duplicate LINE webhook skipped: ${loggedEvent.record.providerEventKey}`);
      return;
    }

    await this.runProcessingPipeline(event, loggedEvent.record.id);
  }

  /** Core handler path for both live webhooks and staff-initiated replays (dedupe already resolved). */
  private async runProcessingPipeline(event: LineWebhookEvent, eventId: string): Promise<void> {
    if (event.mode === 'standby') {
      await this.webhookLogService.markProcessed(eventId, { skipped: 'standby_mode' });
      return;
    }

    await this.webhookLogService.markProcessing(eventId);

    try {
      switch (event.type) {
        case 'message':
          await this.handleMessage(event, eventId);
          break;
        case 'follow':
          await this.handleFollow(event, eventId);
          break;
        case 'unfollow':
          await this.handleUnfollow(event);
          break;
        case 'postback':
          await this.handlePostback(event, eventId);
          break;
        default:
          this.logger.debug(`Unhandled event type: ${(event as any).type}`);
      }

      await this.webhookLogService.markProcessed(eventId);
    } catch (error) {
      await this.webhookLogService.markFailed(eventId, error);
      this.logger.error(
        `Error processing ${event.type} event: ${error instanceof Error ? error.message : error}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  // ─── Message Handlers ──────────────────────────────────────────

  private async handleMessage(event: LineMessageEvent, eventId: string): Promise<void> {
    const userId = event.source.userId;
    if (!userId) return;

    const patient = await this.findOrCreatePatient(userId);

    await this.journeyService.upsertJourney({
      patientId: patient.id,
      lineUserId: userId,
      state: this.journeyService.isPatientRegistered(patient)
        ? 'linked_returning'
        : 'stub_unfinished',
      currentStep: 'message_received',
      sourceEventId: eventId,
    });

    await this.webhookLogService.attachContext(eventId, {
      patientId: patient.id,
    });

    switch (event.message.type) {
      case 'text':
        await this.handleTextMessage(event, patient, eventId);
        break;
      case 'image':
        await this.handleImageMessage(event, patient, eventId);
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
    eventId: string,
  ): Promise<void> {
    const msg = event.message as LineTextMessage;
    const userId = event.source.userId!;
    const triage = this.classifyTextMessage(msg.text, patient);

    const session = await this.getOrCreateChatSession(patient.id, userId, {
      entryPoint: 'message',
      entryIntent: triage.entryIntent,
      queueStatus: triage.queueStatus,
      priority: triage.priority,
    });

    await this.webhookLogService.attachContext(eventId, {
      patientId: patient.id,
      sessionId: session.id,
      processingData: {
        entryIntent: triage.entryIntent,
        queueStatus: triage.queueStatus,
        priority: triage.priority,
      },
    });

    const now = new Date();

    const [savedMsg] = await this.db.insert(chatMessages).values({
      sessionId: session.id,
      role: 'user',
      content: msg.text,
      lineMessageId: msg.id,
      messageType: 'text',
      metadata: {
        entryIntent: triage.entryIntent,
        queueStatus: triage.queueStatus,
        priority: triage.priority,
      },
    }).returning();

    await this.db
      .update(chatSessions)
      .set({
        messageCount: session.messageCount + 1,
        entryPoint: 'message',
        entryIntent: triage.entryIntent,
        queueStatus: triage.queueStatus,
        priority: triage.priority,
        lastInboundAt: now,
        updatedAt: now,
      })
      .where(eq(chatSessions.id, session.id));

    void this.lineAutomation
      .applyIntentTag(patient.id, triage.entryIntent)
      .catch((err) => this.logger.warn(`applyIntentTag: ${(err as Error).message}`));

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
      await this.markOutboundActivity(session.id, {
        queueStatus: 'self_service',
      });
      return;
    }

    if (text === 'เมนู' || text === 'menu') {
      await this.sendMainMenu(event.replyToken, patient);
      await this.markOutboundActivity(session.id, {
        queueStatus: 'self_service',
      });
      return;
    }

    if (triage.entryIntent === 'register' && !this.journeyService.isPatientRegistered(patient)) {
      await this.lineClient.replyMessage(event.replyToken, [
        {
          type: 'text',
          text: `📝 สมัครสมาชิกหรือกรอกข้อมูลเพิ่มเติมได้ที่:\n${this.shopUrl}/login`,
        },
      ]);
      await this.markOutboundActivity(session.id, {
        queueStatus: 'self_service',
      });
      return;
    }

    if (triage.entryIntent === 'link_account') {
      await this.lineClient.replyMessage(event.replyToken, [
        {
          type: 'text',
          text: `🔗 เชื่อมบัญชีเดิมได้ที่:\n${this.shopUrl}/line/link\n\nกรุณาเตรียมหมายเลขสมาชิก เบอร์โทร และวันเดือนปีเกิดค่ะ`,
        },
      ]);
      await this.markOutboundActivity(session.id, {
        queueStatus: 'self_service',
      });

      await this.journeyService.upsertJourney({
        patientId: patient.id,
        lineUserId: userId,
        state: 'link_pending',
        currentStep: 'link_prompted',
        metadata: { sessionId: session.id },
      });
      return;
    }

    if (text.includes('สั่งยา') || text.includes('ซื้อยา')) {
      await this.lineClient.replyMessage(event.replyToken, [
        {
          type: 'text',
          text: `เปิดร้านค้าเพื่อสั่งซื้อยาและผลิตภัณฑ์สุขภาพได้เลยค่ะ 🛒\n${this.shopUrl}`,
        },
      ]);
      await this.markOutboundActivity(session.id, {
        queueStatus: 'self_service',
      });
      return;
    }

    if (text.includes('ใบสั่งยา') || text === 'rx') {
      await this.markSessionNeedsHuman(
        session.id,
        {
          entryIntent: 'rx_upload',
          priority: triage.priority,
          reason: 'rx_upload_requested',
        },
        patient.id,
      );

      await this.lineClient.replyMessage(event.replyToken, [
        {
          type: 'text',
          text: `📋 ส่งรูปใบสั่งยามาได้เลยค่ะ\nหรือเปิดหน้าอัปโหลดที่:\n${this.shopUrl}/rx/upload`,
        },
      ]);
      await this.markOutboundActivity(session.id, {
        queueStatus: 'needs_human',
      });
      return;
    }

    if (text.includes('ปรึกษา') || text.includes('เภสัชกร')) {
      await this.markSessionNeedsHuman(
        session.id,
        {
          entryIntent: 'consult',
          priority: triage.priority,
          reason: triage.handoffReason ?? 'consult_requested',
        },
        patient.id,
      );

      await this.lineClient.replyMessage(event.replyToken, [
        {
          type: 'text',
          text: '💬 กรุณารอสักครู่ค่ะ กำลังเชื่อมต่อเภสัชกรให้...\nหากต้องการปรึกษาทันที กดลิงก์ด้านล่างค่ะ',
        },
      ]);
      await this.markOutboundActivity(session.id, {
        queueStatus: 'needs_human',
      });
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
      await this.markOutboundActivity(session.id, {
        queueStatus: 'self_service',
      });
      return;
    }

    if (parsed && parsed.intent === 'order_tracking') {
      await this.lineClient.replyMessage(event.replyToken, [
        {
          type: 'text',
          text: `📦 ติดตามออเดอร์ได้ที่:\n${this.shopUrl}/orders`,
        },
      ]);
      await this.markOutboundActivity(session.id, {
        queueStatus: 'self_service',
      });
      return;
    }

    if (triage.queueStatus === 'needs_human') {
      await this.markSessionNeedsHuman(
        session.id,
        {
          entryIntent: triage.entryIntent,
          priority: triage.priority,
          reason: triage.handoffReason ?? 'manual_triage',
        },
        patient.id,
      );

      await this.lineClient.replyMessage(event.replyToken, [
        {
          type: 'text',
          text: '🙏 ได้รับข้อความแล้วค่ะ เรื่องนี้กำลังส่งต่อให้เภสัชกรช่วยดูแลโดยเร็วที่สุด',
        },
      ]);
      await this.markOutboundActivity(session.id, {
        queueStatus: 'needs_human',
      });
      return;
    }

    // ── AI Chatbot Response → fallback to staff inbox ──
    await this.handleAiChatbotResponse(event, msg.text, session, patient, triage);
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
    patient: any,
    triage: {
      entryIntent: 'consult' | 'register' | 'link_account' | 'rx_upload' | 'order_tracking' | 'product_search' | 'other';
      queueStatus: 'self_service' | 'needs_human' | 'assigned' | 'resolved';
      priority: 'normal' | 'urgent';
      handoffReason?: string;
    },
  ): Promise<void> {

    try {
      const geminiApiKey = await this.dynamicConfig.resolve('ai.geminiApiKey', 'GEMINI_API_KEY');
      const aiResponse = await chatWithPatientSync(text, [], undefined, {
        geminiApiKey: geminiApiKey?.trim() || undefined,
      });

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
          metadata: {
            entryIntent: triage.entryIntent,
            source: 'ai',
          },
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
          .set({
            sessionType: 'ai_assisted',
            queueStatus: 'self_service',
            entryIntent: triage.entryIntent,
            priority: triage.priority,
            lastOutboundAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(chatSessions.id, session.id));

        return;
      }
    } catch (err) {
      this.logger.error(`AI chatbot error: ${(err as Error).message}`);
    }

    // Fallback to staff inbox
    await this.markSessionNeedsHuman(
      session.id,
      {
        entryIntent: triage.entryIntent,
        priority: triage.priority,
        reason: triage.handoffReason ?? 'ai_fallback',
      },
      patient.id,
    );

    await this.createSystemMessage(
      session.id,
      'ระบบส่งต่อการสนทนาให้เภสัชกรดูแลต่อ',
      {
        handoffReason: triage.handoffReason ?? 'ai_fallback',
        patientId: patient.id,
      },
      patient.id,
    );

    await this.lineClient.replyMessage(event.replyToken, [
      {
        type: 'text',
        text: `ขอบคุณสำหรับข้อความค่ะ 🙏\nเภสัชกรจะตอบกลับโดยเร็วที่สุดค่ะ\n\nพิมพ์ "เมนู" เพื่อดูบริการทั้งหมด`,
      },
    ]);
    await this.markOutboundActivity(session.id, {
      queueStatus: 'needs_human',
    });
  }

  private async handleImageMessage(
    event: LineMessageEvent,
    patient: any,
    eventId: string,
  ): Promise<void> {
    const msg = event.message as LineImageMessage;
    const userId = event.source.userId!;

    const session = await this.getOrCreateChatSession(patient.id, userId, {
      entryPoint: 'message',
      entryIntent: 'rx_upload',
      queueStatus: 'needs_human',
      priority: 'normal',
    });

    await this.webhookLogService.attachContext(eventId, {
      patientId: patient.id,
      sessionId: session.id,
      processingData: {
        entryIntent: 'rx_upload',
        queueStatus: 'needs_human',
        priority: 'normal',
      },
    });

    const now = new Date();

    await this.db.insert(chatMessages).values({
      sessionId: session.id,
      role: 'user',
      content: '[รูปภาพ]',
      lineMessageId: msg.id,
      messageType: 'image',
      metadata: {
        entryIntent: 'rx_upload',
        queueStatus: 'needs_human',
      },
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
        entryPoint: 'message',
        entryIntent: 'rx_upload',
        queueStatus: 'needs_human',
        priority: 'normal',
        lastInboundAt: now,
        updatedAt: now,
      })
      .where(eq(chatSessions.id, session.id));

    void this.lineAutomation
      .applyIntentTag(patient.id, 'rx_upload')
      .catch((err) => this.logger.warn(`applyIntentTag: ${(err as Error).message}`));

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

        await this.createSystemMessage(
          session.id,
          `ระบบตรวจพบใบสั่งยาและสร้างรายการ ${rx.rxNo}`,
          { prescriptionId: rx.id },
          patient.id,
        );

        await this.markOutboundActivity(session.id, {
          queueStatus: 'needs_human',
        });

        this.logger.log(
          `Auto-created prescription ${rx.rxNo} from LINE image (confidence: ${ocrResult.confidence})`,
        );
        return;
      }
    } catch (err) {
      this.logger.error(`Prescription OCR attempt failed: ${(err as Error).message}`);
    }

    // Not a prescription or OCR failed — route to staff inbox
    await this.markSessionNeedsHuman(
      session.id,
      {
        entryIntent: 'rx_upload',
        priority: 'normal',
        reason: 'image_received',
      },
      patient.id,
    );

    await this.lineClient.replyMessage(event.replyToken, [
      {
        type: 'text',
        text: '📷 ได้รับรูปภาพแล้วค่ะ\nเภสัชกรจะตรวจสอบและตอบกลับโดยเร็วที่สุดค่ะ 🙏\n\nหากต้องการส่งใบสั่งยา กดที่:\n' +
          `${this.shopUrl}/rx/upload`,
      },
    ]);
    await this.markOutboundActivity(session.id, {
      queueStatus: 'needs_human',
    });
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

  private async handleFollow(event: LineFollowEvent, eventId: string): Promise<void> {
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
    const isRegistered = this.journeyService.isPatientRegistered(patient);

    await this.journeyService.upsertJourney({
      patientId: patient.id,
      lineUserId: userId,
      state: isRegistered ? 'linked_returning' : 'new_unregistered',
      currentStep: 'follow',
      sourceEventId: eventId,
      metadata: { displayName },
    });

    await this.webhookLogService.attachContext(eventId, {
      patientId: patient.id,
      processingData: {
        state: isRegistered ? 'linked_returning' : 'new_unregistered',
      },
    });

    // Send welcome Flex Message with quick action buttons
    const welcomeMessage = this.flexMessage.welcome({
      displayName,
      shopUrl: this.shopUrl,
      registerUrl: `${this.shopUrl}/login`,
      linkUrl: `${this.shopUrl}/line/link`,
      profileUrl: `${this.shopUrl}/profile`,
      rxUploadUrl: `${this.shopUrl}/rx/upload`,
      isRegistered,
    });

    // Add registration prompt if patient hasn't completed profile
    const needsRegistration = !patient.phone || !patient.dateOfBirth;

    const messages: any[] = [welcomeMessage];

    if (needsRegistration) {
      messages.push({
        type: 'text',
        text: `📝 กรุณาลงทะเบียนข้อมูลเพื่อรับบริการที่ดียิ่งขึ้นค่ะ\n\n👤 ลงทะเบียนที่:\n${this.shopUrl}/login`,
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

  private async handlePostback(event: LinePostbackEvent, eventId: string): Promise<void> {
    const userId = event.source.userId;
    if (!userId) return;

    const patient = await this.findOrCreatePatient(userId);

    const params = new URLSearchParams(event.postback.data);
    const action = params.get('action');

    await this.journeyService.upsertJourney({
      patientId: patient.id,
      lineUserId: userId,
      state: this.journeyService.isPatientRegistered(patient)
        ? 'linked_returning'
        : 'stub_unfinished',
      currentStep: action ?? 'postback',
      sourceEventId: eventId,
    });

    await this.webhookLogService.attachContext(eventId, {
      patientId: patient.id,
      processingData: { action },
    });

    switch (action) {
      case 'consult': {
        const session = await this.getOrCreateChatSession(patient.id, userId, {
          entryPoint: 'postback',
          entryIntent: 'consult',
          queueStatus: 'needs_human',
          priority: 'normal',
        });

        await this.webhookLogService.attachContext(eventId, {
          patientId: patient.id,
          sessionId: session.id,
          processingData: { action, entryIntent: 'consult' },
        });

        await this.markSessionNeedsHuman(
          session.id,
          {
            entryIntent: 'consult',
            priority: 'normal',
            reason: 'consult_postback',
          },
          patient.id,
        );

        await this.lineClient.replyMessage(event.replyToken, [
          {
            type: 'text',
            text: '💬 กรุณาพิมพ์อาการหรือคำถามที่ต้องการปรึกษาเภสัชกรค่ะ\nเภสัชกรจะตอบกลับโดยเร็วที่สุดค่ะ',
          },
        ]);
        await this.markOutboundActivity(session.id, {
          queueStatus: 'needs_human',
        });
        break;
      }

      case 'menu':
        await this.sendMainMenu(event.replyToken, patient);
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
        await this.journeyService.upsertJourney({
          patientId: patient.id,
          lineUserId: userId,
          state: this.journeyService.isPatientRegistered(patient)
            ? 'linked_returning'
            : 'stub_unfinished',
          currentStep: 'rx_upload_prompted',
          sourceEventId: eventId,
        });
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

      case 'link_account':
        await this.lineClient.replyMessage(event.replyToken, [
          {
            type: 'text',
            text: `🔗 เชื่อมบัญชีเดิมได้ที่:\n${this.shopUrl}/line/link\n\nกรุณาเตรียมหมายเลขสมาชิก เบอร์โทร และวันเดือนปีเกิดค่ะ`,
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
    // First check if patient already exists
    const [existing] = await this.db
      .select()
      .from(patients)
      .where(eq(patients.lineUserId, lineUserId))
      .limit(1);

    if (existing) return existing;

    // Generate patient number and attempt insert with conflict handling
    const patientNo = await this.generatePatientNo();
    try {
      const [created] = await this.db
        .insert(patients)
        .values({
          lineUserId,
          patientNo,
          firstName: displayName ?? 'ผู้ใช้',
          lastName: '',
          lineLinkedAt: new Date(),
        })
        .onConflictDoNothing({ target: patients.lineUserId })
        .returning();

      // If conflict occurred, returning() gives empty — re-fetch
      if (!created) {
        const [refetched] = await this.db
          .select()
          .from(patients)
          .where(eq(patients.lineUserId, lineUserId))
          .limit(1);
        return refetched;
      }

      this.logger.log(`New patient created via LINE: ${patientNo}`);
      return created;
    } catch (error: any) {
      // Handle race condition: if duplicate key on patientNo, re-fetch
      if (error?.code === '23505') {
        const [refetched] = await this.db
          .select()
          .from(patients)
          .where(eq(patients.lineUserId, lineUserId))
          .limit(1);
        if (refetched) return refetched;
      }
      throw error;
    }
  }

  private async getOrCreateChatSession(
    patientId: string,
    lineUserId: string,
    routing?: {
      entryPoint?: 'follow' | 'message' | 'postback' | 'rich_menu' | 'liff';
      entryIntent?: 'consult' | 'register' | 'link_account' | 'rx_upload' | 'order_tracking' | 'product_search' | 'other';
      queueStatus?: 'self_service' | 'needs_human' | 'assigned' | 'resolved';
      priority?: 'normal' | 'urgent';
    },
  ): Promise<any> {
    const [existing] = await this.db
      .select()
      .from(chatSessions)
      .where(
        and(
          eq(chatSessions.patientId, patientId),
          eq(chatSessions.status, 'active'),
        ),
      )
      .limit(1);

    if (existing) return existing;

    const [session] = await this.db
      .insert(chatSessions)
      .values({
        patientId,
        lineUserId,
        entryPoint: routing?.entryPoint,
        entryIntent: routing?.entryIntent,
        queueStatus: routing?.queueStatus ?? 'self_service',
        priority: routing?.priority ?? 'normal',
        sessionType: 'bot',
        status: 'active',
        messageCount: 0,
      })
      .returning();

    return session;
  }

  private async sendMainMenu(replyToken: string, patient?: any): Promise<void> {
    const isRegistered = this.journeyService.isPatientRegistered(patient);
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
              type: 'uri' as const,
              label: isRegistered ? '👤 โปรไฟล์ของฉัน' : '📝 สมัครสมาชิก',
              uri: isRegistered ? `${this.shopUrl}/profile` : `${this.shopUrl}/login`,
            },
          },
          {
            type: 'button' as const,
            style: 'secondary' as const,
            action: {
              type: 'uri' as const,
              label: '🔗 เชื่อมบัญชีเดิม',
              uri: `${this.shopUrl}/line/link`,
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

  private classifyTextMessage(text: string, patient: any) {
    const normalized = text.trim().toLowerCase();
    const isUrgent = this.isUrgentText(normalized);

    if (!this.journeyService.isPatientRegistered(patient) && (normalized.includes('สมัคร') || normalized.includes('ลงทะเบียน'))) {
      return {
        entryIntent: 'register' as const,
        queueStatus: 'self_service' as const,
        priority: 'normal' as const,
      };
    }

    if (normalized.includes('เชื่อม') || normalized.includes('บัญชีเดิม')) {
      return {
        entryIntent: 'link_account' as const,
        queueStatus: 'self_service' as const,
        priority: 'normal' as const,
      };
    }

    if (normalized.includes('ปรึกษา') || normalized.includes('เภสัชกร')) {
      return {
        entryIntent: 'consult' as const,
        queueStatus: 'needs_human' as const,
        priority: isUrgent ? 'urgent' as const : 'normal' as const,
        handoffReason: isUrgent ? 'urgent_consult' : 'consult_requested',
      };
    }

    if (normalized.includes('ใบสั่งยา') || normalized === 'rx') {
      return {
        entryIntent: 'rx_upload' as const,
        queueStatus: 'needs_human' as const,
        priority: 'normal' as const,
        handoffReason: 'rx_upload_requested',
      };
    }

    if (normalized.includes('ติดตาม') || normalized.includes('ออเดอร์')) {
      return {
        entryIntent: 'order_tracking' as const,
        queueStatus: 'self_service' as const,
        priority: 'normal' as const,
      };
    }

    if (normalized.includes('สั่งยา') || normalized.includes('ซื้อยา') || normalized.includes('หาสินค้า')) {
      return {
        entryIntent: 'product_search' as const,
        queueStatus: 'self_service' as const,
        priority: 'normal' as const,
      };
    }

    if (isUrgent) {
      return {
        entryIntent: 'consult' as const,
        queueStatus: 'needs_human' as const,
        priority: 'urgent' as const,
        handoffReason: 'urgent_health_signal',
      };
    }

    return {
      entryIntent: 'other' as const,
      queueStatus: 'self_service' as const,
      priority: 'normal' as const,
    };
  }

  private isUrgentText(text: string): boolean {
    const urgentKeywords = [
      'ฉุกเฉิน',
      'หายใจไม่ออก',
      'แน่นหน้าอก',
      'หมดสติ',
      'เลือด',
      'แพ้ยา',
      'ชัก',
      'ใจสั่น',
    ];

    return urgentKeywords.some((keyword) => text.includes(keyword));
  }

  private async markSessionNeedsHuman(
    sessionId: string,
    routing: {
      entryIntent: 'consult' | 'register' | 'link_account' | 'rx_upload' | 'order_tracking' | 'product_search' | 'other';
      priority: 'normal' | 'urgent';
      reason: string;
    },
    patientId?: string,
  ) {
    await this.db
      .update(chatSessions)
      .set({
        sessionType: 'pharmacist',
        entryIntent: routing.entryIntent,
        queueStatus: 'needs_human',
        priority: routing.priority,
        transferredReason: routing.reason,
        updatedAt: new Date(),
      })
      .where(eq(chatSessions.id, sessionId));

    if (patientId) {
      void this.lineAutomation
        .applyIntentTag(patientId, routing.entryIntent)
        .catch((err) => this.logger.warn(`applyIntentTag: ${(err as Error).message}`));
    }
  }

  private async markOutboundActivity(
    sessionId: string,
    state?: {
      queueStatus?: 'self_service' | 'needs_human' | 'assigned' | 'resolved';
    },
  ) {
    await this.db
      .update(chatSessions)
      .set({
        queueStatus: state?.queueStatus,
        lastOutboundAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(chatSessions.id, sessionId));
  }

  private async createSystemMessage(
    sessionId: string,
    content: string,
    metadata: Record<string, unknown>,
    patientId: string,
  ) {
    const [message] = await this.db
      .insert(chatMessages)
      .values({
        sessionId,
        role: 'system',
        messageKind: 'system_event',
        content,
        messageType: 'system',
        metadata,
      })
      .returning();

    this.emitChatMessage(message, sessionId, patientId);
    return message;
  }

  private emitChatMessage(message: any, sessionId: string, patientId: string) {
    try {
      this.eventsService?.emitChatMessage({
        id: message.id,
        sessionId,
        patientId,
        content: message.content,
        role: message.role,
        messageType: message.messageType,
      });
    } catch (err) {
      this.logger.error(`Failed to emit chat:message for session ${sessionId}`, (err as Error).stack);
    }
  }

  private async generatePatientNo(): Promise<string> {
    // Use MAX to get the highest patient number directly (avoids sorting issues)
    const result = await this.db
      .select({ maxNo: sql<string>`MAX(${patients.patientNo})` })
      .from(patients);

    const lastNo = result[0]?.maxNo ?? 'PT-00000';
    const num = parseInt(lastNo.replace('PT-', ''), 10) + 1;
    return `PT-${num.toString().padStart(5, '0')}`;
  }
}
