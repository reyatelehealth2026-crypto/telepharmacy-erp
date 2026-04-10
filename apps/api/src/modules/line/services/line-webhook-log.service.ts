import { createHash } from 'crypto';
import { Injectable, Inject, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { and, desc, eq, sql, gte, lte } from 'drizzle-orm';
import { lineWebhookEvents } from '@telepharmacy/db';
import { DRIZZLE } from '../../../database/database.constants';
import type { LineWebhookEvent } from '../types/line-events.types';

@Injectable()
export class LineWebhookLogService {
  private readonly logger = new Logger(LineWebhookLogService.name);

  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  async beginProcessing(event: LineWebhookEvent) {
    const providerEventKey = this.buildProviderEventKey(event);

    const [existing] = await this.db
      .select()
      .from(lineWebhookEvents)
      .where(eq(lineWebhookEvents.providerEventKey, providerEventKey))
      .limit(1);

    if (existing) {
      await this.db
        .update(lineWebhookEvents)
        .set({
          duplicateCount: sql`${lineWebhookEvents.duplicateCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(lineWebhookEvents.id, existing.id));

      return { duplicate: true, record: existing };
    }

    const [created] = await this.db
      .insert(lineWebhookEvents)
      .values({
        providerEventKey,
        dedupeKey: providerEventKey,
        eventType: event.type,
        lineUserId: this.getLineUserId(event),
        status: 'received',
        payload: event,
      })
      .returning();

    return { duplicate: false, record: created };
  }

  /**
   * Clone a failed event into a new row with a unique provider key so the pipeline runs again.
   * Audit: processingData + replayedFromEventId.
   */
  async createReplayFromFailed(sourceEventId: string, staffId: string) {
    const source = await this.getEvent(sourceEventId);
    if (source.status !== 'failed') {
      throw new BadRequestException(
        'Only events with status "failed" can be replayed (avoids duplicate LINE side effects on success paths).',
      );
    }

    const payload = source.payload as LineWebhookEvent | null;
    if (!payload || typeof payload !== 'object' || !('type' in payload)) {
      throw new BadRequestException('Stored payload is missing or invalid for replay');
    }

    const suffix = createHash('sha256')
      .update(`${sourceEventId}:${staffId}:${Date.now()}:${Math.random()}`)
      .digest('hex')
      .slice(0, 24);
    const providerEventKey = `replay_${sourceEventId.slice(0, 8)}_${suffix}`;

    const [created] = await this.db
      .insert(lineWebhookEvents)
      .values({
        providerEventKey,
        dedupeKey: providerEventKey,
        eventType: source.eventType,
        lineUserId: source.lineUserId,
        patientId: source.patientId,
        sessionId: source.sessionId,
        status: 'received',
        payload: source.payload,
        duplicateCount: 0,
        replayedFromEventId: sourceEventId,
        processingData: {
          replaySourceEventId: sourceEventId,
          replayByStaffId: staffId,
          replayRequestedAt: new Date().toISOString(),
        },
      })
      .returning();

    return created;
  }

  async markProcessing(eventId: string, processingData: Record<string, unknown> = {}) {
    return this.mergeUpdate(eventId, {
      status: 'processing',
      processingData,
    });
  }

  async attachContext(
    eventId: string,
    context: {
      patientId?: string | null;
      sessionId?: string | null;
      processingData?: Record<string, unknown>;
    },
  ) {
    return this.mergeUpdate(eventId, {
      patientId: context.patientId,
      sessionId: context.sessionId,
      processingData: context.processingData ?? {},
    });
  }

  async markProcessed(eventId: string, processingData: Record<string, unknown> = {}) {
    return this.mergeUpdate(eventId, {
      status: 'processed',
      processingData,
      processedAt: new Date(),
    });
  }

  async markFailed(eventId: string, error: unknown, processingData: Record<string, unknown> = {}) {
    return this.mergeUpdate(eventId, {
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : String(error),
      processingData,
      processedAt: new Date(),
    });
  }

  async listEvents(opts: {
    status?: string;
    eventType?: string;
    lineUserId?: string;
    page: number;
    limit: number;
  }) {
    const { where } = this.buildEventFilters(opts);
    return this.db
      .select()
      .from(lineWebhookEvents)
      .where(where)
      .orderBy(desc(lineWebhookEvents.receivedAt))
      .limit(opts.limit)
      .offset((opts.page - 1) * opts.limit);
  }

  async listEventsPaginated(opts: {
    status?: string;
    eventType?: string;
    lineUserId?: string;
    from?: Date;
    to?: Date;
    failedOnly?: boolean;
    page: number;
    limit: number;
  }) {
    const { where } = this.buildEventFilters(opts);
    const offset = (opts.page - 1) * opts.limit;

    const [rows, countResult] = await Promise.all([
      this.db
        .select()
        .from(lineWebhookEvents)
        .where(where)
        .orderBy(desc(lineWebhookEvents.receivedAt))
        .limit(opts.limit)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(lineWebhookEvents)
        .where(where),
    ]);

    const total = countResult[0]?.count ?? 0;

    return {
      items: rows,
      total,
      page: opts.page,
      limit: opts.limit,
      totalPages: Math.max(1, Math.ceil(total / opts.limit)),
    };
  }

  private buildEventFilters(opts: {
    status?: string;
    eventType?: string;
    lineUserId?: string;
    from?: Date;
    to?: Date;
    failedOnly?: boolean;
  }) {
    const conditions = [];

    if (opts.failedOnly) {
      conditions.push(eq(lineWebhookEvents.status, 'failed'));
    } else if (opts.status) {
      conditions.push(eq(lineWebhookEvents.status, opts.status as any));
    }

    if (opts.eventType) {
      conditions.push(eq(lineWebhookEvents.eventType, opts.eventType));
    }

    if (opts.lineUserId) {
      conditions.push(eq(lineWebhookEvents.lineUserId, opts.lineUserId));
    }

    if (opts.from) {
      conditions.push(gte(lineWebhookEvents.receivedAt, opts.from));
    }

    if (opts.to) {
      conditions.push(lte(lineWebhookEvents.receivedAt, opts.to));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    return { where };
  }

  async getEvent(eventId: string) {
    const [event] = await this.db
      .select()
      .from(lineWebhookEvents)
      .where(eq(lineWebhookEvents.id, eventId))
      .limit(1);

    if (!event) {
      throw new NotFoundException('Webhook event not found');
    }

    return event;
  }

  async getStats() {
    const [stats] = await this.db
      .select({
        total: sql<number>`count(*)::int`,
        received: sql<number>`count(*) filter (where ${lineWebhookEvents.status} = 'received')::int`,
        processing: sql<number>`count(*) filter (where ${lineWebhookEvents.status} = 'processing')::int`,
        processed: sql<number>`count(*) filter (where ${lineWebhookEvents.status} = 'processed')::int`,
        failed: sql<number>`count(*) filter (where ${lineWebhookEvents.status} = 'failed')::int`,
        duplicates: sql<number>`coalesce(sum(${lineWebhookEvents.duplicateCount}), 0)::int`,
        today: sql<number>`count(*) filter (where date(${lineWebhookEvents.receivedAt}) = current_date)::int`,
      })
      .from(lineWebhookEvents);

    return (
      stats ?? {
        total: 0,
        received: 0,
        processing: 0,
        processed: 0,
        failed: 0,
        duplicates: 0,
        today: 0,
      }
    );
  }

  /** Extended stats + 14-day trend + recent failures for the webhook monitor UI. */
  async getDashboard() {
    const summary = await this.getStats();

    const [failed24hRow] = await this.db
      .select({ c: sql<number>`count(*)::int` })
      .from(lineWebhookEvents)
      .where(
        and(
          eq(lineWebhookEvents.status, 'failed'),
          gte(lineWebhookEvents.receivedAt, sql`now() - interval '24 hours'`),
        ),
      );

    const failedLast24h = failed24hRow?.c ?? 0;

    const trendRows = await this.db.execute(sql.raw(`
      select date_trunc('day', received_at)::date as day,
        count(*)::int as total,
        count(*) filter (where status = 'failed')::int as failed,
        coalesce(sum(duplicate_count), 0)::int as duplicate_hits
      from line_webhook_events
      where received_at >= now() - interval '14 days'
      group by 1
      order by 1 asc
    `));

    const trend = (trendRows.rows ?? trendRows).map((r: any) => ({
      date: r.day,
      total: r.total,
      failed: r.failed,
      duplicateHits: r.duplicate_hits,
    }));

    const duplicateHitRate =
      summary.total + summary.duplicates > 0
        ? summary.duplicates / (summary.total + summary.duplicates)
        : 0;

    const failureRate =
      summary.total > 0 ? summary.failed / summary.total : 0;

    const recentFailures = await this.db
      .select({
        id: lineWebhookEvents.id,
        eventType: lineWebhookEvents.eventType,
        receivedAt: lineWebhookEvents.receivedAt,
        errorMessage: lineWebhookEvents.errorMessage,
        lineUserId: lineWebhookEvents.lineUserId,
      })
      .from(lineWebhookEvents)
      .where(eq(lineWebhookEvents.status, 'failed'))
      .orderBy(desc(lineWebhookEvents.receivedAt))
      .limit(15);

    return {
      summary: { ...summary, failedLast24h },
      duplicateHitRate,
      failureRate,
      trend,
      recentFailures,
    };
  }

  private async mergeUpdate(
    eventId: string,
    update: {
      status?: 'received' | 'processing' | 'processed' | 'failed';
      patientId?: string | null;
      sessionId?: string | null;
      errorMessage?: string | null;
      processedAt?: Date | null;
      processingData?: Record<string, unknown>;
    },
  ) {
    const [existing] = await this.db
      .select()
      .from(lineWebhookEvents)
      .where(eq(lineWebhookEvents.id, eventId))
      .limit(1);

    if (!existing) {
      this.logger.warn(`Webhook event ${eventId} not found during mergeUpdate`);
      return null;
    }

    const [updated] = await this.db
      .update(lineWebhookEvents)
      .set({
        status: update.status ?? existing.status,
        patientId: update.patientId === undefined ? existing.patientId : update.patientId,
        sessionId: update.sessionId === undefined ? existing.sessionId : existing.sessionId,
        errorMessage: update.errorMessage === undefined ? existing.errorMessage : update.errorMessage,
        processedAt: update.processedAt === undefined ? existing.processedAt : update.processedAt,
        processingData: {
          ...(existing.processingData ?? {}),
          ...(update.processingData ?? {}),
        },
        updatedAt: new Date(),
      })
      .where(eq(lineWebhookEvents.id, eventId))
      .returning();

    return updated;
  }

  private getLineUserId(event: LineWebhookEvent) {
    return event.source.userId ?? null;
  }

  private buildProviderEventKey(event: LineWebhookEvent) {
    const stablePayload = {
      type: event.type,
      timestamp: event.timestamp,
      mode: event.mode,
      userId: event.source.userId ?? null,
      messageId: event.type === 'message' ? event.message.id : null,
      messageType: event.type === 'message' ? event.message.type : null,
      postbackData: event.type === 'postback' ? event.postback.data : null,
    };

    return createHash('sha256')
      .update(JSON.stringify(stablePayload))
      .digest('hex');
  }
}
