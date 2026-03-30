import { z } from "zod";
import {
  PATIENT_TITLES,
  GENDERS,
  BLOOD_TYPES,
  INSURANCE_TYPES,
  ALLERGY_SEVERITIES,
  ALLERGY_REACTION_TYPES,
  ALLERGY_SOURCES,
  CHRONIC_DISEASE_STATUSES,
} from "../types/enums";
import { phoneSchema, emailSchema } from "./common";

const addressSchema = z.object({
  addressLine1: z.string().min(1, "กรุณาระบุที่อยู่"),
  addressLine2: z.string().optional(),
  subDistrict: z.string().min(1, "กรุณาระบุตำบล/แขวง"),
  district: z.string().min(1, "กรุณาระบุอำเภอ/เขต"),
  province: z.string().min(1, "กรุณาระบุจังหวัด"),
  postalCode: z.string().regex(/^\d{5}$/, "รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก"),
  country: z.string().optional(),
});

export const createPatientSchema = z.object({
  title: z.enum(PATIENT_TITLES, { message: "กรุณาเลือกคำนำหน้า" }),
  firstName: z.string().min(1, "กรุณาระบุชื่อ").max(100),
  lastName: z.string().min(1, "กรุณาระบุนามสกุล").max(100),
  birthDate: z.string().date("รูปแบบวันเกิดไม่ถูกต้อง (YYYY-MM-DD)"),
  gender: z.enum(GENDERS, { message: "กรุณาเลือกเพศ" }),
  phone: phoneSchema,
  email: emailSchema.optional(),
  idCardNumber: z
    .string()
    .regex(/^\d{13}$/, "เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก")
    .optional(),
  address: addressSchema.optional(),
  province: z.string().optional(),
  bloodType: z.enum(BLOOD_TYPES).optional(),
  weight: z.number().positive("น้ำหนักต้องมากกว่า 0").optional(),
  height: z.number().positive("ส่วนสูงต้องมากกว่า 0").optional(),
  insuranceType: z.enum(INSURANCE_TYPES).optional(),
  insurancePolicyNo: z.string().optional(),
  lineUserId: z.string().optional(),
});

export const updatePatientSchema = createPatientSchema
  .omit({ lineUserId: true })
  .partial();

export const createAllergySchema = z.object({
  patientId: z.string().uuid(),
  drugName: z.string().min(1, "กรุณาระบุชื่อยาที่แพ้"),
  genericNames: z.array(z.string()).optional(),
  allergyGroup: z.string().optional(),
  reactionType: z.enum(ALLERGY_REACTION_TYPES, {
    message: "กรุณาเลือกประเภทอาการ",
  }),
  severity: z.enum(ALLERGY_SEVERITIES, {
    message: "กรุณาเลือกระดับความรุนแรง",
  }),
  symptoms: z.array(z.string()).optional(),
  source: z.enum(ALLERGY_SOURCES, { message: "กรุณาเลือกแหล่งข้อมูล" }),
  notes: z.string().optional(),
});

export const createChronicDiseaseSchema = z.object({
  patientId: z.string().uuid(),
  diseaseName: z.string().min(1, "กรุณาระบุชื่อโรค"),
  icd10Code: z
    .string()
    .regex(/^[A-Z]\d{2}(\.\d{1,2})?$/, "รูปแบบรหัส ICD-10 ไม่ถูกต้อง")
    .optional(),
  status: z.enum(CHRONIC_DISEASE_STATUSES, { message: "กรุณาเลือกสถานะ" }),
  diagnosedDate: z.string().date().optional(),
  notes: z.string().optional(),
});

export const createMedicationSchema = z.object({
  patientId: z.string().uuid(),
  drugName: z.string().min(1, "กรุณาระบุชื่อยา"),
  genericName: z.string().optional(),
  strength: z.string().optional(),
  dosageForm: z.string().optional(),
  sig: z.string().min(1, "กรุณาระบุวิธีใช้ยา"),
  duration: z.string().optional(),
  prescribedBy: z.string().optional(),
  isCurrent: z.boolean().default(true),
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
});

export type CreatePatientSchemaInput = z.infer<typeof createPatientSchema>;
export type UpdatePatientSchemaInput = z.infer<typeof updatePatientSchema>;
export type CreateAllergySchemaInput = z.infer<typeof createAllergySchema>;
export type CreateChronicDiseaseSchemaInput = z.infer<typeof createChronicDiseaseSchema>;
export type CreateMedicationSchemaInput = z.infer<typeof createMedicationSchema>;
