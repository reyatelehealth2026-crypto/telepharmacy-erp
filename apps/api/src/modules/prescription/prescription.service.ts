import { Injectable, Inject, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
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
} from '@telepharmacy/db';
import { DRIZZLE } from '../../database/database.constants';
import { PrescriptionOcrService } from './prescription-ocr.service';
import { SafetyCheckEngineService } from '../drug-safety/safety-check-engine.service';
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
  ) {}

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

    await this.db
      .update(prescriptions)
      .set({
        status: newStatus,
        verifiedBy: pharmacistId,
        verifiedAt: new Date(),
        rejectionReason: dto.rejectionReason ?? null,
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
