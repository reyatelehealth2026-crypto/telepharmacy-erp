import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  decimal,
  date,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import {
  rxStatusEnum,
  rxPriorityEnum,
  rxSourceEnum,
  safetyCheckResultEnum,
  interventionTypeEnum,
  counselingMethodEnum,
} from "./enums";
import { patients } from "./patients";
import { staff } from "./staff";
import { products } from "./products";
import { inventoryLots } from "./inventory";
import { drugs } from "./drugs";

export const prescriptions = pgTable("prescriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  rxNo: varchar("rx_no", { length: 30 }).unique().notNull(),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => patients.id),
  prescriberName: varchar("prescriber_name", { length: 255 }),
  prescriberLicense: varchar("prescriber_license", { length: 50 }),
  prescriberHospital: varchar("prescriber_hospital", { length: 255 }),
  prescriberDept: varchar("prescriber_dept", { length: 100 }),
  rxDate: date("rx_date"),
  source: rxSourceEnum("source").default("paper_rx"),
  diagnosis: text("diagnosis"),
  images: jsonb("images").default([]),
  ocrStatus: varchar("ocr_status", { length: 20 }).default("pending"),
  ocrResult: jsonb("ocr_result"),
  ocrConfidence: decimal("ocr_confidence", { precision: 5, scale: 2 }),
  ocrProcessedAt: timestamp("ocr_processed_at", { withTimezone: true }),
  aiChecksPassed: boolean("ai_checks_passed"),
  aiChecksResult: jsonb("ai_checks_result"),
  aiPriority: rxPriorityEnum("ai_priority").default("low"),
  status: rxStatusEnum("status").default("received"),
  rejectionReason: text("rejection_reason"),
  orderId: uuid("order_id"),
  verifiedBy: uuid("verified_by").references(() => staff.id),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (t) => [
  index("prescriptions_patient_id_idx").on(t.patientId),
  index("prescriptions_status_idx").on(t.status),
  index("prescriptions_created_at_idx").on(t.createdAt),
  index("prescriptions_ai_priority_idx").on(t.aiPriority),
]);

export const prescriptionItems = pgTable("prescription_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  prescriptionId: uuid("prescription_id")
    .notNull()
    .references(() => prescriptions.id, { onDelete: "cascade" }),
  itemNo: integer("item_no"),
  drugName: varchar("drug_name", { length: 255 }).notNull(),
  strength: varchar("strength", { length: 50 }),
  dosageForm: varchar("dosage_form", { length: 50 }),
  quantity: decimal("quantity", { precision: 10, scale: 2 }),
  sig: text("sig"),
  duration: varchar("duration", { length: 100 }),
  matchedProductId: uuid("matched_product_id").references(() => products.id),
  matchConfidence: decimal("match_confidence", { precision: 5, scale: 2 }),
  matchStatus: varchar("match_status", { length: 20 }).default("pending"),
  dispensedLotId: uuid("dispensed_lot_id").references(() => inventoryLots.id),
  dispensedQty: decimal("dispensed_qty", { precision: 10, scale: 2 }),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }),
  pharmacistDecision: varchar("pharmacist_decision", { length: 20 }),
  substitutionNote: text("substitution_note"),
  skipReason: text("skip_reason"),
  status: varchar("status", { length: 20 }).default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const safetyChecks = pgTable("safety_checks", {
  id: uuid("id").primaryKey().defaultRandom(),
  prescriptionItemId: uuid("prescription_item_id")
    .notNull()
    .references(() => prescriptionItems.id, { onDelete: "cascade" }),
  checkType: varchar("check_type", { length: 50 }).notNull(),
  result: safetyCheckResultEnum("result").notNull(),
  severity: varchar("severity", { length: 20 }),
  description: text("description"),
  recommendation: text("recommendation"),
  referenceDrugId: uuid("reference_drug_id").references(() => drugs.id),
  referenceRuleId: uuid("reference_rule_id"),
  aiGenerated: boolean("ai_generated").default(true).notNull(),
  aiConfidence: decimal("ai_confidence", { precision: 5, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const pharmacistInterventions = pgTable("pharmacist_interventions", {
  id: uuid("id").primaryKey().defaultRandom(),
  prescriptionId: uuid("prescription_id")
    .notNull()
    .references(() => prescriptions.id),
  interventionType: interventionTypeEnum("intervention_type").notNull(),
  description: text("description"),
  actionTaken: text("action_taken"),
  outcome: text("outcome"),
  severity: varchar("severity", { length: 20 }),
  pharmacistId: uuid("pharmacist_id")
    .notNull()
    .references(() => staff.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const counselingSessions = pgTable("counseling_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  prescriptionId: uuid("prescription_id")
    .notNull()
    .references(() => prescriptions.id),
  method: counselingMethodEnum("method").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  durationSeconds: integer("duration_seconds"),
  topicsCovered: text("topics_covered").array().default([]),
  notes: text("notes"),
  recordingUrl: text("recording_url"),
  recordingType: varchar("recording_type", { length: 20 }),
  recordingSizeMb: decimal("recording_size_mb", { precision: 8, scale: 2 }),
  recordingDuration: integer("recording_duration"),
  patientConfirmed: boolean("patient_confirmed").default(false).notNull(),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  pharmacistId: uuid("pharmacist_id")
    .notNull()
    .references(() => staff.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
