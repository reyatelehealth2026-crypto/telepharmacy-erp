import {
  pgTable,
  uuid,
  varchar,
  text,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";
import { complaintSeverityEnum, complaintStatusEnum } from "./enums";
import { patients } from "./patients";
import { orders } from "./orders";
import { chatSessions } from "./chat";
import { staff } from "./staff";

export const complaints = pgTable("complaints", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => patients.id),
  orderId: uuid("order_id").references(() => orders.id),
  chatSessionId: uuid("chat_session_id").references(() => chatSessions.id),
  severity: complaintSeverityEnum("severity").default("medium"),
  category: varchar("category", { length: 100 }),
  description: text("description"),
  images: jsonb("images").default([]),
  status: complaintStatusEnum("status").default("open"),
  resolution: text("resolution"),
  resolvedBy: uuid("resolved_by").references(() => staff.id),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
