import type { DrugClassification, OrderStatus, MembershipTier } from "../types/enums";

export const DRUG_CLASSIFICATIONS_TH: Record<DrugClassification, string> = {
  hhr: "ยาอันตราย (ยาแผนปัจจุบัน)",
  dangerous_drug: "ยาอันตราย",
  specially_controlled: "ยาควบคุมพิเศษ",
  psychotropic: "วัตถุออกฤทธิ์ต่อจิตและประสาท",
  narcotic: "ยาเสพติดให้โทษ",
  device: "เครื่องมือแพทย์",
  supplement: "ผลิตภัณฑ์เสริมอาหาร",
  cosmetic: "เครื่องสำอาง",
  herbal: "ยาสมุนไพร",
  food: "อาหาร",
};

export const ORDER_STATUS_FLOW: Record<OrderStatus, OrderStatus[]> = {
  draft: ["awaiting_payment", "cancelled"],
  awaiting_payment: ["paid", "cancelled", "refunding"],
  paid: ["processing", "cancelled", "refunding"],
  processing: ["packed", "cancelled"],
  packed: ["ready_to_ship"],
  ready_to_ship: ["shipped"],
  shipped: ["out_for_delivery"],
  out_for_delivery: ["delivered"],
  delivered: ["completed", "returned"],
  completed: [],
  cancelled: ["refunding"],
  refunding: ["refunded"],
  refunded: [],
  returned: ["refunding"],
};

export const MEMBERSHIP_TIER_THRESHOLDS: Record<MembershipTier, number> = {
  bronze: 0,
  silver: 3000,
  gold: 10000,
  platinum: 30000,
};

export const POINTS_PER_BAHT = 1;

export const MAX_UPLOAD_SIZE_MB = 10;

export const PAYMENT_EXPIRY_MINUTES = 30;

export const RX_EXPIRY_DAYS = 90;
