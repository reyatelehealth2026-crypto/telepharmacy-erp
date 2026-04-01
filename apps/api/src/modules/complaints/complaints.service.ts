import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import { complaints } from '@telepharmacy/db';
import { DRIZZLE } from '../../database/database.constants';
import { EventsService } from '../events/events.service';
import type { CreateComplaintDto } from './dto/create-complaint.dto';
import type { ResolveComplaintDto } from './dto/resolve-complaint.dto';
import type { QueryComplaintsDto } from './dto/query-complaints.dto';

/**
 * Placeholder token for NotificationSenderService.
 * Task 5.1 will provide the real service — until then we use optional injection.
 */
export const NOTIFICATION_SENDER = 'NOTIFICATION_SENDER';

export interface NotificationSender {
  send(params: {
    patientId: string;
    type: string;
    title: string;
    body: string;
    referenceType?: string;
    referenceId?: string;
  }): Promise<any>;
}

@Injectable()
export class ComplaintsService {
  private readonly logger = new Logger(ComplaintsService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: any,
    @Optional()
    @Inject(NOTIFICATION_SENDER)
    private readonly notificationSender?: NotificationSender,
    @Optional() private readonly eventsService?: EventsService,
  ) {}

  async create(patientId: string, dto: CreateComplaintDto) {
    const [item] = await this.db
      .insert(complaints)
      .values({
        patientId,
        category: dto.category,
        description: dto.description,
        severity: dto.severity ?? 'medium',
        images: dto.images ?? [],
        orderId: dto.orderId ?? null,
        chatSessionId: dto.chatSessionId ?? null,
        status: 'open',
      })
      .returning();

    this.logger.log(
      `Complaint ${item.id} created by patient ${patientId} [category=${dto.category}]`,
    );

    // Emit real-time WebSocket event for admin dashboard
    try {
      this.eventsService?.emitNewComplaint({
        id: item.id,
        patientId,
        category: dto.category,
        severity: dto.severity ?? 'medium',
        status: 'open',
      });
    } catch (err) {
      this.logger.error(`Failed to emit complaint:new for ${item.id}`, (err as Error).stack);
    }

    return { success: true, data: item };
  }

  async findMyComplaints(
    patientId: string,
    page = 1,
    limit = 20,
  ) {
    const offset = (page - 1) * limit;

    const data = await this.db
      .select()
      .from(complaints)
      .where(eq(complaints.patientId, patientId))
      .orderBy(desc(complaints.createdAt))
      .limit(limit)
      .offset(offset);

    return { success: true, data, meta: { page, limit } };
  }

  async findAll(filters: QueryComplaintsDto) {
    const page = filters.page ? parseInt(filters.page, 10) : 1;
    const limit = filters.limit ? parseInt(filters.limit, 10) : 20;
    const offset = (page - 1) * limit;

    const conditions: any[] = [];
    if (filters.status) {
      conditions.push(eq(complaints.status, filters.status as any));
    }
    if (filters.severity) {
      conditions.push(eq(complaints.severity, filters.severity as any));
    }
    if (filters.category) {
      conditions.push(eq(complaints.category, filters.category));
    }

    const whereClause =
      conditions.length > 0 ? and(...conditions) : undefined;

    const data = await this.db
      .select()
      .from(complaints)
      .where(whereClause)
      .orderBy(desc(complaints.createdAt))
      .limit(limit)
      .offset(offset);

    return { success: true, data, meta: { page, limit } };
  }

  async findOne(id: string) {
    const item = await this.findOneEntity(id);
    return { success: true, data: item };
  }

  async resolve(id: string, dto: ResolveComplaintDto, staffId: string) {
    await this.findOneEntity(id);

    const [updated] = await this.db
      .update(complaints)
      .set({
        resolution: dto.resolution,
        resolvedBy: staffId,
        resolvedAt: new Date(),
        status: 'resolved',
        updatedAt: new Date(),
      })
      .where(eq(complaints.id, id))
      .returning();

    this.logger.log(`Complaint ${id} resolved by staff ${staffId}`);
    await this.notifyPatient(updated, 'ข้อร้องเรียนของคุณได้รับการแก้ไขแล้ว');
    return { success: true, data: updated };
  }

  async updateStatus(id: string, status: string) {
    await this.findOneEntity(id);

    const [updated] = await this.db
      .update(complaints)
      .set({ status: status as any, updatedAt: new Date() })
      .where(eq(complaints.id, id))
      .returning();

    this.logger.log(`Complaint ${id} status changed to ${status}`);
    await this.notifyPatient(
      updated,
      `สถานะข้อร้องเรียนของคุณเปลี่ยนเป็น: ${status}`,
    );

    // Emit real-time WebSocket event for admin dashboard
    try {
      this.eventsService?.emitNewComplaint({
        id,
        patientId: updated.patientId,
        status,
      });
    } catch (err) {
      this.logger.error(`Failed to emit complaint:new for ${id}`, (err as Error).stack);
    }

    return { success: true, data: updated };
  }

  // ── Private helpers ──────────────────────────────────────────────

  private async findOneEntity(id: string) {
    const item = await this.db.query.complaints.findFirst({
      where: eq(complaints.id, id),
    });
    if (!item) {
      throw new NotFoundException('ไม่พบข้อร้องเรียน');
    }
    return item;
  }

  /**
   * Send a notification to the complaint's patient when status changes.
   * Uses optional injection so the service works even before
   * NotificationSenderService (Task 5.1) is wired in.
   */
  private async notifyPatient(complaint: any, body: string) {
    if (!this.notificationSender) {
      this.logger.warn(
        'NotificationSenderService not available — skipping complaint notification',
      );
      return;
    }

    try {
      await this.notificationSender.send({
        patientId: complaint.patientId,
        type: 'system_alert',
        title: 'อัปเดตข้อร้องเรียน',
        body,
        referenceType: 'complaint',
        referenceId: complaint.id,
      });
    } catch (err) {
      this.logger.error(
        `Failed to send complaint notification for ${complaint.id}`,
        (err as Error).stack,
      );
    }
  }
}
