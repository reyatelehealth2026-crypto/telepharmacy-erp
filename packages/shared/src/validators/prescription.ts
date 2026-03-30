import { z } from "zod";
import { RX_SOURCES, RX_PRIORITIES } from "../types/enums";

export const createPrescriptionSchema = z.object({
  patientId: z.string().uuid("กรุณาระบุรหัสผู้ป่วย"),
  source: z.enum(RX_SOURCES, { message: "กรุณาเลือกแหล่งที่มาใบสั่งยา" }),
  priority: z.enum(RX_PRIORITIES).optional(),
  prescriberName: z.string().optional(),
  prescriberLicense: z.string().optional(),
  hospitalName: z.string().optional(),
  images: z
    .array(z.string().url("รูปแบบ URL รูปภาพไม่ถูกต้อง"))
    .min(1, "กรุณาอัปโหลดรูปใบสั่งยาอย่างน้อย 1 รูป"),
  notes: z.string().optional(),
});

const verifyItemSchema = z.object({
  itemId: z.string().uuid(),
  decision: z.enum(["approved", "rejected", "substituted"], {
    message: "กรุณาเลือกผลการตรวจสอบ",
  }),
  rejectionReason: z.string().optional(),
  substitutedProductId: z.string().uuid().optional(),
  adjustedQuantity: z.number().int().positive().optional(),
  adjustedSig: z.string().optional(),
});

export const verifyPrescriptionSchema = z.object({
  decision: z.enum(["approved", "partial", "rejected", "referred"], {
    message: "กรุณาเลือกผลการตรวจสอบใบสั่งยา",
  }),
  items: z
    .array(verifyItemSchema)
    .min(1, "กรุณาตรวจสอบรายการยาอย่างน้อย 1 รายการ"),
  pharmacistNotes: z.string().optional(),
  overrideSafetyCheckIds: z.array(z.string().uuid()).optional(),
});

export type CreatePrescriptionSchemaInput = z.infer<typeof createPrescriptionSchema>;
export type VerifyPrescriptionSchemaInput = z.infer<typeof verifyPrescriptionSchema>;
