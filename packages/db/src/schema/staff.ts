import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  date,
  timestamp,
} from "drizzle-orm/pg-core";
import { patientTitleEnum, userRoleEnum } from "./enums";

export const staff = pgTable("staff", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  title: patientTitleEnum("title").default("mr"),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  role: userRoleEnum("role").default("customer_service").notNull(),
  licenseNo: varchar("license_no", { length: 50 }),
  licenseExpiry: date("license_expiry"),
  avatarUrl: text("avatar_url"),
  isActive: boolean("is_active").default(true).notNull(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
