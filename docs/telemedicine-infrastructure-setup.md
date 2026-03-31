# Telemedicine 2569 Compliance - Infrastructure Setup Guide

## Overview

This document describes the infrastructure setup for the Telemedicine 2569 Legal Compliance feature, including database schemas, MinIO buckets, Redis namespaces, and external service integrations.

## Database Schema

### Tables Created

The following tables have been added to support telemedicine compliance:

1. **kyc_verifications** - Patient identity verification records
2. **video_consultations** - Video consultation sessions
3. **consent_templates** - E-consent document templates
4. **patient_consents** - Patient consent acceptance records
5. **scope_rules** - Consultation scope validation rules
6. **scope_validation_results** - Scope validation outcomes
7. **emergency_referrals** - Emergency hospital referrals
8. **telemedicine_audit_log** - Immutable audit trail with hash chain
9. **pharmacist_license_verifications** - Pharmacist license tracking

### Running Migrations

```bash
# Generate migration (already done)
cd packages/db
pnpm db:generate

# Push to database (development)
pnpm db:push

# Run migrations (production)
pnpm db:migrate
```

### Audit Log Immutability

The `telemedicine_audit_log` table is append-only. To enforce this in PostgreSQL:

```sql
-- Prevent updates and deletes
CREATE RULE no_update AS ON UPDATE TO telemedicine_audit_log DO INSTEAD NOTHING;
CREATE RULE no_delete AS ON DELETE TO telemedicine_audit_log DO INSTEAD NOTHING;

-- Verify rules are active
SELECT * FROM pg_rules WHERE tablename = 'telemedicine_audit_log';
```

## MinIO Storage

### Buckets

Four buckets are created for telemedicine data:

| Bucket | Purpose | Retention | Access |
|--------|---------|-----------|--------|
| `telemedicine-documents` | KYC documents, ID cards | Indefinite | Private |
| `telemedicine-recordings` | Video consultation recordings | 5 years | Private |
| `telemedicine-referrals` | Emergency referral letters | Indefinite | Private |
| `audit-reports` | Compliance audit reports | 10 years | Private |

### Automatic Setup

Buckets are automatically created when running `docker compose up`. The `minio-init` service handles initialization.

### Manual Setup

If needed, manually create buckets:

```bash
# Access MinIO container
docker exec -it telepharmacy-minio sh

# Create buckets
mc alias set local http://localhost:9000 minioadmin minioadmin
mc mb local/telemedicine-documents
mc mb local/telemedicine-recordings
mc mb local/telemedicine-referrals
mc mb local/audit-reports

# Set private access
mc anonymous set none local/telemedicine-documents
mc anonymous set none local/telemedicine-recordings
mc anonymous set none local/telemedicine-referrals
mc anonymous set none local/audit-reports

# Enable versioning
mc version enable local/telemedicine-documents
mc version enable local/telemedicine-recordings
mc version enable local/telemedicine-referrals
mc version enable local/audit-reports
```

### Accessing MinIO Console

- URL: http://localhost:9001
- Username: `minioadmin` (or `MINIO_ACCESS_KEY` from .env)
- Password: `minioadmin` (or `MINIO_SECRET_KEY` from .env)

## Redis Configuration

### Namespaces

All telemedicine data uses prefixed keys:

- `kyc:otp:{verificationId}` - OTP codes (TTL: 5 min)
- `kyc:session:{patientId}` - KYC session state (TTL: 24 hours)
- `consultation:session:{sessionId}` - Active consultations (TTL: 24 hours)
- `agora:token:{sessionId}` - Agora RTC tokens (TTL: 24 hours)
- `consent:scroll:{patientId}:{templateId}` - Scroll tracking (TTL: 1 hour)
- `scope:cache:{ruleId}` - Cached scope rules (TTL: 1 hour)
- `license:cache:{pharmacistId}` - License verification cache (TTL: 24 hours)
- `audit:hash-chain:latest` - Latest audit log hash (persistent)

See `infra/redis/telemedicine-config.md` for complete documentation.

## External Services

### Required Services

1. **AWS Rekognition** (Face Verification)
   - Region: `ap-southeast-1` (Bangkok)
   - Required for liveness detection and face comparison
   - Configure: `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`

2. **Agora.io** (Video Platform)
   - Edge servers in Thailand
   - Required for video consultations
   - Configure: `AGORA_APP_ID`, `AGORA_APP_CERTIFICATE`

3. **ThaiSMS** (OTP Delivery)
   - Local Thai SMS gateway
   - Required for phone verification
   - Configure: `THAI_SMS_API_KEY`, `THAI_SMS_SENDER`

4. **Google Gemini 2.5 Pro** (Already configured)
   - Used for OCR (ID card extraction)
   - Used for speech-to-text (consultation transcripts)
   - Already configured via `GEMINI_API_KEY`

### Optional Services

1. **Thai Pharmacy Council API**
   - Automatic license verification
   - Configure: `PHARMACY_COUNCIL_API_URL`, `PHARMACY_COUNCIL_API_KEY`
   - Falls back to manual verification if unavailable

## Environment Variables

Add to your `.env` file:

