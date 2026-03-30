import { z } from 'zod';

export const CreateBreachReportSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().min(1),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  affectedPatientIds: z.array(z.string().uuid()).default([]),
  affectedRecordCount: z.string().optional(),
  dataTypes: z.array(z.string()).default([]),
  discoveredAt: z.string().datetime(),
  rootCause: z.string().optional(),
  remediation: z.string().optional(),
});

export type CreateBreachReportDto = z.infer<typeof CreateBreachReportSchema>;
