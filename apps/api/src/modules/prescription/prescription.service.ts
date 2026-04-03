import { Injectable, Inject, Logger, NotFoundException, BadRequestException, Optional } from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as path from 'path';
import { eq, desc, and, inArray } from 'drizzle-orm';
import {
  prescriptions,
  prescriptionItems,
  pharmacistInterventions,
  counselingSessions,
  patientAllergies,
  patientChronicDiseases,
  patientMedications,
  patients,
  staff,
} from '@telepharmacy/db';
import { DRIZZLE } from '../../database/database.constants';
import { PrescriptionOcrService } from './prescription-ocr.service';
import { SafetyCheckEngineService } from '../drug-safety/safety-check-engine.service';
import { PrescriptionSignatureService } from './prescription-signature.service';
import { NotificationSenderService } from '../notifications/notification-sender.service';
import { EventsService } from '../events/events.service';
import { MinioStorageService } from '../telemedicine/kyc/minio.service';
import type { CreatePrescriptionDto } from './dto/create-prescription.dto';
import type { VerifyPrescriptionDto } from './dto/verify-prescription.dto';
import type { PatientSafetyContext } from '../drug-safety/drug-safety.types';

@Injectable()
export class PrescriptionService {
  private readonly logger = new Logger(PrescriptionService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: any,
    private readonly ocrService: PrescriptionOcrService,
    private readonly safetyEngine: SafetyCheckEngineService,
    private readonly signatureService: PrescriptionSignatureService,
    private readonly notificationSender: NotificationSenderService,
    private readonly minioStorage: MinioStorageService,
    @Optional() private readonly eventsService?: EventsService,
  ) {}

  /** Upload patient prescription images and return public URLs stored for OCR. */
  async uploadRxImages(
    files: Array<{ buffer: Buffer; originalname: string; mimetype: string }>,
    patientId: string,
  ): Promise<string[]> {
    const urls: string[] = [];
    for (const file of files) {
      const ext = path.extname(file.originalname || '') || '.jpg';
      const safeExt = ext.length > 12 ? '.jpg' : ext;
      const filename = `rx/${patientId}/${randomUUID()}${safeExt}`;
      const url = await this.minioStorage.upload('prescriptions', filename, file.buffer);
      urls.push(url);
    }
    return urls;
  }

  async create(patientId: string, dto: CreatePrescriptionDto) {
    const rxNo = await this.generateRxNo();

    const images = (dto.imageUrls ?? []).map((url) => ({ imageUrl: url }));

    const [rx] = await this.db
      .insert(prescriptions)
      .values({
        rxNo,
        patientId,
        source: dto.source ?? 'line_chat',
        diagnosis: dto.diagnosis ?? null,
        images,
        ocrStatus: images.length > 0 ? 'pending' : 'no_images',
        status: 'received',
      })
      .returning();

    if (images.length > 0) {
      await this.ocrService.enqueueOcrJob(rx.id);
    }

    return rx;
  }

  async getQueue(page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    const queue = await this.db
      .select()
      .from(prescriptions)
      .where(
        inArray(prescriptions.status, [
          'received',
          'ai_completed',
          'pharmacist_reviewing',
        ] as any[]),
      )
      .orderBy(
        desc(prescriptions.aiPriority),
        desc(prescriptions.createdAt),
      )
      .limit(limit)
      .offset(offset);

    return {
      data: queue,
      page,
      limit,
      total: queue.length,
    };
  }

  async findById(id: string) {
    const [rx] = await this.db
      .select()
      .from(prescriptions)
      .where(eq(prescriptions.id, id))
      .limit(1);

    if (!rx) throw new NotFoundException(`Prescription ${id} not found`);

    const items = await this.db
      .select()
      .from(prescriptionItems)
      .where(eq(prescriptionItems.prescriptionId, id));

    return { ...rx, items };
  }

