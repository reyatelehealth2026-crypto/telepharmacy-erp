import { z } from "zod";
import { emailSchema } from "./common";

export const staffLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร"),
});

export const lineLoginSchema = z.object({
  code: z.string().min(1, "กรุณาระบุ authorization code"),
  redirectUri: z.string().url("รูปแบบ redirect URI ไม่ถูกต้อง"),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "กรุณาระบุ refresh token"),
});

export const pdpaConsentSchema = z.object({
  version: z.string().min(1, "กรุณาระบุเวอร์ชัน PDPA"),
  dataSharingOpt: z.boolean(),
});

export type StaffLoginInput = z.infer<typeof staffLoginSchema>;
export type LineLoginInput = z.infer<typeof lineLoginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type PdpaConsentInput = z.infer<typeof pdpaConsentSchema>;
