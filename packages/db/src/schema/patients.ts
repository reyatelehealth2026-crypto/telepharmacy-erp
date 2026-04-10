import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  decimal,
  date,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import {
  patientTitleEnum,
  genderEnum,
  bloodTypeEnum,
  insuranceTypeEnum,
  patientStatusEnum,
  allergyReactionTypeEnum,
  allergySeverityEnum,
  allergySourceEnum,
  chronicDiseaseStatusEnum,
} from "./enums";
import { staff } from "./staff";

export const patients = pgTable("patients", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientNo: varchar("patient_no", { length: 20 }).unique(),
  lineUserId: varchar("line_user_id", { length: 50 }).unique(),
  lineLinkedAt: timestamp("line_linked_at", { withTimezone: true }).defaultNow(),
  title: patientTitleEnum("title").default("mr"),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  birthDate: date("birth_date"),
  gender: genderEnum("gender"),
  nationalId: varchar("national_id", { length: 13 }),
  weight: decimal("weight", { precision: 5, scale: 2 }),
  height: decimal("height", { precision: 5, scale: 2 }),
  bloodType: bloodTypeEnum("blood_type").default("unknown"),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 255 }),
  address: text("address"),
  subDistrict: varchar("sub_district", { length: 100 }),
  district: varchar("district", { length: 100 }),
  province: varchar("province", { length: 100 }),
  postalCode: varchar("postal_code", { length: 10 }),
  isPregnant: boolean("is_pregnant").default(false).notNull(),
  isBreastfeeding: boolean("is_breastfeeding").default(false).notNull(),
  smoking: boolean("smoking").default(false).notNull(),
  alcohol: boolean("alcohol").default(false).notNull(),
  insuranceType: insuranceTypeEnum("insurance_type").default("none"),
  insuranceId: varchar("insurance_id", { length: 50 }),
  pdpaConsentAt: timestamp("pdpa_consent_at", { withTimezone: true }).defaultNow(),
  pdpaVersion: varchar("pdpa_version", { length: 20 }).default("1.0"),
  dataSharingOpt: boolean("data_sharing_opt").default(false).notNull(),
  status: patientStatusEnum("status").default("active"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  source: varchar("source", { length: 50 }).default("line"),
  utmSource: varchar("utm_source", { length: 100 }),
  utmMedium: varchar("utm_medium", { length: 100 }),
  utmCampaign: varchar("utm_campaign", { length: 100 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (t) => [
  index("patients_line_user_id_idx").on(t.lineUserId),
  index("patients_phone_idx").on(t.phone),
  index("patients_status_idx").on(t.status),
]);

export const patientAllergies = pgTable("patient_allergies", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => patients.id, { onDelete: "cascade" }),
  drugName: varchar("drug_name", { length: 255 }).notNull(),
  genericNames: text("generic_names").array().default([]),
  allergyGroup: varchar("allergy_group", { length: 100 }),
  reactionType: allergyReactionTypeEnum("reaction_type"),
  severity: allergySeverityEnum("severity"),
  symptoms: text("symptoms"),
  source: allergySourceEnum("source").default("patient_reported"),
  occurredDate: date("occurred_date"),
  notes: text("notes"),
  recordedBy: uuid("recorded_by").references(() => staff.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const patientChronicDiseases = pgTable("patient_chronic_diseases", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => patients.id, { onDelete: "cascade" }),
  diseaseName: varchar("disease_name", { length: 255 }).notNull(),
  icd10Code: varchar("icd10_code", { length: 10 }),
  status: chronicDiseaseStatusEnum("status").default("active"),
  diagnosedDate: date("diagnosed_date"),
  notes: text("notes"),
  doctorName: varchar("doctor_name", { length: 255 }),
  hospital: varchar("hospital", { length: 255 }),
  recordedBy: uuid("recorded_by").references(() => staff.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const patientMedications = pgTable("patient_medications", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => patients.id, { onDelete: "cascade" }),
  drugName: varchar("drug_name", { length: 255 }).notNull(),
  genericName: varchar("generic_name", { length: 255 }),
  strength: varchar("strength", { length: 50 }),
  dosageForm: varchar("dosage_form", { length: 50 }),
  sig: text("sig"),
  duration: varchar("duration", { length: 100 }),
  prescribedBy: varchar("prescribed_by", { length: 255 }),
  prescribedAt: date("prescribed_at"),
  isCurrent: boolean("is_current").default(true).notNull(),
  discontinuedAt: date("discontinued_at"),
  discontinuedReason: text("discontinued_reason"),
  recordedBy: uuid("recorded_by").references(() => staff.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const patientAddresses = pgTable("patient_addresses", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => patients.id, { onDelete: "cascade" }),
  label: varchar("label", { length: 50 }).default("บ้าน"),
  recipientName: varchar("recipient_name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  address: text("address").notNull(),
  subDistrict: varchar("sub_district", { length: 100 }),
  district: varchar("district", { length: 100 }),
  province: varchar("province", { length: 100 }).notNull(),
  postalCode: varchar("postal_code", { length: 10 }),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  notes: text("notes"),
  isDefault: boolean("is_default").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (t) => [
  index("patient_addresses_patient_id_idx").on(t.patientId),
]);
