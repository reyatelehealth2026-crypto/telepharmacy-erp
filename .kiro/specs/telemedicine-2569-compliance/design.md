# Design Document: Telemedicine 2569 Legal Compliance

## Overview

This design document specifies the technical architecture and implementation approach for achieving full Telemedicine 2569 legal compliance in the LINE Telepharmacy ERP system. The feature addresses critical regulatory gaps identified during legal analysis against Thai Ministry of Public Health standards, Medical Council Announcement 012/2563, and PDPA requirements.

### Business Context

The current system provides basic authentication, patient registration, chat consultation, and audit logs but lacks essential components required for legal telemedicine operations. This implementation is CRITICAL for public launch to:

- Protect pharmacists from malpractice liability
- Ensure patient safety through proper identity verification and scope validation
- Achieve regulatory compliance with Thai FDA (สบส.) standards
- Enable court-admissible evidence collection for legal defense

### Design Goals

1. **Modular Architecture**: Enable phased implementation with clear component boundaries
2. **Regulatory Compliance**: Meet all Thai telemedicine legal requirements
3. **Scalability**: Support 10+ concurrent video consultations with room for growth
4. **Maintainability**: Clear separation of concerns with comprehensive documentation
5. **Testability**: Property-based testing for critical compliance components
6. **Data Residency**: All sensitive data stored within Thailand borders

### Key Constraints

- Must integrate with existing LINE LIFF app (apps/shop)
- Must use Thailand-based data centers for all sensitive data
- Must support Thai language throughout (UI, consent forms, transcripts)
- Must work on mobile devices (iOS/Android via LINE)
- Must retain records for 10 years minimum
- Must generate court-admissible evidence

## Architecture

### High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          LINE Platform Layer                             │
│  ┌──────────────┐         ┌──────────────┐        ┌──────────────┐     │
│  │  LINE LIFF   │────────▶│  LINE Bot    │───────▶│ LINE Notify  │     │
│  │  (Shop App)  │         │   Webhook    │        │              │     │
│  └──────────────┘         └──────────────┘        └──────────────┘     │
└─────────────────────────────────────────────────────────────────────────┘
         │                          │                        │
         ▼                          ▼                        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        NestJS API Layer (apps/api)                       │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    Telemedicine Module                            │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐            │  │
│  │  │ KYC Service │  │ Video Call  │  │  E-Consent   │            │  │
│  │  │             │  │  Service    │  │   Service    │            │  │
│  │  └─────────────┘  └─────────────┘  └──────────────┘            │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐            │  │
│  │  │   Scope     │  │  Referral   │  │   License    │            │  │
│  │  │  Validator  │  │   Service   │  │   Verifier   │            │  │
│  │  └─────────────┘  └─────────────┘  └──────────────┘            │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐            │  │
│  │  │   Audit     │  │ Compliance  │  │  Recording   │            │  │
│  │  │   Trail     │  │  Monitor    │  │   Parser     │            │  │
│  │  └─────────────┘  └─────────────┘  └──────────────┘            │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
         │                          │                        │
         ▼                          ▼                        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      External Services Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │ Face Verify  │  │ Video        │  │  SMS/OTP     │  │  Speech    │ │
│  │ (AWS Rekog)  │  │ (Agora.io)   │  │ (ThaiSMS)    │  │  (Gemini)  │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
         │                          │                        │
         ▼                          ▼                        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        Data Storage Layer                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │ PostgreSQL   │  │    Redis     │  │    MinIO     │  │   Append   │ │
│  │ (Patient/Rx) │  │  (Sessions)  │  │  (Videos)    │  │  Only Logs │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘ │
│         All data stored in Thailand data centers (Data Residency)       │
└─────────────────────────────────────────────────────────────────────────┘
```

### Component Interaction Flow

```
Patient Journey: Registration → KYC → Consultation Request → Video Call → Documentation

1. Enhanced KYC Flow:
   Patient → Upload ID → OCR Extract → Liveness Check → Face Compare → OTP Verify → Verified

2. Video Consultation Flow:
   Request → Scope Validate → E-Consent → Video Session → Recording → Transcript → Archive

3. Emergency Referral Flow:
   Pharmacist Trigger → Referral Form → LINE Notify → Hospital List → PDF Letter → Audit Log

4. Audit Trail Flow:
   Every Action → Hash Chain → Append-Only Log → Encrypted Storage → 10-Year Retention
```

### Technology Stack Decisions

Based on requirements analysis and Thai regulatory environment, the following technology choices are recommended:

#### 1. Face Verification Service
**Decision: AWS Rekognition (Thailand Region)**

Justification:
- AWS has Bangkok region (ap-southeast-1) for data residency compliance
- Proven accuracy (>95%) for Thai faces in production environments
- Liveness detection built-in (prevents photo spoofing)
- Face comparison API with confidence scores
- HIPAA/SOC2 compliant infrastructure
- Cost-effective at scale (~$0.001 per image)

Alternative considered: Jumio (rejected due to higher cost and no Thailand region)

#### 2. Video Consultation Platform
**Decision: Agora.io (Thailand Edge Servers)**

Justification:
- Edge servers in Thailand for low latency (<100ms)
- Medical-grade encryption (TLS 1.3 + AES-256)
- Cloud recording with Thailand storage option
- Supports 10+ concurrent sessions easily
- Watermarking and screenshot prevention APIs
- Network quality monitoring built-in
- Thai customer support
- Cost: ~$1.99 per 1000 minutes

Alternatives considered:
- Twilio Video: No Thailand edge servers (higher latency)
- Daily.co: Limited Thai language support
- Self-hosted Jitsi: High maintenance overhead, no SLA

#### 3. SMS/OTP Provider
**Decision: ThaiSMS.com**

Justification:
- Local Thai SMS gateway (best delivery rates)
- OTP template pre-approved by carriers
- 99.9% delivery rate for Thai numbers
- Cost: ~0.25 THB per SMS
- Thai language support team

#### 4. Email Service
**Decision: AWS SES (Bangkok Region)**

Justification:
- Data residency in Thailand
- High deliverability (>98%)
- Cost-effective (~$0.10 per 1000 emails)
- Integrates with existing AWS infrastructure

#### 5. Audit Log Storage
**Decision: Separate PostgreSQL instance with append-only table**

Justification:
- Simpler than TimescaleDB for this use case
- Append-only constraint enforced at database level
- Blockchain-inspired hash chaining for tamper detection
- Can replicate to separate geographic location
- Familiar technology for team

Schema design:
```sql
CREATE TABLE telemedicine_audit_log (
  id UUID PRIMARY KEY,
  previous_hash VARCHAR(64) NOT NULL,
  current_hash VARCHAR(64) NOT NULL UNIQUE,
  timestamp TIMESTAMPTZ NOT NULL,
  actor_id UUID NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  metadata JSONB,
  ip_address INET,
  user_agent TEXT
) WITH (fillfactor=100); -- Optimize for append-only

-- Prevent updates and deletes
CREATE RULE no_update AS ON UPDATE TO telemedicine_audit_log DO INSTEAD NOTHING;
CREATE RULE no_delete AS ON DELETE TO telemedicine_audit_log DO INSTEAD NOTHING;
```

#### 6. Video Storage
**Decision: MinIO (Self-hosted in Thailand)**

Justification:
- Already in tech stack
- Full control over data residency
- S3-compatible API (easy migration if needed)
- Cost-effective for large video files
- Can configure immutable buckets for compliance

Configuration:
```yaml
# MinIO bucket policy for telemedicine videos
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {"AWS": ["arn:aws:iam::*:user/telemedicine-service"]},
      "Action": ["s3:PutObject"],
      "Resource": ["arn:aws:s3:::telemedicine-recordings/*"]
    },
    {
      "Effect": "Deny",
      "Principal": "*",
      "Action": ["s3:DeleteObject"],
      "Resource": ["arn:aws:s3:::telemedicine-recordings/*"]
    }
  ]
}
```

#### 7. Speech-to-Text
**Decision: Google Gemini 2.5 Pro (already in stack)**

Justification:
- Already integrated for chatbot and OCR
- Excellent Thai language support
- Can extract structured data from conversations
- Cost-effective with existing API quota
- Multimodal capabilities for future enhancements

Alternative: Google Cloud Speech-to-Text (more expensive, less flexible)

#### 8. Document Signing
**Decision: PDFKit + node-forge for digital signatures**

Justification:
- Open-source, no vendor lock-in
- Can generate PDF/A for long-term archival
- Digital signature with timestamp
- Embeddable in existing Node.js stack



## Components and Interfaces

### 1. KYC & Identity Verification Module

#### Database Schema (Drizzle ORM)

```typescript
// packages/db/src/schema/telemedicine.ts

