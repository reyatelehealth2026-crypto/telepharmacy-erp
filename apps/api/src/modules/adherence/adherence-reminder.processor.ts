import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { AdherenceService, ADHERENCE_QUEUE, SEND_REMINDER_JOB } from './adherence.service';
import { Inject } from '@nestjs/common';
import { DRIZZLE } from '../../database/database.constants';
import { eq } from 'drizzle-orm';
import { medicationReminders, patients } from '@telepharmacy/db';

@Processor(ADHERENCE_QUEUE)
export class AdherenceReminderProcessor {
  private readonly logger = new Logger(AdherenceReminderProcessor.name);

  constructor(
    private readonly adherenceService: AdherenceService,
    @Inject(DRIZZLE) private readonly db: any,
  ) {}

  @Process(SEND_REMINDER_JOB)
  async handleSendReminder(job: Job<{ reminderId: string; patientId: string; drugName: string }>) {
    const { reminderId, patientId, drugName } = job.data;
    this.logger.log(`Processing reminder job ${job.id} for reminder ${reminderId}`);

    try {
      const [row] = await this.db
        .select({ lineUserId: patients.lineUserId })
        .from(medicationReminders)
        .innerJoin(patients, eq(medicationReminders.patientId, patients.id))
        .where(eq(medicationReminders.id, reminderId))
        .limit(1);

      if (!row) {
        this.logger.warn(`Reminder ${reminderId} not found, skipping`);
        return;
      }

      await this.adherenceService.dispatchLineReminder(row.lineUserId, drugName, reminderId, patientId);
    } catch (err) {
      this.logger.error(`Failed to send reminder ${reminderId}: ${(err as Error).message}`);
      throw err;
    }
  }
}
