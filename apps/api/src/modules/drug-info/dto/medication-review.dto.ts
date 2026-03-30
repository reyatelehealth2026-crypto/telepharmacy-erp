import { z } from 'zod';

export const CreateTdmRequestSchema = z.object({
  patientId: z.string().uuid(),
  drugName: z.string().min(1).max(255),
  indication: z.string().optional(),
  currentDose: z.string().max(100).optional(),
});

export type CreateTdmRequestDto = z.infer<typeof CreateTdmRequestSchema>;

export const RecordTdmResultSchema = z.object({
  result: z.record(z.any()),
  interpretation: z.string().min(1),
  recommendation: z.string().optional(),
});

export type RecordTdmResultDto = z.infer<typeof RecordTdmResultSchema>;