import { pgTable, uuid, varchar, text, boolean, decimal, timestamp, jsonb, index, pgEnum } from "drizzle-orm/pg-core";
import { patients } from "./patients";
import { staff } from "./staff";

export const kycStatusEnum = pgEnum("kyc_status", [
  "pending",
  "documents_uploaded",
  "liveness_passed",
  "face_verified",
  "otp_verified",
  "email_verified",
  "completed",
  "failed",
  "manual_review"
]);

export const kycVerifications = pgTable("kyc_verifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: uuid("patient_id").notNull().references(() => patients.id),
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
  faceMatchConfidence: decimal("face_match_confidence", { precision: 5, scale: 2 }),
  faceMatchPassedAt: timestamp("face_match_passed_at", { withTimezone: true }),
  
  // OTP verification
  phoneOtpSentAt: timestamp("phone_otp_sent_at", { withTimezone: true }),
  phoneOtpVerifiedAt: timestamp("phone_otp_verified_at", { withTimezone: true }),
  phoneOtpAttempts: integer("phone_otp_attempts").default(0),
  
  // Email verification
  emailVerificationSentAt: timestamp("email_verification_sent_at", { withTimezone: true }),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  
  // Guardian consent (for minors)
  requiresGuardianConsent: boolean("requires_guardian_consent").default(false),
  guardianKycId: uuid("guardian_kyc_id").references(() => kycVerifications.id),
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
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("kyc_verifications_patient_id_idx").on(t.patientId),
  index("kyc_verifications_status_idx").on(t.status),
]);
```

#### API Endpoints

```typescript
// apps/api/src/modules/telemedicine/kyc/kyc.controller.ts

@Controller('v1/telemedicine/kyc')
@UseGuards(JwtAuthGuard)
export class KycController {
  
  // Step 1: Upload ID document
  @Post('upload-document')
  @UseInterceptors(FileInterceptor('document'))
  async uploadDocument(
    @CurrentUser() user: RequestUser,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadDocumentDto
  ): Promise<{ verificationId: string; extractedData: any }> {
    // 1. Encrypt and upload to MinIO
    // 2. Run OCR extraction (Gemini)
    // 3. Validate Thai ID checksum (MOD 11)
    // 4. Create/update KYC verification record
    // 5. Return extracted data for user confirmation
  }
  
  // Step 2: Liveness detection
  @Post('liveness-check')
  @UseInterceptors(FileInterceptor('video'))
  async livenessCheck(
    @CurrentUser() user: RequestUser,
    @Param('verificationId') verificationId: string,
    @UploadedFile() video: Express.Multer.File
  ): Promise<{ passed: boolean; score: number; nextStep: string }> {
    // 1. Upload video to MinIO
    // 2. Call AWS Rekognition DetectFaces with liveness check
    // 3. Validate random gestures performed
    // 4. Update KYC record
  }
  
  // Step 3: Face comparison
  @Post('face-compare')
  @UseInterceptors(FileInterceptor('selfie'))
  async faceCompare(
    @CurrentUser() user: RequestUser,
    @Param('verificationId') verificationId: string,
    @UploadedFile() selfie: Express.Multer.File
  ): Promise<{ matched: boolean; confidence: number; requiresReview: boolean }> {
    // 1. Upload selfie to MinIO
    // 2. Call AWS Rekognition CompareFaces
    // 3. If confidence < 90%, flag for manual review
    // 4. Update KYC record
  }
  
  // Step 4: Send OTP
  @Post('send-otp')
  async sendOtp(
    @CurrentUser() user: RequestUser,
    @Param('verificationId') verificationId: string
  ): Promise<{ sent: boolean; expiresIn: number }> {
    // 1. Generate 6-digit OTP
    // 2. Store in Redis with 5-minute expiry
    // 3. Send via ThaiSMS
    // 4. Update KYC record
  }
  
  // Step 5: Verify OTP
  @Post('verify-otp')
  async verifyOtp(
    @CurrentUser() user: RequestUser,
    @Param('verificationId') verificationId: string,
    @Body() dto: VerifyOtpDto
  ): Promise<{ verified: boolean; kycCompleted: boolean }> {
    // 1. Check OTP from Redis
    // 2. Validate attempts (max 3)
    // 3. Update KYC record
    // 4. Send email verification link
  }
  
  // Step 6: Verify email (via link click)
  @Get('verify-email/:token')
  async verifyEmail(
    @Param('token') token: string
  ): Promise<{ verified: boolean; redirectUrl: string }> {
    // 1. Validate JWT token (24-hour expiry)
    // 2. Update KYC record
    // 3. Mark patient as telemedicine-enabled
    // 4. Redirect to LIFF app
  }
  
  // Get KYC status
  @Get('status')
  async getStatus(
    @CurrentUser() user: RequestUser
  ): Promise<KycStatusDto> {
    // Return current KYC verification status and next steps
  }
  
  // Manual review (pharmacist/admin only)
  @Post(':verificationId/review')
  @Roles('pharmacist', 'super_admin')
  async manualReview(
    @CurrentUser() user: RequestUser,
    @Param('verificationId') verificationId: string,
    @Body() dto: ManualReviewDto
  ): Promise<{ approved: boolean }> {
    // Pharmacist reviews flagged KYC and approves/rejects
  }
}
```

#### Service Layer

```typescript
// apps/api/src/modules/telemedicine/kyc/kyc.service.ts

@Injectable()
export class KycService {
  constructor(
    @Inject(DRIZZLE) private db: any,
    private readonly awsRekognitionService: AwsRekognitionService,
    private readonly geminiService: GeminiService,
    private readonly smsService: SmsService,
    private readonly emailService: EmailService,
    private readonly minioService: MinioService,
    private readonly auditService: TelemedicineAuditService,
  ) {}
  
  async extractIdData(imageBuffer: Buffer): Promise<ExtractedIdData> {
    // Use Gemini Vision API to extract:
    // - National ID number
    // - Name (Thai + English)
    // - Date of birth
    // - Address
    // - Issue/expiry dates
    
    const prompt = `Extract structured data from this Thai national ID card image.
    Return JSON with fields: nationalId, thaiName, englishName, dateOfBirth, address, issueDate, expiryDate`;
    
    const result = await this.geminiService.analyzeImage(imageBuffer, prompt);
    
    // Validate Thai ID checksum
    if (!this.validateThaiIdChecksum(result.nationalId)) {
      throw new BadRequestException('Invalid Thai national ID checksum');
    }
    
    return result;
  }
  
  private validateThaiIdChecksum(idNumber: string): boolean {
    // MOD 11 algorithm for Thai national ID
    if (!/^\d{13}$/.test(idNumber)) return false;
    
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(idNumber[i]) * (13 - i);
    }
    const checkDigit = (11 - (sum % 11)) % 10;
    return checkDigit === parseInt(idNumber[12]);
  }
  
  async performLivenessCheck(videoBuffer: Buffer, requiredGestures: string[]): Promise<LivenessResult> {
    // Call AWS Rekognition with video
    // Verify gestures were performed in correct order
    // Return liveness score
  }
  
  async compareFaces(sourceImage: Buffer, targetImage: Buffer): Promise<FaceComparisonResult> {
    // Call AWS Rekognition CompareFaces
    // Return confidence score and similarity
  }
  
  async sendOtp(phoneNumber: string, verificationId: string): Promise<void> {
    const otp = this.generateOtp();
    await this.redis.setex(`kyc:otp:${verificationId}`, 300, otp); // 5 min expiry
    
    await this.smsService.send({
      to: phoneNumber,
      message: `รหัส OTP สำหรับยืนยันตัวตน: ${otp}\nใช้ได้ภายใน 5 นาที\n- LINE Telepharmacy`
    });
  }
  
  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}
