# Implementation Plan: Telemedicine 2569 Legal Compliance

## Overview

This implementation plan breaks down the Telemedicine 2569 Legal Compliance feature into actionable coding tasks. The feature implements 11 major components to achieve full Thai telemedicine regulatory compliance, including KYC verification, video consultation infrastructure, e-consent management, scope validation, emergency referral system, audit trails, license verification, PDPA compliance, regulatory documentation, quality monitoring, and recording parser.

**Technology Stack:**
- Backend: NestJS 11 + PostgreSQL 16 + Drizzle ORM
- Frontend: Next.js 15 + React 19 (LIFF app)
- Infrastructure: Redis, MinIO, BullMQ
- External Services: AWS Rekognition, Agora.io, ThaiSMS, Gemini 2.5 Pro

**Implementation Approach:**
- Phased rollout with critical components first
- All database schemas use Drizzle ORM with migrations
- All services follow NestJS module structure
- All sensitive data encrypted (AES-256)
- All actions logged in audit trail
- Data residency: All data stored in Thailand

## Tasks

- [x] 1. Database Schema Setup & Core Infrastructure
  - Create Drizzle ORM schemas for all telemedicine tables
  - Generate and run database migrations
  - Set up MinIO buckets for video/document storage
  - Configure Redis for session management
  - _Requirements: 1.1, 1.10, 2.3, 6.6, 6.9, 8.1, 8.2_

- [x] 2. Implement KYC & Identity Verification Module
  - [x] 2.1 Create KYC database schema and migrations
    - Define `kyc_verifications` table with Drizzle ORM
    - Include fields for document verification, liveness detection, face comparison, OTP/email verification
    - Add indexes for performance optimization
    - _Requirements: 1.1, 1.10, 1.11_


  - [x] 2.2 Implement KYC service for document upload and OCR extraction
    - Create `KycService` with document encryption and MinIO upload
    - Integrate Gemini Vision API for Thai ID card OCR
    - Implement Thai national ID checksum validation (MOD 11 algorithm)
    - Extract structured data: nationalId, names, DOB, address, dates
    - _Requirements: 1.1, 1.2, 1.11_

  - [x] 2.3 Implement liveness detection with AWS Rekognition
    - Create service method for video upload and liveness check
    - Call AWS Rekognition DetectFaces with liveness detection
    - Validate random gesture performance (turn left, smile, blink)
    - Store liveness score and results in database
    - _Requirements: 1.3, 1.4_

  - [x] 2.4 Implement face comparison verification
    - Create service method for selfie upload
    - Call AWS Rekognition CompareFaces API
    - Compare selfie against ID document photo
    - Flag for manual review if confidence < 90%
    - _Requirements: 1.5, 1.6_

  - [x] 2.5 Implement OTP verification via ThaiSMS
    - Generate 6-digit OTP codes
    - Store OTP in Redis with 5-minute expiry
    - Integrate ThaiSMS API for SMS delivery
    - Validate OTP with max 3 attempts
    - _Requirements: 1.7_

  - [x] 2.6 Implement email verification system
    - Generate JWT tokens for email verification (24-hour expiry)
    - Send verification emails via AWS SES
    - Create verification endpoint to validate tokens
    - Mark patient as telemedicine-enabled upon completion
    - _Requirements: 1.8, 1.12_

  - [x] 2.7 Implement guardian consent for minors
    - Check patient age and require guardian consent if under 20
    - Link guardian KYC verification to patient record
    - Validate guardian relationship documentation
    - _Requirements: 1.9_

  - [x] 2.8 Create KYC REST API endpoints
    - POST /v1/telemedicine/kyc/upload-document
    - POST /v1/telemedicine/kyc/liveness-check
    - POST /v1/telemedicine/kyc/face-compare
    - POST /v1/telemedicine/kyc/send-otp
    - POST /v1/telemedicine/kyc/verify-otp
    - GET /v1/telemedicine/kyc/verify-email/:token
    - GET /v1/telemedicine/kyc/status
    - POST /v1/telemedicine/kyc/:verificationId/review (pharmacist only)
    - _Requirements: 1.1-1.12_


  - [ ]* 2.9 Write unit tests for KYC service
    - Test Thai ID checksum validation
    - Test OCR extraction accuracy
    - Test OTP generation and validation
    - Test face comparison confidence thresholds
    - _Requirements: 1.2, 1.5, 1.7, 1.11_

