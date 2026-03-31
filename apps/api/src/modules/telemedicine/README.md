# Telemedicine Module

Thai Telemedicine 2569 Legal Compliance Implementation

## Overview

This module implements comprehensive telemedicine compliance for the LINE Telepharmacy Platform, adhering to Thai Ministry of Public Health regulations (Telemedicine 2569 B.E.).

## Features

### ✅ Implemented (Phase 1 & 2)

1. **KYC & Identity Verification** (`kyc/`)
   - Thai national ID card OCR with Gemini Vision
   - Liveness detection with AWS Rekognition
   - Face comparison verification
   - OTP verification via ThaiSMS
   - Email verification
   - Guardian consent for minors
   - 1-year validity with auto-expiry

2. **Medical-Grade Audit Trail** (`audit/`)
   - Blockchain-inspired hash chain for tamper detection
   - Append-only immutable logging
   - AES-256-GCM encrypted metadata
   - Chain integrity verification
   - PDF/CSV report generation
   - 10-year retention policy

3. **E-Consent & Disclaimer System** (`consent/`)
   - Thai language consent templates with versioning
   - Scroll tracking and time measurement
   - Digital signature capture
   - Geolocation and device tracking
   - PDF generation with signatures
   - Consent withdrawal mechanism

4. **Consultation Scope Validation** (`scope/`)
   - Rule-based validation engine
   - Prohibited symptom checking
   - Controlled substance validation
   - Patient type validation (new vs follow-up)
   - Baseline data requirements
   - Pharmacist override with justification

5. **Video Consultation Infrastructure** (`consultation/`)
   - Agora.io integration with cloud recording
   - 720p @ 30fps video quality
   - Thailand storage (MinIO)
   - SHA-256 hash for non-repudiation
   - Quality metrics tracking
   - 5-year retention with immutable policy

6. **Emergency Referral System** (`referral/`)
   - One-click referral creation
   - Nearest hospital finder
   - Referral letter PDF generation
   - LINE + SMS notifications
   - Google Maps integration
   - 15-minute follow-up tracking

7. **Pharmacist License Verification** (`license/`)
   - Thai Pharmacy Council API integration
   - License number format validation
   - Expiry monitoring with 60-day reminders
   - Auto-suspension on expiry
   - Manual verification fallback
   - Compliance reporting

### ⏸️ Pending Implementation (Phase 3)

8. **PDPA Compliance** (Task 11)
   - Data residency enforcement
   - Patient data export
   - Data deletion with anonymization
   - Third-party consent management

9. **ส.พ. 16 Documentation** (Task 12)
   - Facility documentation
   - Equipment inventory
   - Quarterly reporting
   - Authorization tracking

10. **Quality Metrics & Monitoring** (Task 13)
    - Real-time compliance dashboard
    - KYC success rate tracking
    - Consultation completion rate
    - Referral rate monitoring
    - Video quality metrics
    - Patient satisfaction surveys

11. **Recording Parser** (Task 14)
    - Speech-to-text with Gemini
    - Clinical information extraction
    - Transcript formatting
    - PDF report generation
    - Pharmacist review interface

## Module Structure

```
telemedicine/
├── kyc/                    # KYC & Identity Verification
│   ├── kyc.service.ts
│   ├── kyc.controller.ts
│   ├── aws-rekognition.service.ts
│   ├── minio.service.ts
│   ├── sms.service.ts
│   ├── email.service.ts
│   └── redis.service.ts
├── audit/                  # Medical-Grade Audit Trail
│   ├── audit.service.ts
│   ├── audit.controller.ts
│   └── audit-report.service.ts
├── consent/                # E-Consent System
│   ├── consent.service.ts
│   ├── consent.controller.ts
│   ├── pdf.service.ts
│   └── consent-template-th-v1.0.0.md
├── scope/                  # Scope Validation Engine
│   ├── scope-validator.service.ts
│   ├── scope.controller.ts
│   └── dto/
├── consultation/           # Video Consultation
│   ├── consultation.service.ts
│   ├── consultation.controller.ts
│   ├── agora.service.ts
│   └── dto/
├── referral/               # Emergency Referral
│   ├── referral.service.ts
│   ├── referral.controller.ts
│   └── dto/
├── license/                # License Verification
│   ├── license-verifier.service.ts
│   ├── license.controller.ts
│   └── dto/
└── telemedicine.module.ts  # Main module
```

## API Endpoints

### KYC & Identity Verification
```
POST   /v1/telemedicine/kyc/upload-document
POST   /v1/telemedicine/kyc/liveness-check
POST   /v1/telemedicine/kyc/face-compare
POST   /v1/telemedicine/kyc/send-otp
POST   /v1/telemedicine/kyc/verify-otp
GET    /v1/telemedicine/kyc/verify-email/:token
GET    /v1/telemedicine/kyc/status
POST   /v1/telemedicine/kyc/:verificationId/review
```

### Audit Trail
```
GET    /v1/telemedicine/audit/logs
POST   /v1/telemedicine/audit/verify-integrity
GET    /v1/telemedicine/audit/report/pdf
GET    /v1/telemedicine/audit/report/csv
```

