import { Injectable, Inject, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { eq, and } from 'drizzle-orm';
import { notifications, notificationPreferences } from '@telepharmacy/db';
import { DRIZZLE } from '../../database/database.constants';

export const NOTIFICATION_QUEUE = 'notification-queue';
export const PROCESS_NOTIFICATION_JOB = 'process-notification';

export interface SendNotificationParams {
  patientId: string;
  type: string;
  channel?: string;
  title: string;
  body: string;
  referenceType?: string;
  referenceId?: string;
  lineMessageData?: object;
}

export interface NotificationJobData {
  notificationId: string;
  patientId: string;
  type: string;
  channel: string;
  title: string;
  body: string;
  lineMessageData?: object;
}

@Injectable()
export class NotificationSenderService {
  private readonly logger = new Logger(NotificationSenderService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: any,
    @InjectQueue(NOTIFICATION_QUEUE) private readonly notificationQueue: Queue,
  ) {}

  /**
   * Send a notification: check preferences, create DB record, enqueue BullMQ job.
   */
  async send(params: SendNotificationParams) {
    const {
      patientId,
      type,
      channel = 'line',
      title,
      body,
      referenceType,
      referenceId,
      lineMessageData,
    } = params;

    // Check notification preferences — skip if disabled
    const isEnabled = await this.checkPreferences(patientId, type, channel);
    if (!isEnabled) {
      this.logger.debug(
        `Notification skipped: patient=${patientId} type=${type} channel=${channel} (disabled by preference)`,
      );
      return null;
    }

    // Create notification record with status=pending
    const [record] = await this.db
      .insert(notifications)
      .values({
        patientId,
        type,
        channel,
        title,
        body,
        status: 'pending',
        referenceType: referenceType ?? null,
        referenceId: referenceId ?? null,
        lineMessageType: lineMessageData ? 'flex' : 'text',
        lineMessageData: lineMessageData ?? null,
        retryCount: 0,
        maxRetries: 3,
      })
      .returning();

    // Enqueue BullMQ job for async processing
    const jobData: NotificationJobData = {
      notificationId: record.id,
      patientId,
      type,
      channel,
      title,
      body,
      lineMessageData,
    };

    await this.notificationQueue.add(PROCESS_NOTIFICATION_JOB, jobData, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 100,
      removeOnFail: false,
    });

    this.logger.log(
      `Notification enqueued: id=${record.id} patient=${patientId} type=${type} channel=${channel}`,
    );

    return record;
  }

  /**
   * Check if a patient has enabled notifications for the given type and channel.
   * Returns true (enabled) by default if no preference record exists.
   */
  private async checkPreferences(
    patientId: string,
    type: string,
    channel: string,
  ): Promise<boolean> {
    const [pref] = await this.db
      .select()
      .from(notificationPreferences)
      .where(
        and(
          eq(notificationPreferences.patientId, patientId),
          eq(notificationPreferences.notificationType, type),
          eq(notificationPreferences.channel, channel),
        ),
      )
      .limit(1);

    // Default to enabled if no preference record exists
    if (!pref) return true;

    return pref.enabled;
  }
}
