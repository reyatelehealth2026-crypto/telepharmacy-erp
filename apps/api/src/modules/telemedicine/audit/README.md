# Telemedicine Audit Trail Module

Medical-grade audit trail system with blockchain-inspired hash chaining for tamper detection and court-admissible evidence.

## Features

- **Hash Chaining**: Blockchain-inspired linked hash structure using SHA-256
- **Encryption**: AES-256-GCM encryption for sensitive metadata
- **Append-Only**: Immutable log entries (enforced at database level)
- **Search & Reporting**: Flexible search with CSV/PDF export
- **Chain Integrity Verification**: Detect any tampering attempts
- **10-Year Retention**: Compliant with Thai medical records law

## Architecture

### Hash Chain Structure

Each audit log entry contains:
- `previousHash`: SHA-256 hash of the previous entry
- `currentHash`: SHA-256 hash of current entry (calculated from all fields)
- Timestamp with millisecond precision
- Actor information (ID, type)
- Action and entity details
- Encrypted metadata

```
Entry 1: previousHash: 0000... → currentHash: abc123...
Entry 2: previousHash: abc123... → currentHash: def456...
Entry 3: previousHash: def456... → currentHash: ghi789...
```

Any modification to an entry breaks the chain, making tampering detectable.

### Encryption

Sensitive metadata is encrypted using AES-256-GCM:
- 256-bit encryption key (32 bytes)
- Random 16-byte IV per entry
- Authentication tag for integrity verification
- Format: `iv:authTag:encryptedData` (all in hex)

## Usage

### Logging Events

```typescript
import { TelemedicineAuditService } from './audit/audit.service';

@Injectable()
export class MyService {
  constructor(private readonly auditService: TelemedicineAuditService) {}

  async performAction() {
    // ... your business logic ...

    // Log the action
    await this.auditService.log({
      actorId: user.id,
      actorType: 'pharmacist',
      actionType: 'prescription_created',
      entityType: 'prescription',
      entityId: prescription.id,
      metadata: {
        patientId: patient.id,
        medications: ['Metformin 500mg'],
      },
      ipAddress: request.ip,
      sessionId: request.session.id,
    });
  }
}
```

### Searching Logs

```typescript
const result = await auditService.search({
  actorId: 'user-123',
  actionType: 'kyc_verification',
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31'),
  limit: 100,
  offset: 0,
});

console.log(`Found ${result.total} entries`);
result.logs.forEach(log => {
  console.log(`${log.timestamp}: ${log.actionType} by ${log.actorType}`);
});
```

### Verifying Chain Integrity

```typescript
const verification = await auditService.verifyChainIntegrity(
  new Date('2024-01-01'),
  new Date('2024-12-31')
);

if (verification.valid) {
  console.log('Chain integrity verified ✓');
} else {
  console.error('Chain integrity compromised!');
  verification.errors.forEach(error => console.error(error));
}
```

### Exporting Reports

```typescript
// CSV export
const csv = await auditService.exportToCsv({
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31'),
});

// PDF export (via AuditReportService)
const pdfBuffer = await reportService.generatePdfReport({
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31'),
});
```

## API Endpoints

### Search Logs
```
GET /v1/telemedicine/audit/search
Query params: actorId, actorType, actionType, entityType, entityId, startDate, endDate, limit, offset
Auth: super_admin
```

### Verify Integrity
```
GET /v1/telemedicine/audit/verify-integrity
Query params: startDate, endDate
Auth: super_admin
```

### Export CSV
```
GET /v1/telemedicine/audit/export/csv
Query params: actorId, actorType, actionType, entityType, entityId, startDate, endDate
Auth: super_admin
```

### Export PDF
```
GET /v1/telemedicine/audit/export/pdf
Query params: actorId, actorType, actionType, entityType, entityId, startDate, endDate
Auth: super_admin
```

## Configuration

Required environment variables:

```env
# 32-byte encryption key in hex format (64 characters)
AUDIT_ENCRYPTION_KEY=484e000ca3bddc03dddf6c80f79a9ebc7747b0d0eba459b65e3dfd793f622ad8
```

Generate a secure key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Database Schema

The audit log uses an append-only table with database-level constraints:

```sql
CREATE TABLE telemedicine_audit_log (
  id UUID PRIMARY KEY,
  previous_hash VARCHAR(64) NOT NULL,
  current_hash VARCHAR(64) NOT NULL UNIQUE,
  timestamp TIMESTAMPTZ(3) NOT NULL,
  actor_id UUID NOT NULL,
  actor_type VARCHAR(20) NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  geolocation JSONB,
  session_id VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prevent updates and deletes
CREATE RULE no_update AS ON UPDATE TO telemedicine_audit_log DO INSTEAD NOTHING;
CREATE RULE no_delete AS ON DELETE TO telemedicine_audit_log DO INSTEAD NOTHING;
```

## Common Action Types

- `kyc_verification_started`
- `kyc_verification_completed`
- `kyc_verification_failed`
- `consultation_requested`
- `consultation_started`
- `consultation_completed`
- `consultation_referred`
- `scope_validation`
- `scope_validation_override`
- `consent_accepted`
- `consent_withdrawn`
- `prescription_created`
- `prescription_dispensed`
- `emergency_referral_created`
- `video_recording_started`
- `video_recording_completed`
- `license_verification`
- `data_access`
- `data_export`

## Security Considerations

1. **Encryption Key Management**: Store the encryption key securely (e.g., AWS Secrets Manager, HashiCorp Vault)
2. **Access Control**: Only super_admin role can access audit logs
3. **Data Retention**: Logs are retained for 10 years minimum
4. **Backup**: Replicate logs to geographically separate location
5. **Monitoring**: Alert on chain integrity failures
6. **Court Admissibility**: Hash chain provides non-repudiation guarantee

## Compliance

This audit trail system meets:
- Thai Ministry of Public Health Telemedicine 2569 requirements
- PDPA (Personal Data Protection Act) audit trail requirements
- Medical records retention law (10 years minimum)
- Court-admissible evidence standards

## Testing

Run unit tests:
```bash
pnpm --filter @telepharmacy/api test audit.service.spec
```

## Troubleshooting

### "Audit encryption key must be a 64-character hex string"
- Ensure `AUDIT_ENCRYPTION_KEY` is set in `.env`
- Key must be exactly 64 hex characters (32 bytes)

### "Chain integrity compromised"
- Check database for unauthorized modifications
- Review database access logs
- Investigate potential security breach

### "Invalid encrypted data format"
- Encryption key may have changed
- Database corruption possible
- Contact system administrator
