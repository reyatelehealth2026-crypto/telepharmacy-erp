# E-Consent & Disclaimer System

## Overview

The E-Consent module implements electronic consent management for telemedicine services, ensuring legal compliance with Thai Ministry of Public Health standards and PDPA requirements.

## Features

### 1. Consent Template Management
- **Semantic Versioning**: Templates use semantic versioning (v1.0.0, v1.1.0, etc.)
- **Multi-language Support**: Thai (th) and English (en) templates
- **Active Template Tracking**: Only one active template per language at a time
- **Effective Date Management**: Templates have effective from/until dates

### 2. Patient Consent Acceptance
- **Scroll Tracking**: Ensures patient scrolls through entire document
- **Time Tracking**: Minimum 30 seconds reading time required
- **Digital Signature**: Captures patient signature as base64 image
- **Metadata Recording**: IP address, device ID, user agent, geolocation
- **PDF Generation**: Automatic PDF generation for patient download

### 3. Consent Validation
- **Active Consent Check**: Validates patient has current active consent
- **Template Version Check**: Ensures consent is for active template version
- **Expiry Check**: Detects expired consent templates

### 4. Consent Withdrawal
- **7-Day Processing**: Withdrawal takes effect after 7 business days
- **Reason Tracking**: Records reason for withdrawal
- **Historical Record**: Maintains complete consent history

### 5. Audit Trail
- **Non-Repudiation**: All consent actions are logged
- **Immutable Records**: Consent records cannot be modified after creation
- **PDF Hash**: SHA-256 hash for document verification

## API Endpoints

### Patient Endpoints

#### Get Active Consent Template
```http
GET /v1/telemedicine/consent/template?language=th
```

Response:
```json
{
  "id": "uuid",
  "version": "1.0.0",
  "language": "th",
  "title": "ข้อตกลงและยินยอมการรับบริการเภสัชกรรมทางไกล",
  "content": "# Markdown content...",
  "clauses": [...],
  "isActive": true,
  "effectiveFrom": "2025-01-01T00:00:00Z",
  "effectiveUntil": null,
  "createdAt": "2024-12-01T00:00:00Z"
}
```

#### Get Consent Status
```http
GET /v1/telemedicine/consent/status
Authorization: Bearer <token>
```

Response:
```json
{
  "hasActiveConsent": true,
  "currentConsent": {...},
  "requiresNewConsent": false,
  "reason": null
}
```

#### Accept Consent
```http
POST /v1/telemedicine/consent/accept
Authorization: Bearer <token>
Content-Type: application/json

{
  "templateId": "uuid",
  "consultationId": "uuid",
  "signatureDataUrl": "data:image/png;base64,...",
  "scrolledToEnd": true,
  "timeSpentSeconds": 120,
  "geolocation": {
    "latitude": 13.7563,
    "longitude": 100.5018,
    "accuracy": 10
  }
}
```

Response:
```json
{
  "success": true,
  "consentId": "uuid",
  "pdfUrl": "https://minio.../consent.pdf",
  "message": "Consent accepted successfully"
}
```

#### Withdraw Consent
```http
POST /v1/telemedicine/consent/withdraw
Authorization: Bearer <token>
Content-Type: application/json

{
  "consentId": "uuid",
  "reason": "I no longer wish to use telemedicine services"
}
```

#### Get Consent History
```http
GET /v1/telemedicine/consent/history
Authorization: Bearer <token>
```

### Admin Endpoints

#### Create Consent Template
```http
POST /v1/telemedicine/consent/template
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "version": "1.1.0",
  "language": "th",
  "title": "ข้อตกลงและยินยอม...",
  "content": "# Markdown content...",
  "clauses": [
    {
      "id": "tech-limitations",
      "title": "ข้อจำกัดของเทคโนโลยี",
      "content": "...",
      "required": true
    }
  ],
  "effectiveFrom": "2025-02-01T00:00:00Z",
  "effectiveUntil": null
}
```

#### Deactivate Template
```http
POST /v1/telemedicine/consent/template/:id/deactivate
Authorization: Bearer <admin-token>
```

## Database Schema

### consent_templates
- `id`: UUID primary key
- `version`: Semantic version (e.g., "1.0.0")
- `language`: Language code ("th", "en")
- `title`: Template title
- `content`: Markdown content
- `clauses`: JSONB array of consent clauses
- `is_active`: Boolean flag
- `effective_from`: Start date
- `effective_until`: End date (nullable)
- `created_by`: Staff ID who created template
- `created_at`: Timestamp

