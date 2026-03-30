import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { AI_CONFIG } from '@telepharmacy/ai';

export interface ParsedOrderIntent {
  intent: 'buy_otc' | 'refill_request' | 'rx_upload' | 'ask_pharmacist' | 'order_tracking' | 'unknown';
  confidence: number;
  entities: Array<{
    productName: string;
    quantity?: number;
    unit?: string;
    dosageForm?: string;
  }>;
  rawText: string;
}

const ORDER_PARSER_PROMPT = `คุณเป็นระบบ NLP สำหรับร้านขายยาออนไลน์ วิเคราะห์ข้อความจากลูกค้าและสกัด intent + entities ออกมา

Intent ที่เป็นไปได้:
- buy_otc: ต้องการซื้อยาหรือสินค้า OTC
- refill_request: ต้องการเติมยาที่เคยซื้อ/สั่ง
- rx_upload: ต้องการส่งใบสั่งยา
- ask_pharmacist: ต้องการปรึกษาเภสัชกร
- order_tracking: ต้องการติดตามออเดอร์
- unknown: ไม่สามารถระบุได้

ตอบเป็น JSON เท่านั้น:
{
  "intent": "buy_otc",
  "confidence": 0.0-1.0,
  "entities": [
    {
      "productName": "ชื่อยาหรือสินค้า",
      "quantity": 1,
      "unit": "กล่อง",
      "dosageForm": "เม็ด"
    }
  ]
}

กฎ:
- confidence ต้องสะท้อนความมั่นใจจริง ๆ
- ถ้าไม่ชัดเจน ให้ confidence ต่ำ
- entities ใส่เฉพาะที่มีในข้อความ
- ถ้าไม่มี quantity ให้ใส่ 1`;

@Injectable()
export class SmartOrderParserService {
  private readonly logger = new Logger(SmartOrderParserService.name);
  private readonly enabled: boolean;

  constructor(private readonly config: ConfigService) {
    this.enabled = this.config.get<string>('FEATURE_SMART_ORDER', 'false') === 'true';
  }

  get isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Parse free-text chat message into structured order intent + entities.
   * Returns null if feature is disabled.
   */
  async parseMessage(text: string): Promise<ParsedOrderIntent | null> {
    if (!this.enabled) return null;

    const startTime = Date.now();

    try {
      const { text: response } = await generateText({
        model: google(AI_CONFIG.defaultModel),
        system: ORDER_PARSER_PROMPT,
        prompt: text,
        temperature: 0.1,
        maxTokens: 512,
      });

      const elapsed = Date.now() - startTime;
      this.logger.debug(`Smart order parse took ${elapsed}ms`);

      // Enforce execution budget: if > 2s, we'll still return the result but log a warning
      if (elapsed > 2000) {
        this.logger.warn(`Smart order parse exceeded 2s budget: ${elapsed}ms`);
      }

      const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);

      return {
        intent: parsed.intent ?? 'unknown',
        confidence: parsed.confidence ?? 0,
        entities: parsed.entities ?? [],
        rawText: text,
      };
    } catch (error) {
      this.logger.error(`Smart order parse failed: ${error}`);
      // Fallback: return unknown with 0 confidence — rule-based path will handle
      return {
        intent: 'unknown',
        confidence: 0,
        entities: [],
        rawText: text,
      };
    }
  }
}
