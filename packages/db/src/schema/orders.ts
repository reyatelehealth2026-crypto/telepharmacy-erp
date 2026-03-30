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
  orderTypeEnum,
  orderStatusEnum,
  drugClassificationEnum,
  paymentMethodEnum,
  paymentStatusEnum,
  deliveryStatusEnum,
  deliveryProviderEnum,
} from "./enums";
import { patients } from "./patients";
import { prescriptions } from "./prescriptions";
import { products } from "./products";
import { inventoryLots } from "./inventory";
import { staff } from "./staff";

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderNo: varchar("order_no", { length: 30 }).unique().notNull(),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => patients.id),
  orderType: orderTypeEnum("order_type").default("otc"),
  prescriptionId: uuid("prescription_id").references(() => prescriptions.id),
  status: orderStatusEnum("status").default("draft"),
  cancellationReason: text("cancellation_reason"),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).default("0"),
  discountAmount: decimal("discount_amount", {
    precision: 12,
    scale: 2,
  }).default("0"),
  discountCode: varchar("discount_code", { length: 20 }),
  deliveryFee: decimal("delivery_fee", { precision: 10, scale: 2 }).default(
    "0",
  ),
  coldChainFee: decimal("cold_chain_fee", { precision: 10, scale: 2 }).default(
    "0",
  ),
  vatAmount: decimal("vat_amount", { precision: 12, scale: 2 }).default("0"),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).default(
    "0",
  ),
  pointsEarned: integer("points_earned").default(0).notNull(),
  pointsRedeemed: integer("points_redeemed").default(0).notNull(),
  pointsDiscount: decimal("points_discount", {
    precision: 10,
    scale: 2,
  }).default("0"),
  deliveryAddress: text("delivery_address"),
  deliverySubDistrict: varchar("delivery_sub_district", { length: 100 }),
  deliveryDistrict: varchar("delivery_district", { length: 100 }),
  deliveryProvince: varchar("delivery_province", { length: 100 }),
  deliveryPostalCode: varchar("delivery_postal_code", { length: 10 }),
  deliveryPhone: varchar("delivery_phone", { length: 20 }),
  deliveryRecipient: varchar("delivery_recipient", { length: 255 }),
  deliveryNotes: text("delivery_notes"),
  coldChainRequired: boolean("cold_chain_required").default(false).notNull(),
  source: varchar("source", { length: 20 }).default("line"),
  lineMessageId: varchar("line_message_id", { length: 50 }),
  notes: text("notes"),
  internalNotes: text("internal_notes"),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  packedAt: timestamp("packed_at", { withTimezone: true }),
  shippedAt: timestamp("shipped_at", { withTimezone: true }),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id),
  itemNo: integer("item_no"),
  productName: varchar("product_name", { length: 255 }).notNull(),
  sku: varchar("sku", { length: 50 }),
  drugClassification: drugClassificationEnum("drug_classification"),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  unit: varchar("unit", { length: 20 }),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  discountAmount: decimal("discount_amount", {
    precision: 10,
    scale: 2,
  }).default("0"),
  totalPrice: decimal("total_price", { precision: 12, scale: 2 }).notNull(),
  lotId: uuid("lot_id").references(() => inventoryLots.id),
  refillFromItemId: uuid("refill_from_item_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  paymentNo: varchar("payment_no", { length: 30 }).unique().notNull(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id),
  method: paymentMethodEnum("method").notNull(),
  status: paymentStatusEnum("status").default("pending"),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  promptpayPayload: varchar("promptpay_payload", { length: 255 }),
  promptpayRef: varchar("promptpay_ref", { length: 50 }),
  slipImageUrl: text("slip_image_url"),
  slipOcrResult: jsonb("slip_ocr_result"),
  slipVerifiedBy: uuid("slip_verified_by").references(() => staff.id),
  slipVerifiedAt: timestamp("slip_verified_at", { withTimezone: true }),
  slipMatchStatus: varchar("slip_match_status", { length: 20 }),
  codCollectedAmount: decimal("cod_collected_amount", {
    precision: 12,
    scale: 2,
  }),
  refundAmount: decimal("refund_amount", { precision: 12, scale: 2 }),
  refundReason: text("refund_reason"),
  refundRef: varchar("refund_ref", { length: 50 }),
  gateway: varchar("gateway", { length: 50 }),
  gatewayRef: varchar("gateway_ref", { length: 255 }),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  expiredAt: timestamp("expired_at", { withTimezone: true }),
  refundedAt: timestamp("refunded_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const deliveries = pgTable("deliveries", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id),
  status: deliveryStatusEnum("status").default("pending"),
  provider: deliveryProviderEnum("provider"),
  trackingNo: varchar("tracking_no", { length: 100 }),
  fee: decimal("fee", { precision: 10, scale: 2 }).default("0"),
  codAmount: decimal("cod_amount", { precision: 12, scale: 2 }),
  coldChain: boolean("cold_chain").default(false).notNull(),
  tempLoggerId: varchar("temp_logger_id", { length: 50 }),
  pickedUpAt: timestamp("picked_up_at", { withTimezone: true }),
  estimatedDelivery: timestamp("estimated_delivery", { withTimezone: true }),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  receiverName: varchar("receiver_name", { length: 255 }),
  receiverPhone: varchar("receiver_phone", { length: 20 }),
  receiverRelation: varchar("receiver_relation", { length: 50 }),
  deliveryProofUrl: text("delivery_proof_url"),
  notes: text("notes"),
  failureReason: text("failure_reason"),
  courierName: varchar("courier_name", { length: 100 }),
  courierPhone: varchar("courier_phone", { length: 20 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