```

### 2. Video Consultation Module

#### Database Schema

```typescript
// packages/db/src/schema/telemedicine.ts (continued)

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
  "expired"
]);

export const consultationTypeEnum = pgEnum("consultation_type", [
  "follow_up_chronic",
  "medication_refill",
  "minor_ailment",
  "general_health",
  "medication_review"
]);

export const videoConsultations = pgTable("video_consultations", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: varchar("session_id", { length: 100 }).unique().notNull(), // Agora channel name
  
  // Participants
  patientId: uuid("patient_id").notNull().references(() => patients.id),
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
  consentAcceptedAt: timestamp("consent_accepted_at", { withTimezone: true }),
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
  transcriptParsedAt: timestamp("transcript_parsed_at", { withTimezone: true }),
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
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("video_consultations_patient_id_idx").on(t.patientId),
  index("video_consultations_pharmacist_id_idx").on(t.pharmacistId),
  index("video_consultations_status_idx").on(t.status),
  index("video_consultations_started_at_idx").on(t.startedAt),
]);
```

#### API Endpoints

```typescript
// apps/api/src/modules/telemedicine/consultation/consultation.controller.ts

@Controller('v1/telemedicine/consultations')
@UseGuards(JwtAuthGuard)
export class ConsultationController {
  
  // Patient requests consultation
  @Post('request')
  async requestConsultation(
    @CurrentUser() user: RequestUser,
    @Body() dto: RequestConsultationDto
  ): Promise<ConsultationResponseDto> {
    // 1. Validate patient has completed KYC
    // 2. Run scope validation
    // 3. If passed, create consultation record
    // 4. Return consent form
  }
  
  // Patient accepts e-consent
  @Post(':consultationId/accept-consent')
  async acceptConsent(
    @CurrentUser() user: RequestUser,
    @Param('consultationId') consultationId: string,
    @Body() dto: AcceptConsentDto
  ): Promise<{ accepted: boolean; nextStep: string }> {
    // 1. Record consent acceptance with signature
    // 2. Notify available pharmacists
    // 3. Update consultation status
  }
  
  // Pharmacist accepts consultation
  @Post(':consultationId/accept')
  @Roles('pharmacist')
  async acceptConsultation(
    @CurrentUser() user: RequestUser,
    @Param('consultationId') consultationId: string
  ): Promise<{ agoraToken: string; channelName: string }> {
    // 1. Assign pharmacist to consultation
    // 2. Generate Agora token
    // 3. Start recording
    // 4. Return video call credentials
  }
  
  // Start video session
  @Post(':consultationId/start')
  async startSession(
    @CurrentUser() user: RequestUser,
    @Param('consultationId') consultationId: string
  ): Promise<{ sessionStarted: boolean }> {
    // 1. Mark session as started
    // 2. Begin recording
    // 3. Start quality monitoring
  }
  
  // End video session
  @Post(':consultationId/end')
  async endSession(
    @CurrentUser() user: RequestUser,
    @Param('consultationId') consultationId: string,
    @Body() dto: EndSessionDto
  ): Promise<{ sessionEnded: boolean; recordingUrl: string }> {
    // 1. Stop recording
    // 2. Calculate duration
    // 3. Generate SHA-256 hash
    // 4. Queue transcript parsing job
    // 5. Update consultation record
  }
  
  // Get consultation details
  @Get(':consultationId')
  async getConsultation(
    @CurrentUser() user: RequestUser,
    @Param('consultationId') consultationId: string
  ): Promise<ConsultationDetailDto> {
    // Return full consultation details with recording/transcript
  }
  
  // List consultations
  @Get()
  async listConsultations(
    @CurrentUser() user: RequestUser,
    @Query() query: ListConsultationsDto
  ): Promise<PaginatedResponse<ConsultationSummaryDto>> {
    // List consultations with filters (status, date range, etc.)
  }
}
```

#### Agora Integration Service

```typescript
// apps/api/src/modules/telemedicine/video/agora.service.ts

@Injectable()
export class AgoraService {
  private readonly appId: string;
  private readonly appCertificate: string;
  
  constructor(private readonly config: ConfigService) {
    this.appId = config.getOrThrow('agora.appId');
    this.appCertificate = config.getOrThrow('agora.appCertificate');
  }
  
  generateToken(channelName: string, uid: number, role: 'publisher' | 'subscriber'): string {
    // Generate Agora RTC token with 24-hour expiry
    const expirationTimeInSeconds = 86400;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;
    
    return RtcTokenBuilder.buildTokenWithUid(
      this.appId,
      this.appCertificate,
      channelName,
      uid,
      role === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER,
      privilegeExpiredTs
    );
  }
  
