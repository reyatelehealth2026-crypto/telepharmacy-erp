import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  decimal,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";
import { chatSessionTypeEnum, chatMessageRoleEnum } from "./enums";
import { patients } from "./patients";
import { orders } from "./orders";
import { prescriptions } from "./prescriptions";
import { staff } from "./staff";

export const chatSessions = pgTable("chat_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => patients.id),
  lineUserId: varchar("line_user_id", { length: 50 }),
  sessionType: chatSessionTypeEnum("session_type").default("bot"),
  orderId: uuid("order_id").references(() => orders.id),
  prescriptionId: uuid("prescription_id").references(() => prescriptions.id),
  aiModel: varchar("ai_model", { length: 50 }),
  aiSessionId: varchar("ai_session_id", { length: 255 }),
  assignedTo: uuid("assigned_to").references(() => staff.id),
  assignedAt: timestamp("assigned_at", { withTimezone: true }),
  transferredReason: text("transferred_reason"),
  status: varchar("status", { length: 20 }).default("active"),
  patientSatisfaction: integer("patient_satisfaction"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  messageCount: integer("message_count").default(0).notNull(),
  firstResponseAt: timestamp("first_response_at", { withTimezone: true }),
  avgResponseTime: integer("avg_response_time"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => chatSessions.id, { onDelete: "cascade" }),
  role: chatMessageRoleEnum("role").notNull(),
  content: text("content"),
  lineMessageId: varchar("line_message_id", { length: 50 }),
  messageType: varchar("message_type", { length: 20 }),
  attachments: jsonb("attachments").default([]),
  aiModel: varchar("ai_model", { length: 50 }),
  aiTokensUsed: integer("ai_tokens_used"),
  aiProcessingMs: integer("ai_processing_ms"),
  sentByStaff: uuid("sent_by_staff").references(() => staff.id),
  sentiment: varchar("sentiment", { length: 20 }),
  sentimentScore: decimal("sentiment_score", { precision: 3, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
