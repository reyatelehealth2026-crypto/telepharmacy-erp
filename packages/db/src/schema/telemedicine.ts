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

// ============================================================================
// ส.พ. 16 COMPLIANCE DOCUMENTATION
// ============================================================================

export const authorizationStatusEnum = pgEnum("authorization_status", [
  "not_applied",
  "application_pending",
  "approved",
  "expired",
  "suspended",
  "renewal_pending",
]);

export const equipmentStatusEnum = pgEnum("equipment_status", [
  "active",
  "maintenance",
  "retired",
  "backup",
]);

export const complianceFacilities = pgTable("compliance_facilities", {
  id: uuid("id").primaryKey().defaultRandom(),
  facilityName: varchar("facility_name", { length: 255 }).notNull(),
  facilityType: varchar("facility_type", { length: 50 }).notNull(), // clinic, pharmacy, hospital

  // Physical location
  address: text("address").notNull(),
  province: varchar("province", { length: 100 }).notNull(),
  district: varchar("district", { length: 100 }).notNull(),
  subdistrict: varchar("subdistrict", { length: 100 }),
  postalCode: varchar("postal_code", { length: 10 }),

  // Consultation space details
  consultationRoomPhotos: jsonb("consultation_room_photos"), // Array of photo URLs
  roomDimensions: jsonb("room_dimensions"), // {length, width, height} in meters
  privacyMeasures: text("privacy_measures"), // Description of privacy setup
  lightingDescription: text("lighting_description"),
  soundproofingDescription: text("soundproofing_description"),

  // Contact information
  phoneNumber: varchar("phone_number", { length: 20 }),
  email: varchar("email", { length: 255 }),
  emergencyContact: varchar("emergency_contact", { length: 20 }),

  // Operating hours
  operatingHours: jsonb("operating_hours"), // {monday: "09:00-17:00", ...}
  telemedicineHours: jsonb("telemedicine_hours"),

  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const complianceEquipment = pgTable(
  "compliance_equipment",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    facilityId: uuid("facility_id")
      .notNull()
      .references(() => complianceFacilities.id),

    // Equipment details
    equipmentType: varchar("equipment_type", { length: 50 }).notNull(), // camera, microphone, monitor, computer, backup_power
    brand: varchar("brand", { length: 100 }),
    model: varchar("model", { length: 100 }),
    serialNumber: varchar("serial_number", { length: 100 }),

    // Specifications
    specifications: jsonb("specifications"), // Technical specs (resolution, bitrate, etc.)
    purchaseDate: timestamp("purchase_date", { withTimezone: true }),
    warrantyExpiry: timestamp("warranty_expiry", { withTimezone: true }),

    // Status and maintenance
    status: equipmentStatusEnum("status").default("active").notNull(),
    lastMaintenanceDate: timestamp("last_maintenance_date", {
      withTimezone: true,
    }),
    nextMaintenanceDate: timestamp("next_maintenance_date", {
      withTimezone: true,
    }),
    maintenanceNotes: text("maintenance_notes"),

    // Documentation
    photoUrl: text("photo_url"),
    invoiceUrl: text("invoice_url"),
    manualUrl: text("manual_url"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("compliance_equipment_facility_id_idx").on(t.facilityId),
    index("compliance_equipment_status_idx").on(t.status),
  ],
);

export const complianceStaffQualifications = pgTable(
  "compliance_staff_qualifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    staffId: uuid("staff_id")
      .notNull()
      .references(() => staff.id),
    facilityId: uuid("facility_id")
      .notNull()
      .references(() => complianceFacilities.id),

    // Professional qualifications
    licenseNumber: varchar("license_number", { length: 50 }).notNull(),
    licenseType: varchar("license_type", { length: 50 }).notNull(), // pharmacist, pharmacist_tech
    licenseIssueDate: timestamp("license_issue_date", { withTimezone: true }),
    licenseExpiryDate: timestamp("license_expiry_date", {
      withTimezone: true,
    }).notNull(),

    // Education
    degree: varchar("degree", { length: 100 }), // Bachelor, Master, PhD
    university: varchar("university", { length: 255 }),
    graduationYear: integer("graduation_year"),

    // Specializations
    specializations: jsonb("specializations"), // Array of specialization areas
    certifications: jsonb("certifications"), // Array of additional certifications

    // Telemedicine training
    telemedicineTrainingCompleted: boolean("telemedicine_training_completed")
      .default(false)
      .notNull(),
    trainingDate: timestamp("training_date", { withTimezone: true }),
    trainingCertificateUrl: text("training_certificate_url"),

    // Work schedule
    workSchedule: jsonb("work_schedule"), // Weekly schedule
    telemedicineShifts: jsonb("telemedicine_shifts"),

    // Documentation
    cvUrl: text("cv_url"),
    licenseDocumentUrl: text("license_document_url"),
    degreeDocumentUrl: text("degree_document_url"),

    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("compliance_staff_qualifications_staff_id_idx").on(t.staffId),
    index("compliance_staff_qualifications_facility_id_idx").on(t.facilityId),
  ],
);

export const sp16Authorizations = pgTable(
  "sp16_authorizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    facilityId: uuid("facility_id")
      .notNull()
      .references(() => complianceFacilities.id),

    // Authorization details
    authorizationNumber: varchar("authorization_number", {
      length: 100,
    }).unique(),
    status: authorizationStatusEnum("status")
      .default("not_applied")
      .notNull(),

    // Application tracking
    applicationDate: timestamp("application_date", { withTimezone: true }),
    applicationDocumentUrl: text("application_document_url"),
    submittedBy: uuid("submitted_by").references(() => staff.id),

    // Approval details
    approvalDate: timestamp("approval_date", { withTimezone: true }),
    approvalDocumentUrl: text("approval_document_url"), // ส.พ. 16 approval letter
    approvedBy: varchar("approved_by", { length: 255 }), // สบส. officer name
    approvalNotes: text("approval_notes"),

    // Validity period
    effectiveDate: timestamp("effective_date", { withTimezone: true }),
    expiryDate: timestamp("expiry_date", { withTimezone: true }),

    // Renewal tracking
    renewalReminderSentAt: timestamp("renewal_reminder_sent_at", {
      withTimezone: true,
    }),
    renewalApplicationDate: timestamp("renewal_application_date", {
      withTimezone: true,
    }),

    // Suspension/revocation
    suspendedAt: timestamp("suspended_at", { withTimezone: true }),
    suspensionReason: text("suspension_reason"),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    revocationReason: text("revocation_reason"),

    // Correspondence
    correspondenceLog: jsonb("correspondence_log"), // Array of communications with สบส.

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("sp16_authorizations_facility_id_idx").on(t.facilityId),
    index("sp16_authorizations_status_idx").on(t.status),
    index("sp16_authorizations_expiry_date_idx").on(t.expiryDate),
  ],
);

