import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { eq, and, desc, sql, isNull, isNotNull } from 'drizzle-orm';
import { notifications } from '@telepharmacy/db';
import { DRIZZLE } from '../../database/database.constants';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  /** Fetch a patient's notifications (newest first) */
  async getMyNotifications(patientId: string, page = 1, limit = 30) {
    const offset = (page - 1) * limit;

    const rows = await this.db
      .select()
      .from(notifications)
      .where(eq(notifications.patientId, patientId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset);

    const [countResult] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(eq(notifications.patientId, patientId));

    const unreadCount = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(eq(notifications.patientId, patientId), isNull(notifications.readAt)));

    return {
      data: rows,
      unreadCount: unreadCount[0]?.count ?? 0,
      total: countResult?.count ?? 0,
      page,
      limit,
    };
  }

  /** Mark a single notification as read */
  async markRead(id: string, patientId: string) {
    const [existing] = await this.db
      .select()
      .from(notifications)
      .where(and(eq(notifications.id, id), eq(notifications.patientId, patientId)))
      .limit(1);

    if (!existing) throw new NotFoundException(`ไม่พบการแจ้งเตือนรหัส ${id}`);

    if (existing.readAt) return existing; // already read

    const [updated] = await this.db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(eq(notifications.id, id))
      .returning();

    return updated;
  }

  /** Mark all notifications as read for a patient */
  async markAllRead(patientId: string) {
    const result = await this.db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.patientId, patientId), isNull(notifications.readAt)));

    return { updated: true };
  }
}
