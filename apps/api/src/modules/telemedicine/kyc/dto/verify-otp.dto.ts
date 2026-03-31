import { z } from 'zod';

export const verifyOtpSchema = z.object({
  verificationId: z.string().uuid(),
  otp: z.string().length(6).regex(/^\d{6}$/, 'OTP must be 6 digits'),
});

export type VerifyOtpDto = z.infer<typeof verifyOtpSchema>;

export const sendOtpSchema = z.object({
  verificationId: z.string().uuid(),
});

export type SendOtpDto = z.infer<typeof sendOtpSchema>;