export const complianceSystemChanges = pgTable(
  "compliance_system_changes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    facilityId: uuid("facility_id")
      .notNull()
      .references(() => complianceFacilities.id),

    // Change details
    changeType: varchar("change_type", { length: 50 }).notNull(), // equipment, software, procedure, staff, facility
    changeCategory: varchar("change_category", { length: 50 }).notNull(), // major, minor
    changeDescription: text("change_description").notNull(),

    // Impact assessment
    requiresSp16Amendment: boolean("requires_sp16_amendment")
      .default(false)
      .notNull(),
    impactAssessment: text("impact_assessment"),
    riskLevel: varchar("risk_level", { length: 20 }), // low, medium, high

    // Implementation
    plannedDate: timestamp("planned_date", { withTimezone: true }),
    implementedDate: timestamp("implemented_date", { withTimezone: true }),
    implementedBy: uuid("implemented_by").references(() => staff.id),

    // Documentation
    changeDocumentUrl: text("change_document_url"),
    approvalDocumentUrl: text("approval_document_url"),
    testingResultsUrl: text("testing_results_url"),

    // Notification to สบส.
    notificationRequired: boolean("notification_required")
      .default(false)
      .notNull(),
    notifiedAt: timestamp("notified_at", { withTimezone: true }),
    notificationDocumentUrl: text("notification_document_url"),
    acknowledgmentReceived: boolean("acknowledgment_received").default(false),
    acknowledgmentDate: timestamp("acknowledgment_date", {
      withTimezone: true,
    }),

    // Audit trail
    reviewedBy: uuid("reviewed_by").references(() => staff.id),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewNotes: text("review_notes"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("compliance_system_changes_facility_id_idx").on(t.facilityId),
    index("compliance_system_changes_change_type_idx").on(t.changeType),
    index("compliance_system_changes_implemented_date_idx").on(
      t.implementedDate,
    ),
  ],
);

