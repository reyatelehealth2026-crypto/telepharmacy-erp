import { z } from 'zod';

export const CreateAdrSchema = z.object({
  patientId: z.string().uuid(),
  prescriptionId: z.string().uuid().optional(),
  drugName: z.string().min(1).max(255),
  drugCode: z.string().max(50).optional(),
  reactionDescription: z.string().min(1),
  severity: z.enum(['mild', 'moderate', 'severe', 'life_threatening', 'fatal']),
  onsetDate: z.string().optional(),
  outcome: z.enum(['resolved', 'resolving', 'not_resolved', 'fatal', 'unknown']),
  rechallenge: z.enum(['positive', 'negative', 'not_done']).default('not_done'),
  dechallenge: z.enum(['resolved', 'not_resolved', 'not_applicable']).default('not_applicable'),
  alternativeCauses: z.string().optional(),
  isKnownReaction: z.boolean().default(false),
});

export type CreateAdrDto = z.infer<typeof CreateAdrSchema>;