  async verify(id: string, pharmacistId: string, dto: VerifyPrescriptionDto) {
    const [rx] = await this.db
      .select()
      .from(prescriptions)
      .where(eq(prescriptions.id, id))
      .limit(1);

    if (!rx) throw new NotFoundException(`Prescription ${id} not found`);

    if (dto.decision === 'rejected' && !dto.rejectionReason) {
      throw new BadRequestException('rejectionReason is required when rejecting');
    }

    const items = await this.db
      .select()
      .from(prescriptionItems)
      .where(eq(prescriptionItems.prescriptionId, id));

    if (items.length > 0) {
      const patientCtx = await this.buildPatientContext(rx.patientId);
      const drugsToCheck = items.map((item: any) => ({
        name: item.drugName,
        strength: item.strength ?? undefined,
        sig: item.sig ?? undefined,
      }));

      const safetyResult = await this.safetyEngine.runChecks(drugsToCheck, patientCtx);

      await this.db
        .update(prescriptions)
        .set({
          aiChecksPassed: !safetyResult.hasIssues,
          aiChecksResult: safetyResult,
          aiPriority: this.mapRiskToPriority(safetyResult.overallRisk),
        })
        .where(eq(prescriptions.id, id));

      for (const item of items) {
        await this.safetyEngine.persistSafetyChecks(item.id, safetyResult);
      }
    }

    const newStatus = this.mapDecisionToStatus(dto.decision);

    // Fetch pharmacist record for digital signature (requires license number).
    const [pharmacist] = await this.db
      .select({
        id: staff.id,
        firstName: staff.firstName,
        lastName: staff.lastName,
        licenseNo: staff.licenseNo,
      })
      .from(staff)
      .where(eq(staff.id, pharmacistId))
      .limit(1);

    if (!pharmacist) {
      throw new NotFoundException(`Pharmacist ${pharmacistId} not found`);
    }

    // Generate a tamper-proof digital signature for the approval decision.
    const interventionNotes = [
      dto.interventionNote,
      dto.rejectionReason,
    ].filter(Boolean).join('; ');

    const signatureToken = this.signatureService.signPrescription(
      id,
      pharmacist,
      dto.decision,
      interventionNotes,
    );

    const signedAt = new Date();

    await this.db
      .update(prescriptions)
      .set({
        status: newStatus,
        verifiedBy: pharmacistId,
        verifiedAt: signedAt,
        rejectionReason: dto.rejectionReason ?? null,
        digitalSignature: signatureToken,
        signedAt,
      })
      .where(eq(prescriptions.id, id));

    if (dto.interventionNote || dto.interventionType) {
      await this.db.insert(pharmacistInterventions).values({
        prescriptionId: id,
        interventionType: (dto.interventionType ?? 'other') as any,
        description: dto.interventionNote ?? '',
        actionTaken: dto.decision,
        pharmacistId,
      });
    }

    // Trigger notification for key prescription status changes
    if (['approved', 'rejected', 'dispensed'].includes(newStatus) && rx.patientId) {
      await this.sendPrescriptionNotification(rx, newStatus);
    }

    // Emit real-time WebSocket event for admin dashboard
    try {
      this.eventsService?.emitPrescriptionUpdate({
        id,
        status: newStatus,
        patientId: rx.patientId,
        rxNo: rx.rxNo,
        verifiedBy: pharmacistId,
      });
    } catch (err) {
      this.logger.error(`Failed to emit prescription:update for ${id}`, (err as Error).stack);
    }

    return this.findById(id);
  }

  async getPatientPrescriptions(patientId: string, page = 1, limit = 10) {
    const offset = (page - 1) * limit;

    const rxList = await this.db
      .select()
      .from(prescriptions)
      .where(eq(prescriptions.patientId, patientId))
      .orderBy(desc(prescriptions.createdAt))
      .limit(limit)
      .offset(offset);

    return { data: rxList, page, limit };
  }