### E-Consent
```
GET    /v1/telemedicine/consent/current
POST   /v1/telemedicine/consent/accept
POST   /v1/telemedicine/consent/withdraw
GET    /v1/telemedicine/consent/history
GET    /v1/telemedicine/consent/:id/pdf
```

### Scope Validation
```
POST   /v1/telemedicine/scope/validate
POST   /v1/telemedicine/scope/:validationId/override
GET    /v1/telemedicine/scope/rules
POST   /v1/telemedicine/scope/rules
```

### Video Consultation
```
POST   /v1/telemedicine/consultations/request
POST   /v1/telemedicine/consultations/:id/accept-consent
POST   /v1/telemedicine/consultations/:id/accept
GET    /v1/telemedicine/consultations/:id/token
POST   /v1/telemedicine/consultations/:id/start
POST   /v1/telemedicine/consultations/:id/end
GET    /v1/telemedicine/consultations/:id
GET    /v1/telemedicine/consultations
```

### Emergency Referral
```
POST   /v1/telemedicine/referrals
POST   /v1/telemedicine/referrals/:id/acknowledge
GET    /v1/telemedicine/referrals/:id
GET    /v1/telemedicine/referrals
GET    /v1/telemedicine/referrals/stats
```

### License Verification
```
POST   /v1/telemedicine/licenses/verify
GET    /v1/telemedicine/licenses/:pharmacistId
POST   /v1/telemedicine/licenses/:id/manual-review
GET    /v1/telemedicine/licenses/expiring
GET    /v1/telemedicine/licenses/compliance-report
```

## Configuration

Add to `.env`:

```bash
# Agora.io
AGORA_APP_ID=your_app_id
AGORA_APP_CERTIFICATE=your_certificate

# AWS Rekognition
AWS_REKOGNITION_REGION=ap-southeast-1
AWS_REKOGNITION_ACCESS_KEY=your_key
AWS_REKOGNITION_SECRET_KEY=your_secret

# ThaiSMS
THAI_SMS_API_KEY=your_api_key
THAI_SMS_SENDER=Telepharmacy

# Audit Encryption
AUDIT_ENCRYPTION_KEY=your_256_bit_hex_key

# Pharmacy Council API
PHARMACY_COUNCIL_API_KEY=your_api_key

# Storage Buckets
TELEMEDICINE_DOCUMENTS_BUCKET=telemedicine-documents
TELEMEDICINE_RECORDINGS_BUCKET=telemedicine-recordings
TELEMEDICINE_REFERRALS_BUCKET=telemedicine-referrals
```

## Database Schema

All tables are defined in `packages/db/src/schema/telemedicine.ts`:

- `kyc_verifications` - KYC verification records
- `video_consultations` - Consultation sessions
- `consent_templates` - Consent document templates
- `patient_consents` - Patient consent acceptances
- `scope_rules` - Validation rules
- `scope_validation_results` - Validation results
- `emergency_referrals` - Referral records
- `telemedicine_audit_log` - Immutable audit trail
- `pharmacist_license_verifications` - License records

## Testing

```bash
# Run all telemedicine tests
cd apps/api
pnpm test telemedicine

# Run specific module tests
pnpm test kyc.service.spec
pnpm test audit.service.spec
pnpm test consent.service.spec
pnpm test scope-validator.service.spec
pnpm test consultation.service.spec
```

## Compliance Requirements

### ✅ Completed
- [x] Requirements 1.1-1.12 (KYC)
- [x] Requirements 2.1-2.14 (Video Consultation)
- [x] Requirements 3.1-3.14 (E-Consent)
- [x] Requirements 4.1-4.14 (Scope Validation)
- [x] Requirements 5.1-5.14 (Emergency Referral)
- [x] Requirements 6.1-6.14 (Audit Trail)
- [x] Requirements 7.1-7.13 (License Verification)

### ⏸️ Pending
- [ ] Requirements 8.1-8.14 (PDPA Compliance)
- [ ] Requirements 9.1-9.12 (ส.พ. 16 Documentation)
- [ ] Requirements 10.1-10.16 (Quality Metrics)
- [ ] Requirements 11.1-11.14 (Recording Parser)

## Security

- **Encryption**: AES-256 for data at rest, TLS 1.3 for data in transit
- **Audit Trail**: Immutable hash chain prevents tampering
- **Recording Storage**: Immutable policy prevents deletion
- **Access Control**: Role-based authorization on all endpoints
- **Token Security**: Agora tokens expire after 24 hours
- **OTP Security**: 5-minute expiry, 3 attempts max

## Data Residency

All data is stored in Thailand:
- PostgreSQL: Thailand data center
- MinIO: Thailand storage
- Redis: Thailand instance
- AWS Services: Bangkok region (ap-southeast-1)

## Monitoring

Key metrics to monitor:
- KYC success rate (target >95%)
- Consultation completion rate (target >90%)
- Referral rate (alert if >15%)
- Video quality metrics
- License compliance rate (target 100%)
- Audit trail integrity

## Support

For issues or questions:
1. Check the implementation summary: `docs/task-7-15-implementation-summary.md`
2. Review individual task documentation in `docs/`
3. Check API documentation at `/api/docs`

## License

Proprietary - LINE Telepharmacy Platform