- [-] 3. Implement Medical-Grade Audit Trail System
  - [ ] 3.1 Create audit log database schema
    - Define `telemedicine_audit_log` table with append-only constraints
    - Implement hash chain fields (previousHash, currentHash)
    - Add indexes for timestamp, actor, entity, and action type
    - Create database rules to prevent UPDATE and DELETE operations
    - _Requirements: 6.1, 6.2, 6.5, 6.6_

  - [ ] 3.2 Implement audit service with hash chaining
    - Create `TelemedicineAuditService` with blockchain-inspired hash chain
    - Implement SHA-256 hash calculation for each log entry
    - Encrypt sensitive metadata using AES-256-GCM
    - Ensure append-only logging with no modifications
    - _Requirements: 6.1, 6.2, 6.4, 6.5, 6.7_

  - [ ] 3.3 Implement audit log search and reporting
    - Create search method with filters (actor, entity, action, date range)
    - Implement metadata decryption for authorized users
    - Generate PDF audit reports with digital signatures
    - Generate CSV exports for external audits
    - _Requirements: 6.10, 6.11, 6.14_

  - [ ] 3.4 Implement chain integrity verification
    - Create method to verify hash chain hasn't been tampered
    - Validate each log entry's hash calculation
    - Verify chain links between consecutive entries
    - Generate integrity check reports
    - _Requirements: 6.5, 6.11_

  - [ ]* 3.5 Write property test for audit trail immutability
    - **Property 1: Append-only guarantee**
    - **Validates: Requirements 6.5, 6.6**
    - Test that no log entries can be modified or deleted
    - Verify hash chain integrity after multiple insertions

  - [ ]* 3.6 Write property test for hash chain consistency
    - **Property 2: Hash chain continuity**
    - **Validates: Requirements 6.4, 6.5**
    - Test that previousHash always matches previous entry's currentHash
    - Verify hash recalculation produces same result

- [~] 4. Checkpoint - Core infrastructure validation
  - Ensure all tests pass, ask the user if questions arise.


- [~] 5. Implement E-Consent & Disclaimer System
  - [ ] 5.1 Create consent database schemas
    - Define `consent_templates` table with versioning
    - Define `patient_consents` table with acceptance tracking
    - Include fields for digital signature, scroll tracking, geolocation
    - _Requirements: 3.1, 3.2, 3.10, 3.11_

  - [ ] 5.2 Create Thai language consent template
    - Write comprehensive consent document in Thai
    - Include sections: technology limitations, scope, patient duties, privacy, withdrawal
    - Format in Markdown with plain language (8th-grade reading level)
    - Implement semantic versioning (v1.0.0)
    - _Requirements: 3.1, 3.3, 3.4, 3.5, 3.6_

  - [ ] 5.3 Implement consent service
    - Create `EConsentService` for consent management
    - Implement scroll tracking and time spent measurement
    - Capture digital signature with touch/stylus input
    - Record acceptance metadata (timestamp, IP, device, geolocation)
    - _Requirements: 3.2, 3.7, 3.8, 3.9_

  - [ ] 5.4 Implement consent PDF generation
    - Generate signed consent PDF with patient signature
    - Include all acceptance metadata in PDF
    - Store PDF in MinIO for patient download
    - _Requirements: 3.13_

  - [ ] 5.5 Implement consent validation and versioning
    - Check consent is active and current before consultation
    - Require re-acceptance when consent document updates
    - Implement consent withdrawal mechanism (7-day processing)
    - _Requirements: 3.11, 3.12, 3.14_

  - [ ] 5.6 Create consent REST API endpoints
    - GET /v1/telemedicine/consent/current - Get active consent template
    - POST /v1/telemedicine/consent/accept - Accept consent
    - POST /v1/telemedicine/consent/withdraw - Withdraw consent
    - GET /v1/telemedicine/consent/history - Get patient consent history
    - GET /v1/telemedicine/consent/:id/pdf - Download signed consent PDF
    - _Requirements: 3.1-3.14_

  - [ ]* 5.7 Write unit tests for consent service
    - Test scroll tracking and time measurement
    - Test consent versioning logic
    - Test withdrawal processing
    - _Requirements: 3.2, 3.11, 3.12_


- [~] 6. Implement Consultation Scope Validation Engine
  - [ ] 6.1 Create scope validation database schemas
    - Define `scope_rules` table with rule engine configuration
    - Define `scope_validation_results` table for validation tracking
    - Include rule types: symptom_check, medication_check, patient_type_check, baseline_data_check
    - _Requirements: 4.1, 4.2, 4.12_

  - [ ] 6.2 Implement scope validator service
    - Create `ScopeValidatorService` with rule evaluation engine
    - Implement symptom checking against prohibited list
    - Implement medication checking for controlled substances
    - Implement patient type validation (new vs follow-up)
    - Implement baseline data validation for chronic conditions
    - Implement time-since-last-visit validation
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9_

  - [ ] 6.3 Seed default scope rules
    - Create seed data for prohibited symptoms (acute abdomen, chest pain, breathing difficulty, high fever)
    - Create seed data for controlled substances list
    - Create rules for new patient with acute condition rejection
    - Create rules for baseline data requirements
    - Create rules for follow-up timeframe validation
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

  - [ ] 6.4 Implement pharmacist override mechanism
    - Create override method with mandatory justification
    - Flag overridden consultations for compliance review
    - Log all overrides in audit trail
    - _Requirements: 4.13, 4.14_

  - [ ] 6.5 Create scope validation REST API endpoints
    - POST /v1/telemedicine/scope/validate - Validate consultation request
    - POST /v1/telemedicine/scope/:validationId/override - Override validation (pharmacist only)
    - GET /v1/telemedicine/scope/rules - List active rules
    - POST /v1/telemedicine/scope/rules - Create custom rule (admin only)
    - _Requirements: 4.1-4.14_

  - [ ]* 6.6 Write property test for scope validation rules
    - **Property 3: Prohibited symptom rejection**
    - **Validates: Requirements 4.3, 4.4**
    - Test that any prohibited symptom triggers rejection
    - Verify controlled substances are always blocked

  - [ ]* 6.7 Write unit tests for scope validator
    - Test new patient with acute condition rejection
    - Test baseline data validation logic
    - Test time-since-last-visit calculation
    - _Requirements: 4.2, 4.7, 4.8, 4.9_


