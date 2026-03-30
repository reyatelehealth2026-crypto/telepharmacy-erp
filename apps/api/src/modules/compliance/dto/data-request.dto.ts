import { z } from 'zod';

export const LogAuditEventSchema = z.object({
  tableName: z.string().min(1).max(100),
  recordId: z.string().uuid(),
  action: z.enum(['read', 'create', 'update', 'delete', 'export']),
  oldValues: z.record(z.any()).optional(),
  newValues: z.record(z.any()).optional(),
});

export type LogAuditEventDto = z.infer<typeof LogAuditEventSchema>;

export const ConsentRecordSchema = z.object({
  consentVersion: z.string().min(1).max(20),
  consentType: z.string().min(1).max(50),
  granted: z.boolean(),
  ipAddress: z.string().max(45).optional(),
});

export type ConsentRecordDto = z.infer<typeof ConsentRecordSchema>;
