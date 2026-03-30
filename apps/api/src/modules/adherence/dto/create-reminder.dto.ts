import { z } from 'zod';

export const CreateReminderSchema = z.object({
  patientId: z.string().uuid(),
  patientMedicationId: z.string().uuid().optional(),
  drugName: z.string().min(1).max(255),
  sig: z.string().optional(),
  scheduledAt: z.string().datetime(),
  reminderMessage: z.string().optional(),
});

export type CreateReminderDto = z.infer<typeof CreateReminderSchema>;