  async startCloudRecording(channelName: string, uid: number): Promise<string> {
    // Start Agora cloud recording
    // Configure to save to MinIO via webhook
    const response = await axios.post(
      `https://api.agora.io/v1/apps/${this.appId}/cloud_recording/resourceid/${resourceId}/mode/mix/start`,
      {
        cname: channelName,
        uid: uid.toString(),
        clientRequest: {
          recordingConfig: {
            channelType: 1, // Live broadcast
            streamTypes: 2, // Audio + Video
            maxIdleTime: 120,
            transcodingConfig: {
              width: 1280,
              height: 720,
              fps: 30,
              bitrate: 2000,
            }
          },
          storageConfig: {
            vendor: 0, // Custom storage (MinIO)
            region: 0,
            bucket: 'telemedicine-recordings',
            accessKey: this.config.get('minio.accessKey'),
            secretKey: this.config.get('minio.secretKey'),
            endpoint: this.config.get('minio.endpoint'),
          }
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${Buffer.from(`${this.appId}:${this.appCertificate}`).toString('base64')}`
        }
      }
    );
    
    return response.data.sid; // Recording session ID
  }
  
  async stopCloudRecording(resourceId: string, sid: string): Promise<RecordingInfo> {
    // Stop recording and get file info
  }
}
```

### 3. E-Consent Module

#### Database Schema

```typescript
// packages/db/src/schema/telemedicine.ts (continued)

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
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const patientConsents = pgTable("patient_consents", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: uuid("patient_id").notNull().references(() => patients.id),
  templateId: uuid("template_id").notNull().references(() => consentTemplates.id),
  consultationId: uuid("consultation_id").references(() => videoConsultations.id),
  
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
  
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("patient_consents_patient_id_idx").on(t.patientId),
  index("patient_consents_consultation_id_idx").on(t.consultationId),
]);
```

#### Consent Template Example

```markdown
# ข้อตกลงและยินยอมการรับบริการเภสัชกรรมทางไกล

## 1. ข้อจำกัดของเทคโนโลยี

ข้าพเจ้าเข้าใจและยอมรับว่า การรับบริการเภสัชกรรมทางไกล (Telepharmacy) มีข้อจำกัดทางเทคโนโลยีดังนี้:

- เภสัชกรไม่สามารถตรวจร่างกายโดยตรงได้
- คุณภาพของภาพและเสียงขึ้นอยู่กับสัญญาณอินเทอร์เน็ต
- อาจมีความล่าช้าในการสื่อสาร
- ไม่สามารถทำการตรวจทางห้องปฏิบัติการได้

ข้อจำกัดเหล่านี้อาจส่งผลต่อความแม่นยำในการประเมินอาการและการให้คำแนะนำ

## 2. ขอบเขตการให้บริการ

ข้าพเจ้าเข้าใจว่าบริการเภสัชกรรมทางไกลเหมาะสำหรับ:
- การติดตามอาการโรคเรื้อรังที่มีประวัติการรักษาแล้ว
- การขอยาประจำตัวเดิม
- การปรึกษาเรื่องยาและการใช้ยา
- อาการเจ็บป่วยเล็กน้อยที่ไม่ซับซ้อน

และ **ไม่เหมาะสำหรับ**:
- อาการเฉียบพลันรุนแรง (ปวดท้องมาก เจ็บหน้าอก หอบเหนื่อย)
- ผู้ป่วยใหม่ที่ไม่มีประวัติการรักษา
- การขอยาเสพติดให้โทษหรือยาควบคุมพิเศษ
- กรณีที่ต้องตรวจร่างกายหรือตรวจทางห้องปฏิบัติการ

## 3. หน้าที่ในการปฏิบัติตามคำแนะนำ

ข้าพเจ้ายินยอมที่จะ:
- ให้ข้อมูลที่ถูกต้องและครบถ้วนแก่เภสัชกร
- ปฏิบัติตามคำแนะนำของเภสัชกรอย่างเคร่งครัด
- **ไปพบแพทย์หรือไปโรงพยาบาลทันที** หากเภสัชกรแนะนำให้ส่งต่อ

ข้าพเจ้าเข้าใจว่า หากข้าพเจ้าเพิกเฉยต่อคำแนะนำให้ไปโรงพยาบาล ข้าพเจ้ายินดีรับผิดชอบผลลัพธ์ทางสุขภาพที่เกิดขึ้นด้วยตนเอง

## 4. ความเป็นส่วนตัวและการบันทึกข้อมูล

ข้าพเจ้ายินยอมให้:
- บันทึกภาพและเสียงการให้คำปรึกษาทั้งหมด
- เก็บรักษาข้อมูลไว้เป็นเวลาอย่างน้อย 10 ปี ตามกฎหมาย
- ใช้ข้อมูลเพื่อการรักษา การตรวจสอบคุณภาพ และการป้องกันข้อพิพาททางกฎหมาย

ข้อมูลทั้งหมดจะถูกเก็บรักษาอย่างปลอดภัยและเป็นความลับตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562

## 5. การยกเลิกความยินยอม

ข้าพเจ้าสามารถถอนความยินยอมนี้ได้ตลอดเวลา โดยการแจ้งเป็นลายลักษณ์อักษร ทั้งนี้ การถอนความยินยอมจะมีผลตั้งแต่วันที่แจ้ง และจะไม่ส่งผลย้อนหลังต่อการให้บริการที่ได้รับไปแล้ว

---

**ข้าพเจ้าได้อ่านและเข้าใจข้อตกลงทั้งหมดแล้ว และยินยอมรับบริการเภสัชกรรมทางไกลด้วยความสมัครใจ**

ลงชื่อ: _________________ (ลายเซ็นดิจิทัล)
วันที่: _________________
```



### 4. Consultation Scope Validation Engine

#### Database Schema

```typescript
// packages/db/src/schema/telemedicine.ts (continued)

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
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const scopeValidationResults = pgTable("scope_validation_results", {
  id: uuid("id").primaryKey().defaultRandom(),
  consultationId: uuid("consultation_id").notNull().references(() => videoConsultations.id),
  overallResult: varchar("overall_result", { length: 20 }).notNull(), // passed, rejected, requires_review
  triggeredRules: jsonb("triggered_rules"), // Array of rule IDs and details
  patientType: varchar("patient_type", { length: 20 }), // new_patient, follow_up
  lastConsultationDate: timestamp("last_consultation_date", { withTimezone: true }),
  hasBaselineData: boolean("has_baseline_data"),
  prohibitedSymptoms: jsonb("prohibited_symptoms"),
  requestedMedications: jsonb("requested_medications"),
  overrideBy: uuid("override_by").references(() => staff.id),
  overrideReason: text("override_reason"),
  overrideAt: timestamp("override_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```

#### Scope Validation Service

```typescript
// apps/api/src/modules/telemedicine/scope/scope-validator.service.ts

@Injectable()
export class ScopeValidatorService {
  constructor(
    @Inject(DRIZZLE) private db: any,
    private readonly auditService: TelemedicineAuditService,
  ) {}
  
  async validateConsultationScope(
    patientId: string,
    consultationRequest: ConsultationRequestDto
  ): Promise<ScopeValidationResult> {
    const rules = await this.loadActiveRules();
    const patientHistory = await this.getPatientHistory(patientId);
    
    const context = {
      patient: patientHistory,
      symptoms: consultationRequest.symptoms,
      requestedMedications: consultationRequest.medications,
      consultationType: consultationRequest.type,
    };
    
    const triggeredRules: TriggeredRule[] = [];
    let overallResult: 'passed' | 'rejected' | 'requires_review' = 'passed';
    
    // Execute rules in priority order
    for (const rule of rules.sort((a, b) => a.priority - b.priority)) {
      const ruleResult = await this.evaluateRule(rule, context);
      
      if (ruleResult.triggered) {
        triggeredRules.push({
          ruleId: rule.id,
          ruleName: rule.ruleName,
          action: rule.action,
          severity: rule.severity,
          message: rule.message,
        });
        
        // Update overall result based on most restrictive action
        if (rule.action === 'reject' && overallResult !== 'rejected') {
          overallResult = 'rejected';
        } else if (rule.action === 'flag_review' && overallResult === 'passed') {
          overallResult = 'requires_review';
        }
      }
    }
    
    // Save validation result
    const [validationResult] = await this.db.insert(scopeValidationResults).values({
      consultationId: consultationRequest.consultationId,
      overallResult,
      triggeredRules,
      patientType: patientHistory.isNewPatient ? 'new_patient' : 'follow_up',
      lastConsultationDate: patientHistory.lastConsultationDate,
      hasBaselineData: patientHistory.hasBaselineData,
      prohibitedSymptoms: this.extractProhibitedSymptoms(triggeredRules),
      requestedMedications: consultationRequest.medications,
    }).returning();
    
    await this.auditService.log({
      action: 'scope_validation',
      entityType: 'consultation',
      entityId: consultationRequest.consultationId,
      metadata: { result: overallResult, triggeredRules },
    });
    
    return {
      passed: overallResult === 'passed',
      result: overallResult,
      triggeredRules,
      canProceed: overallResult !== 'rejected',
      requiresPharmacistReview: overallResult === 'requires_review',
    };
  }
  
  private async evaluateRule(rule: ScopeRule, context: ValidationContext): Promise<RuleEvaluationResult> {
    // Rule evaluation engine
    switch (rule.ruleType) {
      case 'symptom_check':
        return this.evaluateSymptomRule(rule, context);
      case 'medication_check':
        return this.evaluateMedicationRule(rule, context);
      case 'patient_type_check':
        return this.evaluatePatientTypeRule(rule, context);
      case 'baseline_data_check':
        return this.evaluateBaselineDataRule(rule, context);
      case 'time_since_last_visit':
        return this.evaluateTimeSinceLastVisitRule(rule, context);
      default:
        return { triggered: false };
    }
  }
  
  private evaluateSymptomRule(rule: ScopeRule, context: ValidationContext): RuleEvaluationResult {
    // Check for prohibited symptoms
    const prohibitedSymptoms = rule.condition.prohibitedSymptoms || [];
    const patientSymptoms = context.symptoms || [];
    
    const matchedSymptoms = patientSymptoms.filter(symptom =>
      prohibitedSymptoms.some(prohibited =>
        symptom.toLowerCase().includes(prohibited.toLowerCase())
      )
    );
    
    return {
      triggered: matchedSymptoms.length > 0,
      details: { matchedSymptoms },
    };
  }
  
  private evaluateMedicationRule(rule: ScopeRule, context: ValidationContext): RuleEvaluationResult {
    // Check for controlled substances
    const controlledSubstances = rule.condition.controlledSubstances || [];
    const requestedMeds = context.requestedMedications || [];
    
    const matchedMeds = requestedMeds.filter(med =>
      controlledSubstances.some(controlled =>
        med.drugName.toLowerCase().includes(controlled.toLowerCase())
      )
    );
    
    return {
      triggered: matchedMeds.length > 0,
      details: { matchedMedications: matchedMeds },
    };
  }
  
  private evaluatePatientTypeRule(rule: ScopeRule, context: ValidationContext): RuleEvaluationResult {
    // New patient with acute condition = reject
    if (rule.condition.rejectNewPatientWithAcute) {
      const isNewPatient = context.patient.isNewPatient;
      const hasAcuteSymptoms = this.hasAcuteSymptoms(context.symptoms);
      
      return {
        triggered: isNewPatient && hasAcuteSymptoms,
        details: { isNewPatient, hasAcuteSymptoms },
      };
    }
    
    return { triggered: false };
  }
  
  private evaluateBaselineDataRule(rule: ScopeRule, context: ValidationContext): RuleEvaluationResult {
    // Check if patient has required baseline data for chronic condition
    if (context.consultationType === 'follow_up_chronic') {
      const hasBaselineData = context.patient.hasBaselineData;
      const baselineDataAge = context.patient.baselineDataAge; // in months
      
      const isOutdated = baselineDataAge > (rule.condition.maxBaselineAgeMonths || 12);
      
      return {
        triggered: !hasBaselineData || isOutdated,
        details: { hasBaselineData, baselineDataAge, isOutdated },
      };
    }
    
    return { triggered: false };
  }
  
  private evaluateTimeSinceLastVisitRule(rule: ScopeRule, context: ValidationContext): RuleEvaluationResult {
    // Check if last consultation was within acceptable timeframe
    const lastVisit = context.patient.lastConsultationDate;
    if (!lastVisit) {
      return { triggered: true, details: { reason: 'no_previous_visit' } };
    }
    
    const monthsSinceLastVisit = this.getMonthsDifference(lastVisit, new Date());
    const maxMonths = rule.condition.maxMonthsSinceLastVisit || 6;
    
    return {
      triggered: monthsSinceLastVisit > maxMonths,
      details: { monthsSinceLastVisit, maxMonths },
    };
  }
  
  private hasAcuteSymptoms(symptoms: string[]): boolean {
    const acuteKeywords = [
      'ปวดท้องมาก', 'เจ็บหน้าอก', 'หอบเหนื่อย', 'ไข้สูง',
      'severe pain', 'chest pain', 'difficulty breathing', 'high fever'
    ];
    
    return symptoms.some(symptom =>
      acuteKeywords.some(keyword =>
        symptom.toLowerCase().includes(keyword.toLowerCase())
      )
    );
  }
  
  async overrideValidation(
    validationId: string,
    pharmacistId: string,
    reason: string
  ): Promise<void> {
    await this.db.update(scopeValidationResults)
      .set({
        overrideBy: pharmacistId,
        overrideReason: reason,
        overrideAt: new Date(),
      })
      .where(eq(scopeValidationResults.id, validationId));
    
    await this.auditService.log({
      action: 'scope_validation_override',
      entityType: 'scope_validation',
      entityId: validationId,
      actorId: pharmacistId,
      metadata: { reason },
    });
  }
}
```

#### Predefined Scope Rules (Seed Data)

```typescript
// packages/db/src/seed/scope-rules.ts

export const defaultScopeRules = [
  {
    ruleType: 'symptom_check',
    ruleName: 'Prohibit Acute Abdomen',
    condition: {
      prohibitedSymptoms: ['ปวดท้องมาก', 'ท้องแข็ง', 'severe abdominal pain', 'rigid abdomen']
    },
    action: 'reject',
    severity: 'critical',
    message: 'อาการปวดท้องเฉียบพลันต้องได้รับการตรวจร่างกายโดยแพทย์ กรุณาไปโรงพยาบาลทันที',
    priority: 10,
  },
  {
    ruleType: 'symptom_check',
    ruleName: 'Prohibit Chest Pain',
    condition: {
      prohibitedSymptoms: ['เจ็บหน้าอก', 'แน่นหน้าอก', 'chest pain', 'chest tightness']
    },
    action: 'reject',
    severity: 'critical',
    message: 'อาการเจ็บหน้าอกอาจเป็นสัญญาณของโรคหัวใจ กรุณาไปโรงพยาบาลทันที',
    priority: 10,
  },
  {
    ruleType: 'symptom_check',
    ruleName: 'Prohibit Difficulty Breathing',
    condition: {
      prohibitedSymptoms: ['หอบเหนื่อย', 'หายใจลำบาก', 'difficulty breathing', 'shortness of breath']
    },
    action: 'reject',
    severity: 'critical',
    message: 'อาการหายใจลำบากต้องได้รับการประเมินโดยแพทย์ กรุณาไปโรงพยาบาลทันที',
    priority: 10,
  },
  {
    ruleType: 'symptom_check',
    ruleName: 'Flag High Fever',
    condition: {
      prohibitedSymptoms: ['ไข้สูงเกิน 39', 'high fever above 39']
    },
    action: 'flag_review',
    severity: 'high',
    message: 'ไข้สูงต้องได้รับการประเมินโดยเภสัชกร',
    priority: 20,
  },
  {
    ruleType: 'medication_check',
    ruleName: 'Prohibit Controlled Substances',
    condition: {
      controlledSubstances: [
        'tramadol', 'codeine', 'morphine', 'alprazolam', 'diazepam',
        'ทรามาดอล', 'โคเดอีน', 'มอร์ฟีน', 'แอลพราโซแลม'
      ]
    },
    action: 'reject',
    severity: 'critical',
    message: 'ไม่สามารถจ่ายยาเสพติดให้โทษและยาควบคุมพิเศษผ่านระบบเภสัชกรรมทางไกลได้',
    priority: 5,
  },
  {
    ruleType: 'patient_type_check',
    ruleName: 'Reject New Patient with Acute Condition',
    condition: {
      rejectNewPatientWithAcute: true
    },
    action: 'reject',
    severity: 'high',
    message: 'ผู้ป่วยใหม่ที่มีอาการเฉียบพลันต้องพบแพทย์เพื่อตรวจร่างกายก่อน',
    priority: 15,
  },
  {
    ruleType: 'baseline_data_check',
    ruleName: 'Require Baseline Data for Chronic Condition',
    condition: {
      maxBaselineAgeMonths: 12
    },
    action: 'flag_review',
    severity: 'medium',
    message: 'ผู้ป่วยโรคเรื้อรังต้องมีข้อมูลพื้นฐาน (Lab, Vital signs) ที่ไม่เกิน 12 เดือน',
    priority: 30,
  },
  {
    ruleType: 'time_since_last_visit',
    ruleName: 'Require Recent Visit for Follow-up',
    condition: {
      maxMonthsSinceLastVisit: 6
    },
    action: 'flag_review',
    severity: 'medium',
    message: 'ผู้ป่วยติดตามต้องมีประวัติการพบแพทย์ภายใน 6 เดือน',
    priority: 25,
  },
];
```

### 5. Emergency Referral System

#### Database Schema

```typescript
// packages/db/src/schema/telemedicine.ts (continued)

export const referralReasonEnum = pgEnum("referral_reason", [
  "emergency_symptoms",
  "diagnostic_uncertainty",
  "scope_limitation",
  "requires_physical_exam",
  "requires_lab_tests",
  "requires_specialist",
  "patient_request"
]);

export const referralStatusEnum = pgEnum("referral_status", [
  "created",
  "patient_notified",
  "patient_acknowledged",
  "follow_up_sent",
  "completed",
  "patient_declined"
]);

export const emergencyReferrals = pgTable("emergency_referrals", {
  id: uuid("id").primaryKey().defaultRandom(),
  consultationId: uuid("consultation_id").notNull().references(() => videoConsultations.id),
  patientId: uuid("patient_id").notNull().references(() => patients.id),
  pharmacistId: uuid("pharmacist_id").notNull().references(() => staff.id),
  
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
  referralLetterGeneratedAt: timestamp("referral_letter_generated_at", { withTimezone: true }),
  
  // Follow-up
  patientWentToHospital: boolean("patient_went_to_hospital"),
  hospitalVisitDate: timestamp("hospital_visit_date", { withTimezone: true }),
  hospitalFeedback: text("hospital_feedback"),
  
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("emergency_referrals_patient_id_idx").on(t.patientId),
  index("emergency_referrals_consultation_id_idx").on(t.consultationId),
  index("emergency_referrals_status_idx").on(t.status),
]);
```

#### Referral Service

```typescript
// apps/api/src/modules/telemedicine/referral/referral.service.ts

@Injectable()
export class ReferralService {
  constructor(
    @Inject(DRIZZLE) private db: any,
    private readonly lineService: LineService,
    private readonly smsService: SmsService,
    private readonly pdfService: PdfService,
    private readonly auditService: TelemedicineAuditService,
  ) {}
  
  async createReferral(dto: CreateReferralDto): Promise<EmergencyReferral> {
    // 1. Get patient and consultation details
    const [patient] = await this.db.select().from(patients).where(eq(patients.id, dto.patientId));
    const [consultation] = await this.db.select().from(videoConsultations)
      .where(eq(videoConsultations.id, dto.consultationId));
    
    // 2. Find nearest hospitals
    const recommendedHospitals = await this.findNearestHospitals(
      patient.province,
      patient.district,
      dto.urgencyLevel
    );
    
    // 3. Create referral record
    const [referral] = await this.db.insert(emergencyReferrals).values({
      consultationId: dto.consultationId,
      patientId: dto.patientId,
      pharmacistId: dto.pharmacistId,
      reason: dto.reason,
      urgencyLevel: dto.urgencyLevel,
      clinicalSummary: dto.clinicalSummary,
      symptoms: dto.symptoms,
      vitalSigns: dto.vitalSigns,
      currentMedications: dto.currentMedications,
      pharmacistNotes: dto.pharmacistNotes,
      recommendedHospitals,
      nearestHospital: recommendedHospitals[0],
    }).returning();
    
    // 4. Generate referral letter PDF
    const pdfUrl = await this.generateReferralLetter(referral, patient, consultation);
    await this.db.update(emergencyReferrals)
      .set({
        referralLetterUrl: pdfUrl,
        referralLetterGeneratedAt: new Date(),
      })
      .where(eq(emergencyReferrals.id, referral.id));
    
    // 5. Send notifications
    await this.notifyPatient(referral, patient, pdfUrl);
    
    // 6. Update consultation status
    await this.db.update(videoConsultations)
      .set({
        status: 'referred',
        referralId: referral.id,
      })
      .where(eq(videoConsultations.id, dto.consultationId));
    
    // 7. Audit log
    await this.auditService.log({
      action: 'emergency_referral_created',
      entityType: 'referral',
      entityId: referral.id,
      actorId: dto.pharmacistId,
      metadata: { reason: dto.reason, urgencyLevel: dto.urgencyLevel },
    });
    
    return referral;
  }
  
  private async findNearestHospitals(
    province: string,
    district: string,
    urgencyLevel: string
  ): Promise<HospitalInfo[]> {
    // Query hospital database or external API
    // For now, return hardcoded list based on province
    const hospitals = THAILAND_HOSPITALS.filter(h =>
      h.province === province || h.district === district
    );
    
    // Sort by distance and capability
    return hospitals
      .filter(h => urgencyLevel === 'immediate' ? h.hasER : true)
      .slice(0, 3)
      .map(h => ({
        name: h.name,
        address: h.address,
        phone: h.phone,
        emergencyPhone: h.emergencyPhone,
        hasER: h.hasER,
        distance: h.distance,
        googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(h.name)}`,
      }));
  }
  
