import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  decimal,
  integer,
  timestamp,
  jsonb,
  index,
  pgEnum,
  inet,
} from "drizzle-orm/pg-core";
import { patients } from "./patients";
import { staff } from "./staff";

// ============================================================================
// ENUMS
// ============================================================================

export const kycStatusEnum = pgEnum("kyc_status", [
  "pending",
  "documents_uploaded",
  "liveness_passed",
  "face_verified",
  "otp_verified",
  "email_verified",
  "completed",
  "failed",
  "manual_review",
]);

export const consultationStatusEnum = pgEnum("consultation_status", [
  "requested",
  "scope_validated",
  "consent_pending",
  "consent_accepted",
  "pharmacist_assigned",
  "in_progress",
  "completed",
  "referred",
  "cancelled",
  "expired",
]);

export const consultationTypeEnum = pgEnum("consultation_type", [
  "follow_up_chronic",
  "medication_refill",
  "minor_ailment",
  "general_health",
  "medication_review",
]);

export const referralReasonEnum = pgEnum("referral_reason", [
  "emergency_symptoms",
  "diagnostic_uncertainty",
  "scope_limitation",
  "requires_physical_exam",
  "requires_lab_tests",
  "requires_specialist",
  "patient_request",
]);

export const referralStatusEnum = pgEnum("referral_status", [
  "created",
  "patient_notified",
  "patient_acknowledged",
  "follow_up_sent",
  "completed",
  "patient_declined",
]);

// ============================================================================
// KYC & IDENTITY VERIFICATION
// ============================================================================

export const kycVerifications = pgTable(
  "kyc_verifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
    status: kycStatusEnum("status").default("pending").notNull(),

    // Document verification
    idDocumentUrl: text("id_document_url"), // Encrypted S3 URL
    idDocumentType: varchar("id_document_type", { length: 20 }), // national_id, passport
    extractedData: jsonb("extracted_data"), // OCR results
    ocrConfidence: decimal("ocr_confidence", { precision: 5, scale: 2 }),

    // Liveness detection
    livenessVideoUrl: text("liveness_video_url"),
    livenessScore: decimal("liveness_score", { precision: 5, scale: 2 }),
    livenessGestures: jsonb("liveness_gestures"), // ["turn_left", "smile", "blink"]
    livenessPassedAt: timestamp("liveness_passed_at", { withTimezone: true }),

    // Face comparison
    selfieUrl: text("selfie_url"),
    faceMatchConfidence: decimal("face_match_confidence", {
      precision: 5,
      scale: 2,
    }),
    faceMatchPassedAt: timestamp("face_match_passed_at", {
      withTimezone: true,
    }),

    // OTP verification
    phoneOtpSentAt: timestamp("phone_otp_sent_at", { withTimezone: true }),
    phoneOtpVerifiedAt: timestamp("phone_otp_verified_at", {
      withTimezone: true,
    }),
    phoneOtpAttempts: integer("phone_otp_attempts").default(0),

    // Email verification
    emailVerificationSentAt: timestamp("email_verification_sent_at", {
      withTimezone: true,
    }),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),

    // Guardian consent (for minors)
    requiresGuardianConsent: boolean("requires_guardian_consent").default(
      false,
    ),
    guardianKycId: uuid("guardian_kyc_id").references(
      (): any => kycVerifications.id,
    ),
    guardianRelationship: varchar("guardian_relationship", { length: 50 }),

    // Manual review
    flaggedForReview: boolean("flagged_for_review").default(false),
    reviewReason: text("review_reason"),
    reviewedBy: uuid("reviewed_by").references(() => staff.id),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewNotes: text("review_notes"),

    // Audit
    ipAddress: varchar("ip_address", { length: 45 }),
    deviceId: varchar("device_id", { length: 255 }),
    userAgent: text("user_agent"),

    completedAt: timestamp("completed_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }), // KYC valid for 1 year
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("kyc_verifications_patient_id_idx").on(t.patientId),
    index("kyc_verifications_status_idx").on(t.status),
  ],
);

// ============================================================================
// VIDEO CONSULTATIONS
// ============================================================================

