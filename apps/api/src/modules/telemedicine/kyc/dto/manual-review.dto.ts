import { z } from 'zod';

export const manualReviewSchema = z.object({
  approved: z.boolean(),
  reviewNotes: z.string().min(10, 'Review notes must be at least 10 characters'),
});

export type ManualReviewDto = z.infer<typeof manualReviewSchema>;