  private async generateReferralLetter(
    referral: EmergencyReferral,
    patient: Patient,
    consultation: VideoConsultation
  ): Promise<string> {
    const pdfContent = {
      title: 'ใบส่งตัวผู้ป่วย (Referral Letter)',
      date: new Date().toLocaleDateString('th-TH'),
      referralNo: `REF-${referral.id.substring(0, 8).toUpperCase()}`,
      
      patientInfo: {
        name: `${patient.firstName} ${patient.lastName}`,
        hn: patient.patientNo,
        age: this.calculateAge(patient.birthDate),
        gender: patient.gender,
        phone: patient.phone,
      },
      
      referralInfo: {
        from: 'LINE Telepharmacy - เภสัชกรรมทางไกล',
        to: referral.nearestHospital.name,
        urgency: this.getUrgencyText(referral.urgencyLevel),
        reason: this.getReasonText(referral.reason),
      },
      
      clinicalInfo: {
        chiefComplaint: consultation.chiefComplaint,
        symptoms: referral.symptoms,
        vitalSigns: referral.vitalSigns,
        currentMedications: referral.currentMedications,
        summary: referral.clinicalSummary,
        pharmacistNotes: referral.pharmacistNotes,
      },
      
      pharmacistInfo: {
        name: consultation.pharmacist.name,
        licenseNo: consultation.pharmacist.licenseNo,
        signature: 'Digital Signature',
      },
    };
    
    const pdfBuffer = await this.pdfService.generateReferralPdf(pdfContent);
    const filename = `referral-${referral.id}.pdf`;
    const url = await this.minioService.upload('telemedicine-referrals', filename, pdfBuffer);
    
    return url;
  }
  
