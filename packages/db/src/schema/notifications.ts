import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";
import { notificationTypeEnum, notificationChannelEnum } from "./enums";
import { patients } from "./patients";
import { staff } from "./staff";

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: uuid("patient_id").references(() => patients.id),
  staffId: uuid("staff_id").references(() => staff.id),
  type: notificationTypeEnum("type").notNull(),
  channel: notificationChannelEnum("channel").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body"),
  lineMessageType: varchar("line_message_type", { length: 20 }),
  lineMessageData: jsonb("line_message_data"),
  status: varchar("status", { length: 20 }).default("pending"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  readAt: timestamp("read_at", { withTimezone: true }),
  errorMessage: text("error_message"),
  referenceType: varchar("reference_type", { length: 50 }),
  referenceId: uuid("reference_id"),
  retryCount: integer("retry_count").default(0).notNull(),
  maxRetries: integer("max_retries").default(3).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
