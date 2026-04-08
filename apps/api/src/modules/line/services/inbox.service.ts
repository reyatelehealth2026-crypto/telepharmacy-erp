import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { eq, desc, and, sql } from 'drizzle-orm';
import { chatSessions, chatMessages, patients } from '@telepharmacy/db';
import { DRIZZLE } from '../../../database/database.constants';
import { LineClientService } from './line-client.service';

@Injectable()
export class InboxService {
  private readonly logger = new Logger(InboxService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: any,
    private readonly lineClient: LineClientService,
  ) {}

  async listSessions(opts: { status?: string; page: number; limit: number }) {
    const { status, page, limit } = opts;
    const offset = (page - 1) * limit;

    const conditions = status
      ? [eq(chatSessions.status, status as any)]
      : [];

    const sessions = await this.db
      .select({
        id: chatSessions.id,
        patientId: chatSessions.patientId,
        lineUserId: chatSessions.lineUserId,
        sessionType: chatSessions.sessionType,
        status: chatSessions.status,
        assignedTo: chatSessions.assignedTo,
        messageCount: chatSessions.messageCount,
        updatedAt: chatSessions.updatedAt,
        createdAt: chatSessions.createdAt,
        patientFirstName: patients.firstName,
        patientLastName: patients.lastName,
        patientPhone: patients.phone,
      })
      .from(chatSessions)
      .leftJoin(patients, eq(chatSessions.patientId, patients.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(chatSessions.updatedAt))
      .limit(limit)
      .offset(offset);

    // Get last message for each session
    const sessionIds = sessions.map((s: any) => s.id);
    let lastMessages: Record<string, any> = {};

    if (sessionIds.length > 0) {
      const msgs = await this.db.execute(sql`
        SELECT DISTINCT ON (session_id) *
        FROM chat_messages
        WHERE session_id = ANY(${sessionIds})
        ORDER BY session_id, created_at DESC
      `);
      for (const m of msgs.rows ?? msgs) {
        lastMessages[m.session_id] = {
          content: m.content,
          role: m.role,
          createdAt: m.created_at,
        };
      }
    }

    // Return array directly — ResponseInterceptor wraps it in { success, data }
    return sessions.map((s: any) => ({
      ...s,
      lastMessage: lastMessages[s.id] ?? null,
    }));
  }

  async getSessionMessages(sessionId: string, limit: number) {
    const [session] = await this.db
      .select({
        id: chatSessions.id,
        patientId: chatSessions.patientId,
        lineUserId: chatSessions.lineUserId,
        sessionType: chatSessions.sessionType,
        status: chatSessions.status,
        assignedTo: chatSessions.assignedTo,
        messageCount: chatSessions.messageCount,
        patientFirstName: patients.firstName,
        patientLastName: patients.lastName,
      })
      .from(chatSessions)
      .leftJoin(patients, eq(chatSessions.patientId, patients.id))
      .where(eq(chatSessions.id, sessionId))
      .limit(1);

    if (!session) throw new NotFoundException('Session not found');

    const messages = await this.db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(chatMessages.createdAt)
      .limit(limit);

    // Return plain object — ResponseInterceptor wraps it in { success, data }
    return { session, messages };
  }

  async staffReply(sessionId: string, content: string, staffId: string) {
    const [session] = await this.db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.id, sessionId))
      .limit(1);

    if (!session) throw new NotFoundException('Session not found');

    const [message] = await this.db
      .insert(chatMessages)
      .values({
        sessionId,
        role: 'pharmacist',
        content,
        messageType: 'text',
        sentByStaff: staffId,
      })
      .returning();

    await this.db
      .update(chatSessions)
      .set({
        messageCount: session.messageCount + 1,
        sessionType: 'pharmacist',
        assignedTo: session.assignedTo ?? staffId,
        assignedAt: session.assignedTo ? undefined : new Date(),
        firstResponseAt: session.firstResponseAt ?? new Date(),
        updatedAt: new Date(),
      })
      .where(eq(chatSessions.id, sessionId));

    const lineUserId = session.lineUserId;
    if (lineUserId) {
      try {
        await this.lineClient.pushMessage(lineUserId, [
          { type: 'text', text: content },
        ]);
      } catch (err) {
        this.logger.error(`Failed to push LINE message: ${err}`);
      }
    }

    return message;
  }

  async assignSession(sessionId: string, staffId: string) {
    const [session] = await this.db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.id, sessionId))
      .limit(1);

    if (!session) throw new NotFoundException('Session not found');

    await this.db
      .update(chatSessions)
      .set({
        assignedTo: staffId,
        assignedAt: new Date(),
        sessionType: 'pharmacist',
        updatedAt: new Date(),
      })
      .where(eq(chatSessions.id, sessionId));

    return { assigned: true };
  }

  async resolveSession(sessionId: string) {
    const [session] = await this.db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.id, sessionId))
      .limit(1);

    if (!session) throw new NotFoundException('Session not found');

    await this.db
      .update(chatSessions)
      .set({
        status: 'resolved',
        resolvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(chatSessions.id, sessionId));

    return { resolved: true };
  }
}
