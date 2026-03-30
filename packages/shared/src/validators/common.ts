import { z } from "zod";

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().optional(),
  cursor: z.string().optional(),
});

export const uuidSchema = z
  .string()
  .uuid({ message: "รูปแบบ UUID ไม่ถูกต้อง" });

export const phoneSchema = z
  .string()
  .regex(/^0\d{8,9}$/, {
    message: "เบอร์โทรศัพท์ไม่ถูกต้อง (เช่น 0812345678)",
  });

export const emailSchema = z
  .string()
  .email({ message: "รูปแบบอีเมลไม่ถูกต้อง" });

export type PaginationInput = z.infer<typeof paginationSchema>;