export const videoConsultations = pgTable(
  "video_consultations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: varchar("session_id", { length: 100 }).unique().notNull(), // Agora channel name

    // Participants
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
    pharmacistId: uuid("pharmacist_id").references(() => staff.id),

    // Consultation details
    type: consultationTypeEnum("type").notNull(),
    status: consultationStatusEnum("status").default("requested").notNull(),
    chiefComplaint: text("chief_complaint"),
    symptoms: jsonb("symptoms"), // Structured symptom data

    // Scope validation
    scopeValidationResult: jsonb("scope_validation_result"),
    scopeValidatedAt: timestamp("scope_validated_at", { withTimezone: true }),
    scopeOverrideReason: text("scope_override_reason"),

    // E-consent
    consentVersion: varchar("consent_version", { length: 20 }),
    consentAcceptedAt: timestamp("consent_accepted_at", {
      withTimezone: true,
    }),
    consentIpAddress: varchar("consent_ip_address", { length: 45 }),
    consentDeviceId: varchar("consent_device_id", { length: 255 }),
    consentSignatureUrl: text("consent_signature_url"), // Digital signature image

    // Video session
    agoraToken: text("agora_token"), // Encrypted
    agoraUid: integer("agora_uid"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    durationSeconds: integer("duration_seconds"),

    // Recording
    recordingUrl: text("recording_url"), // MinIO URL
    recordingHash: varchar("recording_hash", { length: 64 }), // SHA-256 for non-repudiation
    recordingSizeMb: decimal("recording_size_mb", { precision: 10, scale: 2 }),

    // Transcript
    transcriptUrl: text("transcript_url"),
    transcriptParsedAt: timestamp("transcript_parsed_at", {
      withTimezone: true,
    }),
    structuredData: jsonb("structured_data"), // Extracted clinical info

    // Quality metrics
    avgBandwidthKbps: integer("avg_bandwidth_kbps"),
    avgResolution: varchar("avg_resolution", { length: 20 }), // "720p", "1080p"
    avgFrameRate: integer("avg_frame_rate"),
    connectionDrops: integer("connection_drops").default(0),

    // Outcome
    prescriptionId: uuid("prescription_id"),
    referralId: uuid("referral_id"),
    pharmacistNotes: text("pharmacist_notes"),
    followUpRequired: boolean("follow_up_required").default(false),
    followUpDate: timestamp("follow_up_date", { withTimezone: true }),

    // Audit
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("video_consultations_patient_id_idx").on(t.patientId),
    index("video_consultations_pharmacist_id_idx").on(t.pharmacistId),
    index("video_consultations_status_idx").on(t.status),
    index("video_consultations_started_at_idx").on(t.startedAt),
  ],
);

// ============================================================================
// E-CONSENT SYSTEM
// ============================================================================

