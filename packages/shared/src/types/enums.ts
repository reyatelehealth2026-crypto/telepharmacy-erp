export const USER_ROLES = [
  "super_admin",
  "pharmacist",
  "pharmacist_tech",
  "customer_service",
  "marketing",
  "accounting",
  "delivery",
] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const PATIENT_STATUSES = ["active", "inactive", "deceased"] as const;
export type PatientStatus = (typeof PATIENT_STATUSES)[number];

export const PATIENT_TITLES = [
  "mr",
  "mrs",
  "miss",
  "ms",
  "master",
  "infant",
  "other",
] as const;
export type PatientTitle = (typeof PATIENT_TITLES)[number];

export const GENDERS = ["male", "female", "other"] as const;
export type Gender = (typeof GENDERS)[number];

export const BLOOD_TYPES = [
  "a",
  "b",
  "ab",
  "o",
  "a_rh_minus",
  "b_rh_minus",
  "ab_rh_minus",
  "o_rh_minus",
  "unknown",
] as const;
export type BloodType = (typeof BLOOD_TYPES)[number];

export const INSURANCE_TYPES = [
  "none",
  "government_30baht",
  "social_security",
  "government_civil_servant",
  "private",
] as const;
export type InsuranceType = (typeof INSURANCE_TYPES)[number];

export const ALLERGY_SEVERITIES = [
  "mild",
  "moderate",
  "severe",
  "life_threatening",
] as const;
export type AllergySeverity = (typeof ALLERGY_SEVERITIES)[number];

export const ALLERGY_REACTION_TYPES = [
  "allergic",
  "side_effect",
  "intolerance",
] as const;
export type AllergyReactionType = (typeof ALLERGY_REACTION_TYPES)[number];

export const ALLERGY_SOURCES = [
  "patient_reported",
  "doctor_diagnosed",
  "pharmacist_identified",
  "family_history",
] as const;
export type AllergySource = (typeof ALLERGY_SOURCES)[number];

export const CHRONIC_DISEASE_STATUSES = [
  "active",
  "resolved",
  "under_treatment",
] as const;
export type ChronicDiseaseStatus = (typeof CHRONIC_DISEASE_STATUSES)[number];

export const DRUG_CLASSIFICATIONS = [
  "hhr",
  "dangerous_drug",
  "specially_controlled",
  "psychotropic",
  "narcotic",
  "device",
  "supplement",
  "cosmetic",
  "herbal",
  "food",
] as const;
export type DrugClassification = (typeof DRUG_CLASSIFICATIONS)[number];

export const RX_STATUSES = [
  "received",
  "ai_processing",
  "ai_completed",
  "pharmacist_reviewing",
  "approved",
  "partial",
  "rejected",
  "referred",
  "dispensing",
  "dispensed",
  "counseling",
  "counseling_completed",
  "shipped",
  "delivered",
  "cancelled",
  "expired",
] as const;
export type RxStatus = (typeof RX_STATUSES)[number];

export const RX_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type RxPriority = (typeof RX_PRIORITIES)[number];

export const RX_SOURCES = [
  "paper_rx",
  "electronic_rx",
  "walk_in",
  "phone_call",
  "line_chat",
] as const;
export type RxSource = (typeof RX_SOURCES)[number];

export const ORDER_TYPES = [
  "otc",
  "rx",
  "consultation",
  "refill",
  "reorder",
] as const;
export type OrderType = (typeof ORDER_TYPES)[number];

export const ORDER_STATUSES = [
  "draft",
  "awaiting_payment",
  "paid",
  "processing",
  "packed",
  "ready_to_ship",
  "shipped",
  "out_for_delivery",
  "delivered",
  "completed",
  "cancelled",
  "refunding",
  "refunded",
  "returned",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_METHODS = [
  "promptpay",
  "bank_transfer",
  "cod",
  "mobile_banking",
  "credit_card",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_STATUSES = [
  "pending",
  "processing",
  "successful",
  "failed",
  "expired",
  "refunding",
  "refunded",
  "partially_refunded",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const DELIVERY_STATUSES = [
  "pending",
  "picking",
  "packed",
  "ready",
  "picked_up",
  "in_transit",
  "out_for_delivery",
  "nearby",
  "delivered",
  "failed",
  "returned_to_sender",
] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export const DELIVERY_PROVIDERS = [
  "kerry",
  "flash",
  "ninja_van",
  "j_and_t",
  "dhl",
  "own_driver",
  "customer_pickup",
] as const;
export type DeliveryProvider = (typeof DELIVERY_PROVIDERS)[number];

export const MEMBERSHIP_TIERS = [
  "bronze",
  "silver",
  "gold",
  "platinum",
] as const;
export type MembershipTier = (typeof MEMBERSHIP_TIERS)[number];

export const PRODUCT_STATUSES = [
  "active",
  "inactive",
  "discontinued",
  "draft",
] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const VAT_TYPES = [
  "vat_included",
  "vat_excluded",
  "no_vat",
] as const;
export type VatType = (typeof VAT_TYPES)[number];

export const NOTIFICATION_TYPES = [
  "order_confirmation",
  "payment_received",
  "payment_failed",
  "order_shipped",
  "order_delivered",
  "prescription_status",
  "refill_reminder",
  "medication_reminder",
  "promotion",
  "low_stock_alert",
  "expiry_warning",
  "system_alert",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_CHANNELS = [
  "line",
  "email",
  "sms",
  "push",
  "in_app",
] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];
