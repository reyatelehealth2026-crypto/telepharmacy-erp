import { z } from 'zod';

export const UpdateAdrAssessmentSchema = z.object({
  causalityAssessment: z.enum(['definite', 'probable', 'possible', 'unlikely', 'unassessable']),
  causalityScore: z.string().max(20).optional(),
  status: z.enum(['draft', 'submitted', 'reviewed']).optional(),
});

export type UpdateAdrAssessmentDto = z.infer<typeof UpdateAdrAssessmentSchema>;
