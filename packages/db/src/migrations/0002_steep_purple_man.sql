CREATE TYPE "public"."authorization_status" AS ENUM('not_applied', 'application_pending', 'approved', 'expired', 'suspended', 'renewal_pending');--> statement-breakpoint
CREATE TYPE "public"."equipment_status" AS ENUM('active', 'maintenance', 'retired', 'backup');--> statement-breakpoint
CREATE TABLE "compliance_equipment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"facility_id" uuid NOT NULL,
	"equipment_type" varchar(50) NOT NULL,
	"brand" varchar(100),
	"model" varchar(100),
	"serial_number" varchar(100),
	"specifications" jsonb,
	"purchase_date" timestamp with time zone,
	"warranty_expiry" timestamp with time zone,
	"status" "equipment_status" DEFAULT 'active' NOT NULL,
	"last_maintenance_date" timestamp with time zone,
	"next_maintenance_date" timestamp with time zone,
	"maintenance_notes" text,
	"photo_url" text,
	"invoice_url" text,
	"manual_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "compliance_facilities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"facility_name" varchar(255) NOT NULL,
	"facility_type" varchar(50) NOT NULL,
	"address" text NOT NULL,
	"province" varchar(100) NOT NULL,
	"district" varchar(100) NOT NULL,
	"subdistrict" varchar(100),
	"postal_code" varchar(10),
	"consultation_room_photos" jsonb,
	"room_dimensions" jsonb,
	"privacy_measures" text,
	"lighting_description" text,
	"soundproofing_description" text,
	"phone_number" varchar(20),
	"email" varchar(255),
	"emergency_contact" varchar(20),
	"operating_hours" jsonb,
	"telemedicine_hours" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "compliance_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"facility_id" uuid NOT NULL,
	"report_type" varchar(50) NOT NULL,
	"report_period_start" timestamp with time zone NOT NULL,
	"report_period_end" timestamp with time zone NOT NULL,
	"report_data" jsonb NOT NULL,
	"summary" text,
	"findings" jsonb,
	"recommendations" jsonb,
	"total_consultations" integer,
	"total_referrals" integer,
	"referral_rate" numeric(5, 2),
	"average_consultation_duration" integer,
	"kyc_success_rate" numeric(5, 2),
	"consent_acceptance_rate" numeric(5, 2),
	"system_uptime_percentage" numeric(5, 2),
	"generated_at" timestamp with time zone NOT NULL,
	"generated_by" uuid,
	"report_file_url" text,
	"submitted_to_authority" boolean DEFAULT false,
	"submitted_at" timestamp with time zone,
	"submission_method" varchar(50),
	"acknowledgment_received" boolean DEFAULT false,
	"acknowledgment_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "compliance_staff_qualifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"staff_id" uuid NOT NULL,
	"facility_id" uuid NOT NULL,
	"license_number" varchar(50) NOT NULL,
	"license_type" varchar(50) NOT NULL,
	"license_issue_date" timestamp with time zone,
	"license_expiry_date" timestamp with time zone NOT NULL,
	"degree" varchar(100),
	"university" varchar(255),
	"graduation_year" integer,
	"specializations" jsonb,
	"certifications" jsonb,
	"telemedicine_training_completed" boolean DEFAULT false NOT NULL,
	"training_date" timestamp with time zone,
	"training_certificate_url" text,
	"work_schedule" jsonb,
	"telemedicine_shifts" jsonb,
	"cv_url" text,
	"license_document_url" text,
	"degree_document_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "compliance_system_changes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"facility_id" uuid NOT NULL,
	"change_type" varchar(50) NOT NULL,
	"change_category" varchar(50) NOT NULL,
	"change_description" text NOT NULL,
	"requires_sp16_amendment" boolean DEFAULT false NOT NULL,
	"impact_assessment" text,
	"risk_level" varchar(20),
	"planned_date" timestamp with time zone,
	"implemented_date" timestamp with time zone,
	"implemented_by" uuid,
	"change_document_url" text,
	"approval_document_url" text,
	"testing_results_url" text,
	"notification_required" boolean DEFAULT false NOT NULL,
	"notified_at" timestamp with time zone,
	"notification_document_url" text,
	"acknowledgment_received" boolean DEFAULT false,
	"acknowledgment_date" timestamp with time zone,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"review_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "compliance_technical_specs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"facility_id" uuid NOT NULL,
	"platform_name" varchar(100) NOT NULL,
	"platform_version" varchar(50),
	"encryption_protocol" varchar(50),
	"video_resolution" varchar(20),
	"video_frame_rate" integer,
	"audio_bitrate" integer,
	"video_bitrate" integer,
	"recording_enabled" boolean DEFAULT true NOT NULL,
	"recording_format" varchar(20),
	"recording_storage" varchar(100),
	"recording_retention_years" integer DEFAULT 10,
	"data_encryption_at_rest" varchar(50),
	"data_encryption_in_transit" varchar(50),
	"access_control_method" varchar(100),
	"backup_frequency" varchar(50),
	"backup_location" varchar(255),
	"minimum_bandwidth_kbps" integer DEFAULT 500,
	"recommended_bandwidth_kbps" integer DEFAULT 2000,
	"internet_provider" varchar(100),
	"backup_internet_provider" varchar(100),
	"data_center" varchar(255) NOT NULL,
	"data_center_location" varchar(255),
	"data_residency_compliant" boolean DEFAULT true NOT NULL,
	"technical_document_url" text,
	"security_audit_url" text,
	"compliance_certificate_url" text,
	"uptime_percentage" numeric(5, 2),
	"last_uptime_check" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sp16_authorizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"facility_id" uuid NOT NULL,
	"authorization_number" varchar(100),
	"status" "authorization_status" DEFAULT 'not_applied' NOT NULL,
	"application_date" timestamp with time zone,
	"application_document_url" text,
	"submitted_by" uuid,
	"approval_date" timestamp with time zone,
	"approval_document_url" text,
	"approved_by" varchar(255),
	"approval_notes" text,
	"effective_date" timestamp with time zone,
	"expiry_date" timestamp with time zone,
	"renewal_reminder_sent_at" timestamp with time zone,
	"renewal_application_date" timestamp with time zone,
	"suspended_at" timestamp with time zone,
	"suspension_reason" text,
	"revoked_at" timestamp with time zone,
	"revocation_reason" text,
	"correspondence_log" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sp16_authorizations_authorization_number_unique" UNIQUE("authorization_number")
);
--> statement-breakpoint
ALTER TABLE "compliance_equipment" ADD CONSTRAINT "compliance_equipment_facility_id_compliance_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."compliance_facilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_reports" ADD CONSTRAINT "compliance_reports_facility_id_compliance_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."compliance_facilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_reports" ADD CONSTRAINT "compliance_reports_generated_by_staff_id_fk" FOREIGN KEY ("generated_by") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_staff_qualifications" ADD CONSTRAINT "compliance_staff_qualifications_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_staff_qualifications" ADD CONSTRAINT "compliance_staff_qualifications_facility_id_compliance_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."compliance_facilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_system_changes" ADD CONSTRAINT "compliance_system_changes_facility_id_compliance_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."compliance_facilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_system_changes" ADD CONSTRAINT "compliance_system_changes_implemented_by_staff_id_fk" FOREIGN KEY ("implemented_by") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_system_changes" ADD CONSTRAINT "compliance_system_changes_reviewed_by_staff_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_technical_specs" ADD CONSTRAINT "compliance_technical_specs_facility_id_compliance_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."compliance_facilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sp16_authorizations" ADD CONSTRAINT "sp16_authorizations_facility_id_compliance_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."compliance_facilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sp16_authorizations" ADD CONSTRAINT "sp16_authorizations_submitted_by_staff_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "compliance_equipment_facility_id_idx" ON "compliance_equipment" USING btree ("facility_id");--> statement-breakpoint
CREATE INDEX "compliance_equipment_status_idx" ON "compliance_equipment" USING btree ("status");--> statement-breakpoint
CREATE INDEX "compliance_reports_facility_id_idx" ON "compliance_reports" USING btree ("facility_id");--> statement-breakpoint
CREATE INDEX "compliance_reports_report_type_idx" ON "compliance_reports" USING btree ("report_type");--> statement-breakpoint
CREATE INDEX "compliance_reports_report_period_idx" ON "compliance_reports" USING btree ("report_period_start","report_period_end");--> statement-breakpoint
CREATE INDEX "compliance_staff_qualifications_staff_id_idx" ON "compliance_staff_qualifications" USING btree ("staff_id");--> statement-breakpoint
CREATE INDEX "compliance_staff_qualifications_facility_id_idx" ON "compliance_staff_qualifications" USING btree ("facility_id");--> statement-breakpoint
CREATE INDEX "compliance_system_changes_facility_id_idx" ON "compliance_system_changes" USING btree ("facility_id");--> statement-breakpoint
CREATE INDEX "compliance_system_changes_change_type_idx" ON "compliance_system_changes" USING btree ("change_type");--> statement-breakpoint
CREATE INDEX "compliance_system_changes_implemented_date_idx" ON "compliance_system_changes" USING btree ("implemented_date");--> statement-breakpoint
CREATE INDEX "sp16_authorizations_facility_id_idx" ON "sp16_authorizations" USING btree ("facility_id");--> statement-breakpoint
CREATE INDEX "sp16_authorizations_status_idx" ON "sp16_authorizations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sp16_authorizations_expiry_date_idx" ON "sp16_authorizations" USING btree ("expiry_date");