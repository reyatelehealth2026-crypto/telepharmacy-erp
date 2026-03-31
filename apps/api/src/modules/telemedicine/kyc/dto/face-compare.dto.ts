import { z } from 'zod';

export const faceCompareSchema = z.object({
  verificationId: z.string().uuid(),
});

export type FaceCompareDto = z.infer<typeof faceCompareSchema>;

export interface FaceComparisonResult {
  matched: boolean;
  confidence: number;
  requiresReview: boolean;
  nextStep: string;
}