- [~] 7. Implement Video Consultation Infrastructure
  - [ ] 7.1 Create video consultation database schema
    - Define `video_consultations` table with session tracking
    - Include fields for Agora session, recording, transcript, quality metrics
    - Add consultation status enum and type enum
    - _Requirements: 2.1, 2.2, 2.4, 2.5, 2.10, 2.14_

  - [ ] 7.2 Implement Agora.io integration service
    - Create `AgoraService` for video platform integration
    - Implement RTC token generation with 24-hour expiry
    - Configure cloud recording to save to MinIO (Thailand storage)
    - Set recording parameters: 720p, 30fps, audio+video
    - _Requirements: 2.1, 2.2, 2.3, 2.13_

  - [ ] 7.3 Implement consultation service
    - Create `ConsultationService` for consultation lifecycle management
    - Implement consultation request with scope validation integration
    - Implement pharmacist assignment logic
    - Generate Agora tokens for patient and pharmacist
    - _Requirements: 2.1, 2.4, 2.13_

  - [ ] 7.4 Implement video session management
    - Start cloud recording when session begins
    - Track session duration and quality metrics
    - Monitor network quality and bandwidth
    - Handle connection drops with auto-reconnect (60 seconds)
    - _Requirements: 2.5, 2.6, 2.7, 2.14_

  - [ ] 7.5 Implement recording finalization
    - Stop cloud recording when session ends
    - Generate SHA-256 hash for non-repudiation
    - Store recording URL and metadata in database
    - Watermark video with session ID and timestamp
    - _Requirements: 2.4, 2.5, 2.9, 2.10_

  - [ ] 7.6 Implement recording security features
    - Configure MinIO bucket with immutable policy (no delete)
    - Encrypt recordings at rest (AES-256)
    - Implement 5-year retention policy
    - Prevent screenshot/screen recording on mobile devices
    - _Requirements: 2.1, 2.3, 2.8, 2.11_

  - [ ] 7.7 Create consultation REST API endpoints
    - POST /v1/telemedicine/consultations/request - Request consultation
    - POST /v1/telemedicine/consultations/:id/accept-consent - Accept e-consent
    - POST /v1/telemedicine/consultations/:id/accept - Pharmacist accepts (generates Agora token)
    - POST /v1/telemedicine/consultations/:id/start - Start video session
    - POST /v1/telemedicine/consultations/:id/end - End session and finalize recording
    - GET /v1/telemedicine/consultations/:id - Get consultation details
    - GET /v1/telemedicine/consultations - List consultations with filters
    - _Requirements: 2.1-2.14_

  - [ ]* 7.8 Write unit tests for consultation service
    - Test Agora token generation
    - Test session duration calculation
    - Test recording hash generation
    - _Requirements: 2.4, 2.5, 2.10, 2.14_


- [~] 8. Implement Emergency Referral System
  - [ ] 8.1 Create referral database schema
    - Define `emergency_referrals` table with referral tracking
    - Include referral reason enum and status enum
    - Add fields for clinical summary, recommended hospitals, patient acknowledgment
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.8, 5.11_

  - [ ] 8.2 Implement hospital database and lookup
    - Create Thailand hospitals database with ER capabilities
    - Implement nearest hospital finder by province/district
    - Include hospital contact info and Google Maps integration
    - _Requirements: 5.6, 5.7_

  - [ ] 8.3 Implement referral service
    - Create `ReferralService` for emergency referral management
    - Implement one-click referral creation from consultation
    - Generate referral letter PDF with clinical summary
    - Include patient info, symptoms, vital signs, current medications
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.9_

  - [ ] 8.4 Implement patient notification system
    - Send urgent LINE notification with referral details
    - Include nearest hospital with Google Maps link
    - Include emergency hotline numbers (1669)
    - Send SMS backup notification
    - Send referral letter PDF via LINE
    - _Requirements: 5.5, 5.6, 5.7, 5.9_

  - [ ] 8.5 Implement follow-up tracking
    - Track patient acknowledgment of referral
    - Send follow-up notification if no acknowledgment within 15 minutes
    - Update consultation status to "referred"
    - Prevent prescription issuance for referred consultations
    - _Requirements: 5.8, 5.11, 5.12_

  - [ ] 8.6 Implement referral analytics
    - Generate monthly referral statistics report
    - Track referral reasons and patterns
    - Integrate with hospital information systems (where available)
    - _Requirements: 5.13, 5.14_

  - [ ] 8.7 Create referral REST API endpoints
    - POST /v1/telemedicine/referrals - Create emergency referral
    - POST /v1/telemedicine/referrals/:id/acknowledge - Patient acknowledges referral
    - GET /v1/telemedicine/referrals/:id - Get referral details
    - GET /v1/telemedicine/referrals - List referrals with filters
    - GET /v1/telemedicine/referrals/stats - Get referral statistics
    - _Requirements: 5.1-5.14_

  - [ ]* 8.8 Write unit tests for referral service
    - Test hospital finder logic
    - Test referral letter PDF generation
    - Test notification delivery
    - _Requirements: 5.6, 5.9, 5.5_

