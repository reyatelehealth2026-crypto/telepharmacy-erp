import { z } from 'zod';

export const CreateBroadcastSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  content: z.any(),
  altText: z.string().max(400).optional(),
  segmentFilter: z.record(z.any()).optional(),
  idempotencyKey: z.string().max(100).optional(),
  scheduledAt: z.string().datetime().optional(),
});

export type CreateBroadcastDto = z.infer<typeof CreateBroadcastSchema>;
