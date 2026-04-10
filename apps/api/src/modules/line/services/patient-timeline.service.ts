import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, desc, and, inArray, sql, isNull } from 'drizzle-orm';
import {
  chatSessions,
  prescriptions,
  orders,
  complaints,
  videoConsultations,
  medicationReminders,
  notifications,
  patients,
  patientAllergies,
  patientChronicDiseases,
  patientMedications,
  lineContactJourneys,
  loyaltyAccounts,
} from '@telepharmacy/db';
import { DRIZZLE } from '../../../database/database.constants';

export type TimelineItemKind =
  | 'chat_session'
  | 'prescription'
  | 'order'
  | 'consultation'
  | 'complaint'
  | 'adherence'
  | 'notification';

export interface TimelineItem {
  id: string;
  kind: TimelineItemKind;
  at: string;
  title: string;
  subtitle?: string;
  meta?: Record<string, unknown>;
}

export interface NextActionItem {
  id: string;
  kind: string;
  severity: 'high' | 'medium' | 'low';
  label: string;
  href?: string;
}

export interface ClinicalSnapshot {
  patientId: string;
  patientNo: string | null;
  name: string;
  phone: string | null;
  lineLinkedAt: string | null;
  lineContactState: string | null;
  lineJourneyStep: string | null;
  allergies: string[];
  chronicConditions: string[];
  currentMedicationCount: number;
  activeReminderCount: number;
  loyaltyPoints: number | null;
}

const FETCH_LIMIT = 25;