- [~] 9. Checkpoint - Critical features validation
  - Ensure all tests pass, ask the user if questions arise.


- [~] 10. Implement Pharmacist License Verification
  - [ ] 10.1 Create license verification database schema
    - Define `pharmacist_license_verifications` table
    - Include license details, verification status, expiry tracking
    - Add fields for API verification and manual review
    - _Requirements: 7.1, 7.2, 7.6, 7.10_

  - [ ] 10.2 Implement license verifier service
    - Create `LicenseVerifierService` for license management
    - Implement Thai Pharmacy Council API integration (with fallback)
    - Validate license number format
    - Check license status and expiry date
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.6_

  - [ ] 10.3 Implement license expiry monitoring
    - Check license status monthly for active pharmacists
    - Send renewal reminders 60 days before expiry
    - Auto-suspend pharmacist account if license expires
    - Send suspension notification emails
    - _Requirements: 7.7, 7.8, 7.9_

  - [ ] 10.4 Implement manual verification fallback
    - Support license document upload when API unavailable
    - Use OCR to extract license details
    - Flag for admin review and approval
    - _Requirements: 7.4, 7.5_

  - [ ] 10.5 Implement license display and reporting
    - Display pharmacist license number on consultation interface
    - Generate monthly license compliance report
    - Track verification history in audit trail
    - _Requirements: 7.10, 7.11, 7.12_

  - [ ] 10.6 Create license verification REST API endpoints
    - POST /v1/telemedicine/licenses/verify - Verify pharmacist license
    - GET /v1/telemedicine/licenses/:pharmacistId - Get license status
    - POST /v1/telemedicine/licenses/:id/manual-review - Manual review (admin only)
    - GET /v1/telemedicine/licenses/expiring - List expiring licenses
    - GET /v1/telemedicine/licenses/compliance-report - Generate compliance report
    - _Requirements: 7.1-7.13_

  - [ ]* 10.7 Write unit tests for license verifier
    - Test license number format validation
    - Test expiry date calculation
    - Test auto-suspension logic
    - _Requirements: 7.2, 7.6, 7.9_


- [ ] 11. Implement PDPA Compliance & Data Residency
  - [ ] 11.1 Configure Thailand data residency
    - Verify PostgreSQL hosted in Thailand
    - Configure MinIO with Thailand-only storage
    - Verify Redis hosted in Thailand
    - Configure AWS services to use Bangkok region (ap-southeast-1)
    - _Requirements: 8.1, 8.2_

  - [ ] 11.2 Implement data encryption
    - Configure AES-256 encryption for data at rest
    - Ensure TLS 1.3 for data in transit
    - Encrypt sensitive fields in database (ID documents, recordings)
    - _Requirements: 8.3, 8.4_

  - [ ] 11.3 Implement patient data export
    - Create data export service for PDPA compliance
    - Generate JSON export of all patient data
    - Process export requests within 30 days
    - _Requirements: 8.7_

  - [ ] 11.4 Implement patient data deletion
    - Create data deletion service with 30-day processing
    - Anonymize personal identifiers while retaining medical records
    - Respect legal retention period (10 years)
    - Log all deletion requests in audit trail
    - _Requirements: 8.8, 8.9, 8.10_

  - [ ] 11.5 Implement consent management for third-party data sharing
    - Require explicit consent before sharing data with third parties
    - Maintain data processing agreements
    - Log all data access and transfers
    - _Requirements: 8.5, 8.6, 8.10_

  - [ ] 11.6 Implement role-based access control
    - Configure RBAC with principle of least privilege
    - Require MFA for staff accessing sensitive patient data
    - Log all data access attempts
    - _Requirements: 8.13, 8.14_

  - [ ] 11.7 Create PDPA compliance REST API endpoints
    - POST /v1/telemedicine/pdpa/export-request - Request data export
    - POST /v1/telemedicine/pdpa/deletion-request - Request data deletion
    - GET /v1/telemedicine/pdpa/consent-status - Check consent status
    - POST /v1/telemedicine/pdpa/consent - Update consent preferences
    - _Requirements: 8.7, 8.8, 8.9_

  - [ ]* 11.8 Write unit tests for PDPA compliance
    - Test data export completeness
    - Test data anonymization logic
    - Test retention period enforcement
    - _Requirements: 8.7, 8.8, 8.9_


