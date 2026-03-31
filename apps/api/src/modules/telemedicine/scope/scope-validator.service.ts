import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DRIZZLE } from '../../../database/database.constants';
import * as schema from '@telepharmacy/db';
import { eq, and, desc, gte, sql } from 'drizzle-orm';
import { TelemedicineAuditService } from '../audit/audit.service';
import type {
  ValidateConsultationScopeDto,
  ScopeValidationResult,
  TriggeredRule,
} from './dto/validate-scope.dto';

const {
  scopeRules,
  scopeValidationResults,
  videoConsultations,
  patients,
} = schema;

interface PatientHistory {
  isNewPatient: boolean;
  lastConsultationDate: Date | null;
  hasBaselineData: boolean;
  baselineDataAge: number | null; // in months
  consultationCount: number;
}

interface ValidationContext {
  patient: PatientHistory;
  symptoms: string[];
  requestedMedications: Array<{ drugName: string; genericName?: string }>;
  consultationType: string;
}

interface RuleEvaluationResult {
  triggered: boolean;
  details?: Record<string, any>;
}

@Injectable()
export class ScopeValidatorService {
  constructor(
    @Inject(DRIZZLE) private db: any,
    private readonly config: ConfigService,
    private readonly auditService: TelemedicineAuditService,
  ) {}

  /**
   * Validate consultation scope against all active rules
   */
  async validateConsultationScope(
    dto: ValidateConsultationScopeDto,
    actorId: string,
    actorType: 'patient' | 'pharmacist' | 'system',
  ): Promise<ScopeValidationResult> {
    // 1. Load active rules sorted by priority
    const rules = await this.loadActiveRules();

    // 2. Get patient history
    const patientHistory = await this.getPatientHistory(dto.patientId);

    // 3. Build validation context
    const context: ValidationContext = {
      patient: patientHistory,
      symptoms: dto.symptoms,
      requestedMedications: dto.requestedMedications,
      consultationType: dto.consultationType,
    };

    // 4. Evaluate all rules
    const triggeredRules: TriggeredRule[] = [];
    let overallResult: 'passed' | 'rejected' | 'requires_review' = 'passed';

    for (const rule of rules) {
      const ruleResult = await this.evaluateRule(rule, context);

      if (ruleResult.triggered) {
        triggeredRules.push({
          ruleId: rule.id,
          ruleName: rule.ruleName,
          ruleType: rule.ruleType,
          action: rule.action as 'allow' | 'reject' | 'flag_review',
          severity: rule.severity || 'medium',
          message: rule.message || '',
          details: ruleResult.details,
        });

        // Update overall result based on most restrictive action
        if (rule.action === 'reject') {
          overallResult = 'rejected';
        } else if (
          rule.action === 'flag_review' &&
          overallResult === 'passed'
        ) {
          overallResult = 'requires_review';
        }
      }
    }

    // 5. Save validation result
    const [validationResult] = await this.db
      .insert(scopeValidationResults)
      .values({
        consultationId: dto.consultationId,
        overallResult,
        triggeredRules: triggeredRules,
        patientType: patientHistory.isNewPatient ? 'new_patient' : 'follow_up',
        lastConsultationDate: patientHistory.lastConsultationDate,
        hasBaselineData: patientHistory.hasBaselineData,
        prohibitedSymptoms: this.extractProhibitedSymptoms(triggeredRules),
        requestedMedications: dto.requestedMedications,
      })
      .returning();

    // 6. Audit log
    await this.auditService.log({
      actorId,
      actorType,
      actionType: 'scope_validation',
      entityType: 'consultation',
      entityId: dto.consultationId,
      metadata: {
        result: overallResult,
        triggeredRulesCount: triggeredRules.length,
        patientType: patientHistory.isNewPatient ? 'new_patient' : 'follow_up',
      },
    });

    // 7. Build response
    return {
      validationId: validationResult.id,
      consultationId: dto.consultationId,
      overallResult,
      canProceed: overallResult !== 'rejected',
      requiresPharmacistReview: overallResult === 'requires_review',
      triggeredRules,
      patientType: patientHistory.isNewPatient ? 'new_patient' : 'follow_up',
      lastConsultationDate: patientHistory.lastConsultationDate,
      hasBaselineData: patientHistory.hasBaselineData,
      prohibitedSymptoms: this.extractProhibitedSymptoms(triggeredRules),
      message: this.buildResultMessage(overallResult, triggeredRules),
    };
  }