export const consentTemplates = pgTable("consent_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  version: varchar("version", { length: 20 }).unique().notNull(), // Semantic versioning
  language: varchar("language", { length: 5 }).default("th").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(), // Markdown format
  clauses: jsonb("clauses").notNull(), // Array of consent clauses
  isActive: boolean("is_active").default(true).notNull(),
  effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull(),
  effectiveUntil: timestamp("effective_until", { withTimezone: true }),
  createdBy: uuid("created_by").references(() => staff.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const patientConsents = pgTable(
  "patient_consents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
    templateId: uuid("template_id")
      .notNull()
      .references(() => consentTemplates.id),
    consultationId: uuid("consultation_id").references(
      () => videoConsultations.id,
    ),

    // Consent acceptance
    accepted: boolean("accepted").notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    signatureUrl: text("signature_url"), // Digital signature image

    // Tracking
    scrolledToEnd: boolean("scrolled_to_end").default(false),
    timeSpentSeconds: integer("time_spent_seconds"),

    // Audit trail
    ipAddress: varchar("ip_address", { length: 45 }),
    deviceId: varchar("device_id", { length: 255 }),
    userAgent: text("user_agent"),
    geolocation: jsonb("geolocation"), // {lat, lng, accuracy}

    // Withdrawal
    withdrawnAt: timestamp("withdrawn_at", { withTimezone: true }),
    withdrawalReason: text("withdrawal_reason"),

    // PDF generation
    pdfUrl: text("pdf_url"), // Signed PDF for patient download
    pdfGeneratedAt: timestamp("pdf_generated_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("patient_consents_patient_id_idx").on(t.patientId),
    index("patient_consents_consultation_id_idx").on(t.consultationId),
  ],
);

// ============================================================================
// SCOPE VALIDATION ENGINE
// ============================================================================

export const scopeRules = pgTable("scope_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  ruleType: varchar("rule_type", { length: 50 }).notNull(), // symptom_check, medication_check, patient_type_check
  ruleName: varchar("rule_name", { length: 255 }).notNull(),
  condition: jsonb("condition").notNull(), // Rule condition in JSON format
  action: varchar("action", { length: 20 }).notNull(), // allow, reject, flag_review
  severity: varchar("severity", { length: 20 }), // low, medium, high, critical
  message: text("message"), // Message to display when rule triggers
  isActive: boolean("is_active").default(true).notNull(),
  priority: integer("priority").default(100), // Lower number = higher priority
  createdBy: uuid("created_by").references(() => staff.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const scopeValidationResults = pgTable("scope_validation_results", {
  id: uuid("id").primaryKey().defaultRandom(),
  consultationId: uuid("consultation_id")
    .notNull()
    .references(() => videoConsultations.id),
  overallResult: varchar("overall_result", { length: 20 }).notNull(), // passed, rejected, requires_review
  triggeredRules: jsonb("triggered_rules"), // Array of rule IDs and details
  patientType: varchar("patient_type", { length: 20 }), // new_patient, follow_up
  lastConsultationDate: timestamp("last_consultation_date", {
    withTimezone: true,
  }),
  hasBaselineData: boolean("has_baseline_data"),
  prohibitedSymptoms: jsonb("prohibited_symptoms"),
  requestedMedications: jsonb("requested_medications"),
  overrideBy: uuid("override_by").references(() => staff.id),
  overrideReason: text("override_reason"),
  overrideAt: timestamp("override_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ============================================================================
// EMERGENCY REFERRAL SYSTEM
// ============================================================================

export const emergencyReferrals = pgTable(
  "emergency_referrals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    consultationId: uuid("consultation_id")
      .notNull()
      .references(() => videoConsultations.id),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
    pharmacistId: uuid("pharmacist_id")
      .notNull()
      .references(() => staff.id),

    // Referral details
    reason: referralReasonEnum("reason").notNull(),
    urgencyLevel: varchar("urgency_level", { length: 20 }).notNull(), // immediate, urgent, routine
    clinicalSummary: text("clinical_summary").notNull(),
    symptoms: jsonb("symptoms"),
    vitalSigns: jsonb("vital_signs"),
    currentMedications: jsonb("current_medications"),
    pharmacistNotes: text("pharmacist_notes").notNull(),

    // Recommended hospitals
    recommendedHospitals: jsonb("recommended_hospitals"), // Array of hospital info
    nearestHospital: jsonb("nearest_hospital"),

    // Patient notification
    status: referralStatusEnum("status").default("created").notNull(),
    notifiedAt: timestamp("notified_at", { withTimezone: true }),
    notificationChannel: varchar("notification_channel", { length: 20 }), // line, sms, email
    acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
    followUpSentAt: timestamp("follow_up_sent_at", { withTimezone: true }),

    // Referral letter
    referralLetterUrl: text("referral_letter_url"), // PDF in MinIO
    referralLetterGeneratedAt: timestamp("referral_letter_generated_at", {
      withTimezone: true,
    }),

    // Follow-up
    patientWentToHospital: boolean("patient_went_to_hospital"),
    hospitalVisitDate: timestamp("hospital_visit_date", {
      withTimezone: true,
    }),
    hospitalFeedback: text("hospital_feedback"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("emergency_referrals_patient_id_idx").on(t.patientId),
    index("emergency_referrals_consultation_id_idx").on(t.consultationId),
    index("emergency_referrals_status_idx").on(t.status),
  ],
);

// ============================================================================
// MEDICAL-GRADE AUDIT TRAIL
// ============================================================================

export const telemedicineAuditLog = pgTable(
  "telemedicine_audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Hash chain for tamper detection
    previousHash: varchar("previous_hash", { length: 64 }).notNull(),
    currentHash: varchar("current_hash", { length: 64 }).notNull().unique(),

    // Event details
    timestamp: timestamp("timestamp", { withTimezone: true, precision: 3 })
      .notNull()
      .defaultNow(),
    actorId: uuid("actor_id").notNull(), // Patient or staff ID
    actorType: varchar("actor_type", { length: 20 }).notNull(), // patient, pharmacist, system
    actionType: varchar("action_type", { length: 50 }).notNull(),
    entityType: varchar("entity_type", { length: 50 }).notNull(),
    entityId: uuid("entity_id").notNull(),

    // Metadata
    metadata: jsonb("metadata"), // Encrypted sensitive data
    ipAddress: inet("ip_address"),
    userAgent: text("user_agent"),
    geolocation: jsonb("geolocation"),

    // Session tracking
    sessionId: varchar("session_id", { length: 100 }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("telemedicine_audit_log_timestamp_idx").on(t.timestamp),
    index("telemedicine_audit_log_actor_id_idx").on(t.actorId),
    index("telemedicine_audit_log_entity_idx").on(t.entityType, t.entityId),
    index("telemedicine_audit_log_action_type_idx").on(t.actionType),
  ],
);

// ============================================================================
// PHARMACIST LICENSE VERIFICATION
// ============================================================================

export const pharmacistLicenseVerifications = pgTable(
  "pharmacist_license_verifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pharmacistId: uuid("pharmacist_id")
      .notNull()
      .references(() => staff.id),

    // License details
    licenseNumber: varchar("license_number", { length: 50 }).notNull(),
    licenseType: varchar("license_type", { length: 50 }), // pharmacist, pharmacist_tech
    issueDate: timestamp("issue_date", { withTimezone: true }),
    expiryDate: timestamp("expiry_date", { withTimezone: true }).notNull(),

    // Verification
    verificationMethod: varchar("verification_method", { length: 50 }), // api, manual, document
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    verificationStatus: varchar("verification_status", { length: 20 })
      .default("pending")
      .notNull(), // pending, verified, expired, suspended
    apiResponse: jsonb("api_response"), // Thai Pharmacy Council API response

    // Manual verification
    documentUrl: text("document_url"), // License document upload
    reviewedBy: uuid("reviewed_by").references(() => staff.id),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewNotes: text("review_notes"),

    // Monitoring
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
    expiryReminderSentAt: timestamp("expiry_reminder_sent_at", {
      withTimezone: true,
    }),
    suspendedAt: timestamp("suspended_at", { withTimezone: true }),
    suspensionReason: text("suspension_reason"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("pharmacist_license_verifications_pharmacist_id_idx").on(
      t.pharmacistId,
    ),
    index("pharmacist_license_verifications_status_idx").on(
      t.verificationStatus,
    ),
    index("pharmacist_license_verifications_expiry_date_idx").on(t.expiryDate),
  ],
);
