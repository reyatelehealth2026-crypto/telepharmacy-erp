CREATE TYPE "public"."allergy_reaction_type" AS ENUM('allergic', 'side_effect', 'intolerance');--> statement-breakpoint
CREATE TYPE "public"."allergy_severity" AS ENUM('mild', 'moderate', 'severe', 'life_threatening');--> statement-breakpoint
CREATE TYPE "public"."allergy_source" AS ENUM('patient_reported', 'doctor_diagnosed', 'pharmacist_identified', 'family_history');--> statement-breakpoint
CREATE TYPE "public"."blood_type" AS ENUM('a', 'b', 'ab', 'o', 'a_rh_minus', 'b_rh_minus', 'ab_rh_minus', 'o_rh_minus', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."chat_message_role" AS ENUM('user', 'bot', 'pharmacist', 'system');--> statement-breakpoint
CREATE TYPE "public"."chat_session_type" AS ENUM('bot', 'pharmacist', 'ai_assisted');--> statement-breakpoint
CREATE TYPE "public"."chronic_disease_status" AS ENUM('active', 'resolved', 'under_treatment');--> statement-breakpoint
CREATE TYPE "public"."complaint_severity" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."complaint_status" AS ENUM('open', 'in_progress', 'resolved', 'closed');--> statement-breakpoint
CREATE TYPE "public"."content_type" AS ENUM('health_article', 'product_review', 'faq', 'drug_info', 'promotion_banner');--> statement-breakpoint
CREATE TYPE "public"."counseling_method" AS ENUM('video_call', 'voice_call', 'line_chat', 'face_to_face', 'none');--> statement-breakpoint
CREATE TYPE "public"."delivery_provider" AS ENUM('kerry', 'flash', 'ninja_van', 'j_and_t', 'dhl', 'own_driver', 'customer_pickup');--> statement-breakpoint
CREATE TYPE "public"."delivery_status" AS ENUM('pending', 'picking', 'packed', 'ready', 'picked_up', 'in_transit', 'out_for_delivery', 'nearby', 'delivered', 'failed', 'returned_to_sender');--> statement-breakpoint
CREATE TYPE "public"."drug_classification" AS ENUM('hhr', 'dangerous_drug', 'specially_controlled', 'psychotropic', 'narcotic', 'device', 'supplement', 'cosmetic', 'herbal', 'food');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('male', 'female', 'other');--> statement-breakpoint
CREATE TYPE "public"."insurance_type" AS ENUM('none', 'government_30baht', 'social_security', 'government_civil_servant', 'private');--> statement-breakpoint
CREATE TYPE "public"."intervention_type" AS ENUM('drug_interaction_prevented', 'allergy_prevented', 'dose_adjustment', 'drug_substitution', 'therapy_duplication', 'contraindication', 'patient_education', 'referral_to_doctor', 'other');--> statement-breakpoint
CREATE TYPE "public"."lot_status" AS ENUM('available', 'quarantine', 'expired', 'damaged', 'recalled');--> statement-breakpoint
CREATE TYPE "public"."membership_tier" AS ENUM('bronze', 'silver', 'gold', 'platinum');--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('line', 'email', 'sms', 'push', 'in_app');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('order_confirmation', 'payment_received', 'payment_failed', 'order_shipped', 'order_delivered', 'prescription_status', 'refill_reminder', 'medication_reminder', 'promotion', 'low_stock_alert', 'expiry_warning', 'system_alert');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('draft', 'awaiting_payment', 'paid', 'processing', 'packed', 'ready_to_ship', 'shipped', 'out_for_delivery', 'delivered', 'completed', 'cancelled', 'refunding', 'refunded', 'returned');--> statement-breakpoint
CREATE TYPE "public"."order_type" AS ENUM('otc', 'rx', 'consultation', 'refill', 'reorder');--> statement-breakpoint
CREATE TYPE "public"."patient_status" AS ENUM('active', 'inactive', 'deceased');--> statement-breakpoint
CREATE TYPE "public"."patient_title" AS ENUM('mr', 'mrs', 'miss', 'ms', 'master', 'infant', 'other');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('promptpay', 'bank_transfer', 'cod', 'mobile_banking', 'credit_card');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'processing', 'successful', 'failed', 'expired', 'refunding', 'refunded', 'partially_refunded');--> statement-breakpoint
CREATE TYPE "public"."points_transaction_type" AS ENUM('earned_purchase', 'earned_bonus', 'earned_review', 'redeemed', 'expired', 'adjusted', 'referral_bonus');--> statement-breakpoint
CREATE TYPE "public"."product_status" AS ENUM('active', 'inactive', 'discontinued', 'draft');--> statement-breakpoint
CREATE TYPE "public"."promotion_status" AS ENUM('draft', 'active', 'paused', 'expired', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."promotion_type" AS ENUM('percentage_discount', 'fixed_discount', 'buy_x_get_y', 'bundle', 'free_delivery', 'free_gift', 'points_multiplier');--> statement-breakpoint
CREATE TYPE "public"."rx_priority" AS ENUM('low', 'medium', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."rx_source" AS ENUM('paper_rx', 'electronic_rx', 'walk_in', 'phone_call', 'line_chat');--> statement-breakpoint
CREATE TYPE "public"."rx_status" AS ENUM('received', 'ai_processing', 'ai_completed', 'pharmacist_reviewing', 'approved', 'partial', 'rejected', 'referred', 'dispensing', 'dispensed', 'counseling', 'counseling_completed', 'shipped', 'delivered', 'cancelled', 'expired');--> statement-breakpoint
CREATE TYPE "public"."safety_check_result" AS ENUM('pass', 'warning', 'fail', 'skip');--> statement-breakpoint
CREATE TYPE "public"."stock_movement_type" AS ENUM('purchase_in', 'sale_out', 'return_in', 'return_out', 'adjustment_in', 'adjustment_out', 'write_off', 'transfer_in', 'transfer_out');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('super_admin', 'pharmacist', 'pharmacist_tech', 'customer_service', 'marketing', 'accounting', 'delivery');--> statement-breakpoint
CREATE TYPE "public"."vat_type" AS ENUM('vat_included', 'vat_excluded', 'no_vat');--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"role" "chat_message_role" NOT NULL,
	"content" text,
	"line_message_id" varchar(50),
	"message_type" varchar(20),
	"attachments" jsonb DEFAULT '[]'::jsonb,
	"ai_model" varchar(50),
	"ai_tokens_used" integer,
	"ai_processing_ms" integer,
	"sent_by_staff" uuid,
	"sentiment" varchar(20),
	"sentiment_score" numeric(3, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"line_user_id" varchar(50),
	"session_type" "chat_session_type" DEFAULT 'bot',
	"order_id" uuid,
	"prescription_id" uuid,
	"ai_model" varchar(50),
	"ai_session_id" varchar(255),
	"assigned_to" uuid,
	"assigned_at" timestamp with time zone,
	"transferred_reason" text,
	"status" varchar(20) DEFAULT 'active',
	"patient_satisfaction" integer,
	"resolved_at" timestamp with time zone,
	"message_count" integer DEFAULT 0 NOT NULL,
	"first_response_at" timestamp with time zone,
	"avg_response_time" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "complaints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"order_id" uuid,
	"chat_session_id" uuid,
	"severity" "complaint_severity" DEFAULT 'medium',
	"category" varchar(100),
	"description" text,
	"images" jsonb DEFAULT '[]'::jsonb,
	"status" "complaint_status" DEFAULT 'open',
	"resolution" text,
	"resolved_by" uuid,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "content_type" DEFAULT 'health_article',
	"title_th" varchar(255) NOT NULL,
	"title_en" varchar(255),
	"slug" varchar(300) NOT NULL,
	"body" text,
	"excerpt" text,
	"related_product_ids" text[] DEFAULT '{}',
	"meta_title" varchar(255),
	"meta_description" text,
	"tags" text[] DEFAULT '{}',
	"seo_keywords" text[] DEFAULT '{}',
	"featured_image_url" text,
	"status" varchar(20) DEFAULT 'draft',
	"published_at" timestamp with time zone,
	"author_id" uuid,
	"view_count" integer DEFAULT 0 NOT NULL,
	"share_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "drug_allergy_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_name" varchar(100) NOT NULL,
	"description" text,
	"generic_names" text[] DEFAULT '{}',
	"detection_hint" text,
	CONSTRAINT "drug_allergy_groups_group_name_unique" UNIQUE("group_name")
);
--> statement-breakpoint
CREATE TABLE "drug_disease_contraindications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"drug_id" uuid NOT NULL,
	"disease_name" varchar(255) NOT NULL,
	"icd10_pattern" varchar(50),
	"severity" varchar(20),
	"reason" text,
	"alternative" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drug_interactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"drug_a_id" uuid NOT NULL,
	"drug_b_id" uuid NOT NULL,
	"severity" varchar(20),
	"mechanism" text,
	"clinical_effect" text,
	"management" text,
	"evidence_level" varchar(20),
	"references" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drugs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"generic_name" varchar(255) NOT NULL,
	"generic_name_th" varchar(255),
	"atc_code" varchar(10),
	"atc_category" varchar(255),
	"classification" "drug_classification",
	"requires_prescription" boolean DEFAULT false NOT NULL,
	"requires_pharmacist" boolean DEFAULT false NOT NULL,
	"dosage_forms" text[] DEFAULT '{}',
	"available_strengths" jsonb DEFAULT '[]'::jsonb,
	"pregnancy_category" varchar(5),
	"breastfeeding_safe" boolean,
	"pediatric_safe" boolean,
	"geriatric_safe" boolean,
	"half_life" varchar(50),
	"protein_binding" varchar(50),
	"metabolism" text,
	"excretion" text,
	"therapeutic_range" jsonb DEFAULT '[]'::jsonb,
	"common_side_effects" text[],
	"serious_side_effects" text[],
	"contraindications" text,
	"food_interactions" jsonb DEFAULT '[]'::jsonb,
	"storage_info" text,
	"synonyms" text[] DEFAULT '{}',
	"tags" text[] DEFAULT '{}',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"title" "patient_title" DEFAULT 'mr',
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"phone" varchar(20),
	"role" "user_role" DEFAULT 'customer_service' NOT NULL,
	"license_no" varchar(50),
	"license_expiry" date,
	"avatar_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "staff_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "patient_allergies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"drug_name" varchar(255) NOT NULL,
	"generic_names" text[] DEFAULT '{}',
	"allergy_group" varchar(100),
	"reaction_type" "allergy_reaction_type",
	"severity" "allergy_severity",
	"symptoms" text,
	"source" "allergy_source" DEFAULT 'patient_reported',
	"occurred_date" date,
	"notes" text,
	"recorded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patient_chronic_diseases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"disease_name" varchar(255) NOT NULL,
	"icd10_code" varchar(10),
	"status" "chronic_disease_status" DEFAULT 'active',
	"diagnosed_date" date,
	"notes" text,
	"doctor_name" varchar(255),
	"hospital" varchar(255),
	"recorded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patient_medications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"drug_name" varchar(255) NOT NULL,
	"generic_name" varchar(255),
	"strength" varchar(50),
	"dosage_form" varchar(50),
	"sig" text,
	"duration" varchar(100),
	"prescribed_by" varchar(255),
	"prescribed_at" date,
	"is_current" boolean DEFAULT true NOT NULL,
	"discontinued_at" date,
	"discontinued_reason" text,
	"recorded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_no" varchar(20),
	"line_user_id" varchar(50),
	"line_linked_at" timestamp with time zone DEFAULT now(),
	"title" "patient_title" DEFAULT 'mr',
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"birth_date" date,
	"gender" "gender",
	"national_id" varchar(13),
	"weight" numeric(5, 2),
	"height" numeric(5, 2),
	"blood_type" "blood_type" DEFAULT 'unknown',
	"phone" varchar(20),
	"email" varchar(255),
	"address" text,
	"sub_district" varchar(100),
	"district" varchar(100),
	"province" varchar(100),
	"postal_code" varchar(10),
	"is_pregnant" boolean DEFAULT false NOT NULL,
	"is_breastfeeding" boolean DEFAULT false NOT NULL,
	"smoking" boolean DEFAULT false NOT NULL,
	"alcohol" boolean DEFAULT false NOT NULL,
	"insurance_type" "insurance_type" DEFAULT 'none',
	"insurance_id" varchar(50),
	"pdpa_consent_at" timestamp with time zone DEFAULT now(),
	"pdpa_version" varchar(20) DEFAULT '1.0',
	"data_sharing_opt" boolean DEFAULT false NOT NULL,
	"status" "patient_status" DEFAULT 'active',
	"deleted_at" timestamp with time zone,
	"source" varchar(50) DEFAULT 'line',
	"utm_source" varchar(100),
	"utm_medium" varchar(100),
	"utm_campaign" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "patients_patient_no_unique" UNIQUE("patient_no"),
	CONSTRAINT "patients_line_user_id_unique" UNIQUE("line_user_id")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name_th" varchar(100) NOT NULL,
	"name_en" varchar(100),
	"slug" varchar(120) NOT NULL,
	"parent_id" uuid,
	"icon" varchar(50),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sku" varchar(50) NOT NULL,
	"odoo_code" varchar(50),
	"odoo_last_sync_at" timestamp with time zone,
	"stock_qty" numeric(12, 3) DEFAULT '0',
	"stock_sync_at" timestamp with time zone,
	"name_th" varchar(255) NOT NULL,
	"name_en" varchar(255),
	"slug" varchar(300) NOT NULL,
	"drug_id" uuid,
	"generic_name" varchar(255),
	"brand" varchar(100),
	"manufacturer" varchar(255),
	"category_id" uuid,
	"drug_classification" "drug_classification",
	"requires_prescription" boolean DEFAULT false NOT NULL,
	"requires_pharmacist" boolean DEFAULT false NOT NULL,
	"dosage_form" varchar(50),
	"strength" varchar(50),
	"pack_size" varchar(50),
	"unit" varchar(20),
	"barcode" varchar(50),
	"fda_registration_no" varchar(50),
	"short_description" text,
	"full_description" text,
	"how_to_use" text,
	"warnings" text,
	"side_effects" text,
	"contraindications" text,
	"ingredients" text,
	"images" jsonb DEFAULT '[]'::jsonb,
	"sell_price" numeric(10, 2),
	"member_price" numeric(10, 2),
	"compare_price" numeric(10, 2),
	"cost_price" numeric(10, 2),
	"vat_type" "vat_type" DEFAULT 'vat_included',
	"min_stock" numeric(10, 2) DEFAULT '0',
	"max_stock" numeric(10, 2),
	"reorder_point" numeric(10, 2) DEFAULT '10',
	"cold_chain" boolean DEFAULT false NOT NULL,
	"storage_instruction" varchar(255),
	"shelf_life_months" integer,
	"weight_gram" numeric(8, 2),
	"status" "product_status" DEFAULT 'draft',
	"is_featured" boolean DEFAULT false NOT NULL,
	"is_new" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"tags" text[] DEFAULT '{}',
	"seo_keywords" text[] DEFAULT '{}',
	"search_keywords" text[],
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "products_sku_unique" UNIQUE("sku"),
	CONSTRAINT "products_odoo_code_unique" UNIQUE("odoo_code"),
	CONSTRAINT "products_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "inventory_lots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"lot_no" varchar(100) NOT NULL,
	"manufacturing_date" date,
	"expiry_date" date,
	"received_date" date DEFAULT now(),
	"quantity_received" numeric(12, 3) NOT NULL,
	"quantity_available" numeric(12, 3) DEFAULT '0',
	"quantity_reserved" numeric(12, 3) DEFAULT '0',
	"quantity_damaged" numeric(12, 3) DEFAULT '0',
	"cost_price" numeric(10, 2),
	"warehouse_location" varchar(50),
	"warehouse_zone" varchar(50),
	"supplier_id" uuid,
	"supplier_lot_ref" varchar(100),
	"status" "lot_status" DEFAULT 'available',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lot_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"movement_type" "stock_movement_type" NOT NULL,
	"quantity" numeric(12, 3) NOT NULL,
	"unit_cost" numeric(10, 2),
	"reference_type" varchar(50),
	"reference_id" uuid,
	"reason" text,
	"notes" text,
	"performed_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "counseling_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prescription_id" uuid NOT NULL,
	"method" "counseling_method" NOT NULL,
	"started_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"duration_seconds" integer,
	"topics_covered" text[] DEFAULT '{}',
	"notes" text,
	"recording_url" text,
	"recording_type" varchar(20),
	"recording_size_mb" numeric(8, 2),
	"recording_duration" integer,
	"patient_confirmed" boolean DEFAULT false NOT NULL,
	"confirmed_at" timestamp with time zone,
	"pharmacist_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pharmacist_interventions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prescription_id" uuid NOT NULL,
	"intervention_type" "intervention_type" NOT NULL,
	"description" text,
	"action_taken" text,
	"outcome" text,
	"severity" varchar(20),
	"pharmacist_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prescription_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prescription_id" uuid NOT NULL,
	"item_no" integer,
	"drug_name" varchar(255) NOT NULL,
	"strength" varchar(50),
	"dosage_form" varchar(50),
	"quantity" numeric(10, 2),
	"sig" text,
	"duration" varchar(100),
	"matched_product_id" uuid,
	"match_confidence" numeric(5, 2),
	"match_status" varchar(20) DEFAULT 'pending',
	"dispensed_lot_id" uuid,
	"dispensed_qty" numeric(10, 2),
	"unit_price" numeric(10, 2),
	"total_price" numeric(10, 2),
	"pharmacist_decision" varchar(20),
	"substitution_note" text,
	"skip_reason" text,
	"status" varchar(20) DEFAULT 'pending',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prescriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rx_no" varchar(30) NOT NULL,
	"patient_id" uuid NOT NULL,
	"prescriber_name" varchar(255),
	"prescriber_license" varchar(50),
	"prescriber_hospital" varchar(255),
	"prescriber_dept" varchar(100),
	"rx_date" date,
	"source" "rx_source" DEFAULT 'paper_rx',
	"diagnosis" text,
	"images" jsonb DEFAULT '[]'::jsonb,
	"ocr_status" varchar(20) DEFAULT 'pending',
	"ocr_result" jsonb,
	"ocr_confidence" numeric(5, 2),
	"ocr_processed_at" timestamp with time zone,
	"ai_checks_passed" boolean,
	"ai_checks_result" jsonb,
	"ai_priority" "rx_priority" DEFAULT 'low',
	"status" "rx_status" DEFAULT 'received',
	"rejection_reason" text,
	"order_id" uuid,
	"verified_by" uuid,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "prescriptions_rx_no_unique" UNIQUE("rx_no")
);
--> statement-breakpoint
CREATE TABLE "safety_checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prescription_item_id" uuid NOT NULL,
	"check_type" varchar(50) NOT NULL,
	"result" "safety_check_result" NOT NULL,
	"severity" varchar(20),
	"description" text,
	"recommendation" text,
	"reference_drug_id" uuid,
	"reference_rule_id" uuid,
	"ai_generated" boolean DEFAULT true NOT NULL,
	"ai_confidence" numeric(5, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"status" "delivery_status" DEFAULT 'pending',
	"provider" "delivery_provider",
	"tracking_no" varchar(100),
	"fee" numeric(10, 2) DEFAULT '0',
	"cod_amount" numeric(12, 2),
	"cold_chain" boolean DEFAULT false NOT NULL,
	"temp_logger_id" varchar(50),
	"picked_up_at" timestamp with time zone,
	"estimated_delivery" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"receiver_name" varchar(255),
	"receiver_phone" varchar(20),
	"receiver_relation" varchar(50),
	"delivery_proof_url" text,
	"notes" text,
	"failure_reason" text,
	"courier_name" varchar(100),
	"courier_phone" varchar(20),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"item_no" integer,
	"product_name" varchar(255) NOT NULL,
	"sku" varchar(50),
	"drug_classification" "drug_classification",
	"quantity" numeric(10, 2) NOT NULL,
	"unit" varchar(20),
	"unit_price" numeric(10, 2) NOT NULL,
	"discount_amount" numeric(10, 2) DEFAULT '0',
	"total_price" numeric(12, 2) NOT NULL,
	"lot_id" uuid,
	"refill_from_item_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_no" varchar(30) NOT NULL,
	"patient_id" uuid NOT NULL,
	"order_type" "order_type" DEFAULT 'otc',
	"prescription_id" uuid,
	"status" "order_status" DEFAULT 'draft',
	"cancellation_reason" text,
	"subtotal" numeric(12, 2) DEFAULT '0',
	"discount_amount" numeric(12, 2) DEFAULT '0',
	"discount_code" varchar(20),
	"delivery_fee" numeric(10, 2) DEFAULT '0',
	"cold_chain_fee" numeric(10, 2) DEFAULT '0',
	"vat_amount" numeric(12, 2) DEFAULT '0',
	"total_amount" numeric(12, 2) DEFAULT '0',
	"points_earned" integer DEFAULT 0 NOT NULL,
	"points_redeemed" integer DEFAULT 0 NOT NULL,
	"points_discount" numeric(10, 2) DEFAULT '0',
	"delivery_address" text,
	"delivery_sub_district" varchar(100),
	"delivery_district" varchar(100),
	"delivery_province" varchar(100),
	"delivery_postal_code" varchar(10),
	"delivery_phone" varchar(20),
	"delivery_recipient" varchar(255),
	"delivery_notes" text,
	"cold_chain_required" boolean DEFAULT false NOT NULL,
	"source" varchar(20) DEFAULT 'line',
	"line_message_id" varchar(50),
	"notes" text,
	"internal_notes" text,
	"paid_at" timestamp with time zone,
	"processed_at" timestamp with time zone,
	"packed_at" timestamp with time zone,
	"shipped_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_order_no_unique" UNIQUE("order_no")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_no" varchar(30) NOT NULL,
	"order_id" uuid NOT NULL,
	"method" "payment_method" NOT NULL,
	"status" "payment_status" DEFAULT 'pending',
	"amount" numeric(12, 2) NOT NULL,
	"promptpay_payload" varchar(255),
	"promptpay_ref" varchar(50),
	"slip_image_url" text,
	"slip_ocr_result" jsonb,
	"slip_verified_by" uuid,
	"slip_verified_at" timestamp with time zone,
	"slip_match_status" varchar(20),
	"cod_collected_amount" numeric(12, 2),
	"refund_amount" numeric(12, 2),
	"refund_reason" text,
	"refund_ref" varchar(50),
	"gateway" varchar(50),
	"gateway_ref" varchar(255),
	"paid_at" timestamp with time zone,
	"expired_at" timestamp with time zone,
	"refunded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_payment_no_unique" UNIQUE("payment_no")
);
--> statement-breakpoint
CREATE TABLE "loyalty_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"current_points" integer DEFAULT 0 NOT NULL,
	"lifetime_points" integer DEFAULT 0 NOT NULL,
	"lifetime_spent" numeric(12, 2) DEFAULT '0',
	"tier" "membership_tier" DEFAULT 'bronze',
	"tier_upgrade_at" timestamp with time zone,
	"tier_last_calculated" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "loyalty_accounts_patient_id_unique" UNIQUE("patient_id")
);
--> statement-breakpoint
CREATE TABLE "points_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"loyalty_account_id" uuid NOT NULL,
	"type" "points_transaction_type" NOT NULL,
	"points" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"reference_type" varchar(50),
	"reference_id" uuid,
	"expires_at" timestamp with time zone,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promotions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(30) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"type" "promotion_type" NOT NULL,
	"product_ids" text[] DEFAULT '{}',
	"category_ids" text[] DEFAULT '{}',
	"tier_required" "membership_tier",
	"min_order_amount" numeric(12, 2),
	"max_discount" numeric(12, 2),
	"value" numeric(10, 2),
	"buy_quantity" integer,
	"get_quantity" integer,
	"usage_limit" integer,
	"usage_per_customer" integer DEFAULT 1,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"status" "promotion_status" DEFAULT 'draft',
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "promotions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid,
	"staff_id" uuid,
	"type" "notification_type" NOT NULL,
	"channel" "notification_channel" NOT NULL,
	"title" varchar(255) NOT NULL,
	"body" text,
	"line_message_type" varchar(20),
	"line_message_data" jsonb,
	"status" varchar(20) DEFAULT 'pending',
	"sent_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"read_at" timestamp with time zone,
	"error_message" text,
	"reference_type" varchar(50),
	"reference_id" uuid,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"max_retries" integer DEFAULT 3 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"table_name" varchar(100) NOT NULL,
	"record_id" uuid NOT NULL,
	"action" varchar(20) NOT NULL,
	"old_values" jsonb,
	"new_values" jsonb,
	"changed_by" uuid,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" varchar(45)
);
--> statement-breakpoint
CREATE TABLE "medication_reminders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"patient_medication_id" uuid,
	"drug_name" varchar(255) NOT NULL,
	"sig" text,
	"reminder_times" time[] DEFAULT '{}',
	"reminder_days" integer[] DEFAULT '{1,2,3,4,5,6,7}',
	"is_active" boolean DEFAULT true NOT NULL,
	"last_reminded_at" timestamp with time zone,
	"last_confirmed_at" timestamp with time zone,
	"weekly_adherence" numeric(5, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_config" (
	"key" varchar(100) PRIMARY KEY NOT NULL,
	"value" jsonb,
	"description" text,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_session_id_chat_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."chat_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_sent_by_staff_staff_id_fk" FOREIGN KEY ("sent_by_staff") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_prescription_id_prescriptions_id_fk" FOREIGN KEY ("prescription_id") REFERENCES "public"."prescriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_assigned_to_staff_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_chat_session_id_chat_sessions_id_fk" FOREIGN KEY ("chat_session_id") REFERENCES "public"."chat_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_resolved_by_staff_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content" ADD CONSTRAINT "content_author_id_staff_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drug_disease_contraindications" ADD CONSTRAINT "drug_disease_contraindications_drug_id_drugs_id_fk" FOREIGN KEY ("drug_id") REFERENCES "public"."drugs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drug_interactions" ADD CONSTRAINT "drug_interactions_drug_a_id_drugs_id_fk" FOREIGN KEY ("drug_a_id") REFERENCES "public"."drugs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drug_interactions" ADD CONSTRAINT "drug_interactions_drug_b_id_drugs_id_fk" FOREIGN KEY ("drug_b_id") REFERENCES "public"."drugs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_allergies" ADD CONSTRAINT "patient_allergies_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_allergies" ADD CONSTRAINT "patient_allergies_recorded_by_staff_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_chronic_diseases" ADD CONSTRAINT "patient_chronic_diseases_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_chronic_diseases" ADD CONSTRAINT "patient_chronic_diseases_recorded_by_staff_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_medications" ADD CONSTRAINT "patient_medications_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_medications" ADD CONSTRAINT "patient_medications_recorded_by_staff_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_drug_id_drugs_id_fk" FOREIGN KEY ("drug_id") REFERENCES "public"."drugs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_created_by_staff_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_updated_by_staff_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_lots" ADD CONSTRAINT "inventory_lots_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_lot_id_inventory_lots_id_fk" FOREIGN KEY ("lot_id") REFERENCES "public"."inventory_lots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_performed_by_staff_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "counseling_sessions" ADD CONSTRAINT "counseling_sessions_prescription_id_prescriptions_id_fk" FOREIGN KEY ("prescription_id") REFERENCES "public"."prescriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "counseling_sessions" ADD CONSTRAINT "counseling_sessions_pharmacist_id_staff_id_fk" FOREIGN KEY ("pharmacist_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pharmacist_interventions" ADD CONSTRAINT "pharmacist_interventions_prescription_id_prescriptions_id_fk" FOREIGN KEY ("prescription_id") REFERENCES "public"."prescriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pharmacist_interventions" ADD CONSTRAINT "pharmacist_interventions_pharmacist_id_staff_id_fk" FOREIGN KEY ("pharmacist_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescription_items" ADD CONSTRAINT "prescription_items_prescription_id_prescriptions_id_fk" FOREIGN KEY ("prescription_id") REFERENCES "public"."prescriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescription_items" ADD CONSTRAINT "prescription_items_matched_product_id_products_id_fk" FOREIGN KEY ("matched_product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescription_items" ADD CONSTRAINT "prescription_items_dispensed_lot_id_inventory_lots_id_fk" FOREIGN KEY ("dispensed_lot_id") REFERENCES "public"."inventory_lots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_verified_by_staff_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safety_checks" ADD CONSTRAINT "safety_checks_prescription_item_id_prescription_items_id_fk" FOREIGN KEY ("prescription_item_id") REFERENCES "public"."prescription_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safety_checks" ADD CONSTRAINT "safety_checks_reference_drug_id_drugs_id_fk" FOREIGN KEY ("reference_drug_id") REFERENCES "public"."drugs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_lot_id_inventory_lots_id_fk" FOREIGN KEY ("lot_id") REFERENCES "public"."inventory_lots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_prescription_id_prescriptions_id_fk" FOREIGN KEY ("prescription_id") REFERENCES "public"."prescriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_slip_verified_by_staff_id_fk" FOREIGN KEY ("slip_verified_by") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_accounts" ADD CONSTRAINT "loyalty_accounts_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "points_transactions" ADD CONSTRAINT "points_transactions_loyalty_account_id_loyalty_accounts_id_fk" FOREIGN KEY ("loyalty_account_id") REFERENCES "public"."loyalty_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_created_by_staff_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_changed_by_staff_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_reminders" ADD CONSTRAINT "medication_reminders_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_reminders" ADD CONSTRAINT "medication_reminders_patient_medication_id_patient_medications_id_fk" FOREIGN KEY ("patient_medication_id") REFERENCES "public"."patient_medications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_config" ADD CONSTRAINT "system_config_updated_by_staff_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "drugs_generic_name_idx" ON "drugs" USING btree ("generic_name");--> statement-breakpoint
CREATE INDEX "drugs_atc_code_idx" ON "drugs" USING btree ("atc_code");--> statement-breakpoint
CREATE INDEX "drugs_classification_idx" ON "drugs" USING btree ("classification");--> statement-breakpoint
CREATE INDEX "patients_line_user_id_idx" ON "patients" USING btree ("line_user_id");--> statement-breakpoint
CREATE INDEX "patients_phone_idx" ON "patients" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "patients_status_idx" ON "patients" USING btree ("status");--> statement-breakpoint
CREATE INDEX "inventory_lots_product_id_idx" ON "inventory_lots" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "inventory_lots_expiry_date_idx" ON "inventory_lots" USING btree ("expiry_date");--> statement-breakpoint
CREATE INDEX "inventory_lots_status_idx" ON "inventory_lots" USING btree ("status");--> statement-breakpoint
CREATE INDEX "inventory_lots_fefo_idx" ON "inventory_lots" USING btree ("product_id","expiry_date","status");--> statement-breakpoint
CREATE INDEX "prescriptions_patient_id_idx" ON "prescriptions" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "prescriptions_status_idx" ON "prescriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "prescriptions_created_at_idx" ON "prescriptions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "prescriptions_ai_priority_idx" ON "prescriptions" USING btree ("ai_priority");--> statement-breakpoint
CREATE INDEX "orders_patient_id_idx" ON "orders" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "orders_created_at_idx" ON "orders" USING btree ("created_at");