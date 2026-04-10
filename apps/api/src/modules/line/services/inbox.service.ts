import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { eq, desc, asc, and, sql, isNull, isNotNull, lte, gt, inArray } from 'drizzle-orm';
import {
  chatSessions,
  chatMessages,
  patients,
  lineContactJourneys,
  patientTags,
  patientTagAssignments,
  lineQuickReplies,
} from '@telepharmacy/db';
import { DRIZZLE } from '../../../database/database.constants';
import { LineClientService } from './line-client.service';
import { AuditService } from '../../audit/audit.service';

@Injectable()
export class InboxService {
  private readonly logger = new Logger(InboxService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: any,
    private readonly lineClient: LineClientService,
    private readonly auditService: AuditService,
  ) {}

  async listSessions(opts: {
    status?: string;
    queueStatus?: string;
    priority?: string;
    unreadOnly?: boolean;
    tagId?: string;
    followUp?: 'any' | 'due' | 'scheduled' | 'none';
    page: number;
    limit: number;
  }) {
    const { status, queueStatus, priority, unreadOnly, tagId, followUp, page, limit } = opts;
    const offset = (page - 1) * limit;

    const conditions = [];

    if (status) {
      conditions.push(eq(chatSessions.status, status as any));
    }

    if (queueStatus) {
      conditions.push(eq(chatSessions.queueStatus, queueStatus as any));
    }

    if (priority === 'normal' || priority === 'urgent') {
      conditions.push(eq(chatSessions.priority, priority));
    }

    if (unreadOnly) {
      conditions.push(
        sql`(${chatSessions.lastInboundAt} IS NOT NULL AND (${chatSessions.lastStaffReadAt} IS NULL OR ${chatSessions.lastInboundAt} > ${chatSessions.lastStaffReadAt}))`,
      );
    }

    if (tagId) {
      const taggedRows = await this.db
        .select({ patientId: patientTagAssignments.patientId })
        .from(patientTagAssignments)
        .where(eq(patientTagAssignments.tagId, tagId));
      const pids = [...new Set(taggedRows.map((r: { patientId: string }) => r.patientId))] as string[];
      if (pids.length === 0) {
        return [];
      }
      conditions.push(inArray(chatSessions.patientId, pids));
    }

    if (followUp === 'due') {
      conditions.push(isNotNull(chatSessions.followUpAt));
      conditions.push(lte(chatSessions.followUpAt, new Date()));
    } else if (followUp === 'scheduled') {
      conditions.push(isNotNull(chatSessions.followUpAt));
      conditions.push(gt(chatSessions.followUpAt, new Date()));
    } else if (followUp === 'any') {
      conditions.push(isNotNull(chatSessions.followUpAt));
    } else if (followUp === 'none') {
      conditions.push(isNull(chatSessions.followUpAt));
    }

    const sessions = await this.db
      .select({
        id: chatSessions.id,
        patientId: chatSessions.patientId,
        lineUserId: chatSessions.lineUserId,
        patientNo: patients.patientNo,
        sessionType: chatSessions.sessionType,
        status: chatSessions.status,
        entryIntent: chatSessions.entryIntent,
        queueStatus: chatSessions.queueStatus,
        priority: chatSessions.priority,
        assignedTo: chatSessions.assignedTo,
        transferredReason: chatSessions.transferredReason,
        messageCount: chatSessions.messageCount,
        firstResponseAt: chatSessions.firstResponseAt,
        lastInboundAt: chatSessions.lastInboundAt,
        lastOutboundAt: chatSessions.lastOutboundAt,
        lastStaffReadAt: chatSessions.lastStaffReadAt,
        followUpAt: chatSessions.followUpAt,
        reopenedAt: chatSessions.reopenedAt,
        updatedAt: chatSessions.updatedAt,
        createdAt: chatSessions.createdAt,
        patientFirstName: patients.firstName,
        patientLastName: patients.lastName,
        patientPhone: patients.phone,
        patientBirthDate: patients.birthDate,
        lineContactState: lineContactJourneys.state,
        lineJourneyStep: lineContactJourneys.currentStep,
      })
      .from(chatSessions)
      .leftJoin(patients, eq(chatSessions.patientId, patients.id))
      .leftJoin(lineContactJourneys, eq(chatSessions.lineUserId, lineContactJourneys.lineUserId))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(chatSessions.updatedAt))
      .limit(limit)
      .offset(offset);

    const sessionIds = sessions.map((s: any) => s.id);
    const patientIds = [...new Set(sessions.map((s: any) => s.patientId))] as string[];

