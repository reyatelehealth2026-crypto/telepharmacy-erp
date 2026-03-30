import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { eq, and, desc, sql } from 'drizzle-orm';
import { medicationReminders, patients, notifications } from '@telepharmacy/db';
import { DRIZZLE } from '../../database/database.constants';
import { LineClientService } from '../line/services/line-client.service';
import type { CreateReminderDto } from './dto/create-reminder.dto';

export const ADHERENCE_QUEUE = 'adherence-queue';
export const SEND_REMINDER_JOB = 'send-reminder';

@Injectable()
export class AdherenceService {
  private readonly logger = new Logger(AdherenceService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: any,
    @InjectQueue(ADHERENCE_QUEUE) private readonly adherenceQueue: Queue,
    private readonly lineClient: LineClientService,
  ) {}

  async createReminder(dto: CreateReminderDto, createdBy: string) {
    const [patient] = await this.db
      .select()
      .from(patients)
      .where(eq(patients.id, dto.patientId))
      .limit(1);

    if (!patient) throw new NotFoundException(`ไม่พบข้อมูลผู้ป่วย ${dto.patientId}`);

    const [reminder] = await this.db
      .insert(medicationReminders)
      .values({
        patientId: dto.patientId,
        patientMedicationId: dto.patientMedicationId ?? null,
        drugName: dto.drugName,
        sig: dto.sig ?? null,
        isActive: true,
      })
      .returning();

    const scheduledAt = new Date(dto.scheduledAt);
    const delay = Math.max(scheduledAt.getTime() - Date.now(), 0);

    await this.adherenceQueue.add(
      SEND_REMINDER_JOB,
      { reminderId: reminder.id, patientId: dto.patientId, drugName: dto.drugName },
      {
        delay,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    );

    this.logger.log(`Adherence reminder scheduled: ${reminder.id}, delay=${delay}ms`);
    return reminder;
  }

  async findReminders(filters: {
    patientId?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }) {
    const { page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;

    const conditions: any[] = [];
    if (filters.patientId) conditions.push(eq(medicationReminders.patientId, filters.patientId));
    if (filters.isActive !== undefined)
      conditions.push(eq(medicationReminders.isActive, filters.isActive));

    const query = this.db
      .select()
      .from(medicationReminders)
      .orderBy(desc(medicationReminders.createdAt))
      .limit(limit)
      .offset(offset);

    if (conditions.length > 0) query.where(and(...conditions));

    const rows = await query;
    return { data: rows, page, limit };
  }

  async acknowledge(id: string, patientId: string) {
    const [reminder] = await this.db
      .select()
      .from(medicationReminders)
      .where(and(eq(medicationReminders.id, id), eq(medicationReminders.patientId, patientId)))
      .limit(1);

    if (!reminder) throw new NotFoundException(`ไม่พบการแจ้งเตือนรหัส ${id}`);

    const [updated] = await this.db
      .update(medicationReminders)
      .set({ lastConfirmedAt: new Date(), updatedAt: new Date() })
      .where(eq(medicationReminders.id, id))
      .returning();

    return updated;
  }

  async getAdherenceStats(patientId: string) {
    const [patient] = await this.db
      .select()
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1);

    if (!patient) throw new NotFoundException(`ไม่พบข้อมูลผู้ป่วย ${patientId}`);

    const reminders = await this.db
      .select()
      .from(medicationReminders)
      .where(eq(medicationReminders.patientId, patientId));

    const totalReminders = reminders.length;
    const confirmedReminders = reminders.filter((r: any) => r.lastConfirmedAt !== null).length;
    const adherenceRate =
      totalReminders > 0 ? Math.round((confirmedReminders / totalReminders) * 100) : 0;

    const activeReminders = reminders.filter((r: any) => r.isActive);

    return {
      patientId,
      totalReminders,
      confirmedReminders,
      adherenceRate,
      activeReminders: activeReminders.length,
      medications: activeReminders.map((r: any) => ({
        id: r.id,
        drugName: r.drugName,
        sig: r.sig,
        lastRemindedAt: r.lastRemindedAt,
        lastConfirmedAt: r.lastConfirmedAt,
        weeklyAdherence: r.weeklyAdherence,
      })),
    };
  }

  async sendReminderNow(id: string) {
    const [reminder] = await this.db
      .select({ reminder: medicationReminders, lineUserId: patients.lineUserId })
      .from(medicationReminders)
      .innerJoin(patients, eq(medicationReminders.patientId, patients.id))
      .where(eq(medicationReminders.id, id))
      .limit(1);

    if (!reminder) throw new NotFoundException(`ไม่พบการแจ้งเตือนรหัส ${id}`);

    await this.dispatchLineReminder(
      reminder.lineUserId,
      reminder.reminder.drugName,
      reminder.reminder.id,
      reminder.reminder.patientId,
    );

    return { success: true, message: 'ส่งการแจ้งเตือนเรียบร้อยแล้ว' };
  }

  async dispatchLineReminder(
    lineUserId: string | null,
    drugName: string,
    reminderId: string,
    patientId: string,
  ) {
    if (!lineUserId) {
      this.logger.warn(`Patient ${patientId} has no LINE user ID, skipping push`);
      return;
    }

    const message = `แจ้งเตือน: ถึงเวลาเติมยา ${drugName} แล้วค่ะ กรุณาติดต่อเภสัชกรเพื่อสั่งยาใหม่`;

    await this.lineClient.pushMessage(lineUserId, [{ type: 'text', text: message }]);

    await this.db
      .update(medicationReminders)
      .set({ lastRemindedAt: new Date(), updatedAt: new Date() })
      .where(eq(medicationReminders.id, reminderId));

    await this.db.insert(notifications).values({
      patientId,
      type: 'refill_reminder',
      channel: 'line',
      title: 'แจ้งเตือนเติมยา',
      body: message,
      status: 'sent',
      sentAt: new Date(),
      referenceType: 'medication_reminder',
      referenceId: reminderId,
    });

    this.logger.log(`LINE reminder sent to ${lineUserId} for drug ${drugName}`);
  }
}
