import { z } from 'zod';

export const uploadDocumentSchema = z.object({
  documentType: z.enum(['national_id', 'passport']),
  patientId: z.string().uuid(),
});

export type UploadDocumentDto = z.infer<typeof uploadDocumentSchema>;

export const extractedIdDataSchema = z.object({
  nationalId: z.string(),
  thaiName: z.string(),
  englishName: z.string().optional(),
  dateOfBirth: z.string(),
  address: z.string(),
  issueDate: z.string(),
  expiryDate: z.string(),
  confidence: z.number(),
});

export type ExtractedIdData = z.infer<typeof extractedIdDataSchema>;
