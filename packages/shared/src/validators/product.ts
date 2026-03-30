import { z } from "zod";
import {
  DRUG_CLASSIFICATIONS,
  PRODUCT_STATUSES,
  VAT_TYPES,
} from "../types/enums";
import { paginationSchema } from "./common";

export const createProductSchema = z.object({
  sku: z.string().min(1, "กรุณาระบุรหัสสินค้า").max(50),
  nameTh: z.string().min(1, "กรุณาระบุชื่อสินค้า (ภาษาไทย)").max(300),
  nameEn: z.string().max(300).optional(),
  genericName: z.string().optional(),
  brand: z.string().min(1, "กรุณาระบุยี่ห้อ"),
  manufacturer: z.string().optional(),
  categoryId: z.string().uuid("กรุณาเลือกหมวดหมู่"),
  drugClassification: z.enum(DRUG_CLASSIFICATIONS, {
    message: "กรุณาเลือกประเภทยา",
  }),
  dosageForm: z.string().optional(),
  strength: z.string().optional(),
  packSize: z.string().optional(),
  unit: z.string().min(1, "กรุณาระบุหน่วยนับ"),
  description: z.string().optional(),
  indication: z.string().optional(),
  contraindication: z.string().optional(),
  sideEffects: z.string().optional(),
  storageCondition: z.string().optional(),
  costPrice: z.number().min(0, "ราคาทุนต้องไม่ต่ำกว่า 0"),
  sellPrice: z.number().positive("ราคาขายต้องมากกว่า 0"),
  memberPrice: z.number().positive().optional(),
  vatType: z.enum(VAT_TYPES).optional(),
  images: z.array(z.string().url()).optional(),
  barcode: z.string().optional(),
  fdaRegNo: z.string().optional(),
  requiresPrescription: z.boolean().optional(),
  isControlled: z.boolean().optional(),
  stockQuantity: z.number().int().min(0).optional(),
  reorderPoint: z.number().int().min(0).optional(),
  expiryDate: z.string().date().optional(),
  tags: z.array(z.string()).optional(),
});

export const updateProductSchema = createProductSchema
  .omit({ sku: true })
  .partial();

export const productSearchSchema = paginationSchema.extend({
  q: z.string().optional(),
  category: z.string().uuid().optional(),
  classification: z.enum(DRUG_CLASSIFICATIONS).optional(),
  status: z.enum(PRODUCT_STATUSES).optional(),
  requiresPrescription: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
});

export type CreateProductSchemaInput = z.infer<typeof createProductSchema>;
export type UpdateProductSchemaInput = z.infer<typeof updateProductSchema>;
export type ProductSearchSchemaInput = z.infer<typeof productSearchSchema>;