    let lastMessages: Record<string, any> = {};
    if (sessionIds.length > 0) {
      const msgs = await this.db.execute(sql`
        SELECT DISTINCT ON (session_id) *
        FROM chat_messages
        WHERE session_id = ANY(${sessionIds}::uuid[])
          AND message_kind <> 'internal_note'
        ORDER BY session_id, created_at DESC
      `);
      for (const m of msgs.rows ?? msgs) {
        const row = m as Record<string, unknown>;
        lastMessages[String(row.session_id)] = {
          content: row.content,
          role: row.role,
          messageKind: row.message_kind,
          createdAt: row.created_at,
        };
      }
    }

    let tagsByPatient: Record<string, { id: string; slug: string; label: string; color: string | null }[]> =
      {};
    if (patientIds.length > 0) {
      const tagRows = await this.db
        .select({
          patientId: patientTagAssignments.patientId,
          id: patientTags.id,
          slug: patientTags.slug,
          label: patientTags.label,
          color: patientTags.color,
        })
        .from(patientTagAssignments)
        .innerJoin(patientTags, eq(patientTagAssignments.tagId, patientTags.id))
        .where(inArray(patientTagAssignments.patientId, patientIds));

      for (const row of tagRows) {
        const pid = row.patientId;
        if (!tagsByPatient[pid]) tagsByPatient[pid] = [];
        tagsByPatient[pid].push({
          id: row.id,
          slug: row.slug,
          label: row.label,
          color: row.color,
        });
      }
    }