@Injectable()
export class PatientTimelineService {
  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  async getCustomer360(sessionId: string) {
    const [sessionRow] = await this.db
      .select({
        id: chatSessions.id,
        patientId: chatSessions.patientId,
        lineUserId: chatSessions.lineUserId,
        followUpAt: chatSessions.followUpAt,
        queueStatus: chatSessions.queueStatus,
        status: chatSessions.status,
      })
      .from(chatSessions)
      .where(eq(chatSessions.id, sessionId))
      .limit(1);

    if (!sessionRow) {
      throw new NotFoundException('Session not found');
    }

    const patientId = sessionRow.patientId;

    const [patient] = await this.db
      .select({
        id: patients.id,
        patientNo: patients.patientNo,
        firstName: patients.firstName,
        lastName: patients.lastName,
        phone: patients.phone,
        lineLinkedAt: patients.lineLinkedAt,
      })
      .from(patients)
      .where(and(eq(patients.id, patientId), isNull(patients.deletedAt)))
      .limit(1);

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    const [
      journeyRow,
      loyaltyRow,
      allergyRows,
      chronicRows,
      medCount,
      reminderRows,
      timeline,
      nextActions,
    ] = await Promise.all([
      sessionRow.lineUserId
        ? this.db
            .select({
              state: lineContactJourneys.state,
              currentStep: lineContactJourneys.currentStep,
            })
            .from(lineContactJourneys)
            .where(eq(lineContactJourneys.lineUserId, sessionRow.lineUserId))
            .limit(1)
            .then((r: { state: string; currentStep: string | null }[]) => r[0] ?? null)
        : Promise.resolve(null),
      this.db
        .select({ currentPoints: loyaltyAccounts.currentPoints })
        .from(loyaltyAccounts)
        .where(eq(loyaltyAccounts.patientId, patientId))
        .limit(1)
        .then((r: { currentPoints: number }[]) => r[0] ?? null),
      this.db
        .select({ drugName: patientAllergies.drugName })
        .from(patientAllergies)
        .where(eq(patientAllergies.patientId, patientId))
        .orderBy(desc(patientAllergies.createdAt))
        .limit(8),
      this.db
        .select({ diseaseName: patientChronicDiseases.diseaseName })
        .from(patientChronicDiseases)
        .where(
          and(
            eq(patientChronicDiseases.patientId, patientId),
            eq(patientChronicDiseases.status, 'active'),
          ),
        )
        .orderBy(desc(patientChronicDiseases.createdAt))
        .limit(8),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(patientMedications)
        .where(
          and(
            eq(patientMedications.patientId, patientId),
            eq(patientMedications.isCurrent, true),
          ),
        )
        .then((r: { count: number }[]) => r[0]?.count ?? 0),
      this.db
        .select({
          id: medicationReminders.id,
          drugName: medicationReminders.drugName,
          weeklyAdherence: medicationReminders.weeklyAdherence,
          lastRemindedAt: medicationReminders.lastRemindedAt,
          updatedAt: medicationReminders.updatedAt,
        })
        .from(medicationReminders)
        .where(
          and(
            eq(medicationReminders.patientId, patientId),
            eq(medicationReminders.isActive, true),
          ),
        )
        .orderBy(desc(medicationReminders.updatedAt))
        .limit(FETCH_LIMIT),
      this.buildTimeline(patientId),
      this.buildNextActions(patientId, sessionRow),
    ]);

    const clinical: ClinicalSnapshot = {
      patientId: patient.id,
      patientNo: patient.patientNo,
      name: `${patient.firstName} ${patient.lastName}`.trim(),
      phone: patient.phone,
      lineLinkedAt: patient.lineLinkedAt ? new Date(patient.lineLinkedAt).toISOString() : null,
      lineContactState: journeyRow?.state ?? null,
      lineJourneyStep: journeyRow?.currentStep ?? null,
      allergies: allergyRows.map((a: { drugName: string }) => a.drugName),
      chronicConditions: chronicRows.map((c: { diseaseName: string }) => c.diseaseName),
      currentMedicationCount: medCount,
      activeReminderCount: reminderRows.length,
      loyaltyPoints: loyaltyRow?.currentPoints ?? null,
    };

    const adherenceItems: TimelineItem[] = reminderRows.map(
      (r: {
        id: string;
        drugName: string;
        weeklyAdherence: string | null;
        lastRemindedAt: Date | null;
        updatedAt: Date;
      }) => ({
        id: r.id,
        kind: 'adherence' as const,
        at: new Date(r.lastRemindedAt ?? r.updatedAt).toISOString(),
        title: `แจ้งเตือนยา: ${r.drugName}`,
        subtitle:
          r.weeklyAdherence != null
            ? `ความครบถ้วนรายสัปดาห์ ${r.weeklyAdherence}%`
            : 'ยาที่ติดตามอยู่',
        meta: { weeklyAdherence: r.weeklyAdherence },
      }),
    );

    const merged = [...timeline, ...adherenceItems].sort(
      (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
    );

    return {
      sessionId,
      clinical,
      timeline: merged.slice(0, 100),
      nextActions,
    };
  }

  private async buildTimeline(patientId: string): Promise<TimelineItem[]> {
    const [
      sessions,
      rxList,
      orderList,
      consultList,
      complaintList,
      notifList,
    ] = await Promise.all([
      this.db
        .select({
          id: chatSessions.id,
          status: chatSessions.status,
          queueStatus: chatSessions.queueStatus,
          messageCount: chatSessions.messageCount,
          entryIntent: chatSessions.entryIntent,
          createdAt: chatSessions.createdAt,
          resolvedAt: chatSessions.resolvedAt,
        })
        .from(chatSessions)
        .where(eq(chatSessions.patientId, patientId))
        .orderBy(desc(chatSessions.updatedAt))
        .limit(FETCH_LIMIT),
      this.db
        .select({
          id: prescriptions.id,
          rxNo: prescriptions.rxNo,
          status: prescriptions.status,
          diagnosis: prescriptions.diagnosis,
          createdAt: prescriptions.createdAt,
        })
        .from(prescriptions)
        .where(eq(prescriptions.patientId, patientId))
        .orderBy(desc(prescriptions.createdAt))
        .limit(FETCH_LIMIT),
      this.db
        .select({
          id: orders.id,
          orderNo: orders.orderNo,
          status: orders.status,
          totalAmount: orders.totalAmount,
          createdAt: orders.createdAt,
        })
        .from(orders)
        .where(eq(orders.patientId, patientId))
        .orderBy(desc(orders.createdAt))
        .limit(FETCH_LIMIT),
      this.db
        .select({
          id: videoConsultations.id,
          status: videoConsultations.status,
          type: videoConsultations.type,
          chiefComplaint: videoConsultations.chiefComplaint,
          createdAt: videoConsultations.createdAt,
          startedAt: videoConsultations.startedAt,
        })
        .from(videoConsultations)
        .where(eq(videoConsultations.patientId, patientId))
        .orderBy(desc(videoConsultations.createdAt))
        .limit(FETCH_LIMIT),
      this.db
        .select({
          id: complaints.id,
          status: complaints.status,
          category: complaints.category,
          description: complaints.description,
          createdAt: complaints.createdAt,
        })
        .from(complaints)
        .where(eq(complaints.patientId, patientId))
        .orderBy(desc(complaints.createdAt))
        .limit(FETCH_LIMIT),
      this.db
        .select({
          id: notifications.id,
          title: notifications.title,
          type: notifications.type,
          status: notifications.status,
          createdAt: notifications.createdAt,
          sentAt: notifications.sentAt,
        })
        .from(notifications)
        .where(eq(notifications.patientId, patientId))
        .orderBy(desc(notifications.createdAt))
        .limit(FETCH_LIMIT),
    ]);

    const items: TimelineItem[] = [];

    for (const s of sessions) {
      items.push({
        id: s.id,
        kind: 'chat_session',
        at: new Date(s.createdAt).toISOString(),
        title: `แชท — ${s.queueStatus ?? s.status}`,
        subtitle: s.entryIntent ? `เจตนา: ${s.entryIntent}` : `${s.messageCount ?? 0} ข้อความ`,
        meta: {
          status: s.status,
          queueStatus: s.queueStatus,
          resolvedAt: s.resolvedAt ? new Date(s.resolvedAt).toISOString() : null,
        },
      });
    }

    for (const r of rxList) {
      items.push({
        id: r.id,
        kind: 'prescription',
        at: new Date(r.createdAt).toISOString(),
        title: `ใบสั่งยา ${r.rxNo}`,
        subtitle: r.diagnosis ? String(r.diagnosis).slice(0, 120) : `สถานะ: ${r.status}`,
        meta: { status: r.status },
      });
    }

    for (const o of orderList) {
      items.push({
        id: o.id,
        kind: 'order',
        at: new Date(o.createdAt).toISOString(),
        title: `ออเดอร์ ${o.orderNo}`,
        subtitle: `สถานะ ${o.status} · ฿${o.totalAmount ?? '0'}`,
        meta: { status: o.status },
      });
    }

    for (const v of consultList) {
      items.push({
        id: v.id,
        kind: 'consultation',
        at: new Date(v.startedAt ?? v.createdAt).toISOString(),
        title: `ปรึกษาทางวิดีโอ (${v.type})`,
        subtitle: v.chiefComplaint ? String(v.chiefComplaint).slice(0, 120) : v.status,
        meta: { status: v.status },
      });
    }

    for (const c of complaintList) {
      items.push({
        id: c.id,
        kind: 'complaint',
        at: new Date(c.createdAt).toISOString(),
        title: `เรื่องร้องเรียน${c.category ? `: ${c.category}` : ''}`,
        subtitle: c.description ? String(c.description).slice(0, 100) : c.status,
        meta: { status: c.status },
      });
    }

    for (const n of notifList) {
      items.push({
        id: n.id,
        kind: 'notification',
        at: new Date(n.sentAt ?? n.createdAt).toISOString(),
        title: n.title,
        subtitle: `${n.type} · ${n.status}`,
        meta: { type: n.type, status: n.status },
      });
    }

    return items;
  }

  private async buildNextActions(
    patientId: string,
    session: {
      followUpAt: Date | null;
      queueStatus: string | null;
      status: string;
    },
  ): Promise<NextActionItem[]> {
    const actions: NextActionItem[] = [];

    if (session.followUpAt && new Date(session.followUpAt) <= new Date()) {
      actions.push({
        id: 'session-follow-up',
        kind: 'inbox_follow_up',
        severity: 'high',
        label: 'ถึงกำหนดติดตามจาก inbox (นัดถัดไป)',
      });
    }

    if (session.status === 'active' && session.queueStatus === 'needs_human') {
      actions.push({
        id: 'session-needs-human',
        kind: 'inbox_queue',
        severity: 'medium',
        label: 'เคสนี้รอเภสัชกรตอบ',
      });
    }

    const [openComplaints, pendingRx, stuckOrders, pendingConsults] = await Promise.all([
      this.db
        .select({ id: complaints.id })
        .from(complaints)
        .where(
          and(
            eq(complaints.patientId, patientId),
            inArray(complaints.status, ['open', 'in_progress']),
          ),
        )
        .limit(5),
      this.db
        .select({ id: prescriptions.id, rxNo: prescriptions.rxNo, status: prescriptions.status })
        .from(prescriptions)
        .where(
          and(
            eq(prescriptions.patientId, patientId),
            inArray(prescriptions.status, [
              'received',
              'ai_processing',
              'pharmacist_reviewing',
            ]),
          ),
        )
        .orderBy(desc(prescriptions.createdAt))
        .limit(5),
      this.db
        .select({ id: orders.id, orderNo: orders.orderNo, status: orders.status })
        .from(orders)
        .where(
          and(
            eq(orders.patientId, patientId),
            inArray(orders.status, ['draft', 'awaiting_payment']),
          ),
        )
        .orderBy(desc(orders.createdAt))
        .limit(5),
      this.db
        .select({ id: videoConsultations.id, status: videoConsultations.status })
        .from(videoConsultations)
        .where(
          and(
            eq(videoConsultations.patientId, patientId),
            inArray(videoConsultations.status, [
              'requested',
              'scope_validated',
              'consent_pending',
              'consent_accepted',
              'pharmacist_assigned',
            ]),
          ),
        )
        .orderBy(desc(videoConsultations.createdAt))
        .limit(5),
    ]);

    for (const c of openComplaints) {
      actions.push({
        id: `complaint-${c.id}`,
        kind: 'complaint',
        severity: 'high',
        label: 'มีเรื่องร้องเรียนที่ยังไม่ปิด',
        href: `/dashboard/complaints/${c.id}`,
      });
    }

    for (const r of pendingRx) {
      actions.push({
        id: `rx-${r.id}`,
        kind: 'prescription',
        severity: 'medium',
        label: `ใบสั่งยา ${r.rxNo} สถานะ ${r.status}`,
        href: `/dashboard/pharmacist/${r.id}`,
      });
    }

    for (const o of stuckOrders) {
      actions.push({
        id: `order-${o.id}`,
        kind: 'order',
        severity: 'medium',
        label: `ออเดอร์ ${o.orderNo} (${o.status})`,
        href: `/dashboard/orders/${o.id}`,
      });
    }

    for (const v of pendingConsults) {
      actions.push({
        id: `consult-${v.id}`,
        kind: 'consultation',
        severity: 'medium',
        label: 'การปรึกษาวิดีโอรอดำเนินการ',
        href: `/dashboard/telemedicine/${v.id}`,
      });
    }

    const adherenceCheck = await this.db
      .select({
        id: medicationReminders.id,
        drugName: medicationReminders.drugName,
        weeklyAdherence: medicationReminders.weeklyAdherence,
      })
      .from(medicationReminders)
      .where(
        and(eq(medicationReminders.patientId, patientId), eq(medicationReminders.isActive, true)),
      )
      .limit(20);

    for (const m of adherenceCheck) {
      const w = m.weeklyAdherence != null ? Number(m.weeklyAdherence) : null;
      if (w != null && !Number.isNaN(w) && w < 70) {
        actions.push({
          id: `adh-${m.id}`,
          kind: 'adherence',
          severity: 'low',
          label: `ความครบถ้วนยา ${m.drugName} ต่ำ (${w}%)`,
          href: `/dashboard/patients/${patientId}`,
        });
      }
    }

    return actions.slice(0, 20);
  }
}
