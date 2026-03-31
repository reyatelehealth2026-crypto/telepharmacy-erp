import { z } from 'zod';

// ============================================================================
// Request DTOs
// ============================================================================

export const ValidateConsultationScopeSchema = z.object({
  consultationId: z.string().uuid(),
  patientId: z.string().uuid(),
  consultationType: z.enum([
    'follow_up_chronic',
    'medication_refill',
    'minor_ailment',
    'general_health',
    'medication_review',
  ]),
  chiefComplaint: z.string().min(1).max(1000),
  symptoms: z.array(z.string()).default([]),
  requestedMedications: z
    .array(
      z.object({
        drugName: z.string(),
        genericName: z.string().optional(),
        dosage: z.string().optional(),
      }),
    )
    .default([]),
});

export const OverrideScopeValidationSchema = z.object({
  validationId: z.string().uuid(),
  reason: z.string().min(50).max(1000), // Mandatory justification
});

export const CreateScopeRuleSchema = z.object({
  ruleType: z.enum([
    'symptom_check',
    'medication_check',
    'patient_type_check',
    'baseline_data_check',
    'time_since_last_visit',
  ]),
  ruleName: z.string().min(1).max(255),
  condition: z.record(z.any()), // JSON condition object
  action: z.enum(['allow', 'reject', 'flag_review']),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  message: z.string().optional(),
  priority: z.number().int().min(1).max(1000).default(100),
});

export const UpdateScopeRuleSchema = z.object({
  ruleName: z.string().min(1).max(255).optional(),
  condition: z.record(z.any()).optional(),
  action: z.enum(['allow', 'reject', 'flag_review']).optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  message: z.string().optional(),
  priority: z.number().int().min(1).max(1000).optional(),
  isActive: z.boolean().optional(),
});

// ============================================================================
// Response DTOs
// ============================================================================

export interface ScopeValidationResult {
  validationId: string;
  consultationId: string;
  overallResult: 'passed' | 'rejected' | 'requires_review';
  canProceed: boolean;
  requiresPharmacistReview: boolean;
  triggeredRules: TriggeredRule[];
  patientType: 'new_patient' | 'follow_up';
  lastConsultationDate: Date | null;
  hasBaselineData: boolean;
  prohibitedSymptoms: string[];
  message: string;
}

export interface TriggeredRule {
  ruleId: string;
  ruleName: string;
  ruleType: string;
  action: 'allow' | 'reject' | 'flag_review';
  severity: string;
  message: string;
  details?: Record<string, any>;
}

export interface ScopeRuleDto {
  id: string;
  ruleType: string;
  ruleName: string;
  condition: Record<string, any>;
  action: 'allow' | 'reject' | 'flag_review';
  severity: string | null;
  message: string | null;
  isActive: boolean;
  priority: number;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScopeValidationHistoryDto {
  id: string;
  consultationId: string;
  overallResult: string;
  triggeredRules: any;
  patientType: string | null;
  lastConsultationDate: Date | null;
  hasBaselineData: boolean | null;
  overrideBy: string | null;
  overrideReason: string | null;
  overrideAt: Date | null;
  createdAt: Date;
}

// ============================================================================
// Type exports
// ============================================================================

export type ValidateConsultationScopeDto = z.infer<
  typeof ValidateConsultationScopeSchema
>;
export type OverrideScopeValidationDto = z.infer<
  typeof OverrideScopeValidationSchema
>;
export type CreateScopeRuleDto = z.infer<typeof CreateScopeRuleSchema>;
export type UpdateScopeRuleDto = z.infer<typeof UpdateScopeRuleSchema>;
