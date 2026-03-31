CREATE TYPE "public"."adr_causality" AS ENUM('definite', 'probable', 'possible', 'unlikely', 'unassessable');--> statement-breakpoint
CREATE TYPE "public"."adr_dechallenge" AS ENUM('resolved', 'not_resolved', 'not_applicable');--> statement-breakpoint
CREATE TYPE "public"."adr_outcome" AS ENUM('resolved', 'resolving', 'not_resolved', 'fatal', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."adr_rechallenge" AS ENUM('positive', 'negative', 'not_done');--> statement-breakpoint
CREATE TYPE "public"."adr_severity" AS ENUM('mild', 'moderate', 'severe', 'life_threatening', 'fatal');--> statement-breakpoint
CREATE TYPE "public"."adr_status" AS ENUM('draft', 'submitted', 'reviewed');--> statement-breakpoint
CREATE TYPE "public"."breach_severity" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."breach_status" AS ENUM('detected', 'investigating', 'contained', 'resolved', 'reported_to_authority');--> statement-breakpoint
CREATE TYPE "public"."mr_status" AS ENUM('pending', 'in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."tdm_status" AS ENUM('pending', 'sample_collected', 'result_available', 'reviewed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."broadcast_recipient_status" AS ENUM('pending', 'sent', 'delivered', 'failed');--> statement-breakpoint
CREATE TYPE "public"."broadcast_status" AS ENUM('draft', 'scheduled', 'sending', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."sentiment_label" AS ENUM('positive', 'neutral', 'negative', 'angry');--> statement-breakpoint
CREATE TYPE "public"."consultation_status" AS ENUM('requested', 'scope_validated', 'consent_pending', 'consent_accepted', 'pharmacist_assigned', 'in_progress', 'completed', 'referred', 'cancelled', 'expired');--> statement-breakpoint
CREATE TYPE "public"."consultation_type" AS ENUM('follow_up_chronic', 'medication_refill', 'minor_ailment', 'general_health', 'medication_review');--> statement-breakpoint
CREATE TYPE "public"."kyc_status" AS ENUM('pending', 'documents_uploaded', 'liveness_passed', 'face_verified', 'otp_verified', 'email_verified', 'completed', 'failed', 'manual_review');--> statement-breakpoint
CREATE TYPE "public"."referral_reason" AS ENUM('emergency_symptoms', 'diagnostic_uncertainty', 'scope_limitation', 'requires_physical_exam', 'requires_lab_tests', 'requires_specialist', 'patient_request');--> statement-breakpoint
CREATE TYPE "public"."referral_status" AS ENUM('created', 'patient_notified', 'patient_acknowledged', 'follow_up_sent', 'completed', 'patient_declined');--> statement-breakpoint
CREATE TABLE "account_link_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" varchar(64) NOT NULL,
	"patient_id" uuid NOT NULL,
	"line_user_id" varchar(50),
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "account_link_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "broadcast_campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"content" jsonb NOT NULL,
	"alt_text" varchar(400),
	"segment_filter" jsonb DEFAULT '{}'::jsonb,
	"idempotency_key" varchar(100),
	"status" "broadcast_status" DEFAULT 'draft',
	"scheduled_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"total_recipients" integer DEFAULT 0 NOT NULL,
	"success_count" integer DEFAULT 0 NOT NULL,
	"failure_count" integer DEFAULT 0 NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "broadcast_campaigns_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "broadcast_recipients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"line_user_id" varchar(50) NOT NULL,
	"recipient_status" "broadcast_recipient_status" DEFAULT 'pending',
	"sent_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"notification_type" varchar(50) NOT NULL,
	"channel" varchar(20) NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "adr_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"prescription_id" uuid,
	"drug_name" varchar(255) NOT NULL,
	"drug_code" varchar(50),
	"reaction_description" text NOT NULL,
	"severity" "adr_severity" NOT NULL,
	"onset_date" date,
	"outcome" "adr_outcome" NOT NULL,
	"causality_score" varchar(20),
	"causality_assessment" "adr_causality",
	"rechallenge" "adr_rechallenge" DEFAULT 'not_done',
	"dechallenge" "adr_dechallenge" DEFAULT 'not_applicable',
	"alternative_causes" text,
	"is_known_reaction" boolean DEFAULT false NOT NULL,
	"reported_by" uuid,
	"reported_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" "adr_status" DEFAULT 'draft' NOT NULL,
	"regulatory_exported_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consent_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"consent_version" varchar(20) NOT NULL,
	"consent_type" varchar(50) NOT NULL,
	"granted" boolean NOT NULL,
	"granted_at" timestamp with time zone,
	"withdrawn_at" timestamp with time zone,
	"ip_address" varchar(45),
	"recorded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_breach_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"severity" "breach_severity" NOT NULL,
	"status" "breach_status" DEFAULT 'detected' NOT NULL,
	"affected_patient_ids" uuid[] DEFAULT '{}',
	"affected_record_count" varchar(20),
	"data_types" text[] DEFAULT '{}',
	"discovered_at" timestamp with time zone NOT NULL,
	"reported_by" uuid,
	"contained_at" timestamp with time zone,
	"resolved_at" timestamp with time zone,
	"authority_notified_at" timestamp with time zone,
	"notification_sent_at" timestamp with time zone,
	"root_cause" text,
	"remediation" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "medication_review_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"requested_by" uuid,
	"reason" text,
	"status" "mr_status" DEFAULT 'pending' NOT NULL,
	"pharmacist_id" uuid,
	"review_note" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tdm_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"drug_name" varchar(255) NOT NULL,
	"indication" text,
	"current_dose" varchar(100),
	"requested_by" uuid,
	"pharmacist_id" uuid,
	"status" "tdm_status" DEFAULT 'pending' NOT NULL,
	"sample_collected_at" timestamp with time zone,
	"result" jsonb,
	"interpretation" text,
	"recommendation" text,
	"result_recorded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consent_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" varchar(20) NOT NULL,
	"language" varchar(5) DEFAULT 'th' NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"clauses" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"effective_from" timestamp with time zone NOT NULL,
	"effective_until" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "consent_templates_version_unique" UNIQUE("version")
);
--> statement-breakpoint
CREATE TABLE "emergency_referrals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"consultation_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"pharmacist_id" uuid NOT NULL,
	"reason" "referral_reason" NOT NULL,
	"urgency_level" varchar(20) NOT NULL,
	"clinical_summary" text NOT NULL,
	"symptoms" jsonb,
	"vital_signs" jsonb,
	"current_medications" jsonb,
	"pharmacist_notes" text NOT NULL,
	"recommended_hospitals" jsonb,
	"nearest_hospital" jsonb,
	"status" "referral_status" DEFAULT 'created' NOT NULL,
	"notified_at" timestamp with time zone,
	"notification_channel" varchar(20),
	"acknowledged_at" timestamp with time zone,
	"follow_up_sent_at" timestamp with time zone,
	"referral_letter_url" text,
	"referral_letter_generated_at" timestamp with time zone,
	"patient_went_to_hospital" boolean,
	"hospital_visit_date" timestamp with time zone,
	"hospital_feedback" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kyc_verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"status" "kyc_status" DEFAULT 'pending' NOT NULL,
	"id_document_url" text,
	"id_document_type" varchar(20),
	"extracted_data" jsonb,
	"ocr_confidence" numeric(5, 2),
	"liveness_video_url" text,
	"liveness_score" numeric(5, 2),
	"liveness_gestures" jsonb,
	"liveness_passed_at" timestamp with time zone,
	"selfie_url" text,
	"face_match_confidence" numeric(5, 2),
	"face_match_passed_at" timestamp with time zone,
	"phone_otp_sent_at" timestamp with time zone,
	"phone_otp_verified_at" timestamp with time zone,
	"phone_otp_attempts" integer DEFAULT 0,
	"email_verification_sent_at" timestamp with time zone,
	"email_verified_at" timestamp with time zone,
	"requires_guardian_consent" boolean DEFAULT false,
	"guardian_kyc_id" uuid,
	"guardian_relationship" varchar(50),
	"flagged_for_review" boolean DEFAULT false,
	"review_reason" text,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"review_notes" text,
	"ip_address" varchar(45),
	"device_id" varchar(255),
	"user_agent" text,
	"completed_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patient_consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"template_id" uuid NOT NULL,
	"consultation_id" uuid,
	"accepted" boolean NOT NULL,
	"accepted_at" timestamp with time zone,
	"signature_url" text,
	"scrolled_to_end" boolean DEFAULT false,
	"time_spent_seconds" integer,
	"ip_address" varchar(45),
	"device_id" varchar(255),
	"user_agent" text,
	"geolocation" jsonb,
	"withdrawn_at" timestamp with time zone,
	"withdrawal_reason" text,
	"pdf_url" text,
	"pdf_generated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pharmacist_license_verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pharmacist_id" uuid NOT NULL,
	"license_number" varchar(50) NOT NULL,
	"license_type" varchar(50),
	"issue_date" timestamp with time zone,
	"expiry_date" timestamp with time zone NOT NULL,
	"verification_method" varchar(50),
	"verified_at" timestamp with time zone,
	"verification_status" varchar(20) DEFAULT 'pending' NOT NULL,
	"api_response" jsonb,
	"document_url" text,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"review_notes" text,
	"last_checked_at" timestamp with time zone,
	"expiry_reminder_sent_at" timestamp with time zone,
	"suspended_at" timestamp with time zone,
	"suspension_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scope_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rule_type" varchar(50) NOT NULL,
	"rule_name" varchar(255) NOT NULL,
	"condition" jsonb NOT NULL,
	"action" varchar(20) NOT NULL,
	"severity" varchar(20),
	"message" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"priority" integer DEFAULT 100,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scope_validation_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"consultation_id" uuid NOT NULL,
	"overall_result" varchar(20) NOT NULL,
	"triggered_rules" jsonb,
	"patient_type" varchar(20),
	"last_consultation_date" timestamp with time zone,
	"has_baseline_data" boolean,
	"prohibited_symptoms" jsonb,
	"requested_medications" jsonb,
	"override_by" uuid,
	"override_reason" text,
	"override_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "telemedicine_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"previous_hash" varchar(64) NOT NULL,
	"current_hash" varchar(64) NOT NULL,
	"timestamp" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"actor_id" uuid NOT NULL,
	"actor_type" varchar(20) NOT NULL,
	"action_type" varchar(50) NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" uuid NOT NULL,
	"metadata" jsonb,
	"ip_address" "inet",
	"user_agent" text,
	"geolocation" jsonb,
	"session_id" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "telemedicine_audit_log_current_hash_unique" UNIQUE("current_hash")
);
--> statement-breakpoint
CREATE TABLE "video_consultations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar(100) NOT NULL,
	"patient_id" uuid NOT NULL,
	"pharmacist_id" uuid,
	"type" "consultation_type" NOT NULL,
	"status" "consultation_status" DEFAULT 'requested' NOT NULL,
	"chief_complaint" text,
	"symptoms" jsonb,
	"scope_validation_result" jsonb,
	"scope_validated_at" timestamp with time zone,
	"scope_override_reason" text,
	"consent_version" varchar(20),
	"consent_accepted_at" timestamp with time zone,
	"consent_ip_address" varchar(45),
	"consent_device_id" varchar(255),
	"consent_signature_url" text,
	"agora_token" text,
	"agora_uid" integer,
	"started_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"duration_seconds" integer,
	"recording_url" text,
	"recording_hash" varchar(64),
	"recording_size_mb" numeric(10, 2),
	"transcript_url" text,
	"transcript_parsed_at" timestamp with time zone,
	"structured_data" jsonb,
	"avg_bandwidth_kbps" integer,
	"avg_resolution" varchar(20),
	"avg_frame_rate" integer,
	"connection_drops" integer DEFAULT 0,
	"prescription_id" uuid,
	"referral_id" uuid,
	"pharmacist_notes" text,
	"follow_up_required" boolean DEFAULT false,
	"follow_up_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "video_consultations_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "digital_signature" text;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "signed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "account_link_tokens" ADD CONSTRAINT "account_link_tokens_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broadcast_campaigns" ADD CONSTRAINT "broadcast_campaigns_created_by_staff_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broadcast_recipients" ADD CONSTRAINT "broadcast_recipients_campaign_id_broadcast_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."broadcast_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broadcast_recipients" ADD CONSTRAINT "broadcast_recipients_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adr_reports" ADD CONSTRAINT "adr_reports_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adr_reports" ADD CONSTRAINT "adr_reports_reported_by_staff_id_fk" FOREIGN KEY ("reported_by") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_recorded_by_staff_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_breach_reports" ADD CONSTRAINT "data_breach_reports_reported_by_staff_id_fk" FOREIGN KEY ("reported_by") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_review_requests" ADD CONSTRAINT "medication_review_requests_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_review_requests" ADD CONSTRAINT "medication_review_requests_requested_by_staff_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_review_requests" ADD CONSTRAINT "medication_review_requests_pharmacist_id_staff_id_fk" FOREIGN KEY ("pharmacist_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tdm_requests" ADD CONSTRAINT "tdm_requests_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tdm_requests" ADD CONSTRAINT "tdm_requests_requested_by_staff_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tdm_requests" ADD CONSTRAINT "tdm_requests_pharmacist_id_staff_id_fk" FOREIGN KEY ("pharmacist_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_templates" ADD CONSTRAINT "consent_templates_created_by_staff_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_referrals" ADD CONSTRAINT "emergency_referrals_consultation_id_video_consultations_id_fk" FOREIGN KEY ("consultation_id") REFERENCES "public"."video_consultations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_referrals" ADD CONSTRAINT "emergency_referrals_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_referrals" ADD CONSTRAINT "emergency_referrals_pharmacist_id_staff_id_fk" FOREIGN KEY ("pharmacist_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kyc_verifications" ADD CONSTRAINT "kyc_verifications_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kyc_verifications" ADD CONSTRAINT "kyc_verifications_guardian_kyc_id_kyc_verifications_id_fk" FOREIGN KEY ("guardian_kyc_id") REFERENCES "public"."kyc_verifications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kyc_verifications" ADD CONSTRAINT "kyc_verifications_reviewed_by_staff_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_consents" ADD CONSTRAINT "patient_consents_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_consents" ADD CONSTRAINT "patient_consents_template_id_consent_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."consent_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_consents" ADD CONSTRAINT "patient_consents_consultation_id_video_consultations_id_fk" FOREIGN KEY ("consultation_id") REFERENCES "public"."video_consultations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pharmacist_license_verifications" ADD CONSTRAINT "pharmacist_license_verifications_pharmacist_id_staff_id_fk" FOREIGN KEY ("pharmacist_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pharmacist_license_verifications" ADD CONSTRAINT "pharmacist_license_verifications_reviewed_by_staff_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scope_rules" ADD CONSTRAINT "scope_rules_created_by_staff_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scope_validation_results" ADD CONSTRAINT "scope_validation_results_consultation_id_video_consultations_id_fk" FOREIGN KEY ("consultation_id") REFERENCES "public"."video_consultations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scope_validation_results" ADD CONSTRAINT "scope_validation_results_override_by_staff_id_fk" FOREIGN KEY ("override_by") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_consultations" ADD CONSTRAINT "video_consultations_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_consultations" ADD CONSTRAINT "video_consultations_pharmacist_id_staff_id_fk" FOREIGN KEY ("pharmacist_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "broadcast_campaigns_status_idx" ON "broadcast_campaigns" USING btree ("status");--> statement-breakpoint
CREATE INDEX "broadcast_campaigns_scheduled_idx" ON "broadcast_campaigns" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX "broadcast_recipients_campaign_idx" ON "broadcast_recipients" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "broadcast_recipients_patient_idx" ON "broadcast_recipients" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "emergency_referrals_patient_id_idx" ON "emergency_referrals" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "emergency_referrals_consultation_id_idx" ON "emergency_referrals" USING btree ("consultation_id");--> statement-breakpoint
CREATE INDEX "emergency_referrals_status_idx" ON "emergency_referrals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "kyc_verifications_patient_id_idx" ON "kyc_verifications" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "kyc_verifications_status_idx" ON "kyc_verifications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "patient_consents_patient_id_idx" ON "patient_consents" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "patient_consents_consultation_id_idx" ON "patient_consents" USING btree ("consultation_id");--> statement-breakpoint
CREATE INDEX "pharmacist_license_verifications_pharmacist_id_idx" ON "pharmacist_license_verifications" USING btree ("pharmacist_id");--> statement-breakpoint
CREATE INDEX "pharmacist_license_verifications_status_idx" ON "pharmacist_license_verifications" USING btree ("verification_status");--> statement-breakpoint
CREATE INDEX "pharmacist_license_verifications_expiry_date_idx" ON "pharmacist_license_verifications" USING btree ("expiry_date");--> statement-breakpoint
CREATE INDEX "telemedicine_audit_log_timestamp_idx" ON "telemedicine_audit_log" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "telemedicine_audit_log_actor_id_idx" ON "telemedicine_audit_log" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "telemedicine_audit_log_entity_idx" ON "telemedicine_audit_log" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "telemedicine_audit_log_action_type_idx" ON "telemedicine_audit_log" USING btree ("action_type");--> statement-breakpoint
CREATE INDEX "video_consultations_patient_id_idx" ON "video_consultations" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "video_consultations_pharmacist_id_idx" ON "video_consultations" USING btree ("pharmacist_id");--> statement-breakpoint
CREATE INDEX "video_consultations_status_idx" ON "video_consultations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "video_consultations_started_at_idx" ON "video_consultations" USING btree ("started_at");