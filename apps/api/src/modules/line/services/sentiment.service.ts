import { Injectable, Inject, Logger } from '@nestjs/common';
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { AI_CONFIG } from '@telepharmacy/ai';
import { eq, and, desc } from 'drizzle-orm';
import { chatMessages, chatSessions } from '@telepharmacy/db';
import { DRIZZLE } from '../../../database/database.constants';

export type SentimentLabel = 'positive' | 'neutral' | 'negative' | 'angry';

export interface SentimentResult {
  label: SentimentLabel;
  score: number;
}

const SENTIMENT_PROMPT = `วิเคราะห์อารมณ์ของข้อความภาษาไทยจากลูกค้าร้านขายยาออนไลน์

ตอบเป็น JSON เท่านั้น:
{
  "label": "positive|neutral|negative|angry",
  "score": 0.0-1.0
}

กฎ:
- positive = ขอบคุณ, ดีใจ, พอใจ
- neutral = สอบถามข้อมูลปกติ, ไม่มีอารมณ์ชัด
- negative = ไม่พอใจ, ผิดหวัง, รำคาญ
- angry = โกรธ, ด่า, คำหยาบ, ขู่
- score สะท้อนความเข้มข้นของอารมณ์ (0.0 = ไม่มี, 1.0 = มากที่สุด)`;

@Injectable()
export class SentimentService {
  private readonly logger = new Logger(SentimentService.name);

  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  /**
   * Analyze sentiment of a text message.
   */
  async analyze(text: string): Promise<SentimentResult> {
    try {
      const { text: response } = await generateText({
        model: google(AI_CONFIG.defaultModel),
        system: SENTIMENT_PROMPT,
        prompt: text,
        temperature: 0.1,
        maxTokens: 128,
      });

      const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);

      return {
        label: parsed.label ?? 'neutral',
        score: typeof parsed.score === 'number' ? parsed.score : 0.5,
      };
    } catch {
      return { label: 'neutral', score: 0.5 };
    }
  }

  /**
   * Store sentiment on a chat message.
   */
  async storeSentiment(messageId: string, sentiment: SentimentResult) {
    await this.db
      .update(chatMessages)
      .set({
        sentiment: sentiment.label,
        sentimentScore: String(sentiment.score),
      })
      .where(eq(chatMessages.id, messageId));
  }

  /**
   * Check if escalation is needed based on recent message sentiments.
   * Rule: 2 consecutive negative/angry messages with score >= 0.75 triggers escalation.
   */
  async shouldEscalate(sessionId: string): Promise<boolean> {
    const recentMessages = await this.db
      .select({
        sentiment: chatMessages.sentiment,
        sentimentScore: chatMessages.sentimentScore,
      })
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.sessionId, sessionId),
          eq(chatMessages.role, 'user'),
        ),
      )
      .orderBy(desc(chatMessages.createdAt))
      .limit(2);

    if (recentMessages.length < 2) return false;

    const isNegative = (msg: any) => {
      const label = msg.sentiment;
      const score = parseFloat(msg.sentimentScore ?? '0');
      return (label === 'angry' || label === 'negative') && score >= 0.75;
    };

    return recentMessages.every(isNegative);
  }

  /**
   * Escalate a chat session to staff queue.
   */
  async escalateSession(sessionId: string, reason: string) {
    await this.db
      .update(chatSessions)
      .set({
        sessionType: 'pharmacist',
        transferredReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(chatSessions.id, sessionId));

    this.logger.warn(`Chat session ${sessionId} escalated: ${reason}`);
  }
}
