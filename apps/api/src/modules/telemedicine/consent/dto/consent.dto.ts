import { z } from 'zod';

// ============================================================================
// Request DTOs
// ============================================================================

export const GetConsentTemplateSchema = z.object({
  version: z.string().optional(),
  language: z.enum(['th', 'en']).default('th'),
});

export const AcceptConsentSchema = z.object({
  templateId: z.string().uuid(),
  consultationId: z.string().uuid().optional(),
  signatureDataUrl: z.string(), // Base64 encoded signature image
  scrolledToEnd: z.boolean(),
  timeSpentSeconds: z.number().int().min(0),
  geolocation: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
      accuracy: z.number().optional(),
    })
    .optional(),
});

export const WithdrawConsentSchema = z.object({
  consentId: z.string().uuid(),
  reason: z.string().min(10).max(500),
});

export const CreateConsentTemplateSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/), // Semantic versioning
  language: z.enum(['th', 'en']).default('th'),
  title: z.string().min(1).max(255),
  content: z.string().min(100), // Markdown content
  clauses: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      content: z.string(),
      required: z.boolean().default(true),
    }),
  ),
  effectiveFrom: z.string().datetime(),
  effectiveUntil: z.string().datetime().optional(),
});

// ============================================================================
// Response DTOs
// ============================================================================

export interface ConsentTemplateDto {
  id: string;
  version: string;
  language: string;
  title: string;
  content: string; // Markdown
  clauses: ConsentClause[];
  isActive: boolean;
  effectiveFrom: Date;
  effectiveUntil: Date | null;
  createdAt: Date;
}

export interface ConsentClause {
  id: string;
  title: string;
  content: string;
  required: boolean;
}

export interface PatientConsentDto {
  id: string;
  patientId: string;
  templateId: string;
  template: ConsentTemplateDto;
  consultationId: string | null;
  accepted: boolean;
  acceptedAt: Date | null;
  signatureUrl: string | null;
  scrolledToEnd: boolean;
  timeSpentSeconds: number | null;
  ipAddress: string | null;
  deviceId: string | null;
  userAgent: string | null;
  geolocation: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  } | null;
  withdrawnAt: Date | null;
  withdrawalReason: string | null;
  pdfUrl: string | null;
  pdfGeneratedAt: Date | null;
  createdAt: Date;
}

export interface ConsentAcceptanceResult {
  success: boolean;
  consentId: string;
  pdfUrl: string;
  message: string;
}

export interface ConsentStatusDto {
  hasActiveConsent: boolean;
  currentConsent: PatientConsentDto | null;
  requiresNewConsent: boolean;
  reason: string | null;
}

// ============================================================================
// Type exports
// ============================================================================

export type GetConsentTemplateDto = z.infer<typeof GetConsentTemplateSchema>;
export type AcceptConsentDto = z.infer<typeof AcceptConsentSchema>;
export type WithdrawConsentDto = z.infer<typeof WithdrawConsentSchema>;
export type CreateConsentTemplateDto = z.infer<
  typeof CreateConsentTemplateSchema
>;
