import { z } from 'zod';

export const RegisterPatientSchema = z.object({
  lineAccessToken: z.string().min(1, 'LINE access token is required'),
  firstName: z.string().min(1, 'ชื่อจริงจำเป็นต้องกรอก').max(100),
  lastName: z.string().min(1, 'นามสกุลจำเป็นต้องกรอก').max(100),
  phone: z.string().min(9).max(20).optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  weight: z.number().positive().optional(),
  height: z.number().positive().optional(),
  pdpaConsent: z.boolean().refine((v) => v === true, {
    message: 'ต้องยินยอม PDPA ก่อนสมัครสมาชิก',
  }),
  pdpaConsentVersion: z.string().default('1.0'),
});

export type RegisterPatientDto = z.infer<typeof RegisterPatientSchema>;
