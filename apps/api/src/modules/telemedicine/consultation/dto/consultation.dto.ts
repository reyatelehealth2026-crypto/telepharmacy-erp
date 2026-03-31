import { z } from 'zod';

// ============================================================================
// Request Consultation
// ============================================================================

export const RequestConsultationSchema = z.object({
  type: z.enum([
    'follow_up_chronic',
    'medication_refill',
    'minor_ailment',
    'general_health',
    'medication_review',
  ]),
  chiefComplaint: z.string().min(10).max(500),
  symptoms: z.array(z.string()).optional(),
  requestedMedications: z
    .array(
      z.object({
        drugName: z.string(),
        genericName: z.string().optional(),
      }),
    )
    .optional(),
});

export type RequestConsultationDto = z.infer<
  typeof RequestConsultationSchema
>;

// ============================================================================
// Accept Consent
// ============================================================================

export const AcceptConsentSchema = z.object({
  templateId: z.string().uuid(),
  signatureData: z.string(), // Base64 encoded signature image
  scrolledToEnd: z.boolean(),
  timeSpentSeconds: z.number().int().min(0),
  ipAddress: z.string().optional(),
  deviceId: z.string().optional(),
  userAgent: z.string().optional(),
  geolocation: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
      accuracy: z.number().optional(),
    })
    .optional(),
});

export type AcceptConsentDto = z.infer<typeof AcceptConsentSchema>;

// ============================================================================
// Start Session
// ============================================================================

export const StartSessionSchema = z.object({
  actorType: z.enum(['patient', 'pharmacist']).optional(),
});

export type StartSessionDto = z.infer<typeof StartSessionSchema>;

// ============================================================================
// End Session
// ============================================================================

export const EndSessionSchema = z.object({
  recordingResourceId: z.string().optional(),
  recordingSid: z.string().optional(),
  avgBandwidthKbps: z.number().int().optional(),
  avgResolution: z.string().optional(),
  avgFrameRate: z.number().int().optional(),
  connectionDrops: z.number().int().optional(),
  pharmacistNotes: z.string().optional(),
  actorType: z.enum(['patient', 'pharmacist']).optional(),
});

export type EndSessionDto = z.infer<typeof EndSessionSchema>;

// ============================================================================
// List Consultations
// ============================================================================

export const ListConsultationsSchema = z.object({
  status: z
    .array(
      z.enum([
        'requested',
        'scope_validated',
        'consent_pending',
        'consent_accepted',
        'pharmacist_assigned',
        'in_progress',
        'completed',
        'referred',
        'cancelled',
        'expired',
      ]),
    )
    .optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
});

export type ListConsultationsDto = z.infer<typeof ListConsultationsSchema>;

// ============================================================================
// Response Types
// ============================================================================

export interface ConsultationResponseDto {
  consultationId: string;
  status: string;
  canProceed: boolean;
  scopeValidation: any;
  consentTemplate?: any;
  message: string;
  nextStep: string;
}

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
