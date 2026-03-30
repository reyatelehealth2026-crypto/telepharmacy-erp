import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  decimal,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";
import {
  drugClassificationEnum,
  vatTypeEnum,
  productStatusEnum,
} from "./enums";
import { staff } from "./staff";
import { drugs } from "./drugs";

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  nameTh: varchar("name_th", { length: 100 }).notNull(),
  nameEn: varchar("name_en", { length: 100 }),
  slug: varchar("slug", { length: 120 }).unique().notNull(),
  parentId: uuid("parent_id"),
  icon: varchar("icon", { length: 50 }),
  sortOrder: integer("sort_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  sku: varchar("sku", { length: 50 }).unique().notNull(),
  odooCode: varchar("odoo_code", { length: 50 }).unique(),
  odooLastSyncAt: timestamp("odoo_last_sync_at", { withTimezone: true }),
  stockQty: decimal("stock_qty", { precision: 12, scale: 3 }).default("0"),
  stockSyncAt: timestamp("stock_sync_at", { withTimezone: true }),
  nameTh: varchar("name_th", { length: 255 }).notNull(),
  nameEn: varchar("name_en", { length: 255 }),
  slug: varchar("slug", { length: 300 }).unique().notNull(),
  drugId: uuid("drug_id").references(() => drugs.id),
  genericName: varchar("generic_name", { length: 255 }),
  brand: varchar("brand", { length: 100 }),
  manufacturer: varchar("manufacturer", { length: 255 }),
  categoryId: uuid("category_id").references(() => categories.id),
  drugClassification: drugClassificationEnum("drug_classification"),
  requiresPrescription: boolean("requires_prescription")
    .default(false)
    .notNull(),
  requiresPharmacist: boolean("requires_pharmacist").default(false).notNull(),
  dosageForm: varchar("dosage_form", { length: 50 }),
  strength: varchar("strength", { length: 50 }),
  packSize: varchar("pack_size", { length: 50 }),
  unit: varchar("unit", { length: 20 }),
  barcode: varchar("barcode", { length: 50 }),
  fdaRegistrationNo: varchar("fda_registration_no", { length: 50 }),
  shortDescription: text("short_description"),
  fullDescription: text("full_description"),
  howToUse: text("how_to_use"),
  warnings: text("warnings"),
  sideEffects: text("side_effects"),
  contraindications: text("contraindications"),
  ingredients: text("ingredients"),
  images: jsonb("images").default([]),
  sellPrice: decimal("sell_price", { precision: 10, scale: 2 }),
  memberPrice: decimal("member_price", { precision: 10, scale: 2 }),
  comparePrice: decimal("compare_price", { precision: 10, scale: 2 }),
  costPrice: decimal("cost_price", { precision: 10, scale: 2 }),
  vatType: vatTypeEnum("vat_type").default("vat_included"),
  minStock: decimal("min_stock", { precision: 10, scale: 2 }).default("0"),
  maxStock: decimal("max_stock", { precision: 10, scale: 2 }),
  reorderPoint: decimal("reorder_point", { precision: 10, scale: 2 }).default(
    "10",
  ),
  coldChain: boolean("cold_chain").default(false).notNull(),
  storageInstruction: varchar("storage_instruction", { length: 255 }),
  shelfLifeMonths: integer("shelf_life_months"),
  weightGram: decimal("weight_gram", { precision: 8, scale: 2 }),
  status: productStatusEnum("status").default("draft"),
  isFeatured: boolean("is_featured").default(false).notNull(),
  isNew: boolean("is_new").default(false).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  tags: text("tags").array().default([]),
  seoKeywords: text("seo_keywords").array().default([]),
  searchKeywords: text("search_keywords").array(),
  createdBy: uuid("created_by").references(() => staff.id),
  updatedBy: uuid("updated_by").references(() => staff.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});
