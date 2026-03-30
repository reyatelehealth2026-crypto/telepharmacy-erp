import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  date,
  jsonb,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { staff } from "./staff";
import { patients } from "./patients";

export const adrSeverityEnum = pgEnum("adr_severity", [
  "mild",
  "moderate",
  "severe",
  "life_threatening",
  "fatal",
]);

export const adrOutcomeEnum = pgEnum("adr_outcome", [
  "resolved",
  "resolving",
  "not_resolved",
  "fatal",
  "unknown",
]);

export const adrCausalityEnum = pgEnum("adr_causality", [
  "definite",
  "probable",
  "possible",
  "unlikely",
  "unassessable",
]);

export const adrRechallengeEnum = pgEnum("adr_rechallenge", [
  "positive",
  "negative",
  "not_done",
]);

export const adrDechallengeEnum = pgEnum("adr_dechallenge", [
  "resolved",
  "not_resolved",
  "not_applicable",
]);

export const adrStatusEnum = pgEnum("adr_status", [
  "draft",
  "submitted",
  "reviewed",
]);

export const mrStatusEnum = pgEnum("mr_status", [
  "pending",
  "in_progress",
  "completed",
  "cancelled",
]);

export const tdmStatusEnum = pgEnum("tdm_status", [
  "pending",
  "sample_collected",
  "result_available",
  "reviewed",
  "cancelled",
]);

export const breachSeverityEnum = pgEnum("breach_severity", [
  "low",
  "medium",
  "high",
  "critical",
]);

export const breachStatusEnum = pgEnum("breach_status", [
  "detected",
  "investigating",
  "contained",
  "resolved",
  "reported_to_authority",
]);

export const adrReports = pgTable("adr_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => patients.id),
  prescriptionId: uuid("prescription_id"),
  drugName: varchar("drug_name", { length: 255 }).notNull(),
  drugCode: varchar("drug_code", { length: 50 }),
  reactionDescription: text("reaction_description").notNull(),
  severity: adrSeverityEnum("severity").notNull(),
  onsetDate: date("onset_date"),
  outcome: adrOutcomeEnum("outcome").notNull(),
  causalityScore: varchar("causality_score", { length: 20 }),
  causalityAssessment: adrCausalityEnum("causality_assessment"),
  rechallenge: adrRechallengeEnum("rechallenge").default("not_done"),
  dechallenge: adrDechallengeEnum("dechallenge").default("not_applicable"),
  alternativeCauses: text("alternative_causes"),
  isKnownReaction: boolean("is_known_reaction").default(false).notNull(),
  reportedBy: uuid("reported_by").references(() => staff.id),
  reportedAt: timestamp("reported_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  status: adrStatusEnum("status").default("draft").notNull(),
  regulatoryExportedAt: timestamp("regulatory_exported_at", {
    withTimezone: true,
  }),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const medicationReviewRequests = pgTable(
  "medication_review_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
    requestedBy: uuid("requested_by").references(() => staff.id),
    reason: text("reason"),
    status: mrStatusEnum("status").default("pending").notNull(),
    pharmacistId: uuid("pharmacist_id").references(() => staff.id),
    reviewNote: text("review_note"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);

export const tdmRequests = pgTable("tdm_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => patients.id),
  drugName: varchar("drug_name", { length: 255 }).notNull(),
  indication: text("indication"),
  currentDose: varchar("current_dose", { length: 100 }),
  requestedBy: uuid("requested_by").references(() => staff.id),
  pharmacistId: uuid("pharmacist_id").references(() => staff.id),
  status: tdmStatusEnum("status").default("pending").notNull(),
  sampleCollectedAt: timestamp("sample_collected_at", { withTimezone: true }),
  result: jsonb("result"),
  interpretation: text("interpretation"),
  recommendation: text("recommendation"),
  resultRecordedAt: timestamp("result_recorded_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const dataBreachReports = pgTable("data_breach_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  severity: breachSeverityEnum("severity").notNull(),
  status: breachStatusEnum("status").default("detected").notNull(),
  affectedPatientIds: uuid("affected_patient_ids").array().default([]),
  affectedRecordCount: varchar("affected_record_count", { length: 20 }),
  dataTypes: text("data_types").array().default([]),
  discoveredAt: timestamp("discovered_at", { withTimezone: true }).notNull(),
  reportedBy: uuid("reported_by").references(() => staff.id),
  containedAt: timestamp("contained_at", { withTimezone: true }),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  authorityNotifiedAt: timestamp("authority_notified_at", {
    withTimezone: true,
  }),
  notificationSentAt: timestamp("notification_sent_at", { withTimezone: true }),
  rootCause: text("root_cause"),
  remediation: text("remediation"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const consentRecords = pgTable("consent_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => patients.id),
  consentVersion: varchar("consent_version", { length: 20 }).notNull(),
  consentType: varchar("consent_type", { length: 50 }).notNull(),
  granted: boolean("granted").notNull(),
  grantedAt: timestamp("granted_at", { withTimezone: true }),
  withdrawnAt: timestamp("withdrawn_at", { withTimezone: true }),
  ipAddress: varchar("ip_address", { length: 45 }),
  recordedBy: uuid("recorded_by").references(() => staff.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
