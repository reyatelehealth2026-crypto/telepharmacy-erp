import { Process, Processor } from '@nestjs/bull';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bull';
import { eq } from 'drizzle-orm';
import { notifications, patients } from '@telepharmacy/db';
import { LineClientService } from '../line/services/line-client.service';
import { DRIZZLE } from '../../database/database.constants';
import {
  NOTIFICATION_QUEUE,
  PROCESS_NOTIFICATION_JOB,
  NotificationJobData,
} from './notification-sender.service';
import type { LineMessageObject } from '../line/types/line-events.types';

@Processor(NOTIFICATION_QUEUE)
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: any,
    private readonly lineClient: LineClientService,
  ) {}

  @Process(PROCESS_NOTIFICATION_JOB)
  async handleNotification(job: Job<NotificationJobData>) {
    const { notificationId, patientId, channel } = job.data;

    this.logger.log(
      `Processing notification: id=${notificationId} patient=${patientId} attempt=${job.attemptsMade + 1}`,
    );

    try {
      if (channel === 'line') {
        await this.sendLineNotification(job.data);
      }

      // Success: update sentAt + status=sent
      await this.db
        .update(notifications)
        .set({
          status: 'sent',
          sentAt: new Date(),
        })
        .where(eq(notifications.id, notificationId));

      this.logger.log(`Notification sent successfully: id=${notificationId}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Notification failed: id=${notificationId} error=${errorMsg}`,
      );

      // Fetch current notification to check retryCount vs maxRetries
      const [notification] = await this.db
        .select({
          retryCount: notifications.retryCount,
          maxRetries: notifications.maxRetries,
        })
        .from(notifications)
        .where(eq(notifications.id, notificationId))
        .limit(1);

      const newRetryCount = (notification?.retryCount ?? 0) + 1;
      const maxRetries = notification?.maxRetries ?? 3;

      // Update errorMessage and increment retryCount
      const updateData: Record<string, any> = {
        errorMessage: errorMsg,
        retryCount: newRetryCount,
      };

      // When retryCount reaches maxRetries, set status=failed
      if (newRetryCount >= maxRetries) {
        updateData.status = 'failed';
        this.logger.warn(
          `Notification permanently failed after ${newRetryCount} attempts: id=${notificationId}`,
        );
      }

      await this.db
        .update(notifications)
        .set(updateData)
        .where(eq(notifications.id, notificationId));

      // Re-throw so BullMQ handles retry (if attempts remain)
      throw error;
    }
  }

  /**
   * Send notification via LINE push message.
   * Looks up the patient's lineUserId and sends the Flex Message or text.
   */
  private async sendLineNotification(data: NotificationJobData): Promise<void> {
    const { patientId, title, body, lineMessageData } = data;

    // Look up patient's LINE user ID
    const [patient] = await this.db
      .select({ lineUserId: patients.lineUserId })
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1);

    if (!patient?.lineUserId) {
      throw new Error(
        `Patient ${patientId} has no LINE user ID — cannot send LINE notification`,
      );
    }

    // Build LINE message(s)
    const messages: LineMessageObject[] = lineMessageData
      ? [
          {
            type: 'flex' as const,
            altText: title,
            contents: lineMessageData as any,
          },
        ]
      : [
          {
            type: 'text' as const,
            text: `${title}\n${body}`,
          },
        ];

    await this.lineClient.pushMessage(patient.lineUserId, messages);
  }
}