### patient_consents
- `id`: UUID primary key
- `patient_id`: Foreign key to patients
- `template_id`: Foreign key to consent_templates
- `consultation_id`: Foreign key to video_consultations (nullable)
- `accepted`: Boolean
- `accepted_at`: Timestamp
- `signature_url`: MinIO URL to signature image
- `scrolled_to_end`: Boolean
- `time_spent_seconds`: Integer
- `ip_address`: VARCHAR(45)
- `device_id`: VARCHAR(255)
- `user_agent`: TEXT
- `geolocation`: JSONB {lat, lng, accuracy}
- `withdrawn_at`: Timestamp (nullable)
- `withdrawal_reason`: TEXT (nullable)
- `pdf_url`: MinIO URL to signed PDF
- `pdf_generated_at`: Timestamp
- `created_at`: Timestamp

## Consent Template Format

Templates are written in Markdown with the following structure:

```markdown
# ข้อตกลงและยินยอมการรับบริการเภสัชกรรมทางไกล

**เวอร์ชัน 1.0.0**

## 1. ข้อจำกัดของเทคโนโลยี
[Content explaining technology limitations]

## 2. ขอบเขตการให้บริการ
[Content explaining service scope]

## 3. หน้าที่ในการปฏิบัติตามคำแนะนำ
[Content explaining patient responsibilities]

## 4. ความเป็นส่วนตัวและการบันทึกข้อมูล
[Content explaining privacy and data recording]

## 5. การยกเลิกความยินยอม
[Content explaining withdrawal process]

## คำยืนยัน
[Confirmation statement]
```

## Validation Rules

### Consent Acceptance
1. **Scroll Tracking**: `scrolledToEnd` must be `true`
2. **Minimum Time**: `timeSpentSeconds` must be ≥ 30 seconds
3. **Signature Required**: `signatureDataUrl` must be valid base64 image
4. **Template Active**: Template must be active and not expired
5. **Metadata Required**: IP address, device ID, user agent must be captured

### Consent Withdrawal
1. **Ownership**: Patient can only withdraw their own consents
2. **Already Withdrawn**: Cannot withdraw already withdrawn consent
3. **Reason Required**: Withdrawal reason must be 10-500 characters
4. **Processing Time**: 7 business days processing period

## Security Features

### Data Protection
- **Encryption at Rest**: All sensitive data encrypted in MinIO
- **Encryption in Transit**: TLS 1.3 for all API calls
- **Data Residency**: All data stored in Thailand data centers
- **Access Control**: Role-based access control (RBAC)

### Non-Repudiation
- **Digital Signature**: Patient signature captured and stored
- **Timestamp**: NTP-synchronized timestamps
- **IP Address**: Source IP recorded
- **Device ID**: Device identifier recorded
- **Geolocation**: GPS coordinates (if available)
- **PDF Hash**: SHA-256 hash for document verification

### Audit Trail
- All consent actions logged to `telemedicine_audit_log`
- Immutable log entries with hash chaining
- 10-year retention period

## Integration Points

### MinIO Storage
- **Bucket**: `telemedicine-documents`
- **Signature Path**: `consent-signatures/{patientId}/{timestamp}.png`
- **PDF Path**: `consent-pdfs/{patientId}/{consentId}.pdf`

### PDF Generation
- Uses PDFKit library
- Includes patient signature
- Includes consent metadata
- Includes document hash for verification
- PDF/A format for long-term archival

### Audit Service
- Logs all consent actions
- Integrates with telemedicine audit trail
- Provides non-repudiation guarantees

## Testing

### Unit Tests
```bash
cd apps/api
pnpm test consent.service.spec.ts
```

### Integration Tests
```bash
cd apps/api
pnpm test:e2e consent.e2e-spec.ts
```

## Compliance

### Thai Regulations
- **Medical Practice Act B.E. 2542**: 10-year record retention
- **Medical Council Announcement 012/2563**: Telemedicine consent requirements
- **PDPA B.E. 2562**: Personal data protection and consent management

### Requirements Satisfied
- ✅ Requirement 3.1: Thai language consent document
- ✅ Requirement 3.2: Scroll tracking before acceptance
- ✅ Requirement 3.3: Plain language (8th-grade reading level)
- ✅ Requirement 3.4: Technology limitations acknowledgment
- ✅ Requirement 3.5: Referral agreement
- ✅ Requirement 3.6: Responsibility transfer acknowledgment
- ✅ Requirement 3.7: Digital signature capture
- ✅ Requirement 3.8: Metadata recording (IP, device, geolocation)
- ✅ Requirement 3.9: Audit trail with non-repudiation
- ✅ Requirement 3.10: Semantic versioning
- ✅ Requirement 3.11: Re-acceptance on template update
- ✅ Requirement 3.12: Withdrawal mechanism (7-day processing)
- ✅ Requirement 3.13: PDF generation for download
- ✅ Requirement 3.14: Active consent validation

## Future Enhancements

1. **Multi-language Support**: Add English consent templates
2. **Video Consent**: Record video of patient reading and accepting consent
3. **Biometric Signature**: Use fingerprint or face recognition for signature
4. **Smart Contract**: Blockchain-based consent management
5. **AI Readability**: Automatic readability score calculation
6. **Consent Analytics**: Dashboard for consent acceptance rates