- [ ] 12. Implement ส.พ. 16 Compliance Documentation
  - [ ] 12.1 Create compliance documentation database schema
    - Define tables for facility info, equipment inventory, staff qualifications
    - Track ส.พ. 16 authorization status and expiry
    - Maintain change log for system modifications
    - _Requirements: 9.1, 9.9, 9.10_

  - [ ] 12.2 Implement documentation generator service
    - Create service to generate ส.พ. 16 application package
    - Include facility information with photos and dimensions
    - Document licensed pharmacist list with qualifications
    - Document video platform technical specifications
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [ ] 12.3 Implement system monitoring for compliance
    - Generate internet stability reports (uptime, bandwidth)
    - Maintain equipment inventory (cameras, microphones, backups)
    - Document standard operating procedures
    - _Requirements: 9.5, 9.6, 9.7_

  - [ ] 12.4 Implement quarterly reporting
    - Generate quarterly compliance reports for สบส. submission
    - Track authorization expiration with 90-day renewal reminders
    - Generate annual self-assessment reports
    - _Requirements: 9.8, 9.9, 9.12_

  - [ ] 12.5 Create compliance documentation REST API endpoints
    - GET /v1/telemedicine/compliance/sp16-package - Generate ส.พ. 16 application
    - GET /v1/telemedicine/compliance/quarterly-report - Generate quarterly report
    - GET /v1/telemedicine/compliance/self-assessment - Generate self-assessment
    - POST /v1/telemedicine/compliance/equipment - Update equipment inventory
    - GET /v1/telemedicine/compliance/authorization-status - Check authorization status
    - _Requirements: 9.1-9.12_

  - [ ]* 12.6 Write unit tests for documentation generator
    - Test ส.พ. 16 package completeness
    - Test quarterly report generation
    - _Requirements: 9.1, 9.8_


- [ ] 13. Implement Quality Metrics & Compliance Monitoring
  - [ ] 13.1 Create compliance monitoring database schema
    - Define tables for metrics tracking and alerts
    - Store historical metric data for trend analysis
    - _Requirements: 10.1, 10.14_

  - [ ] 13.2 Implement compliance monitor service
    - Create `ComplianceMonitorService` for real-time metrics
    - Track KYC verification success rate (target >95%)
    - Track consultation completion rate (target >90%)
    - Track referral rate with alerts (threshold 15%)
    - Track average consultation duration (target 10-20 minutes)
    - Track patient consent acceptance rate (target >98%)
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

  - [ ] 13.3 Implement video quality monitoring
    - Track video resolution, frame rate, connection stability
    - Monitor bandwidth and connection drops
    - Alert on quality degradation
    - _Requirements: 10.7_

  - [ ] 13.4 Implement compliance tracking
    - Track pharmacist license compliance (target 100%)
    - Track audit trail completeness (target 100%)
    - Track data residency compliance (target 100%)
    - _Requirements: 10.8, 10.9, 10.10_

  - [ ] 13.5 Implement reporting and alerting
    - Generate weekly compliance summary reports
    - Send automatic alerts when metrics fall below thresholds
    - Provide drill-down capability for issue investigation
    - Export compliance data in CSV format
    - _Requirements: 10.11, 10.12, 10.13, 10.14_

  - [ ] 13.6 Implement patient satisfaction tracking
    - Create post-consultation survey system
    - Track satisfaction scores
    - Include in compliance scorecard
    - _Requirements: 10.15_

  - [ ] 13.7 Create compliance monitoring REST API endpoints
    - GET /v1/telemedicine/compliance/dashboard - Real-time dashboard metrics
    - GET /v1/telemedicine/compliance/metrics - Get specific metrics with date range
    - GET /v1/telemedicine/compliance/weekly-report - Generate weekly report
    - GET /v1/telemedicine/compliance/scorecard - Get compliance scorecard
    - GET /v1/telemedicine/compliance/alerts - Get active alerts
    - POST /v1/telemedicine/compliance/survey - Submit patient satisfaction survey
    - _Requirements: 10.1-10.16_

  - [ ]* 13.8 Write unit tests for compliance monitor
    - Test metric calculation accuracy
    - Test alert threshold logic
    - Test report generation
    - _Requirements: 10.2, 10.4, 10.11_