export const complianceTechnicalSpecs = pgTable("compliance_technical_specs", {
  id: uuid("id").primaryKey().defaultRandom(),
  facilityId: uuid("facility_id")
    .notNull()
    .references(() => complianceFacilities.id),

  // Video platform specifications
  platformName: varchar("platform_name", { length: 100 }).notNull(), // Agora.io
  platformVersion: varchar("platform_version", { length: 50 }),
  encryptionProtocol: varchar("encryption_protocol", { length: 50 }), // TLS 1.3, AES-256
  videoResolution: varchar("video_resolution", { length: 20 }), // 720p, 1080p
  videoFrameRate: integer("video_frame_rate"), // 30fps
  audioBitrate: integer("audio_bitrate"), // kbps
  videoBitrate: integer("video_bitrate"), // kbps

  // Recording capabilities
  recordingEnabled: boolean("recording_enabled").default(true).notNull(),
  recordingFormat: varchar("recording_format", { length: 20 }), // MP4, WebM
  recordingStorage: varchar("recording_storage", { length: 100 }), // MinIO Thailand
  recordingRetentionYears: integer("recording_retention_years").default(10),

  // Security measures
  dataEncryptionAtRest: varchar("data_encryption_at_rest", { length: 50 }), // AES-256
  dataEncryptionInTransit: varchar("data_encryption_in_transit", {
    length: 50,
  }), // TLS 1.3
  accessControlMethod: varchar("access_control_method", { length: 100 }), // JWT, MFA
  backupFrequency: varchar("backup_frequency", { length: 50 }), // daily, hourly
  backupLocation: varchar("backup_location", { length: 255 }), // Geographic location

  // Network requirements
  minimumBandwidthKbps: integer("minimum_bandwidth_kbps").default(500),
  recommendedBandwidthKbps: integer("recommended_bandwidth_kbps").default(
    2000,
  ),
  internetProvider: varchar("internet_provider", { length: 100 }),
  backupInternetProvider: varchar("backup_internet_provider", { length: 100 }),

  // Data residency
  dataCenter: varchar("data_center", { length: 255 }).notNull(), // Must be in Thailand
  dataCenterLocation: varchar("data_center_location", { length: 255 }), // Bangkok, Thailand
  dataResidencyCompliant: boolean("data_residency_compliant")
    .default(true)
    .notNull(),

  // Documentation
  technicalDocumentUrl: text("technical_document_url"),
  securityAuditUrl: text("security_audit_url"),
  complianceCertificateUrl: text("compliance_certificate_url"),

  // Monitoring
  uptimePercentage: decimal("uptime_percentage", { precision: 5, scale: 2 }), // 99.99%
  lastUptimeCheck: timestamp("last_uptime_check", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const complianceReports = pgTable(
  "compliance_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    facilityId: uuid("facility_id")
      .notNull()
      .references(() => complianceFacilities.id),

    // Report details
    reportType: varchar("report_type", { length: 50 }).notNull(), // quarterly, annual, self_assessment, incident
    reportPeriodStart: timestamp("report_period_start", {
      withTimezone: true,
    }).notNull(),
    reportPeriodEnd: timestamp("report_period_end", {
      withTimezone: true,
    }).notNull(),

    // Report content
    reportData: jsonb("report_data").notNull(), // Structured report data
    summary: text("summary"),
    findings: jsonb("findings"), // Array of findings/issues
    recommendations: jsonb("recommendations"),

    // Metrics
    totalConsultations: integer("total_consultations"),
    totalReferrals: integer("total_referrals"),
    referralRate: decimal("referral_rate", { precision: 5, scale: 2 }), // Percentage
    averageConsultationDuration: integer("average_consultation_duration"), // Seconds
    kycSuccessRate: decimal("kyc_success_rate", { precision: 5, scale: 2 }),
    consentAcceptanceRate: decimal("consent_acceptance_rate", {
      precision: 5,
      scale: 2,
    }),
    systemUptimePercentage: decimal("system_uptime_percentage", {
      precision: 5,
      scale: 2,
    }),

    // Generation and submission
    generatedAt: timestamp("generated_at", { withTimezone: true }).notNull(),
    generatedBy: uuid("generated_by").references(() => staff.id),
    reportFileUrl: text("report_file_url"), // PDF report

    // Submission to สบส.
    submittedToAuthority: boolean("submitted_to_authority").default(false),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    submissionMethod: varchar("submission_method", { length: 50 }), // email, portal, mail
    acknowledgmentReceived: boolean("acknowledgment_received").default(false),
    acknowledgmentDate: timestamp("acknowledgment_date", {
      withTimezone: true,
    }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("compliance_reports_facility_id_idx").on(t.facilityId),
    index("compliance_reports_report_type_idx").on(t.reportType),
    index("compliance_reports_report_period_idx").on(
      t.reportPeriodStart,
      t.reportPeriodEnd,
    ),
  ],
);
