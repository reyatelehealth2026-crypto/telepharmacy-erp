import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import {
  broadcastStatusEnum,
  broadcastRecipientStatusEnum,
} from "./enums";
import { patients } from "./patients";
import { staff } from "./staff";

/**
 * LINE broadcast campaigns — supports segmented sending with scheduling.
 */
export const broadcastCampaigns = pgTable(
  "broadcast_campaigns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    /** LINE message content (flex, text, etc.) */
    content: jsonb("content").notNull(),
    altText: varchar("alt_text", { length: 400 }),
    /** Segment filter — JSON query (e.g., { tier: "gold", province: "กรุงเทพฯ" }) */
    segmentFilter: jsonb("segment_filter").default({}),
    /** Idempotency key for dedup */
    idempotencyKey: varchar("idempotency_key", { length: 100 }).unique(),
    status: broadcastStatusEnum("status").default("draft"),
    /** Scheduled send time (null = immediate) */
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    /** Delivery stats */
    totalRecipients: integer("total_recipients").default(0).notNull(),
    successCount: integer("success_count").default(0).notNull(),
    failureCount: integer("failure_count").default(0).notNull(),
    createdBy: uuid("created_by").references(() => staff.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("broadcast_campaigns_status_idx").on(t.status),
    index("broadcast_campaigns_scheduled_idx").on(t.scheduledAt),
  ],
);

/**
 * Per-recipient delivery status for broadcast campaigns.
 */
export const broadcastRecipients = pgTable(
  "broadcast_recipients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => broadcastCampaigns.id, { onDelete: "cascade" }),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
    lineUserId: varchar("line_user_id", { length: 50 }).notNull(),
    status: broadcastRecipientStatusEnum("recipient_status").default("pending"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("broadcast_recipients_campaign_idx").on(t.campaignId),
    index("broadcast_recipients_patient_idx").on(t.patientId),
  ],
);

/**
 * Account link tokens — short-lived tokens for binding existing patient accounts to LINE.
 */
export const accountLinkTokens = pgTable("account_link_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  token: varchar("token", { length: 64 }).unique().notNull(),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => patients.id),
  lineUserId: varchar("line_user_id", { length: 50 }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Notification preferences — per patient, per channel, per notification type.
 */
export const notificationPreferences = pgTable("notification_preferences", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => patients.id, { onDelete: "cascade" }),
  /** notification type (order_confirmation, refill_reminder, etc.) */
  notificationType: varchar("notification_type", { length: 50 }).notNull(),
  /** channel (line, email, sms, push) */
  channel: varchar("channel", { length: 20 }).notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
