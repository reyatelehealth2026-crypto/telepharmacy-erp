import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and, gt } from 'drizzle-orm';
import { chatSessions, chatMessages } from '@telepharmacy/db';
import { DRIZZLE } from '../../../database/database.constants';

@Injectable()
export class ChatService {
  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  async getOrCreateSession(patientId: string) {
    // Find existing active session
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

    if (existing) {
      return { data: existing };
    }

    // Create new session
    const [session] = await this.db
      .insert(chatSessions)
      .values({
        patientId,
        sessionType: 'bot',
        status: 'active',
        messageCount: 0,
      })
      .returning();

    // Add welcome message
    await this.db.insert(chatMessages).values({
      sessionId: session.id,
      role: 'system',
      content: 'สวัสดีค่ะ ยินดีให้คำปรึกษาค่ะ มีอะไรให้ช่วยเหลือคะ?',
      messageType: 'text',
    });

    return { data: session };
  }

  async getMessages(
    sessionId: string,
    patientId: string,
    after?: string,
    limit = 50,
  ) {
    // Verify session belongs to patient
    const [session] = await this.db
      .select()
      .from(chatSessions)
      .where(
        and(
          eq(chatSessions.id, sessionId),
          eq(chatSessions.patientId, patientId),
        ),
      )
      .limit(1);

    if (!session) throw new NotFoundException('Session not found');

    const conditions = [eq(chatMessages.sessionId, sessionId)];

    if (after) {
      conditions.push(gt(chatMessages.createdAt, new Date(after)));
    }

    const messages = await this.db
      .select()
      .from(chatMessages)
      .where(and(...conditions))
      .orderBy(chatMessages.createdAt)
      .limit(limit);

    return {
      data: messages,
      sessionId,
      assignedTo: session.assignedTo,
      status: session.status,
    };
  }

  async sendMessage(sessionId: string, patientId: string, content: string) {
    // Verify session belongs to patient
    const [session] = await this.db
      .select()
      .from(chatSessions)
      .where(
        and(
          eq(chatSessions.id, sessionId),
          eq(chatSessions.patientId, patientId),
        ),
      )
      .limit(1);

    if (!session) throw new NotFoundException('Session not found');

    const [message] = await this.db
      .insert(chatMessages)
      .values({
        sessionId,
        role: 'user',
        content,
        messageType: 'text',
      })
      .returning();

    // Update session message count
    await this.db
      .update(chatSessions)
      .set({
        messageCount: session.messageCount + 1,
        updatedAt: new Date(),
      })
      .where(eq(chatSessions.id, sessionId));

    return { data: message };
  }
}
