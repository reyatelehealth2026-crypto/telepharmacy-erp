# PDPA Compliance Module

**Task 11: PDPA Compliance & Data Residency**

Implements Thai Personal Data Protection Act (PDPA) compliance for the telemedicine system.

## Features

### Data Subject Rights

1. **Right to Access** - Patient data export
2. **Right to Erasure** - Data deletion with anonymization
3. **Right to Consent** - Consent preference management
4. **Right to Data Portability** - JSON export format

### Data Protection

- **Data Residency**: All data stored in Thailand
- **Encryption**: AES-256 for data at rest, TLS 1.3 in transit
- **Access Logging**: All data access tracked in audit trail
- **Retention Policy**: 10-year medical records retention

## API Endpoints

### POST /v1/telemedicine/pdpa/export-request
Request patient data export (30-day SLA)

**Request Body:**
```json
{
  "patientId": "uuid",
  "requestReason": "ขอข้อมูลส่วนบุคคล",
  "deliveryMethod": "email" | "download"
}
```

**Response:**
```json
{
  "requestId": "uuid",
  "status": "pending",
  "estimatedCompletionDate": "2026-04-30T00:00:00Z"
}
```

### GET /v1/telemedicine/pdpa/export/:patientId
Get complete patient data export

**Response:**
```json
{
  "exportDate": "2026-03-31T10:00:00Z",
  "exportVersion": "1.0.0",
  "patient": { ... },
  "kycVerifications": [ ... ],
  "consultations": [ ... ],
  "consents": [ ... ],
  "referrals": [ ... ],
  "metadata": { ... }
}
```

### POST /v1/telemedicine/pdpa/deletion-request
Request patient data deletion (30-day SLA)

**Request Body:**
```json
{
  "patientId": "uuid",
  "deletionReason": "ขอลบข้อมูลส่วนบุคคล",
  "confirmationCode": "123456"
}
```

**Response:**
```json
{
  "requestId": "uuid",
  "status": "pending",
  "estimatedCompletionDate": "2026-04-30T00:00:00Z",
  "retentionNotice": "ข้อมูลทางการแพทย์จะถูกเก็บไว้เป็นเวลา 10 ปีตามกฎหมาย"
}
```

### GET /v1/telemedicine/pdpa/consent-status
Get patient consent preferences

**Query Parameters:**
- `patientId`: Patient UUID

**Response:**
```json
{
  "marketingConsent": false,
  "researchConsent": false,
  "thirdPartySharing": false,
  "dataRetentionConsent": true,
  "lastUpdated": "2026-03-31T10:00:00Z"
}
```

### POST /v1/telemedicine/pdpa/consent
Update patient consent preferences

**Query Parameters:**
- `patientId`: Patient UUID

**Request Body:**
```json
{
  "marketingConsent": true,
  "researchConsent": false,
  "thirdPartySharing": false,
  "dataRetentionConsent": true
}
```

### GET /v1/telemedicine/pdpa/data-residency
Verify data residency compliance

**Response:**
```json
{
  "compliant": true,
  "checks": {
    "database": { "location": "localhost", "compliant": true },
    "storage": { "location": "localhost:9000", "compliant": true },
    "cache": { "location": "localhost", "compliant": true }
  }
}
```

### GET /v1/telemedicine/pdpa/compliance-report
Generate PDPA compliance report

**Query Parameters:**
- `startDate`: ISO date string
- `endDate`: ISO date string

**Response:**
```json
{
  "period": { "start": "2026-03-01", "end": "2026-03-31" },
  "dataExportRequests": 5,
  "dataDeletionRequests": 2,
  "dataAccessLogs": 150,
  "consentUpdates": 10,
  "dataResidencyCompliant": true
}
```

## Data Anonymization

When processing deletion requests:

1. **Personal Identifiers Removed:**
   - Name → "DELETED"
   - Phone number → null
   - Email → null
   - LINE User ID → null
   - Address → null
   - National ID → null

2. **Medical Records Retained:**
   - Consultations (anonymized)
   - Referrals (anonymized)
   - Audit logs (immutable)

3. **Retention Period:**
   - Medical records: 10 years
   - Audit logs: 10 years
   - Personal data: Deleted immediately

## Data Residency Requirements

All data must be stored in Thailand:

- **Database**: PostgreSQL in Thailand data center
- **Storage**: MinIO in Thailand
- **Cache**: Redis in Thailand
- **Backups**: Thailand-only replication

## Compliance Checklist

- [x] Data export API (30-day SLA)
- [x] Data deletion API (30-day SLA)
- [x] Consent management
- [x] Data residency verification
- [x] Access logging
- [x] Encryption (AES-256 + TLS 1.3)
- [x] 10-year retention policy
- [ ] RBAC with MFA (pending)
- [ ] Background job processors (pending)

## Environment Variables

```bash
# PDPA Configuration
PDPA_DATA_RETENTION_YEARS=10
PDPA_EXPORT_SLA_DAYS=30
PDPA_DELETION_SLA_DAYS=30
AUDIT_ENCRYPTION_KEY=<256-bit hex key>
```

## Testing

```bash
# Unit tests
pnpm test pdpa.service.spec.ts

# Integration tests
pnpm test:e2e pdpa.e2e-spec.ts
```

## Related Modules

- **Audit Module**: Logs all PDPA actions
- **KYC Module**: Handles identity verification data
- **Consultation Module**: Manages consultation records

## References

- Thai PDPA Act B.E. 2562 (2019)
- Requirements 8.1-8.14
- Task 11 in implementation plan