- [ ] 14. Implement Consultation Recording Parser & Pretty Printer
  - [ ] 14.1 Create recording parser database schema
    - Define tables for transcripts and structured consultation data
    - Store speaker identification and timestamps
    - Store extracted clinical information
    - _Requirements: 11.3, 11.4, 11.5_

  - [ ] 14.2 Implement speech-to-text parser
    - Create `RecordingParserService` using Gemini for Thai STT
    - Parse audio from consultation recordings
    - Identify speaker roles (pharmacist vs patient) with >90% accuracy
    - Generate timestamped transcript with speaker labels
    - _Requirements: 11.1, 11.2, 11.3_

  - [ ] 14.3 Implement clinical information extraction
    - Extract symptoms, medications discussed, recommendations
    - Use Gemini to structure clinical data
    - Handle Thai medical terminology with specialized dictionary
    - _Requirements: 11.4, 11.12_

  - [ ] 14.4 Implement transcript formatting
    - Format transcript using medical documentation standards
    - Generate consultation summary with structured sections
    - Include chief complaint, assessment, and plan
    - _Requirements: 11.5, 11.6_

  - [ ] 14.5 Implement pretty printer for PDF reports
    - Create PDF report generator for consultation documentation
    - Include consultation metadata (session ID, duration, participants, timestamps)
    - Embed video recording link for authorized access
    - Support sensitive information redaction
    - _Requirements: 11.7, 11.8, 11.9, 11.13_

  - [ ] 14.6 Implement round-trip validation
    - Validate parsed transcript matches original recording duration (within 5%)
    - Implement parse → print → parse round-trip testing
    - Ensure structured data equivalence after round-trip
    - _Requirements: 11.10, 11.11_

  - [ ] 14.7 Implement pharmacist review interface
    - Allow pharmacist to review and edit transcript before finalization
    - Track transcript edits in audit trail
    - _Requirements: 11.14_

  - [ ] 14.8 Create recording parser REST API endpoints
    - POST /v1/telemedicine/recordings/:id/parse - Trigger parsing job
    - GET /v1/telemedicine/recordings/:id/transcript - Get transcript
    - GET /v1/telemedicine/recordings/:id/summary - Get clinical summary
    - GET /v1/telemedicine/recordings/:id/pdf - Generate PDF report
    - PUT /v1/telemedicine/recordings/:id/transcript - Update transcript (pharmacist only)
    - _Requirements: 11.1-11.14_

  - [ ]* 14.9 Write property test for round-trip consistency
    - **Property 4: Round-trip data preservation**
    - **Validates: Requirements 11.11**
    - Test that parse → print → parse produces equivalent structured data
    - Verify no data loss in round-trip transformation

  - [ ]* 14.10 Write unit tests for recording parser
    - Test speaker identification accuracy
    - Test clinical information extraction
    - Test transcript duration validation
    - _Requirements: 11.2, 11.4, 11.10_

- [ ] 15. Checkpoint - Post-launch features validation
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 16. Frontend Integration (LIFF App)
  - [ ] 16.1 Create KYC verification flow in LIFF app
    - Build ID document upload screen with camera integration
    - Build liveness detection screen with gesture instructions
    - Build selfie capture screen
    - Build OTP verification screen
    - Build email verification confirmation screen
    - Show KYC progress indicator
    - _Requirements: 1.1-1.12_

  - [ ] 16.2 Create e-consent acceptance flow
    - Build consent document viewer with scroll tracking
    - Implement scroll-to-end requirement before enabling accept button
    - Build digital signature capture with touch/stylus
    - Show consent acceptance confirmation
    - _Requirements: 3.1-3.14_

  - [ ] 16.3 Create consultation request flow
    - Build symptom input form
    - Build medication request form
    - Show scope validation results
    - Handle rejection with clear messaging and hospital recommendations
    - _Requirements: 4.1-4.14_

  - [ ] 16.4 Create video consultation interface
    - Integrate Agora.io SDK for video calls
    - Build video call UI with controls (mute, camera toggle, end call)
    - Show connection quality indicator
    - Handle reconnection attempts
    - Display pharmacist license information
    - _Requirements: 2.1-2.14, 7.11_

  - [ ] 16.5 Create referral acknowledgment interface
    - Show emergency referral notification
    - Display nearest hospital information with map
    - Provide one-click acknowledgment button
    - Show referral letter PDF viewer
    - _Requirements: 5.5-5.12_

  - [ ] 16.6 Create consultation history and recordings
    - Build consultation history list
    - Show consultation details with transcript
    - Provide video recording playback (authorized access)
    - Download consultation summary PDF
    - _Requirements: 2.12, 11.7-11.9_

  - [ ]* 16.7 Write E2E tests for critical user flows
    - Test complete KYC verification flow
    - Test consultation request and video call flow
    - Test emergency referral acknowledgment
    - _Requirements: 1.1-1.12, 2.1-2.14, 5.5-5.12_


- [ ] 17. Admin Dashboard Integration
  - [ ] 17.1 Create KYC review interface for pharmacists
    - Build manual KYC review queue
    - Show flagged verifications with face comparison results
    - Provide approve/reject actions with notes
    - _Requirements: 1.6, 1.10_

  - [ ] 17.2 Create consultation queue for pharmacists
    - Build real-time consultation request queue
    - Show patient info, symptoms, scope validation results
    - Provide accept/reject actions
    - Display active video consultations
    - _Requirements: 2.1, 4.1-4.14_

  - [ ] 17.3 Create emergency referral interface
    - Build one-click referral creation from consultation
    - Show referral form with clinical summary
    - Display recommended hospitals
    - Track referral status and patient acknowledgment
    - _Requirements: 5.1-5.14_

  - [ ] 17.4 Create compliance monitoring dashboard
    - Build real-time metrics dashboard with charts
    - Show KYC success rate, consultation completion, referral rate
    - Display video quality metrics
    - Show license compliance status
    - Display active alerts
    - _Requirements: 10.1-10.16_

  - [ ] 17.5 Create audit log viewer
    - Build audit log search interface with filters
    - Display log entries with metadata
    - Provide export functionality (PDF, CSV)
    - Show chain integrity verification results
    - _Requirements: 6.10, 6.11, 6.14_

  - [ ] 17.6 Create license management interface
    - Build pharmacist license list with status
    - Show expiring licenses with alerts
    - Provide manual verification interface
    - Display compliance reports
    - _Requirements: 7.8, 7.10, 7.11, 7.12_

  - [ ] 17.7 Create ส.พ. 16 documentation interface
    - Build documentation generator with form inputs
    - Show authorization status and expiry
    - Provide quarterly report generation
    - Display equipment inventory management
    - _Requirements: 9.1-9.12_

  - [ ]* 17.8 Write integration tests for admin features
    - Test KYC review workflow
    - Test consultation acceptance workflow
    - Test referral creation workflow
    - _Requirements: 1.6, 2.1, 5.1_


