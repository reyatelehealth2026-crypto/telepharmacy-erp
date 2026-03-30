import { pgEnum } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", [
  "super_admin",
  "pharmacist",
  "pharmacist_tech",
  "customer_service",
  "marketing",
  "accounting",
  "delivery",
]);

export const patientStatusEnum = pgEnum("patient_status", [
  "active",
  "inactive",
  "deceased",
]);

export const patientTitleEnum = pgEnum("patient_title", [
  "mr",
  "mrs",
  "miss",
  "ms",
  "master",
  "infant",
  "other",
]);

export const genderEnum = pgEnum("gender", ["male", "female", "other"]);

export const bloodTypeEnum = pgEnum("blood_type", [
  "a",
  "b",
  "ab",
  "o",
  "a_rh_minus",
  "b_rh_minus",
  "ab_rh_minus",
  "o_rh_minus",
  "unknown",
]);

export const insuranceTypeEnum = pgEnum("insurance_type", [
  "none",
  "government_30baht",
  "social_security",
  "government_civil_servant",
  "private",
]);

export const allergySeverityEnum = pgEnum("allergy_severity", [
  "mild",
  "moderate",
  "severe",
  "life_threatening",
]);

export const allergyReactionTypeEnum = pgEnum("allergy_reaction_type", [
  "allergic",
  "side_effect",
  "intolerance",
]);

export const allergySourceEnum = pgEnum("allergy_source", [
  "patient_reported",
  "doctor_diagnosed",
  "pharmacist_identified",
  "family_history",
]);

export const chronicDiseaseStatusEnum = pgEnum("chronic_disease_status", [
  "active",
  "resolved",
  "under_treatment",
]);

export const drugClassificationEnum = pgEnum("drug_classification", [
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
]);

export const rxStatusEnum = pgEnum("rx_status", [
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
]);

export const rxPriorityEnum = pgEnum("rx_priority", [
  "low",
  "medium",
  "high",
  "urgent",
]);

export const rxSourceEnum = pgEnum("rx_source", [
  "paper_rx",
  "electronic_rx",
  "walk_in",
  "phone_call",
  "line_chat",
]);

export const safetyCheckResultEnum = pgEnum("safety_check_result", [
  "pass",
  "warning",
  "fail",
  "skip",
]);

export const interventionTypeEnum = pgEnum("intervention_type", [
  "drug_interaction_prevented",
  "allergy_prevented",
  "dose_adjustment",
  "drug_substitution",
  "therapy_duplication",
  "contraindication",
  "patient_education",
  "referral_to_doctor",
  "other",
]);

export const orderTypeEnum = pgEnum("order_type", [
  "otc",
  "rx",
  "consultation",
  "refill",
  "reorder",
]);

export const orderStatusEnum = pgEnum("order_status", [
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
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "promptpay",
  "bank_transfer",
  "cod",
  "mobile_banking",
  "credit_card",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "processing",
  "successful",
  "failed",
  "expired",
  "refunding",
  "refunded",
  "partially_refunded",
]);

export const deliveryStatusEnum = pgEnum("delivery_status", [
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
]);

export const deliveryProviderEnum = pgEnum("delivery_provider", [
  "kerry",
  "flash",
  "ninja_van",
  "j_and_t",
  "dhl",
  "own_driver",
  "customer_pickup",
]);

export const counselingMethodEnum = pgEnum("counseling_method", [
  "video_call",
  "voice_call",
  "line_chat",
  "face_to_face",
  "none",
]);

export const lotStatusEnum = pgEnum("lot_status", [
  "available",
  "quarantine",
  "expired",
  "damaged",
  "recalled",
]);

export const stockMovementTypeEnum = pgEnum("stock_movement_type", [
  "purchase_in",
  "sale_out",
  "return_in",
  "return_out",
  "adjustment_in",
  "adjustment_out",
  "write_off",
  "transfer_in",
  "transfer_out",
]);

export const membershipTierEnum = pgEnum("membership_tier", [
  "bronze",
  "silver",
  "gold",
  "platinum",
]);

export const pointsTransactionTypeEnum = pgEnum("points_transaction_type", [
  "earned_purchase",
  "earned_bonus",
  "earned_review",
  "redeemed",
  "expired",
  "adjusted",
  "referral_bonus",
]);

export const promotionTypeEnum = pgEnum("promotion_type", [
  "percentage_discount",
  "fixed_discount",
  "buy_x_get_y",
  "bundle",
  "free_delivery",
  "free_gift",
  "points_multiplier",
]);

export const promotionStatusEnum = pgEnum("promotion_status", [
  "draft",
  "active",
  "paused",
  "expired",
  "cancelled",
]);

export const notificationChannelEnum = pgEnum("notification_channel", [
  "line",
  "email",
  "sms",
  "push",
  "in_app",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
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
]);

export const contentTypeEnum = pgEnum("content_type", [
  "health_article",
  "product_review",
  "faq",
  "drug_info",
  "promotion_banner",
]);

export const chatSessionTypeEnum = pgEnum("chat_session_type", [
  "bot",
  "pharmacist",
  "ai_assisted",
]);

export const chatMessageRoleEnum = pgEnum("chat_message_role", [
  "user",
  "bot",
  "pharmacist",
  "system",
]);

export const complaintStatusEnum = pgEnum("complaint_status", [
  "open",
  "in_progress",
  "resolved",
  "closed",
]);

export const complaintSeverityEnum = pgEnum("complaint_severity", [
  "low",
  "medium",
  "high",
  "critical",
]);

export const vatTypeEnum = pgEnum("vat_type", [
  "vat_included",
  "vat_excluded",
  "no_vat",
]);

export const productStatusEnum = pgEnum("product_status", [
  "active",
  "inactive",
  "discontinued",
  "draft",
]);

export const broadcastStatusEnum = pgEnum("broadcast_status", [
  "draft",
  "scheduled",
  "sending",
  "completed",
  "failed",
  "cancelled",
]);

export const broadcastRecipientStatusEnum = pgEnum(
  "broadcast_recipient_status",
  ["pending", "sent", "delivered", "failed"],
);

export const sentimentLabelEnum = pgEnum("sentiment_label", [
  "positive",
  "neutral",
  "negative",
  "angry",
]);
