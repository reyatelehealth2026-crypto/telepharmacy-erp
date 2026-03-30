import { Injectable, Inject, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { safetyChecks, prescriptionItems } from '@telepharmacy/db';
import { DRIZZLE } from '../../database/database.constants';
import { AllergyDetectionService } from './allergy-detection.service';
import { DrugInteractionService } from './drug-interaction.service';
import { ContraindicationCheckerService } from './contraindication-checker.service';
import { DuplicateTherapyService } from './duplicate-therapy.service';
import { DoseRangeValidatorService } from './dose-range-validator.service';
import type {
  DrugToCheck,
  PatientSafetyContext,
  SafetyCheckSummary,
  SafetyIssue,
} from './drug-safety.types';

@Injectable()
export class SafetyCheckEngineService {
  private readonly logger = new Logger(SafetyCheckEngineService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: any,
    private readonly allergyDetection: AllergyDetectionService,
    private readonly ddiChecker: DrugInteractionService,
    private readonly contraindicationChecker: ContraindicationCheckerService,
    private readonly duplicateTherapy: DuplicateTherapyService,
    private readonly doseValidator: DoseRangeValidatorService,
  ) {}

  async runChecks(
    drugsToCheck: DrugToCheck[],
    patient: PatientSafetyContext,
  ): Promise<SafetyCheckSummary> {
    const [allergyAlerts, ddiAlerts, contraindications, duplicateTherapy, doseWarnings] =
      await Promise.all([
        this.allergyDetection.checkAllergies(drugsToCheck, patient),
        this.ddiChecker.checkInteractions([...drugsToCheck, ...patient.currentMedications.map((m) => ({
          name: m.drugName,
          genericName: m.genericName,
          strength: m.strength,
        }))]),
        this.contraindicationChecker.checkContraindications(drugsToCheck, patient),
        this.duplicateTherapy.checkDuplicateTherapy(drugsToCheck, patient),
        this.doseValidator.checkDoses(drugsToCheck, patient),
      ]);

    const allIssues: SafetyIssue[] = [
      ...allergyAlerts,
      ...ddiAlerts,
      ...contraindications,
      ...duplicateTherapy,
      ...doseWarnings,
    ];

    const hasIssues = allIssues.length > 0;
    const overallRisk = this.calculateRisk(allergyAlerts, ddiAlerts, contraindications);

    const summaryParts: string[] = [];
    if (allergyAlerts.length > 0)
      summaryParts.push(`พบการแพ้ยา ${allergyAlerts.length} รายการ`);
    if (ddiAlerts.length > 0)
      summaryParts.push(`พบปฏิกิริยาระหว่างยา ${ddiAlerts.length} คู่`);
    if (contraindications.length > 0)
      summaryParts.push(`พบข้อห้ามใช้ ${contraindications.length} รายการ`);
    if (duplicateTherapy.length > 0)
      summaryParts.push(`พบยาซ้ำซ้อน ${duplicateTherapy.length} รายการ`);
    if (doseWarnings.length > 0)
      summaryParts.push(`พบคำเตือนขนาดยา ${doseWarnings.length} รายการ`);

    const summary =
      summaryParts.length > 0
        ? summaryParts.join('; ')
        : 'ผ่านการตรวจสอบความปลอดภัย ไม่พบปัญหา';

    return {
      hasIssues,
      overallRisk,
      issues: allIssues,
      allergyAlerts,
      ddiAlerts,
      contraindications,
      duplicateTherapy,
      doseWarnings,
      summary,
    };
  }

  async persistSafetyChecks(
    prescriptionItemId: string,
    summary: SafetyCheckSummary,
  ): Promise<void> {
    const rows: Parameters<typeof this.db.insert>[0] extends never ? never[] : any[] = [];

    for (const alert of summary.allergyAlerts) {
      rows.push({
        prescriptionItemId,
        checkType: 'allergy',
        result: alert.severity === 'life_threatening' || alert.severity === 'severe' ? 'fail' : 'warning',
        severity: alert.severity,
        description: alert.message,
        recommendation: alert.isCrossAllergy
          ? 'ตรวจสอบ cross-allergy และพิจารณาใช้ยาทางเลือก'
          : 'ห้ามจ่ายยานี้ — ผู้ป่วยมีประวัติแพ้',
        aiGenerated: false,
      });
    }

    for (const ddi of summary.ddiAlerts) {
      rows.push({
        prescriptionItemId,
        checkType: 'drug_interaction',
        result: ddi.severity === 'contraindicated' || ddi.severity === 'major' ? 'fail' : 'warning',
        severity: ddi.severity,
        description: `DDI: ${ddi.drugA} + ${ddi.drugB} — ${ddi.clinicalEffect}`,
        recommendation: ddi.management,
        aiGenerated: false,
      });
    }

    for (const ci of summary.contraindications) {
      rows.push({
        prescriptionItemId,
        checkType: 'contraindication',
        result: ci.severity === 'contraindicated' ? 'fail' : 'warning',
        severity: ci.severity,
        description: `ข้อห้ามใช้: ${ci.drugName} ใน ${ci.diseaseName} — ${ci.reason}`,
        recommendation: ci.alternative ?? 'ปรึกษาแพทย์ก่อนจ่ายยา',
        aiGenerated: false,
      });
    }

    for (const dup of summary.duplicateTherapy) {
      rows.push({
        prescriptionItemId,
        checkType: 'duplicate_therapy',
        result: 'warning' as const,
        severity: 'moderate',
        description: dup.message,
        recommendation: 'ตรวจสอบว่ามีความตั้งใจสั่งยาซ้ำหรือไม่',
        aiGenerated: false,
      });
    }

    if (rows.length === 0) {
      await this.db.insert(safetyChecks).values({
        prescriptionItemId,
        checkType: 'overall',
        result: 'pass' as const,
        description: 'ผ่านการตรวจสอบความปลอดภัยทั้งหมด',
        aiGenerated: false,
      });
      return;
    }

    await this.db.insert(safetyChecks).values(rows);
  }

  private calculateRisk(
    allergies: SafetyCheckSummary['allergyAlerts'],
    ddis: SafetyCheckSummary['ddiAlerts'],
    contraindications: SafetyCheckSummary['contraindications'],
  ): SafetyCheckSummary['overallRisk'] {
    const hasLifeThreatening = allergies.some(
      (a) => a.severity === 'life_threatening' || a.severity === 'severe',
    );
    if (hasLifeThreatening) return 'critical';

    const hasContraindicated =
      ddis.some((d) => d.severity === 'contraindicated') ||
      contraindications.some((c) => c.severity === 'contraindicated');
    if (hasContraindicated) return 'critical';

    const hasMajor =
      ddis.some((d) => d.severity === 'major') ||
      allergies.some((a) => a.severity === 'moderate') ||
      contraindications.length > 0;
    if (hasMajor) return 'high';

    const hasModerate = ddis.some((d) => d.severity === 'moderate') || allergies.length > 0;
    if (hasModerate) return 'medium';

    return 'low';
  }
}
