# Telemedicine Module - Quick Start Guide

Get up and running with the Telemedicine module in 5 minutes.

## Prerequisites

- Node.js ≥ 20
- pnpm 10.28+
- PostgreSQL 16
- Redis 7
- MinIO (S3-compatible storage)
- Docker & Docker Compose (for local development)

## 1. Environment Setup

Copy `.env.example` to `.env` and configure:

```bash
# Required for basic functionality
AGORA_APP_ID=your_agora_app_id
AGORA_APP_CERTIFICATE=your_agora_certificate
AWS_REKOGNITION_REGION=ap-southeast-1
AWS_REKOGNITION_ACCESS_KEY=your_aws_key
AWS_REKOGNITION_SECRET_KEY=your_aws_secret
THAI_SMS_API_KEY=your_sms_api_key
AUDIT_ENCRYPTION_KEY=generate_256_bit_hex_key

# Optional (has fallbacks)
PHARMACY_COUNCIL_API_KEY=your_api_key
```

### Generate Audit Encryption Key

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 2. Start Infrastructure

```bash
# Start PostgreSQL, Redis, MinIO
docker compose up -d
```

## 3. Database Setup

```bash
# Generate and run migrations
cd packages/db
pnpm db:generate
pnpm db:migrate

# Seed scope rules (optional but recommended)
pnpm tsx src/seed/seed-scope-rules.script.ts
```

## 4. Create MinIO Buckets

```bash
# Using MinIO client (mc)
mc alias set local http://localhost:9000 minioadmin minioadmin

mc mb local/telemedicine-documents
mc mb local/telemedicine-recordings
mc mb local/telemedicine-referrals
mc mb local/audit-reports

# Set immutable policy on recordings
mc retention set --default COMPLIANCE "5y" local/telemedicine-recordings
```

Or use MinIO Console at http://localhost:9001

## 5. Start API Server

```bash
cd apps/api
pnpm dev
```

API will be available at http://localhost:3000

## 6. Test the API

### Check Health

```bash
curl http://localhost:3000/health
```

### Test KYC Upload (Mock)

```bash
curl -X POST http://localhost:3000/v1/telemedicine/kyc/upload-document \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "test-patient-id",
    "documentType": "national_id",
    "documentImage": "base64_encoded_image_here"
  }'
```

### Get Active Consent Template

```bash
curl http://localhost:3000/v1/telemedicine/consent/current
```

### Validate Consultation Scope

```bash
curl -X POST http://localhost:3000/v1/telemedicine/scope/validate \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "test-patient-id",
    "consultationType": "follow_up_chronic",
    "chiefComplaint": "ขอยาประจำ",
    "symptoms": ["ไม่มีอาการผิดปกติ"],
    "requestedMedications": ["metformin"]
  }'
```

## 7. View API Documentation

Open http://localhost:3000/api/docs in your browser to see Swagger documentation.

## Common Tasks

### Run Tests

```bash
cd apps/api
pnpm test telemedicine
```

### Check Audit Trail Integrity

```bash
curl -X POST http://localhost:3000/v1/telemedicine/audit/verify-integrity
```

### List Expiring Licenses

```bash
curl http://localhost:3000/v1/telemedicine/licenses/expiring
```

### Generate Compliance Report

```bash
curl http://localhost:3000/v1/telemedicine/licenses/compliance-report
```

## Module Structure

```
telemedicine/
├── kyc/              # Identity verification
├── audit/            # Audit trail
├── consent/          # E-consent system
├── scope/            # Scope validation
├── consultation/     # Video consultations
├── referral/         # Emergency referrals
└── license/          # License verification
```

## Key Concepts

### 1. KYC Flow

```
Upload ID → Liveness Check → Face Compare → OTP → Email → Verified
```

### 2. Consultation Flow

```
Request → Scope Validation → Accept Consent → Pharmacist Accepts → 
Video Call → End Session → Recording Saved
```

### 3. Referral Flow

```
Create Referral → Generate PDF → Send Notifications → 
Patient Acknowledges → Follow-up (if needed)
```

### 4. Audit Trail

All actions are logged in an immutable hash chain:

```typescript
await auditService.log({
  actorId: 'user-id',
  actorType: 'patient',
  actionType: 'consultation_requested',
  entityType: 'consultation',
  entityId: 'consultation-id',
  metadata: { /* any data */ },
});
```

## Troubleshooting

### Database Connection Error

```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Check connection string in .env
DATABASE_URL=postgresql://user:password@localhost:5432/telepharmacy
```

### MinIO Connection Error

```bash
# Check MinIO is running
docker ps | grep minio

# Check MinIO config in .env
MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
```

### Redis Connection Error

```bash
# Check Redis is running
docker ps | grep redis

# Check Redis config in .env
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Agora Token Generation Error

Make sure you have valid Agora credentials:

```bash
AGORA_APP_ID=your_app_id
AGORA_APP_CERTIFICATE=your_certificate
```

Get credentials from https://console.agora.io

## Development Tips

### 1. Use Mock Data

For development, you can use mock patient/pharmacist IDs:

```typescript
const mockPatientId = 'mock-patient-id';
const mockPharmacistId = 'mock-pharmacist-id';
```

### 2. Skip External Services

Set environment variables to skip external service calls:

```bash
SKIP_AWS_REKOGNITION=true
SKIP_THAI_SMS=true
```

### 3. View Logs

```bash
# API logs
cd apps/api
pnpm dev | pnpm pino-pretty

# Database logs
docker logs -f telepharmacy-postgres

# Redis logs
docker logs -f telepharmacy-redis
```

### 4. Reset Database

```bash
cd packages/db
pnpm db:push --force
pnpm tsx src/seed/seed-scope-rules.script.ts
```

## Next Steps

1. Read the full documentation: `apps/api/src/modules/telemedicine/README.md`
2. Review implementation summary: `docs/task-7-15-implementation-summary.md`
3. Check compliance status: `docs/TELEMEDICINE_STATUS.md`
4. Explore API endpoints in Swagger: http://localhost:3000/api/docs

## Support

- Implementation docs: `docs/`
- Module README: `apps/api/src/modules/telemedicine/README.md`
- Task tracking: `.kiro/specs/telemedicine-2569-compliance/tasks.md`

## Quick Reference

### Important URLs

- API: http://localhost:3000
- API Docs: http://localhost:3000/api/docs
- MinIO Console: http://localhost:9001
- Drizzle Studio: http://localhost:4983 (run `pnpm db:studio`)

### Important Commands

```bash
# Start everything
docker compose up -d && cd apps/api && pnpm dev

# Run tests
pnpm test telemedicine

# Generate migration
cd packages/db && pnpm db:generate

# Run migration
cd packages/db && pnpm db:migrate

# Open Drizzle Studio
cd packages/db && pnpm db:studio

# View logs
docker compose logs -f
```

### Important Files

- Config: `apps/api/src/config/telemedicine.config.ts`
- Schema: `packages/db/src/schema/telemedicine.ts`
- Module: `apps/api/src/modules/telemedicine/telemedicine.module.ts`
- Env: `.env`

---

Happy coding! 🚀