  private async notifyPatient(
    referral: EmergencyReferral,
    patient: Patient,
    pdfUrl: string
  ): Promise<void> {
    const urgencyEmoji = referral.urgencyLevel === 'immediate' ? '🚨' : '⚠️';
    const message = `${urgencyEmoji} แจ้งเตือนสำคัญ: ส่งตัวไปโรงพยาบาล\n\n` +
      `เภสัชกรแนะนำให้คุณไปพบแพทย์ที่โรงพยาบาลเพื่อรับการตรวจรักษาเพิ่มเติม\n\n` +
      `เหตุผล: ${this.getReasonText(referral.reason)}\n` +
      `ระดับความเร่งด่วน: ${this.getUrgencyText(referral.urgencyLevel)}\n\n` +
      `โรงพยาบาลที่แนะนำ:\n` +
      `📍 ${referral.nearestHospital.name}\n` +
      `📞 ${referral.nearestHospital.phone}\n` +
      `🚑 ฉุกเฉิน: ${referral.nearestHospital.emergencyPhone || '1669'}\n\n` +
      `ดูแผนที่: ${referral.nearestHospital.googleMapsUrl}\n\n` +
      `ใบส่งตัว: ${pdfUrl}`;
    
    // Send LINE notification
    if (patient.lineUserId) {
      await this.lineService.pushMessage(patient.lineUserId, {
        type: 'text',
        text: message,
      });
      
      // Send PDF as file
      await this.lineService.pushMessage(patient.lineUserId, {
        type: 'file',
        url: pdfUrl,
        fileName: `ใบส่งตัว-${patient.patientNo}.pdf`,
      });
    }
    
    // Send SMS backup
    await this.smsService.send({
      to: patient.phone,
      message: `${urgencyEmoji} แจ้งเตือน: เภสัชกรแนะนำให้ไปโรงพยาบาล ${referral.nearestHospital.name} โทร ${referral.nearestHospital.phone}`,
    });
    
    // Update referral status
    await this.db.update(emergencyReferrals)
      .set({
        status: 'patient_notified',
        notifiedAt: new Date(),
        notificationChannel: 'line,sms',
      })
      .where(eq(emergencyReferrals.id, referral.id));
    
    // Schedule follow-up notification (15 minutes)
    await this.scheduleFollowUpNotification(referral.id, 15 * 60 * 1000);
  }
  
  async acknowledgeReferral(referralId: string, patientId: string): Promise<void> {
    await this.db.update(emergencyReferrals)
      .set({
        status: 'patient_acknowledged',
        acknowledgedAt: new Date(),
      })
      .where(and(
        eq(emergencyReferrals.id, referralId),
        eq(emergencyReferrals.patientId, patientId)
      ));
  }
  
  private async scheduleFollowUpNotification(referralId: string, delayMs: number): Promise<void> {
    // Use BullMQ to schedule follow-up
    await this.queue.add(
      'send-referral-follow-up',
      { referralId },
      { delay: delayMs }
    );
  }
}
```



### 6. Medical-Grade Audit Trail System

#### Database Schema

```typescript
// packages/db/src/schema/telemedicine.ts (continued)

export const telemedicineAuditLog = pgTable("telemedicine_audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  
  // Hash chain for tamper detection
  previousHash: varchar("previous_hash", { length: 64 }).notNull(),
  currentHash: varchar("current_hash", { length: 64 }).notNull().unique(),
  
  // Event details
  timestamp: timestamp("timestamp", { withTimezone: true, precision: 3 }).notNull().defaultNow(),
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
  
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("telemedicine_audit_log_timestamp_idx").on(t.timestamp),
  index("telemedicine_audit_log_actor_id_idx").on(t.actorId),
  index("telemedicine_audit_log_entity_idx").on(t.entityType, t.entityId),
  index("telemedicine_audit_log_action_type_idx").on(t.actionType),
]);

// Prevent updates and deletes
// CREATE RULE no_update AS ON UPDATE TO telemedicine_audit_log DO INSTEAD NOTHING;
// CREATE RULE no_delete AS ON DELETE TO telemedicine_audit_log DO INSTEAD NOTHING;
```

#### Audit Service

```typescript
// apps/api/src/modules/telemedicine/audit/audit.service.ts

