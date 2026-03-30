import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  decimal,
  timestamp,
} from "drizzle-orm/pg-core";
import {
  membershipTierEnum,
  pointsTransactionTypeEnum,
  promotionTypeEnum,
  promotionStatusEnum,
} from "./enums";
import { patients } from "./patients";
import { staff } from "./staff";

export const loyaltyAccounts = pgTable("loyalty_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: uuid("patient_id")
    .unique()
    .notNull()
    .references(() => patients.id),
  currentPoints: integer("current_points").default(0).notNull(),
  lifetimePoints: integer("lifetime_points").default(0).notNull(),
  lifetimeSpent: decimal("lifetime_spent", {
    precision: 12,
    scale: 2,
  }).default("0"),
  tier: membershipTierEnum("tier").default("bronze"),
  tierUpgradeAt: timestamp("tier_upgrade_at", { withTimezone: true }),
  tierLastCalculated: timestamp("tier_last_calculated", {
    withTimezone: true,
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const pointsTransactions = pgTable("points_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  loyaltyAccountId: uuid("loyalty_account_id")
    .notNull()
    .references(() => loyaltyAccounts.id),
  type: pointsTransactionTypeEnum("type").notNull(),
  points: integer("points").notNull(),
  balanceAfter: integer("balance_after").notNull(),
  referenceType: varchar("reference_type", { length: 50 }),
  referenceId: uuid("reference_id"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const promotions = pgTable("promotions", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code", { length: 30 }).unique().notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  type: promotionTypeEnum("type").notNull(),
  productIds: text("product_ids").array().default([]),
  categoryIds: text("category_ids").array().default([]),
  tierRequired: membershipTierEnum("tier_required"),
  minOrderAmount: decimal("min_order_amount", { precision: 12, scale: 2 }),
  maxDiscount: decimal("max_discount", { precision: 12, scale: 2 }),
  value: decimal("value", { precision: 10, scale: 2 }),
  buyQuantity: integer("buy_quantity"),
  getQuantity: integer("get_quantity"),
  usageLimit: integer("usage_limit"),
  usagePerCustomer: integer("usage_per_customer").default(1),
  usageCount: integer("usage_count").default(0).notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  status: promotionStatusEnum("status").default("draft"),
  createdBy: uuid("created_by").references(() => staff.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