- [ ] 18. Background Jobs & Scheduled Tasks
  - [ ] 18.1 Implement KYC expiry checker job
    - Create BullMQ job to check KYC expiry (1-year validity)
    - Send renewal reminders 30 days before expiry
    - Auto-expire outdated KYC verifications
    - _Requirements: 1.10_

  - [ ] 18.2 Implement license verification checker job
    - Create monthly job to recheck all active pharmacist licenses
    - Send expiry reminders 60 days before expiry
    - Auto-suspend expired licenses
    - _Requirements: 7.7, 7.8, 7.9_

  - [ ] 18.3 Implement recording parser job
    - Create job to parse consultation recordings after session ends
    - Queue parsing with retry logic
    - Generate transcript and clinical summary
    - _Requirements: 11.1-11.14_

  - [ ] 18.4 Implement referral follow-up job
    - Create delayed job to send follow-up notification (15 minutes)
    - Check if patient acknowledged referral
    - Send additional reminders if needed
    - _Requirements: 5.12_

  - [ ] 18.5 Implement compliance metrics aggregation job
    - Create daily job to calculate and store compliance metrics
    - Generate weekly summary reports
    - Send alerts for metrics below thresholds
    - _Requirements: 10.1, 10.11, 10.12_

  - [ ] 18.6 Implement audit log backup job
    - Create daily job to replicate audit logs to backup location
    - Verify chain integrity during backup
    - _Requirements: 6.8_

  - [ ] 18.7 Implement data retention cleanup job
    - Create monthly job to enforce retention policies
    - Archive old recordings (>5 years) to cold storage
    - Maintain audit logs for 10 years
    - _Requirements: 2.11, 6.9_

  - [ ]* 18.8 Write unit tests for background jobs
    - Test KYC expiry logic
    - Test license expiry logic
    - Test metrics aggregation
    - _Requirements: 1.10, 7.8, 10.1_


- [ ] 19. Configuration & Environment Setup
  - [ ] 19.1 Add telemedicine configuration to NestJS config
    - Create `telemedicine.config.ts` with all service configurations
    - Add AWS Rekognition config (region, credentials)
    - Add Agora.io config (app ID, certificate)
    - Add ThaiSMS config (API key, sender)
    - Add audit encryption key configuration
    - _Requirements: All_

  - [ ] 19.2 Update environment variables
    - Add AWS_REKOGNITION_REGION=ap-southeast-1
    - Add AWS_REKOGNITION_ACCESS_KEY
    - Add AWS_REKOGNITION_SECRET_KEY
    - Add AGORA_APP_ID
    - Add AGORA_APP_CERTIFICATE
    - Add THAI_SMS_API_KEY
    - Add THAI_SMS_SENDER
    - Add AUDIT_ENCRYPTION_KEY (256-bit hex)
    - Add PHARMACY_COUNCIL_API_KEY (optional)
    - _Requirements: All_

  - [ ] 19.3 Configure MinIO buckets
    - Create bucket: telemedicine-documents (ID cards, licenses)
    - Create bucket: telemedicine-recordings (video consultations)
    - Create bucket: telemedicine-referrals (referral letters)
    - Create bucket: audit-reports (compliance reports)
    - Set immutable policies on recordings bucket
    - _Requirements: 2.3, 2.11, 5.9, 6.11_

  - [ ] 19.4 Configure Redis namespaces
    - Create namespace: kyc:otp (OTP codes)
    - Create namespace: consultation:session (active sessions)
    - Create namespace: agora:tokens (video tokens)
    - _Requirements: 1.7, 2.1_

  - [ ] 19.5 Set up BullMQ queues
    - Create queue: kyc-processing
    - Create queue: recording-parsing
    - Create queue: referral-notifications
    - Create queue: license-verification
    - Create queue: compliance-metrics
    - _Requirements: 11.1, 5.12, 7.7, 10.1_

  - [ ] 19.6 Configure database connection pooling
    - Optimize PostgreSQL connection pool for telemedicine load
    - Configure separate connection for audit log writes
    - _Requirements: 6.6_


