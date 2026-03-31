# MinIO Telemedicine Bucket Setup

## Automatic Initialization

The telemedicine buckets are automatically created when you run `docker compose up`. The `minio-init` service in docker-compose.yml creates the following buckets:

- `telemedicine-documents` - KYC documents, ID cards, consent forms
- `telemedicine-recordings` - Video consultation recordings
- `telemedicine-referrals` - Emergency referral letters (PDF)
- `audit-reports` - Compliance audit reports

## Manual Setup (if needed)

If you need to manually create or reconfigure the buckets, run:

```bash
# Start MinIO
docker compose up -d minio

# Wait for MinIO to be healthy
sleep 5

# Run the initialization script
docker compose run --rm minio-init sh /scripts/init-telemedicine-buckets.sh
```

## Bucket Configuration

All telemedicine buckets are configured with:
- **Private access** (no anonymous access)
- **Versioning enabled** (track all changes)
- **Encryption at rest** (AES-256)
- **Retention policies**:
  - `telemedicine-recordings`: 5 years (GOVERNANCE mode)
  - `audit-reports`: 10 years (COMPLIANCE mode)

## Data Residency Compliance

All buckets are stored locally in the MinIO container. For production:

1. Deploy MinIO in Thailand data center
2. Configure backup replication to secondary Thailand location
3. Ensure no cross-border data transfer
4. Enable audit logging for all bucket access

## Accessing Buckets

### MinIO Console
- URL: http://localhost:9001
- Username: minioadmin (or MINIO_ACCESS_KEY from .env)
- Password: minioadmin (or MINIO_SECRET_KEY from .env)

### API Access
```typescript
import { S3Client } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  endpoint: 'http://localhost:9000',
  region: 'us-east-1', // MinIO default
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY,
    secretAccessKey: process.env.MINIO_SECRET_KEY,
  },
  forcePathStyle: true, // Required for MinIO
});
```

## Monitoring

Monitor bucket usage:
```bash
# Check bucket sizes
docker exec telepharmacy-minio mc du local/telemedicine-recordings

# List all buckets
docker exec telepharmacy-minio mc ls local/

# Check bucket policy
docker exec telepharmacy-minio mc anonymous get local/telemedicine-documents
```

## Backup Strategy

For production, configure:
1. Daily snapshots to separate storage
2. Replication to secondary MinIO instance
3. Offsite backup to Thailand-based cloud storage
4. Test restore procedures monthly
