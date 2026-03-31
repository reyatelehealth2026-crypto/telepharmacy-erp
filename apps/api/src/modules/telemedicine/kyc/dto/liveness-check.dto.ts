import { z } from 'zod';

export const livenessCheckSchema = z.object({
  verificationId: z.string().uuid(),
  gestures: z.array(z.enum(['turn_left', 'turn_right', 'smile', 'blink', 'nod'])),
});

export type LivenessCheckDto = z.infer<typeof livenessCheckSchema>;

export interface LivenessResult {
  passed: boolean;
  score: number;
  gesturesPerformed: string[];
  nextStep: string;
}
