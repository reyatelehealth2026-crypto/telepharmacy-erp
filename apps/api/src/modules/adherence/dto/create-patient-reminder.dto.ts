import { z } from 'zod';

/** Patient self-service reminder creation (no patientId needed — derived from JWT) */
export const CreatePatientReminderSchema = z.object({
  drugName: z.string().min(1).max(255),
  sig: z.string().optional(),
  reminderTimes: z
    .array(z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'HH:MM or HH:MM:SS'))
    .min(1)
    .default(['08:00']),
  /** 1=Mon … 7=Sun (ISO weekday) */
  reminderDays: z.array(z.number().min(1).max(7)).default([1, 2, 3, 4, 5, 6, 7]),
});

export type CreatePatientReminderDto = z.infer<typeof CreatePatientReminderSchema>;