  /**
   * Load all active scope rules sorted by priority
   */
  private async loadActiveRules(): Promise<any[]> {
    return await this.db
      .select()
      .from(scopeRules)
      .where(eq(scopeRules.isActive, true))
      .orderBy(scopeRules.priority);
  }

  /**
   * Get patient consultation history and baseline data status
   */
  private async getPatientHistory(
    patientId: string,
  ): Promise<PatientHistory> {
    // Get consultation count and last consultation date
    const consultations = await this.db
      .select({
        count: sql<number>`count(*)::int`,
        lastDate: sql<Date>`max(${videoConsultations.startedAt})`,
      })
      .from(videoConsultations)
      .where(
        and(
          eq(videoConsultations.patientId, patientId),
          eq(videoConsultations.status, 'completed'),
        ),
      );

    const consultationCount = consultations[0]?.count || 0;
    const lastConsultationDate = consultations[0]?.lastDate || null;

    // Check for baseline data (simplified - in production, check actual lab results)
    // For now, assume patient has baseline data if they have completed consultations
    const hasBaselineData = consultationCount > 0;

    // Calculate baseline data age in months
    let baselineDataAge: number | null = null;
    if (lastConsultationDate) {
      const now = new Date();
      baselineDataAge = this.getMonthsDifference(lastConsultationDate, now);
    }

    return {
      isNewPatient: consultationCount === 0,
      lastConsultationDate,
      hasBaselineData,
      baselineDataAge,
      consultationCount,
    };
  }

  /**
   * Evaluate a single rule against the validation context
   */
  private async evaluateRule(
    rule: any,
    context: ValidationContext,
  ): Promise<RuleEvaluationResult> {
    switch (rule.ruleType) {
      case 'symptom_check':
        return this.evaluateSymptomRule(rule, context);
      case 'medication_check':
        return this.evaluateMedicationRule(rule, context);
      case 'patient_type_check':
        return this.evaluatePatientTypeRule(rule, context);
      case 'baseline_data_check':
        return this.evaluateBaselineDataRule(rule, context);
      case 'time_since_last_visit':
        return this.evaluateTimeSinceLastVisitRule(rule, context);
      default:
        return { triggered: false };
    }
  }

  /**
   * Evaluate symptom check rule (prohibited symptoms)
   */
  private evaluateSymptomRule(
    rule: any,
    context: ValidationContext,
  ): RuleEvaluationResult {
    const prohibitedSymptoms = rule.condition.prohibitedSymptoms || [];
    const patientSymptoms = context.symptoms || [];

    const matchedSymptoms = patientSymptoms.filter((symptom) =>
      prohibitedSymptoms.some((prohibited: string) =>
        symptom.toLowerCase().includes(prohibited.toLowerCase()),
      ),
    );

    return {
      triggered: matchedSymptoms.length > 0,
      details: { matchedSymptoms },
    };
  }

  /**
   * Evaluate medication check rule (controlled substances)
   */
  private evaluateMedicationRule(
    rule: any,
    context: ValidationContext,
  ): RuleEvaluationResult {
    const controlledSubstances = rule.condition.controlledSubstances || [];
    const requestedMeds = context.requestedMedications || [];

    const matchedMeds = requestedMeds.filter((med) =>
      controlledSubstances.some(
        (controlled: string) =>
          med.drugName.toLowerCase().includes(controlled.toLowerCase()) ||
          (med.genericName &&
            med.genericName.toLowerCase().includes(controlled.toLowerCase())),
      ),
    );

    return {
      triggered: matchedMeds.length > 0,
      details: { matchedMedications: matchedMeds.map((m) => m.drugName) },
    };
  }

  /**
   * Evaluate patient type rule (new patient with acute condition)
   */
  private evaluatePatientTypeRule(
    rule: any,
    context: ValidationContext,
  ): RuleEvaluationResult {
    if (rule.condition.rejectNewPatientWithAcute) {
      const isNewPatient = context.patient.isNewPatient;
      const hasAcuteSymptoms = this.hasAcuteSymptoms(context.symptoms);

      return {
        triggered: isNewPatient && hasAcuteSymptoms,
        details: { isNewPatient, hasAcuteSymptoms },
      };
    }

    return { triggered: false };
  }

