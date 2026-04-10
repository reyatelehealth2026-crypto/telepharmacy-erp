import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  decimal,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
  primaryKey,
  boolean,
} from "drizzle-orm/pg-core";
import {
  chatSessionTypeEnum,
  chatMessageRoleEnum,
  chatMessageKindEnum,
  chatEntryPointEnum,
  chatEntryIntentEnum,
  chatQueueStatusEnum,
  chatPriorityEnum,
  lineContactStateEnum,
  webhookEventStatusEnum,
} from "./enums";
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
  entryPoint: chatEntryPointEnum("entry_point"),
  entryIntent: chatEntryIntentEnum("entry_intent"),
  queueStatus: chatQueueStatusEnum("queue_status").default("self_service"),
  priority: chatPriorityEnum("priority").default("normal"),
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
  lastInboundAt: timestamp("last_inbound_at", { withTimezone: true }),
  lastOutboundAt: timestamp("last_outbound_at", { withTimezone: true }),
  lastStaffReadAt: timestamp("last_staff_read_at", { withTimezone: true }),
  followUpAt: timestamp("follow_up_at", { withTimezone: true }),
  reopenedAt: timestamp("reopened_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (t) => [index("chat_sessions_follow_up_at_idx").on(t.followUpAt)]);

export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => chatSessions.id, { onDelete: "cascade" }),
  role: chatMessageRoleEnum("role").notNull(),
  messageKind: chatMessageKindEnum("message_kind").default("message").notNull(),
  content: text("content"),
  lineMessageId: varchar("line_message_id", { length: 50 }),
  messageType: varchar("message_type", { length: 20 }),
  attachments: jsonb("attachments").default([]),
  metadata: jsonb("metadata").default({}),
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

export const lineContactJourneys = pgTable(
  "line_contact_journeys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id").references(() => patients.id),
    lineUserId: varchar("line_user_id", { length: 50 }).notNull(),
    state: lineContactStateEnum("state").default("new_unregistered").notNull(),
    currentStep: varchar("current_step", { length: 100 }),
    sourceEventId: uuid("source_event_id"),
    metadata: jsonb("metadata").default({}).notNull(),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    lastEventAt: timestamp("last_event_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("line_contact_journeys_line_user_id_uidx").on(t.lineUserId),
    index("line_contact_journeys_patient_id_idx").on(t.patientId),
    index("line_contact_journeys_state_idx").on(t.state),
  ],
);

export const lineWebhookEvents = pgTable(
  "line_webhook_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    providerEventKey: varchar("provider_event_key", { length: 255 })
      .notNull()
      .unique(),
    dedupeKey: varchar("dedupe_key", { length: 255 }).notNull(),
    eventType: varchar("event_type", { length: 50 }).notNull(),
    lineUserId: varchar("line_user_id", { length: 50 }),
    patientId: uuid("patient_id").references(() => patients.id),
    sessionId: uuid("session_id").references(() => chatSessions.id),
    status: webhookEventStatusEnum("status").default("received").notNull(),
    payload: jsonb("payload").default({}).notNull(),
    processingData: jsonb("processing_data").default({}).notNull(),
    errorMessage: text("error_message"),
    duplicateCount: integer("duplicate_count").default(0).notNull(),
    replayedFromEventId: uuid("replayed_from_event_id"),
    receivedAt: timestamp("received_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("line_webhook_events_dedupe_idx").on(t.dedupeKey),
    index("line_webhook_events_event_type_idx").on(t.eventType),
    index("line_webhook_events_status_idx").on(t.status),
    index("line_webhook_events_line_user_id_idx").on(t.lineUserId),
    index("line_webhook_events_received_at_idx").on(t.receivedAt),
  ],
);

export const patientTags = pgTable(
  "patient_tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: varchar("slug", { length: 64 }).notNull().unique(),
    label: varchar("label", { length: 120 }).notNull(),
    color: varchar("color", { length: 32 }),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("patient_tags_sort_idx").on(t.sortOrder)],
);

export const patientTagAssignments = pgTable(
  "patient_tag_assignments",
  {
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => patientTags.id, { onDelete: "cascade" }),
    assignedByStaffId: uuid("assigned_by_staff_id").references(() => staff.id),
    assignedAt: timestamp("assigned_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.patientId, t.tagId] }),
    index("patient_tag_assignments_tag_idx").on(t.tagId),
  ],
);

export const lineQuickReplies = pgTable(
  "line_quick_replies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: varchar("title", { length: 120 }).notNull(),
    body: text("body").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("line_quick_replies_active_sort_idx").on(t.isActive, t.sortOrder)],
);
