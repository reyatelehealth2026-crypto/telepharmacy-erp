import { z } from 'zod';
import { createZodDto } from '@anatine/zod-nestjs';

// Zod schema following best practices from telepharmacy-best-practices power
const LineLoginSchema = z.object({
  code: z
    .string()
    .min(1, { message: 'กรุณาระบุ authorization code' })
    .describe('LINE authorization code from OAuth flow'),
  
  redirectUri: z
    .string()
    .url({ message: 'รูปแบบ redirect URI ไม่ถูกต้อง' })
    .describe('Redirect URI used in LINE OAuth flow'),
});

// Export both the schema and DTO class
export { LineLoginSchema };
export class LineLoginZodDto extends createZodDto(LineLoginSchema) {}

// Type inference for better TypeScript support
export type LineLoginData = z.infer<typeof LineLoginSchema>;