- [ ] 20. Integration & Wiring
  - [ ] 20.1 Create telemedicine module structure
    - Create `apps/api/src/modules/telemedicine` directory
    - Create submodules: kyc, audit, consent, scope, consultation, referral, license, compliance, recording
    - Create `telemedicine.module.ts` as parent module
    - Register all submodules and services
    - _Requirements: All_

  - [ ] 20.2 Wire KYC module with audit trail
    - Inject `TelemedicineAuditService` into `KycService`
    - Log all KYC events (document upload, verification steps, completion)
    - _Requirements: 1.10, 6.1_

  - [ ] 20.3 Wire consultation module with scope validator
    - Inject `ScopeValidatorService` into `ConsultationService`
    - Validate scope before creating consultation
    - Block consultation if validation fails
    - _Requirements: 4.1-4.14, 2.1_

  - [ ] 20.4 Wire consultation module with e-consent
    - Inject `EConsentService` into `ConsultationService`
    - Require active consent before starting video session
    - _Requirements: 3.14, 2.1_

  - [ ] 20.5 Wire consultation module with referral system
    - Inject `ReferralService` into `ConsultationService`
    - Enable one-click referral from active consultation
    - Update consultation status when referred
    - _Requirements: 5.1, 5.8_

  - [ ] 20.6 Wire consultation module with recording parser
    - Trigger parsing job when consultation ends
    - Link transcript to consultation record
    - _Requirements: 11.1, 2.10_

  - [ ] 20.7 Wire license verifier with staff module
    - Check license status before allowing consultation acceptance
    - Block expired pharmacists from accepting consultations
    - _Requirements: 7.9, 2.1_

  - [ ] 20.8 Wire compliance monitor with all modules
    - Collect metrics from KYC, consultation, referral, license modules
    - Aggregate data for dashboard
    - _Requirements: 10.1-10.16_

  - [ ] 20.9 Register all routes in main app module
    - Import `TelemedicineModule` in `app.module.ts`
    - Verify all endpoints are accessible
    - Apply authentication guards
    - _Requirements: All_

  - [ ]* 20.10 Write integration tests for module wiring
    - Test end-to-end consultation flow (KYC → consent → scope → video → recording)
    - Test referral flow from consultation
    - Test license check blocking expired pharmacists
    - _Requirements: 1.1-11.14_

- [ ] 21. Final checkpoint - Complete system validation
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 22. Documentation & Deployment Preparation
  - [ ] 22.1 Write API documentation
    - Document all telemedicine endpoints with OpenAPI/Swagger
    - Include request/response examples
    - Document authentication requirements
    - _Requirements: All_

  - [ ] 22.2 Write deployment guide
    - Document infrastructure requirements (Thailand data centers)
    - Document external service setup (AWS, Agora, ThaiSMS)
    - Document environment variable configuration
    - Document database migration steps
    - _Requirements: All_

  - [ ] 22.3 Write operator manual
    - Document KYC review procedures for pharmacists
    - Document consultation acceptance workflow
    - Document emergency referral procedures
    - Document compliance monitoring procedures
    - _Requirements: 1.6, 2.1, 5.1, 10.1_

  - [ ] 22.4 Write compliance checklist
    - Create pre-launch compliance verification checklist
    - Include all Telemedicine 2569 requirements
    - Include PDPA compliance checks
    - Include ส.พ. 16 application requirements
    - _Requirements: All_

  - [ ] 22.5 Create runbook for common issues
    - Document troubleshooting for video quality issues
    - Document AWS Rekognition fallback procedures
    - Document audit log integrity verification
    - Document license verification failures
    - _Requirements: 2.6, 1.5, 6.5, 7.4_

## Notes

- Tasks marked with `*` are optional testing tasks and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at critical milestones
- Property tests validate universal correctness properties for compliance-critical components
- Unit tests validate specific examples and edge cases
- All implementation must use TypeScript with NestJS 11 for backend and Next.js 15 for frontend
- All database operations must use Drizzle ORM
- All sensitive data must be encrypted with AES-256
- All actions must be logged in the audit trail
- Data residency requirement: All data must be stored in Thailand

## Implementation Priority

**Phase 1 (CRITICAL - Must have before launch):**
- Tasks 1-4: Database setup, KYC, Audit Trail, E-Consent
- Task 6: Scope Validation

**Phase 2 (HIGH - Launch blockers):**
- Task 7: Video Consultation
- Task 8: Referral System
- Task 10: License Verification

**Phase 3 (MEDIUM - Post-launch):**
- Task 14: Recording Parser
- Task 13: Compliance Monitor
- Task 12: ส.พ. 16 Documentation

**Phase 4 (Integration & Polish):**
- Tasks 16-22: Frontend, Admin Dashboard, Background Jobs, Configuration, Documentation

## Estimated Complexity

- **High Complexity (3-5 days each):** Tasks 2, 3, 6, 7, 14
- **Medium Complexity (2-3 days each):** Tasks 5, 8, 10, 11, 13, 16, 17
- **Low Complexity (1-2 days each):** Tasks 1, 12, 18, 19, 20, 22

**Total Estimated Time:** 8-12 weeks for complete implementation with testing
