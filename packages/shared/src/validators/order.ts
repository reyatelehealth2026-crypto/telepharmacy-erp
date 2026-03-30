import { z } from "zod";
import {
  ORDER_TYPES,
  PAYMENT_METHODS,
  DELIVERY_PROVIDERS,
} from "../types/enums";
import { phoneSchema } from "./common";

export const deliveryAddressSchema = z.object({
  addressLine1: z.string().min(1, "กรุณาระบุที่อยู่"),
  addressLine2: z.string().optional(),
  subDistrict: z.string().min(1, "กรุณาระบุตำบล/แขวง"),
  district: z.string().min(1, "กรุณาระบุอำเภอ/เขต"),
  province: z.string().min(1, "กรุณาระบุจังหวัด"),
  postalCode: z.string().regex(/^\d{5}$/, "รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก"),
  country: z.string().optional(),
});

const orderItemSchema = z.object({
  productId: z.string().uuid("รหัสสินค้าไม่ถูกต้อง"),
  quantity: z.number().int().positive("จำนวนต้องมากกว่า 0"),
  prescriptionItemId: z.string().uuid().optional(),
});

export const createOrderSchema = z.object({
  patientId: z.string().uuid("กรุณาระบุรหัสผู้ป่วย"),
  orderType: z.enum(ORDER_TYPES, { message: "กรุณาเลือกประเภทคำสั่งซื้อ" }),
  prescriptionId: z.string().uuid().optional(),
  items: z
    .array(orderItemSchema)
    .min(1, "กรุณาเพิ่มสินค้าอย่างน้อย 1 รายการ"),
  deliveryAddress: deliveryAddressSchema,
  recipientName: z.string().min(1, "กรุณาระบุชื่อผู้รับ"),
  recipientPhone: phoneSchema,
  deliveryProvider: z.enum(DELIVERY_PROVIDERS).optional(),
  paymentMethod: z.enum(PAYMENT_METHODS, {
    message: "กรุณาเลือกวิธีชำระเงิน",
  }),
  usePoints: z.number().int().min(0).optional(),
  notes: z.string().optional(),
});

export const cancelOrderSchema = z.object({
  reason: z.string().min(1, "กรุณาระบุเหตุผลในการยกเลิก").max(500),
});

export type CreateOrderSchemaInput = z.infer<typeof createOrderSchema>;
export type CancelOrderSchemaInput = z.infer<typeof cancelOrderSchema>;
