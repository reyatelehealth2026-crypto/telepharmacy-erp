import {
  pgTable,
  uuid,
  varchar,
  text,
  decimal,
  date,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { lotStatusEnum, stockMovementTypeEnum } from "./enums";
import { products } from "./products";
import { staff } from "./staff";

export const inventoryLots = pgTable("inventory_lots", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id),
  lotNo: varchar("lot_no", { length: 100 }).notNull(),
  manufacturingDate: date("manufacturing_date"),
  expiryDate: date("expiry_date"),
  receivedDate: date("received_date").defaultNow(),
  quantityReceived: decimal("quantity_received", {
    precision: 12,
    scale: 3,
  }).notNull(),
  quantityAvailable: decimal("quantity_available", {
    precision: 12,
    scale: 3,
  }).default("0"),
  quantityReserved: decimal("quantity_reserved", {
    precision: 12,
    scale: 3,
  }).default("0"),
  quantityDamaged: decimal("quantity_damaged", {
    precision: 12,
    scale: 3,
  }).default("0"),
  costPrice: decimal("cost_price", { precision: 10, scale: 2 }),
  warehouseLocation: varchar("warehouse_location", { length: 50 }),
  warehouseZone: varchar("warehouse_zone", { length: 50 }),
  supplierId: uuid("supplier_id"),
  supplierLotRef: varchar("supplier_lot_ref", { length: 100 }),
  status: lotStatusEnum("status").default("available"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (t) => [
  index("inventory_lots_product_id_idx").on(t.productId),
  index("inventory_lots_expiry_date_idx").on(t.expiryDate),
  index("inventory_lots_status_idx").on(t.status),
  index("inventory_lots_fefo_idx").on(t.productId, t.expiryDate, t.status),
]);

export const stockMovements = pgTable("stock_movements", {
  id: uuid("id").primaryKey().defaultRandom(),
  lotId: uuid("lot_id")
    .references(() => inventoryLots.id),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id),
  movementType: stockMovementTypeEnum("movement_type").notNull(),
  quantity: decimal("quantity", { precision: 12, scale: 3 }).notNull(),
  unitCost: decimal("unit_cost", { precision: 10, scale: 2 }),
  referenceType: varchar("reference_type", { length: 50 }),
  referenceId: uuid("reference_id"),
  reason: text("reason"),
  notes: text("notes"),
  performedBy: uuid("performed_by").references(() => staff.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