```bash
# AWS Rekognition (Thailand region)
AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key

# Agora.io Video Platform
AGORA_APP_ID=your_agora_app_id
AGORA_APP_CERTIFICATE=your_agora_certificate

# ThaiSMS OTP Delivery
THAI_SMS_API_KEY=your_thai_sms_key
THAI_SMS_SENDER=Telepharmacy

# Audit Trail Encryption (generate with: openssl rand -hex 32)
AUDIT_ENCRYPTION_KEY=your_64_char_hex_string

# Thai Pharmacy Council API (optional)
PHARMACY_COUNCIL_API_URL=https://api.pharmacycouncil.org
PHARMACY_COUNCIL_API_KEY=your_api_key
```

## Data Residency Compliance

### Thailand-Only Storage

All sensitive data MUST be stored in Thailand:

1. **PostgreSQL**: Deploy in Thailand data center
2. **MinIO**: Deploy in Thailand data center
3. **Redis**: Deploy in Thailand data center
4. **AWS Services**: Use `ap-southeast-1` (Bangkok) region only

### Verification

Check data residency compliance:

```typescript
// In telemedicine.config.ts
dataResidency: {
  allowedRegions: ['th', 'thailand', 'ap-southeast-1'],
  enforceThailandOnly: true,
}
```

## Security Configuration

### Encryption

1. **Data at Rest**:
   - PostgreSQL: Enable transparent data encryption (TDE)
   - MinIO: AES-256 encryption enabled on all buckets
   - Redis: AOF persistence with encryption

2. **Data in Transit**:
   - TLS 1.3 for all API connections
   - Agora.io end-to-end encryption for video
   - HTTPS only in production

3. **Audit Trail**:
   - SHA-256 hash chain for tamper detection
   - AES-256-GCM encryption for sensitive metadata
   - Append-only database rules

### Access Control

1. **MinIO**: Private buckets, no anonymous access
2. **Redis**: AUTH enabled in production
3. **PostgreSQL**: Role-based access control (RBAC)
4. **API**: JWT authentication with role-based permissions

## Monitoring & Compliance

### Health Checks

Monitor these endpoints:

- PostgreSQL: `pg_isready`
- Redis: `redis-cli ping`
- MinIO: `mc admin info`
- Agora: Check connection quality metrics

### Compliance Metrics

Track these KPIs:

- KYC verification success rate (target: >95%)
- Video consultation completion rate (target: >90%)
- Audit log completeness (target: 100%)
- Data residency compliance (target: 100%)
- License verification status (target: 100%)

### Backup Strategy

1. **Database**: Daily automated backups, 30-day retention
2. **MinIO**: Versioning enabled, replicate to secondary Thailand location
3. **Redis**: AOF persistence, daily snapshots
4. **Audit Logs**: Replicate to separate append-only storage

## Testing Infrastructure

### Local Development

```bash
# Start all services
docker compose up -d

# Verify services are healthy
docker compose ps

# Check MinIO buckets
docker exec telepharmacy-minio mc ls local/

# Check Redis
docker exec telepharmacy-redis redis-cli ping

# Check PostgreSQL
docker exec telepharmacy-postgres psql -U user -d telepharmacy -c "\dt"
```

### Verify Telemedicine Tables

```bash
# Connect to PostgreSQL
docker exec -it telepharmacy-postgres psql -U user -d telepharmacy

# List telemedicine tables
\dt *kyc*
\dt *consultation*
\dt *consent*
\dt *referral*
\dt *audit*
\dt *license*

# Check audit log rules
SELECT * FROM pg_rules WHERE tablename = 'telemedicine_audit_log';
```

## Production Deployment

### Pre-Deployment Checklist

- [ ] All services deployed in Thailand data centers
- [ ] TLS certificates configured
- [ ] Environment variables set (no defaults)
- [ ] Database migrations run successfully
- [ ] MinIO buckets created with correct policies
- [ ] Redis AUTH enabled
- [ ] Audit log immutability rules applied
- [ ] Backup systems configured and tested
- [ ] Monitoring and alerting configured
- [ ] External service credentials validated
- [ ] Data residency compliance verified

### Post-Deployment Verification

1. Test KYC flow end-to-end
2. Test video consultation with recording
3. Verify audit logs are being written
4. Check MinIO bucket access controls
5. Verify data is stored in Thailand only
6. Test backup and restore procedures

## Troubleshooting

### MinIO Buckets Not Created

```bash
# Manually run init script
docker compose run --rm minio-init

# Or create manually
docker exec -it telepharmacy-minio sh
mc alias set local http://localhost:9000 minioadmin minioadmin
mc mb local/telemedicine-documents
```

### Audit Log Rules Not Applied

```sql
-- Connect to database
docker exec -it telepharmacy-postgres psql -U user -d telepharmacy

-- Apply rules manually
CREATE RULE no_update AS ON UPDATE TO telemedicine_audit_log DO INSTEAD NOTHING;
CREATE RULE no_delete AS ON DELETE TO telemedicine_audit_log DO INSTEAD NOTHING;
```

### Redis Connection Issues

```bash
# Check Redis is running
docker compose ps redis

# Test connection
docker exec telepharmacy-redis redis-cli ping

# Check logs
docker compose logs redis
```

## Support

For infrastructure issues:
1. Check service logs: `docker compose logs [service-name]`
2. Verify environment variables in `.env`
3. Review this documentation
4. Contact DevOps team for production issues