@Injectable()
export class TelemedicineAuditService {
  private readonly encryptionKey: Buffer;
  
  constructor(
    @Inject(DRIZZLE) private db: any,
    private readonly config: ConfigService,
  ) {
    this.encryptionKey = Buffer.from(config.getOrThrow('audit.encryptionKey'), 'hex');
  }
  
  async log(event: AuditEvent): Promise<void> {
    // 1. Get previous hash for chain
    const previousHash = await this.getLatestHash();
    
    // 2. Encrypt sensitive metadata
    const encryptedMetadata = event.metadata
      ? this.encryptData(JSON.stringify(event.metadata))
      : null;
    
    // 3. Create log entry
    const logEntry = {
      previousHash,
      timestamp: new Date(),
      actorId: event.actorId,
      actorType: event.actorType,
      actionType: event.actionType,
      entityType: event.entityType,
      entityId: event.entityId,
      metadata: encryptedMetadata,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      geolocation: event.geolocation,
      sessionId: event.sessionId,
    };
    
    // 4. Calculate current hash (blockchain-inspired)
    const currentHash = this.calculateHash(logEntry);
    
    // 5. Insert into append-only table
    await this.db.insert(telemedicineAuditLog).values({
      ...logEntry,
      currentHash,
    });
  }
  
  private async getLatestHash(): Promise<string> {
    const [latest] = await this.db
      .select({ hash: telemedicineAuditLog.currentHash })
      .from(telemedicineAuditLog)
      .orderBy(desc(telemedicineAuditLog.timestamp))
      .limit(1);
    
    return latest?.hash || '0'.repeat(64); // Genesis hash
  }
  
  private calculateHash(entry: any): string {
    // Create deterministic string representation
    const data = [
      entry.previousHash,
      entry.timestamp.toISOString(),
      entry.actorId,
      entry.actorType,
      entry.actionType,
      entry.entityType,
      entry.entityId,
      JSON.stringify(entry.metadata),
    ].join('|');
    
    return crypto.createHash('sha256').update(data).digest('hex');
  }
  
  private encryptData(data: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Return: iv + authTag + encrypted data
    return iv.toString('hex') + authTag.toString('hex') + encrypted;
  }
  
  private decryptData(encryptedData: string): string {
    const iv = Buffer.from(encryptedData.slice(0, 32), 'hex');
    const authTag = Buffer.from(encryptedData.slice(32, 64), 'hex');
    const encrypted = encryptedData.slice(64);
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
  
  async verifyChainIntegrity(startDate?: Date, endDate?: Date): Promise<IntegrityCheckResult> {
    // Verify hash chain hasn't been tampered with
    let query = this.db
      .select()
      .from(telemedicineAuditLog)
      .orderBy(telemedicineAuditLog.timestamp);
    
    if (startDate) {
      query = query.where(gte(telemedicineAuditLog.timestamp, startDate));
    }
    if (endDate) {
      query = query.where(lte(telemedicineAuditLog.timestamp, endDate));
    }
    
    const logs = await query;
    
    let isValid = true;
    const errors: string[] = [];
    
    for (let i = 0; i < logs.length; i++) {
      const log = logs[i];
      
      // Verify hash calculation
      const recalculatedHash = this.calculateHash(log);
      if (recalculatedHash !== log.currentHash) {
        isValid = false;
        errors.push(`Hash mismatch at log ${log.id}: expected ${log.currentHash}, got ${recalculatedHash}`);
      }
      
      // Verify chain link
      if (i > 0) {
        const previousLog = logs[i - 1];
        if (log.previousHash !== previousLog.currentHash) {
          isValid = false;
          errors.push(`Chain break at log ${log.id}: previous hash doesn't match`);
        }
      }
    }
    
    return {
      isValid,
      checkedCount: logs.length,
      errors,
      startDate,
      endDate,
    };
  }
  
  async searchLogs(criteria: AuditSearchCriteria): Promise<AuditLogEntry[]> {
    let query = this.db.select().from(telemedicineAuditLog);
    
    if (criteria.actorId) {
      query = query.where(eq(telemedicineAuditLog.actorId, criteria.actorId));
    }
    if (criteria.entityType && criteria.entityId) {
      query = query.where(
        and(
          eq(telemedicineAuditLog.entityType, criteria.entityType),
          eq(telemedicineAuditLog.entityId, criteria.entityId)
        )
      );
    }
    if (criteria.actionType) {
      query = query.where(eq(telemedicineAuditLog.actionType, criteria.actionType));
    }
    if (criteria.startDate) {
      query = query.where(gte(telemedicineAuditLog.timestamp, criteria.startDate));
    }
    if (criteria.endDate) {
      query = query.where(lte(telemedicineAuditLog.timestamp, criteria.endDate));
    }
    
    const logs = await query.orderBy(desc(telemedicineAuditLog.timestamp)).limit(criteria.limit || 100);
    
    // Decrypt metadata for authorized users
    return logs.map(log => ({
      ...log,
      metadata: log.metadata ? JSON.parse(this.decryptData(log.metadata)) : null,
    }));
  }
  
  async generateAuditReport(
    startDate: Date,
    endDate: Date,
    format: 'pdf' | 'csv' = 'pdf'
  ): Promise<string> {
    const logs = await this.searchLogs({ startDate, endDate, limit: 10000 });
    
    if (format === 'csv') {
      return this.generateCsvReport(logs);
    } else {
      return this.generatePdfReport(logs, startDate, endDate);
    }
  }
  
  private async generatePdfReport(
    logs: AuditLogEntry[],
    startDate: Date,
    endDate: Date
  ): Promise<string> {
    // Generate PDF with digital signature
    const pdfContent = {
      title: 'Telemedicine Audit Report',
      period: `${startDate.toLocaleDateString('th-TH')} - ${endDate.toLocaleDateString('th-TH')}`,
      generatedAt: new Date().toISOString(),
      totalEntries: logs.length,
      logs: logs.map(log => ({
        timestamp: log.timestamp.toISOString(),
        actor: `${log.actorType}:${log.actorId}`,
        action: log.actionType,
        entity: `${log.entityType}:${log.entityId}`,
        hash: log.currentHash,
      })),
      signature: 'Digital Signature',
      integrityCheck: await this.verifyChainIntegrity(startDate, endDate),
    };
    
    const pdfBuffer = await this.pdfService.generateAuditReportPdf(pdfContent);
    const filename = `audit-report-${Date.now()}.pdf`;
    const url = await this.minioService.upload('audit-reports', filename, pdfBuffer);
    
    return url;
  }
}
```

### 7. Pharmacist License Verification Module

#### Database Schema

```typescript
// packages/db/src/schema/telemedicine.ts (continued)

export const licenseVerificationStatusEnum = pgEnum("license_verification_status", [
  "pending",
  "verified",
  "expired",
  "suspended",
  "revoked",
  "manual_review"
]);

export const pharmacistLicenseVerifications = pgTable("pharmacist_license_verifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  pharmacistId: uuid("pharmacist_id").notNull().references(() => staff.id),
  
  // License details
  licenseNo: varchar("license_no", { length: 50 }).notNull(),
  licenseType: varchar("license_type", { length: 50 }), // pharmacist, pharmacist_tech
  issueDate: date("issue_date"),
  expiryDate: date("expiry_date"),
  
  // Verification
  status: licenseVerificationStatusEnum("status").default("pending").notNull(),
  verificationMethod: varchar("verification_method", { length: 50 }), // api, manual, document
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
  nextCheckDate: date("next_check_date"),
  
  // API verification
  apiResponse: jsonb("api_response"),
  apiVerifiedAt: timestamp("api_verified_at", { withTimezone: true }),
  
  // Manual verification
  documentUrl: text("document_url"),
  verifiedBy: uuid("verified_by").references(() => staff.id),
  verificationNotes: text("verification_notes"),
  
  // Alerts
  expiryReminderSentAt: timestamp("expiry_reminder_sent_at", { withTimezone: true }),
  suspensionNotifiedAt: timestamp("suspension_notified_at", { withTimezone: true }),
  
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("pharmacist_license_verifications_pharmacist_id_idx").on(t.pharmacistId),
  index("pharmacist_license_verifications_status_idx").on(t.status),
  index("pharmacist_license_verifications_expiry_date_idx").on(t.expiryDate),
]);
```

#### License Verification Service

```typescript
// apps/api/src/modules/telemedicine/license/license-verifier.service.ts