  async logIntervention(prescriptionId: string, pharmacistId: string, body: {
    interventionType: string;
    description: string;
    actionTaken?: string;
    outcome?: string;
    severity?: string;
  }) {
    const [rx] = await this.db
      .select({ id: prescriptions.id })
      .from(prescriptions)
      .where(eq(prescriptions.id, prescriptionId))
      .limit(1);

    if (!rx) throw new NotFoundException(`Prescription ${prescriptionId} not found`);

    const [intervention] = await this.db
      .insert(pharmacistInterventions)
      .values({
        prescriptionId,
        interventionType: body.interventionType as any,
        description: body.description,
        actionTaken: body.actionTaken ?? null,
        outcome: body.outcome ?? null,
        severity: body.severity ?? null,
        pharmacistId,
      })
      .returning();

    return intervention;
  }

  async startCounseling(prescriptionId: string, pharmacistId: string, method: string) {
    const [rx] = await this.db
      .select({ id: prescriptions.id })
      .from(prescriptions)
      .where(eq(prescriptions.id, prescriptionId))
      .limit(1);

    if (!rx) throw new NotFoundException(`Prescription ${prescriptionId} not found`);

    const [session] = await this.db
      .insert(counselingSessions)
      .values({
        prescriptionId,
        method: method as any,
        startedAt: new Date(),
        pharmacistId,
        patientConfirmed: false,
      })
      .returning();

    return session;
  }

  async updateCounseling(sessionId: string, body: {
    endedAt?: string;
    topicsCovered?: string[];
    notes?: string;
    patientConfirmed?: boolean;
  }) {
    const updates: any = {};
    if (body.endedAt) {
      updates.endedAt = new Date(body.endedAt);
      const [existing] = await this.db
        .select({ startedAt: counselingSessions.startedAt })
        .from(counselingSessions)
        .where(eq(counselingSessions.id, sessionId))
        .limit(1);
      if (existing?.startedAt) {
        updates.durationSeconds = Math.floor(
          (new Date(body.endedAt).getTime() - new Date(existing.startedAt).getTime()) / 1000,
        );
      }
    }
    if (body.topicsCovered) updates.topicsCovered = body.topicsCovered;
    if (body.notes !== undefined) updates.notes = body.notes;
    if (body.patientConfirmed !== undefined) {
      updates.patientConfirmed = body.patientConfirmed;
      if (body.patientConfirmed) updates.confirmedAt = new Date();
    }

    const [updated] = await this.db
      .update(counselingSessions)
      .set(updates)
      .where(eq(counselingSessions.id, sessionId))
      .returning();

    return updated;
  }

  async getSignature(prescriptionId: string) {
    const [rx] = await this.db
      .select({
        id: prescriptions.id,
        rxNo: prescriptions.rxNo,
        status: prescriptions.status,
        verifiedBy: prescriptions.verifiedBy,
        verifiedAt: prescriptions.verifiedAt,
        digitalSignature: prescriptions.digitalSignature,
        signedAt: prescriptions.signedAt,
      })
      .from(prescriptions)
      .where(eq(prescriptions.id, prescriptionId))
      .limit(1);

    if (!rx) throw new NotFoundException(`Prescription ${prescriptionId} not found`);

    if (!rx.digitalSignature) {
      return {
        hasSignature: false,
        prescriptionId: rx.id,
        rxNo: rx.rxNo,
        status: rx.status,
      };
    }

    // Verify the stored signature to detect any tampering since it was created.
    const decoded = this.signatureService.verifyPrescriptionSignature(rx.digitalSignature);

    return {
      hasSignature: true,
      prescriptionId: rx.id,
      rxNo: rx.rxNo,
      status: rx.status,
      verifiedBy: rx.verifiedBy,
      verifiedAt: rx.verifiedAt,
      signedAt: rx.signedAt,
      signature: decoded,
      signatureValid: true,
    };
  }