    return sessions.map((s: any) => ({
      ...s,
      hasUnread:
        !!s.lastInboundAt &&
        (!s.lastStaffReadAt || new Date(s.lastInboundAt) > new Date(s.lastStaffReadAt)),
      isRegistered: !!s.patientPhone && !!s.patientBirthDate,
      lastMessage: lastMessages[s.id] ?? null,
      tags: tagsByPatient[s.patientId] ?? [],
    }));
  }

  async getSessionMessages(sessionId: string, limit: number) {
    const [session] = await this.db
      .select({
        id: chatSessions.id,
        patientId: chatSessions.patientId,
        lineUserId: chatSessions.lineUserId,
        patientNo: patients.patientNo,
        sessionType: chatSessions.sessionType,
        status: chatSessions.status,
        entryIntent: chatSessions.entryIntent,
        queueStatus: chatSessions.queueStatus,
        priority: chatSessions.priority,
        assignedTo: chatSessions.assignedTo,
        messageCount: chatSessions.messageCount,
        firstResponseAt: chatSessions.firstResponseAt,
        lastInboundAt: chatSessions.lastInboundAt,
        lastOutboundAt: chatSessions.lastOutboundAt,
        lastStaffReadAt: chatSessions.lastStaffReadAt,
        followUpAt: chatSessions.followUpAt,
        reopenedAt: chatSessions.reopenedAt,
        transferredReason: chatSessions.transferredReason,
        patientFirstName: patients.firstName,
        patientLastName: patients.lastName,
        patientPhone: patients.phone,
        patientBirthDate: patients.birthDate,
        lineContactState: lineContactJourneys.state,
        lineJourneyStep: lineContactJourneys.currentStep,
      })
      .from(chatSessions)
      .leftJoin(patients, eq(chatSessions.patientId, patients.id))
      .leftJoin(lineContactJourneys, eq(chatSessions.lineUserId, lineContactJourneys.lineUserId))
      .where(eq(chatSessions.id, sessionId))
      .limit(1);

    if (!session) throw new NotFoundException('Session not found');

    await this.db
      .update(chatSessions)
      .set({
        lastStaffReadAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(chatSessions.id, sessionId));

    const messages = await this.db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(chatMessages.createdAt)
      .limit(limit);

    const tagRows = await this.db
      .select({
        id: patientTags.id,
        slug: patientTags.slug,
        label: patientTags.label,
        color: patientTags.color,
      })
      .from(patientTagAssignments)
      .innerJoin(patientTags, eq(patientTagAssignments.tagId, patientTags.id))
      .where(eq(patientTagAssignments.patientId, session.patientId));

    return {
      session: {
        ...session,
        isRegistered: !!session.patientPhone && !!session.patientBirthDate,
        hasUnread:
          !!session.lastInboundAt &&
          (!session.lastStaffReadAt || new Date(session.lastInboundAt) > new Date(session.lastStaffReadAt)),
      },
      customerSummary: {
        patientId: session.patientId,
        patientNo: session.patientNo,
        name: `${session.patientFirstName} ${session.patientLastName}`.trim(),
        phone: session.patientPhone,
        isRegistered: !!session.patientPhone && !!session.patientBirthDate,
        lineContactState: session.lineContactState,
        lineJourneyStep: session.lineJourneyStep,
        entryIntent: session.entryIntent,
        queueStatus: session.queueStatus,
        priority: session.priority,
        tags: tagRows,
      },
      messages,
    };
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
        messageKind: 'message',
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
        queueStatus: 'assigned',
        assignedTo: session.assignedTo ?? staffId,
        assignedAt: session.assignedTo ? undefined : new Date(),
        firstResponseAt: session.firstResponseAt ?? new Date(),
        lastOutboundAt: new Date(),
        lastStaffReadAt: new Date(),
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

    await this.auditService.log({
      tableName: 'chat_sessions',
      recordId: sessionId,
      action: 'inbox_staff_reply',
      newValues: { messageId: message.id, contentLength: content.length },
      changedBy: staffId,
    });

    return message;
  }

  async addInternalNote(sessionId: string, content: string, staffId: string) {
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
        messageKind: 'internal_note',
        content,
        messageType: 'text',
        sentByStaff: staffId,
      })
      .returning();

    await this.db
      .update(chatSessions)
      .set({
        lastStaffReadAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(chatSessions.id, sessionId));

    await this.auditService.log({
      tableName: 'chat_sessions',
      recordId: sessionId,
      action: 'inbox_internal_note',
      newValues: { messageId: message.id, contentLength: content.length },
      changedBy: staffId,
    });

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
        queueStatus: 'assigned',
        lastStaffReadAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(chatSessions.id, sessionId));

    await this.auditService.log({
      tableName: 'chat_sessions',
      recordId: sessionId,
      action: 'inbox_assign',
      newValues: { assignedTo: staffId },
      changedBy: staffId,
    });

    return { assigned: true };
  }

  async resolveSession(sessionId: string, staffId: string) {
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
        queueStatus: 'resolved',
        resolvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(chatSessions.id, sessionId));

    await this.auditService.log({
      tableName: 'chat_sessions',
      recordId: sessionId,
      action: 'inbox_resolve',
      changedBy: staffId,
    });

    return { resolved: true };
  }

  async reopenSession(sessionId: string, staffId: string) {
    const [session] = await this.db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.id, sessionId))
      .limit(1);

    if (!session) throw new NotFoundException('Session not found');
    if (session.status !== 'resolved') {
      throw new BadRequestException('Session is not resolved');
    }

    const queueStatus = session.assignedTo ? 'assigned' : 'needs_human';

    await this.db
      .update(chatSessions)
      .set({
        status: 'active',
        queueStatus,
        resolvedAt: null,
        reopenedAt: new Date(),
        lastStaffReadAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(chatSessions.id, sessionId));

    await this.auditService.log({
      tableName: 'chat_sessions',
      recordId: sessionId,
      action: 'inbox_reopen',
      changedBy: staffId,
    });

    return { reopened: true };
  }

  async setFollowUp(sessionId: string, followUpAt: Date | null, staffId: string) {
    const [session] = await this.db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.id, sessionId))
      .limit(1);

    if (!session) throw new NotFoundException('Session not found');

    await this.db
      .update(chatSessions)
      .set({
        followUpAt,
        updatedAt: new Date(),
      })
      .where(eq(chatSessions.id, sessionId));

    await this.auditService.log({
      tableName: 'chat_sessions',
      recordId: sessionId,
      action: 'inbox_follow_up',
      newValues: { followUpAt: followUpAt?.toISOString() ?? null },
      changedBy: staffId,
    });

    return { followUpAt };
  }

  async listPatientTags() {
    return this.db
      .select()
      .from(patientTags)
      .orderBy(asc(patientTags.sortOrder), asc(patientTags.label));
  }

  async createPatientTag(input: { slug: string; label: string; color?: string | null }) {
    const [row] = await this.db
      .insert(patientTags)
      .values({
        slug: input.slug,
        label: input.label,
        color: input.color ?? null,
      })
      .returning();
    return row;
  }

  async setSessionPatientTags(sessionId: string, tagIds: string[], staffId: string) {
    const [session] = await this.db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.id, sessionId))
      .limit(1);

    if (!session) throw new NotFoundException('Session not found');

    await this.db
      .delete(patientTagAssignments)
      .where(eq(patientTagAssignments.patientId, session.patientId));

    if (tagIds.length > 0) {
      await this.db.insert(patientTagAssignments).values(
        tagIds.map((tagId) => ({
          patientId: session.patientId,
          tagId,
          assignedByStaffId: staffId,
        })),
      );
    }

    await this.auditService.log({
      tableName: 'patient_tag_assignments',
      recordId: session.patientId,
      action: 'inbox_patient_tags_set',
      newValues: { sessionId, tagIds },
      changedBy: staffId,
    });

    return { tagIds };
  }

  async listQuickReplies() {
    return this.db
      .select()
      .from(lineQuickReplies)
      .where(eq(lineQuickReplies.isActive, true))
      .orderBy(asc(lineQuickReplies.sortOrder), asc(lineQuickReplies.title));
  }
}
