import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { eq, and, desc, sql, isNotNull, inArray } from 'drizzle-orm';
import {
  broadcastCampaigns,
  broadcastRecipients,
  patients,
} from '@telepharmacy/db';
import { DRIZZLE } from '../../../database/database.constants';
import type { CreateBroadcastDto } from '../dto/create-broadcast.dto';

export const BROADCAST_QUEUE = 'broadcast-queue';
export const SEND_BROADCAST_JOB = 'send-broadcast-batch';

@Injectable()
export class BroadcastService {
  private readonly logger = new Logger(BroadcastService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: any,
    @InjectQueue(BROADCAST_QUEUE) private readonly broadcastQueue: Queue,
  ) {}

  /**
   * Create a broadcast campaign, resolve recipients from segment filter, enqueue batches.
   */
  async createCampaign(dto: CreateBroadcastDto, staffId: string) {
    // Check idempotency
    if (dto.idempotencyKey) {
      const [existing] = await this.db
        .select()
        .from(broadcastCampaigns)
        .where(eq(broadcastCampaigns.idempotencyKey, dto.idempotencyKey))
        .limit(1);

      if (existing) {
        return { success: true, data: existing, deduplicated: true };
      }
    }

    // 1) Create campaign record
    const [campaign] = await this.db
      .insert(broadcastCampaigns)
      .values({
        name: dto.name,
        description: dto.description ?? null,
        content: dto.content,
        altText: dto.altText ?? 'ข้อความจาก Re-Ya',
        segmentFilter: dto.segmentFilter ?? {},
        idempotencyKey: dto.idempotencyKey ?? null,
        status: dto.scheduledAt ? 'scheduled' : 'sending',
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        createdBy: staffId,
      })
      .returning();

    // 2) Resolve recipients from segment filter
    const recipientPatients = await this.resolveSegment(dto.segmentFilter ?? {});

    // 3) Insert recipient rows
    if (recipientPatients.length > 0) {
      await this.db.insert(broadcastRecipients).values(
        recipientPatients.map((p: any) => ({
          campaignId: campaign.id,
          patientId: p.id,
          lineUserId: p.lineUserId,
          status: 'pending',
        })),
      );
    }

    // Update total count
    await this.db
      .update(broadcastCampaigns)
      .set({ totalRecipients: recipientPatients.length })
      .where(eq(broadcastCampaigns.id, campaign.id));

    // 4) Enqueue batches (500 per batch)
    const batchSize = 500;
    const delay = dto.scheduledAt
      ? Math.max(new Date(dto.scheduledAt).getTime() - Date.now(), 0)
      : 0;

    for (let i = 0; i < recipientPatients.length; i += batchSize) {
      const batchUserIds = recipientPatients
        .slice(i, i + batchSize)
        .map((p: any) => p.lineUserId);

      await this.broadcastQueue.add(
        SEND_BROADCAST_JOB,
        {
          campaignId: campaign.id,
          lineUserIds: batchUserIds,
          content: dto.content,
          altText: dto.altText ?? 'ข้อความจาก Re-Ya',
          batchIndex: Math.floor(i / batchSize),
        },
        {
          delay,
          attempts: 3,
          backoff: { type: 'exponential', delay: 10000 },
          removeOnComplete: 50,
          removeOnFail: 50,
        },
      );
    }

    this.logger.log(
      `Broadcast campaign ${campaign.id} created: ${recipientPatients.length} recipients, ${Math.ceil(recipientPatients.length / batchSize)} batches`,
    );

    return {
      success: true,
      data: {
        ...campaign,
        totalRecipients: recipientPatients.length,
      },
    };
  }

  /**
   * Get campaign details with delivery stats.
   */
  async getCampaign(id: string) {
    const campaign = await this.db.query.broadcastCampaigns.findFirst({
      where: eq(broadcastCampaigns.id, id),
    });

    if (!campaign) throw new NotFoundException(`Campaign ${id} not found`);

    // Aggregate delivery stats
    const recipients = await this.db
      .select()
      .from(broadcastRecipients)
      .where(eq(broadcastRecipients.campaignId, id));

    const stats = {
      total: recipients.length,
      sent: recipients.filter((r: any) => r.status === 'sent' || r.status === 'delivered').length,
      delivered: recipients.filter((r: any) => r.status === 'delivered').length,
      failed: recipients.filter((r: any) => r.status === 'failed').length,
      pending: recipients.filter((r: any) => r.status === 'pending').length,
    };

    return { success: true, data: { ...campaign, stats } };
  }

  /**
   * List campaigns with pagination.
   */
  async listCampaigns(page: number = 1, limit: number = 20) {
    const offset = (page - 1) * limit;
    const campaigns = await this.db
      .select()
      .from(broadcastCampaigns)
      .orderBy(desc(broadcastCampaigns.createdAt))
      .limit(limit)
      .offset(offset);

    return { success: true, data: campaigns, meta: { page, limit } };
  }

  /**
   * Mark batch recipients as sent/failed (called by worker).
   */
  async markBatchSent(campaignId: string, lineUserIds: string[], success: boolean, error?: string) {
    const status = success ? 'sent' : 'failed';
    const now = new Date();

    for (const uid of lineUserIds) {
      await this.db
        .update(broadcastRecipients)
        .set({
          status,
          sentAt: success ? now : null,
          errorMessage: error ?? null,
        })
        .where(
          and(
            eq(broadcastRecipients.campaignId, campaignId),
            eq(broadcastRecipients.lineUserId, uid),
          ),
        );
    }

    // Update campaign counts
    const allRecipients = await this.db
      .select()
      .from(broadcastRecipients)
      .where(eq(broadcastRecipients.campaignId, campaignId));

    const successCount = allRecipients.filter((r: any) => r.status === 'sent' || r.status === 'delivered').length;
    const failureCount = allRecipients.filter((r: any) => r.status === 'failed').length;
    const pendingCount = allRecipients.filter((r: any) => r.status === 'pending').length;

    const updates: any = { successCount, failureCount, updatedAt: now };
    if (pendingCount === 0) {
      updates.status = failureCount === allRecipients.length ? 'failed' : 'completed';
      updates.completedAt = now;
    }

    await this.db
      .update(broadcastCampaigns)
      .set(updates)
      .where(eq(broadcastCampaigns.id, campaignId));
  }

  // ─── Segment Resolution ─────────────────────────────────────

  /**
   * Resolve patients matching a segment filter.
   * Supported filters: tier, province, status, hasOrders.
   */
  private async resolveSegment(filter: Record<string, any>): Promise<any[]> {
    // Base: all patients with LINE user ID
    let query = this.db
      .select({ id: patients.id, lineUserId: patients.lineUserId })
      .from(patients)
      .where(
        and(
          isNotNull(patients.lineUserId),
          eq(patients.status, 'active'),
        ),
      );

    // Filter by province
    if (filter.province) {
      query = query.where(eq(patients.province, filter.province));
    }

    const results = await query;
    return results.filter((p: any) => p.lineUserId);
  }
}