  /**
   * Evaluate baseline data check rule (chronic condition requires baseline)
   */
  private evaluateBaselineDataRule(
    rule: any,
    context: ValidationContext,
  ): RuleEvaluationResult {
    if (context.consultationType === 'follow_up_chronic') {
      const hasBaselineData = context.patient.hasBaselineData;
      const baselineDataAge = context.patient.baselineDataAge || 0;
      const maxAgeMonths = rule.condition.maxBaselineAgeMonths || 12;

      const isOutdated = baselineDataAge > maxAgeMonths;

      return {
        triggered: !hasBaselineData || isOutdated,
        details: { hasBaselineData, baselineDataAge, isOutdated, maxAgeMonths },
      };
    }

    return { triggered: false };
  }

  /**
   * Evaluate time since last visit rule
   */
  private evaluateTimeSinceLastVisitRule(
    rule: any,
    context: ValidationContext,
  ): RuleEvaluationResult {
    const lastVisit = context.patient.lastConsultationDate;

    if (!lastVisit) {
      return {
        triggered: true,
        details: { reason: 'no_previous_visit' },
      };
    }

    const monthsSinceLastVisit = this.getMonthsDifference(
      lastVisit,
      new Date(),
    );
    const maxMonths = rule.condition.maxMonthsSinceLastVisit || 6;

    return {
      triggered: monthsSinceLastVisit > maxMonths,
      details: { monthsSinceLastVisit, maxMonths },
    };
  }

  /**
   * Check if symptoms indicate acute condition
   */
  private hasAcuteSymptoms(symptoms: string[]): boolean {
    const acuteKeywords = [
      'ปวดท้องมาก',
      'เจ็บหน้าอก',
      'หอบเหนื่อย',
      'ไข้สูง',
      'ปวดหัวรุนแรง',
      'สลบ',
      'severe pain',
      'chest pain',
      'difficulty breathing',
      'high fever',
      'severe headache',
      'unconscious',
    ];

    return symptoms.some((symptom) =>
      acuteKeywords.some((keyword) =>
        symptom.toLowerCase().includes(keyword.toLowerCase()),
      ),
    );
  }

  /**
   * Calculate months difference between two dates
   */
  private getMonthsDifference(startDate: Date, endDate: Date): number {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const yearsDiff = end.getFullYear() - start.getFullYear();
    const monthsDiff = end.getMonth() - start.getMonth();

    return yearsDiff * 12 + monthsDiff;
  }

  /**
   * Extract prohibited symptoms from triggered rules
   */
  private extractProhibitedSymptoms(triggeredRules: TriggeredRule[]): string[] {
    const symptoms: string[] = [];

    for (const rule of triggeredRules) {
      if (
        rule.ruleType === 'symptom_check' &&
        rule.details?.matchedSymptoms
      ) {
        symptoms.push(...rule.details.matchedSymptoms);
      }
    }

    return symptoms;
  }

  /**
   * Build user-friendly result message
   */
  private buildResultMessage(
    result: 'passed' | 'rejected' | 'requires_review',
    triggeredRules: TriggeredRule[],
  ): string {
    if (result === 'passed') {
      return 'การตรวจสอบขอบเขตการให้บริการผ่าน สามารถดำเนินการให้คำปรึกษาได้';
    }

    if (result === 'rejected') {
      const criticalRules = triggeredRules.filter(
        (r) => r.severity === 'critical',
      );
      if (criticalRules.length > 0) {
        return criticalRules[0].message;
      }
      return 'ไม่สามารถให้บริการเภสัชกรรมทางไกลได้ กรุณาพบแพทย์เพื่อรับการตรวจรักษา';
    }

    return 'การให้คำปรึกษาต้องได้รับการพิจารณาจากเภสัชกร';
  }

  /**
   * Override validation result (pharmacist only)
   */
  async overrideValidation(
    validationId: string,
    pharmacistId: string,
    reason: string,
  ): Promise<void> {
    if (!reason || reason.length < 50) {
      throw new BadRequestException(
        'Override reason must be at least 50 characters',
      );
    }

    await this.db
      .update(scopeValidationResults)
      .set({
        overrideBy: pharmacistId,
        overrideReason: reason,
        overrideAt: new Date(),
      })
      .where(eq(scopeValidationResults.id, validationId));

    await this.auditService.log({
      actorId: pharmacistId,
      actorType: 'pharmacist',
      actionType: 'scope_validation_override',
      entityType: 'scope_validation',
      entityId: validationId,
      metadata: { reason },
    });
  }

  /**
   * Get validation history for a consultation
   */
  async getValidationHistory(consultationId: string): Promise<any[]> {
    return await this.db
      .select()
      .from(scopeValidationResults)
      .where(eq(scopeValidationResults.consultationId, consultationId))
      .orderBy(desc(scopeValidationResults.createdAt));
  }
}