  /**
   * Send a notification to the patient when prescription status changes to approved/rejected/dispensed.
   * Wrapped in try/catch so notification failures don't break the main flow.
   */
  private async sendPrescriptionNotification(rx: any, status: string) {
    const statusMessages: Record<string, { title: string; body: string }> = {
      approved: {
        title: 'ใบสั่งยาอนุมัติแล้ว',
        body: `ใบสั่งยา ${rx.rxNo} ได้รับการอนุมัติแล้ว สามารถสั่งซื้อยาได้`,
      },
      rejected: {
        title: 'ใบสั่งยาไม่ผ่านการตรวจสอบ',
        body: `ใบสั่งยา ${rx.rxNo} ไม่ผ่านการตรวจสอบ กรุณาติดต่อเภสัชกร`,
      },
      dispensed: {
        title: 'จ่ายยาเรียบร้อย',
        body: `ใบสั่งยา ${rx.rxNo} ได้จ่ายยาเรียบร้อยแล้ว`,
      },
    };

    const msg = statusMessages[status];
    if (!msg) return;

    try {
      await this.notificationSender.send({
        patientId: rx.patientId,
        type: 'prescription_update',
        title: msg.title,
        body: msg.body,
        referenceType: 'prescription',
        referenceId: rx.id,
      });
    } catch (err) {
      this.logger.error(
        `Failed to send prescription notification for ${rx.id} (status=${status})`,
        (err as Error).stack,
      );
    }
  }

  private async buildPatientContext(patientId: string): Promise<PatientSafetyContext> {
    const [patient] = await this.db
      .select()
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1);

    const allergies = await this.db
      .select()
      .from(patientAllergies)
      .where(eq(patientAllergies.patientId, patientId));

    const diseases = await this.db
      .select()
      .from(patientChronicDiseases)
      .where(eq(patientChronicDiseases.patientId, patientId));

    const meds = await this.db
      .select()
      .from(patientMedications)
      .where(and(eq(patientMedications.patientId, patientId), eq(patientMedications.isCurrent, true)));

    const birthDate = patient?.birthDate ? new Date(patient.birthDate) : null;
    const age = birthDate
      ? Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : 30;

    return {
      id: patientId,
      firstName: patient?.firstName ?? '',
      lastName: patient?.lastName ?? '',
      age,
      gender: patient?.gender ?? 'other',
      weight: patient?.weight ? parseFloat(patient.weight) : undefined,
      isPregnant: patient?.isPregnant ?? false,
      isBreastfeeding: patient?.isBreastfeeding ?? false,
      allergies: allergies.map((a: any) => ({
        drugName: a.drugName,
        genericNames: a.genericNames ?? [],
        allergyGroup: a.allergyGroup ?? undefined,
        severity: a.severity ?? 'moderate',
      })),
      chronicDiseases: diseases.map((d: any) => ({
        diseaseName: d.diseaseName,
        icd10Code: d.icd10Code ?? undefined,
        status: d.status ?? 'active',
      })),
      currentMedications: meds.map((m: any) => ({
        drugName: m.drugName,
        genericName: m.genericName ?? undefined,
        strength: m.strength ?? undefined,
        sig: m.sig ?? '',
      })),
    };
  }

  private mapDecisionToStatus(decision: string): string {
    switch (decision) {
      case 'approved': return 'approved';
      case 'rejected': return 'rejected';
      case 'partial': return 'partial';
      case 'referred': return 'referred';
      default: return 'pharmacist_reviewing';
    }
  }

  private mapRiskToPriority(risk: string): string {
    switch (risk) {
      case 'critical': return 'urgent';
      case 'high': return 'high';
      case 'medium': return 'medium';
      default: return 'low';
    }
  }

  private async generateRxNo(): Promise<string> {
    const date = new Date();
    const prefix = `RX${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    const count = await this.db.$count(prescriptions);
    return `${prefix}${String((count ?? 0) + 1).padStart(5, '0')}`;
  }
}
