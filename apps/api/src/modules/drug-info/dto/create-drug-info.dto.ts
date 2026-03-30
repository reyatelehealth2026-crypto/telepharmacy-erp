import { z } from 'zod';

export const CreateMedicationReviewSchema = z.object({
  patientId: z.string().uuid(),
  reason: z.string().min(1).max(1000).optional(),
});

export type CreateMedicationReviewDto = z.infer<typeof CreateMedicationReviewSchema>;

export const CompleteMedicationReviewSchema = z.object({
  reviewNote: z.string().min(1),
});

export type CompleteMedicationReviewDto = z.infer<typeof CompleteMedicationReviewSchema>;