@Injectable()
export class LicenseVerifierService {
  constructor(
    @Inject(DRIZZLE) private db: any,
    private readonly emailService: EmailService,
    private readonly auditService: TelemedicineAuditService,
  ) {}
  
  async verifyLicense(pharmacistId: string, licenseNo: string): Promise<LicenseVerificationResult> {
    // 1. Try API verification first (if available)
    let apiResult: ApiVerificationResult | null = null;
    try {
      apiResult = await this.verifyViaPharmacyCouncilApi(licenseNo);
    } catch (error) {
      console.warn('Pharmacy Council API unavailable, falling back to manual verification');
    }
    
    // 2. Create verification record
    const [verification] = await this.db.insert(pharmacistLicenseVerifications).values({
      pharmacistId,
      licenseNo,
      licenseType: apiResult?.licenseType || 'pharmacist',
      issueDate: apiResult?.issueDate,
      expiryDate: apiResult?.expiryDate,
      status: apiResult ? this.mapApiStatus(apiResult.status) : 'manual_review',
      verificationMethod: apiResult ? 'api' : 'manual',
      verifiedAt: apiResult ? new Date() : null,
      lastCheckedAt: new Date(),
      nextCheckDate: this.calculateNextCheckDate(),
      apiResponse: apiResult,
      apiVerifiedAt: apiResult ? new Date() : null,
    }).returning();
    
    // 3. Update staff record
    await this.db.update(staff)
      .set({
        licenseNo,
        licenseExpiry: verification.expiryDate,
      })
      .where(eq(staff.id, pharmacistId));
    
    // 4. Check expiry and send reminders if needed
    if (verification.expiryDate) {
      await this.checkExpiryAndSendReminders(verification);
    }
    
    // 5. Audit log
    await this.auditService.log({
      action: 'license_verification',
      entityType: 'license_verification',
      entityId: verification.id,
      actorId: pharmacistId,
      actorType: 'pharmacist',
      metadata: {
        licenseNo,
        status: verification.status,
        method: verification.verificationMethod,
      },
    });
    
    return {
      verified: verification.status === 'verified',
      status: verification.status,
      expiryDate: verification.expiryDate,
      requiresManualReview: verification.status === 'manual_review',
    };
  }
  
  private async verifyViaPharmacyCouncilApi(licenseNo: string): Promise<ApiVerificationResult> {
    // Call Thai Pharmacy Council API (if available)
    // For now, this is a placeholder
    const response = await axios.get(
      `https://api.pharmacycouncil.org/verify/${licenseNo}`,
      {
        headers: {
          'Authorization': `Bearer ${this.config.get('pharmacyCouncil.apiKey')}`,
        },
        timeout: 5000,
      }
    );
    
    return {
      licenseNo: response.data.licenseNo,
      licenseType: response.data.type,
      status: response.data.status, // active, expired, suspended, revoked
      issueDate: new Date(response.data.issueDate),
      expiryDate: new Date(response.data.expiryDate),
      pharmacistName: response.data.name,
    };
  }
  
  private mapApiStatus(apiStatus: string): string {
    const statusMap: Record<string, string> = {
      'active': 'verified',
      'expired': 'expired',
      'suspended': 'suspended',
      'revoked': 'revoked',
    };
    return statusMap[apiStatus] || 'manual_review';
  }
  
  private calculateNextCheckDate(): Date {
    // Check monthly
    const nextCheck = new Date();
    nextCheck.setMonth(nextCheck.getMonth() + 1);
    return nextCheck;
  }
  
  private async checkExpiryAndSendReminders(verification: any): Promise<void> {
    const daysUntilExpiry = this.getDaysUntilExpiry(verification.expiryDate);
    
    // Send reminder 60 days before expiry
    if (daysUntilExpiry <= 60 && daysUntilExpiry > 0 && !verification.expiryReminderSentAt) {
      await this.sendExpiryReminder(verification);
    }
    
    // Suspend account if expired
    if (daysUntilExpiry <= 0 && verification.status !== 'expired') {
      await this.suspendPharmacist(verification);
    }
  }
  
  private getDaysUntilExpiry(expiryDate: Date): number {
    const now = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  
  private async sendExpiryReminder(verification: any): Promise<void> {
    const [pharmacist] = await this.db.select().from(staff).where(eq(staff.id, verification.pharmacistId));
    
    await this.emailService.send({
      to: pharmacist.email,
      subject: 'แจ้งเตือน: ใบอนุญาตเภสัชกรใกล้หมดอายุ',
      template: 'license-expiry-reminder',
      data: {
        pharmacistName: `${pharmacist.firstName} ${pharmacist.lastName}`,
        licenseNo: verification.licenseNo,
        expiryDate: verification.expiryDate.toLocaleDateString('th-TH'),
        daysRemaining: this.getDaysUntilExpiry(verification.expiryDate),
      },
    });
    
    await this.db.update(pharmacistLicenseVerifications)
      .set({ expiryReminderSentAt: new Date() })
      .where(eq(pharmacistLicenseVerifications.id, verification.id));
  }
  
  private async suspendPharmacist(verification: any): Promise<void> {
    // Suspend pharmacist account
    await this.db.update(staff)
      .set({ isActive: false })
      .where(eq(staff.id, verification.pharmacistId));
    
    // Update verification status
    await this.db.update(pharmacistLicenseVerifications)
      .set({
        status: 'expired',
        suspensionNotifiedAt: new Date(),
      })
      .where(eq(pharmacistLicenseVerifications.id, verification.id));
    
    // Send notification
    const [pharmacist] = await this.db.select().from(staff).where(eq(staff.id, verification.pharmacistId));
    
    await this.emailService.send({
      to: pharmacist.email,
      subject: 'แจ้งเตือนสำคัญ: บัญชีถูกระงับเนื่องจากใบอนุญาตหมดอายุ',
      template: 'license-expired-suspension',
      data: {
        pharmacistName: `${pharmacist.firstName} ${pharmacist.lastName}`,
        licenseNo: verification.licenseNo,
        expiryDate: verification.expiryDate.toLocaleDateString('th-TH'),
      },
    });
    
    // Audit log
    await this.auditService.log({
      action: 'pharmacist_suspended',
      entityType: 'staff',
      entityId: verification.pharmacistId,
      actorType: 'system',
      actorId: 'system',
      metadata: {
        reason: 'license_expired',
        licenseNo: verification.licenseNo,
        expiryDate: verification.expiryDate,
      },
    });
  }
  
  async performMonthlyCheck(): Promise<void> {
    // Cron job to check all active pharmacist licenses
    const verifications = await this.db
      .select()
      .from(pharmacistLicenseVerifications)
      .where(
        and(
          eq(pharmacistLicenseVerifications.status, 'verified'),
          lte(pharmacistLicenseVerifications.nextCheckDate, new Date())
        )
      );
    
    for (const verification of verifications) {
      try {
        await this.recheckLicense(verification);
      } catch (error) {
        console.error(`Failed to recheck license ${verification.licenseNo}:`, error);
      }
    }
  }
  
  private async recheckLicense(verification: any): Promise<void> {
    // Re-verify via API
    try {
      const apiResult = await this.verifyViaPharmacyCouncilApi(verification.licenseNo);
      
      await this.db.update(pharmacistLicenseVerifications)
        .set({
          status: this.mapApiStatus(apiResult.status),
          lastCheckedAt: new Date(),
          nextCheckDate: this.calculateNextCheckDate(),
          apiResponse: apiResult,
          apiVerifiedAt: new Date(),
        })
        .where(eq(pharmacistLicenseVerifications.id, verification.id));
      
      // Check expiry
      await this.checkExpiryAndSendReminders(verification);
    } catch (error) {
      // API failed, schedule next check
      await this.db.update(pharmacistLicenseVerifications)
        .set({
          lastCheckedAt: new Date(),
          nextCheckDate: this.calculateNextCheckDate(),
        })
        .where(eq(pharmacistLicenseVerifications.id, verification.id));
    }
  }
}
```

