import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  decimal,
  time,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";
import { staff } from "./staff";
import { patients } from "./patients";
import { patientMedications } from "./patients";

export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  tableName: varchar("table_name", { length: 100 }).notNull(),
  recordId: uuid("record_id").notNull(),
  action: varchar("action", { length: 20 }).notNull(),
  oldValues: jsonb("old_values"),
  newValues: jsonb("new_values"),
  changedBy: uuid("changed_by").references(() => staff.id),
  changedAt: timestamp("changed_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  ipAddress: varchar("ip_address", { length: 45 }),
});

export const systemConfig = pgTable("system_config", {
  key: varchar("key", { length: 100 }).primaryKey(),
  value: jsonb("value"),
  description: text("description"),
  updatedBy: uuid("updated_by").references(() => staff.id),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const medicationReminders = pgTable("medication_reminders", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => patients.id),
  patientMedicationId: uuid("patient_medication_id").references(
    () => patientMedications.id,
  ),
  drugName: varchar("drug_name", { length: 255 }).notNull(),
  sig: text("sig"),
  reminderTimes: time("reminder_times").array().default([]),
  reminderDays: integer("reminder_days").array().default([1, 2, 3, 4, 5, 6, 7]),
  isActive: boolean("is_active").default(true).notNull(),
  lastRemindedAt: timestamp("last_reminded_at", { withTimezone: true }),
  lastConfirmedAt: timestamp("last_confirmed_at", { withTimezone: true }),
  weeklyAdherence: decimal("weekly_adherence", { precision: 5, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
