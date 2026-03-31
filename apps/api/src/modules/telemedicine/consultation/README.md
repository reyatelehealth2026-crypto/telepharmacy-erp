# Video Consultation Module

## Overview

The Video Consultation Module implements medical-grade video consultation infrastructure for Thai telemedicine compliance (Telemedicine 2569). It provides secure, recorded video sessions between patients and pharmacists with full audit trails and regulatory compliance features.

## Features

- **Agora.io Integration**: Medical-grade video platform with Thailand edge servers
- **Cloud Recording**: Automatic recording with Thailand data residency (MinIO)
- **Scope Validation**: Pre-consultation validation against telemedicine scope rules
- **E-Consent Integration**: Patient consent before video sessions
- **Session Management**: Complete lifecycle from request to completion
- **Quality Monitoring**: Network quality, bandwidth, and connection tracking
- **Non-Repudiation**: SHA-256 hashing of recordings for legal evidence
- **Audit Trail**: Complete logging of all consultation events

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Consultation Workflow                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Patient Request → Scope Validation → E-Consent              │
│  2. Pharmacist Accept → Generate Agora Tokens                   │
│  3. Start Session → Begin Cloud Recording                       │
│  4. Video Call → Quality Monitoring                             │
│  5. End Session → Stop Recording → Generate Hash                │
│  6. Store Recording → Queue Transcript Parsing                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Components

### 1. AgoraService

Handles Agora.io platform integration:

- **Token Generation**: RTC tokens with 24-hour expiry
- **Cloud Recording**: Start/stop recording with MinIO storage
- **Resource Management**: Acquire/release recording resources
- **Channel Management**: Generate unique channel names

### 2. ConsultationService

Core business logic for consultations:

- **Request Consultation**: Validate KYC, run scope validation
- **Accept Consent**: Record patient consent acceptance
- **Assign Pharmacist**: Generate tokens for video session
- **Session Management**: Start/end sessions with recording
- **Recording Finalization**: Generate SHA-256 hash, store metadata

### 3. ConsultationController

REST API endpoints:

- `POST /v1/telemedicine/consultations/request` - Request consultation
- `POST /v1/telemedicine/consultations/:id/accept-consent` - Accept e-consent
- `POST /v1/telemedicine/consultations/:id/accept` - Pharmacist accepts
- `GET /v1/telemedicine/consultations/:id/token` - Get patient token
- `POST /v1/telemedicine/consultations/:id/start` - Start video session
- `POST /v1/telemedicine/consultations/:id/end` - End session
- `GET /v1/telemedicine/consultations/:id` - Get consultation details
- `GET /v1/telemedicine/consultations` - List consultations

## Database Schema

### video_consultations

```sql
CREATE TABLE video_consultations (
  id UUID PRIMARY KEY,
  session_id VARCHAR(100) UNIQUE NOT NULL, -- Agora channel name
  
  -- Participants
  patient_id UUID NOT NULL REFERENCES patients(id),
  pharmacist_id UUID REFERENCES staff(id),
  
  -- Consultation details
  type consultation_type NOT NULL,
  status consultation_status DEFAULT 'requested',
  chief_complaint TEXT,
  symptoms JSONB,
  
  -- Scope validation
  scope_validation_result JSONB,
  scope_validated_at TIMESTAMPTZ,
  
  -- E-consent
  consent_version VARCHAR(20),
  consent_accepted_at TIMESTAMPTZ,
  consent_ip_address VARCHAR(45),
  consent_signature_url TEXT,
  
  -- Video session
  agora_token TEXT, -- Encrypted
  agora_uid INTEGER,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  
  -- Recording
  recording_url TEXT, -- MinIO URL
  recording_hash VARCHAR(64), -- SHA-256 for non-repudiation
  recording_size_mb DECIMAL(10,2),
  
  -- Quality metrics
  avg_bandwidth_kbps INTEGER,
  avg_resolution VARCHAR(20),
  avg_frame_rate INTEGER,
  connection_drops INTEGER DEFAULT 0,
  
  -- Outcome
  prescription_id UUID,
  referral_id UUID,
  pharmacist_notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## API Usage Examples

### 1. Request Consultation (Patient)

```typescript
POST /v1/telemedicine/consultations/request
Content-Type: application/json
Authorization: Bearer <patient_token>

{
  "type": "follow_up_chronic",
  "chiefComplaint": "ขอยาความดันโลหิตสูงประจำเดือน",
  "symptoms": ["ความดันโลหิตสูง", "ปวดศีรษะเล็กน้อย"],
  "requestedMedications": [
    {
      "drugName": "Amlodipine",
      "genericName": "amlodipine"
    }
  ]
}

Response:
{
  "consultationId": "uuid",
  "status": "scope_validated",
  "canProceed": true,
  "scopeValidation": {
    "overallResult": "passed",
    "triggeredRules": [],
    "message": "การตรวจสอบขอบเขตการให้บริการผ่าน"
  },
  "consentTemplate": {
    "id": "uuid",
    "version": "1.0.0",
    "title": "ข้อตกลงและยินยอมการรับบริการเภสัชกรรมทางไกล",
    "content": "..."
  },
  "message": "กรุณายอมรับข้อตกลงการให้บริการเภสัชกรรมทางไกล",
  "nextStep": "accept_consent"
}
```

### 2. Accept E-Consent (Patient)

```typescript
POST /v1/telemedicine/consultations/:id/accept-consent
Content-Type: application/json
Authorization: Bearer <patient_token>

{
  "templateId": "uuid",
  "signatureData": "data:image/png;base64,...",
  "scrolledToEnd": true,
  "timeSpentSeconds": 45,
  "ipAddress": "1.2.3.4",
  "deviceId": "device-123",
  "userAgent": "Mozilla/5.0...",
  "geolocation": {
    "latitude": 13.7563,
    "longitude": 100.5018,
    "accuracy": 10
  }
}

Response:
{
  "accepted": true,
  "nextStep": "waiting_for_pharmacist"
}
```

### 3. Pharmacist Accepts Consultation

```typescript
POST /v1/telemedicine/consultations/:id/accept
Authorization: Bearer <pharmacist_token>

Response:
{
  "agoraToken": "006abc123...",
  "channelName": "consultation-uuid",
  "uid": 123456789
}
```

### 4. Get Patient Token

```typescript
GET /v1/telemedicine/consultations/:id/token
Authorization: Bearer <patient_token>

Response:
{
  "agoraToken": "006xyz789...",
  "channelName": "consultation-uuid",
  "uid": 987654321
}
```

### 5. Start Video Session

```typescript
POST /v1/telemedicine/consultations/:id/start
Authorization: Bearer <pharmacist_token>

{
  "actorType": "pharmacist"
}

Response:
{
  "sessionStarted": true,
  "recordingStarted": true
}
```

### 6. End Video Session

```typescript
POST /v1/telemedicine/consultations/:id/end
Authorization: Bearer <pharmacist_token>

{
  "recordingResourceId": "resource-id",
  "recordingSid": "sid-123",
  "avgBandwidthKbps": 1500,
  "avgResolution": "720p",
  "avgFrameRate": 30,
  "connectionDrops": 0,
  "pharmacistNotes": "ให้คำแนะนำการใช้ยาและติดตามอาการ",
  "actorType": "pharmacist"
}

Response:
{
  "sessionEnded": true,
  "recordingUrl": "https://minio.example.com/telemedicine-recordings/..."
}
```

## Configuration

### Environment Variables

```env
# Agora.io Configuration
AGORA_APP_ID=your-app-id
AGORA_APP_CERTIFICATE=your-app-certificate

# MinIO Configuration (Thailand data center)
MINIO_ENDPOINT=https://minio.thailand.example.com
MINIO_ACCESS_KEY=your-access-key
MINIO_SECRET_KEY=your-secret-key
```

### telemedicine.config.ts

```typescript
export const telemedicineConfig = registerAs('telemedicine', () => ({
  agora: {
    appId: process.env.AGORA_APP_ID,
    appCertificate: process.env.AGORA_APP_CERTIFICATE,
    tokenExpirySeconds: 86400, // 24 hours
  },
  
  consultation: {
    minResolution: '720p',
    minFrameRate: 30,
    minBandwidthKbps: 500,
    reconnectTimeoutSeconds: 60,
    maxConcurrentSessions: 10,
  },
  
  storage: {
    recordingsBucket: 'telemedicine-recordings',
  },
}));
```

## Agora.io Setup

### 1. Create Agora Project

1. Sign up at https://console.agora.io
2. Create new project
3. Enable RTC (Real-Time Communication)
4. Enable Cloud Recording
5. Copy App ID and App Certificate

### 2. Configure Cloud Recording

1. Go to Cloud Recording settings
2. Enable "Third-party Cloud Storage"
3. Configure S3-compatible storage (MinIO):
   - Vendor: Custom
   - Region: 0
   - Bucket: telemedicine-recordings
   - Access Key: Your MinIO access key
   - Secret Key: Your MinIO secret key
   - Endpoint: Your MinIO endpoint

### 3. Recording Settings

- **Resolution**: 1280x720 (720p)
- **Frame Rate**: 30 fps
- **Bitrate**: 2000 kbps
- **Max Idle Time**: 120 seconds
- **Layout**: Best fit (automatic)

## Security Features

### 1. Token Security

- Tokens expire after 24 hours
- Separate tokens for patient and pharmacist
- Role-based access (publisher/subscriber)
- Encrypted token storage in database

### 2. Recording Security

- Stored in Thailand data centers only (data residency)
- Encrypted at rest (AES-256)
- SHA-256 hash for non-repudiation
- Immutable storage (no delete operations)
- 5-year retention minimum

### 3. Access Control

- Patient can only access their own consultations
- Pharmacist can only access assigned consultations
- Admin can access all consultations
- Audit log for all access attempts

## Quality Monitoring

The system tracks:

- **Bandwidth**: Average Kbps during session
- **Resolution**: Actual video resolution achieved
- **Frame Rate**: Average FPS
- **Connection Drops**: Number of disconnections
- **Duration**: Total session time in seconds

## Compliance Features

### Thai Telemedicine 2569 Requirements

✅ **Identity Verification**: KYC check before consultation
✅ **Informed Consent**: E-consent with digital signature
✅ **Scope Validation**: Automated rule engine
✅ **Video Recording**: Cloud recording with non-repudiation
✅ **Data Residency**: Thailand storage only
✅ **Audit Trail**: Complete event logging
✅ **Quality Standards**: 720p minimum, 30fps
✅ **Retention**: 5-year minimum storage

## Error Handling

### Common Errors

1. **KYC Not Completed**
   - Status: 400 Bad Request
   - Message: "กรุณายืนยันตัวตน (KYC) ก่อนใช้บริการเภสัชกรรมทางไกล"

2. **Scope Validation Failed**
   - Status: 200 OK (with canProceed: false)
   - Message: Specific rejection reason from scope rules

3. **Consent Not Accepted**
   - Status: 400 Bad Request
   - Message: "สถานะคำขอให้คำปรึกษาไม่ถูกต้อง"

4. **Pharmacist Already Assigned**
   - Status: 403 Forbidden
   - Message: "คำขอให้คำปรึกษานี้ถูกรับโดยเภสัชกรท่านอื่นแล้ว"

5. **Recording Failed**
   - Logged in audit trail
   - Consultation marked as completed with note

## Testing

### Unit Tests

```bash
cd apps/api
pnpm test consultation.service.spec.ts
pnpm test agora.service.spec.ts
```

### Integration Tests

```bash
pnpm test:e2e consultation.e2e-spec.ts
```

### Manual Testing

1. Request consultation with valid patient
2. Accept consent with signature
3. Pharmacist accepts consultation
4. Start video session
5. Simulate video call (use Agora test app)
6. End session and verify recording

## Monitoring

### Key Metrics

- Consultation request rate
- Scope validation pass/fail rate
- Average session duration
- Recording success rate
- Average video quality metrics
- Pharmacist response time

### Alerts

- Recording failure
- Low video quality (< 720p)
- High connection drops (> 3)
- Session timeout (> 60 minutes)
- Storage capacity warnings

## Future Enhancements

- [ ] Real-time transcript generation
- [ ] AI-powered clinical data extraction
- [ ] Automatic prescription generation from transcript
- [ ] Video quality auto-adjustment
- [ ] Multi-pharmacist consultation support
- [ ] Screen sharing for medication instructions
- [ ] Post-consultation patient surveys
- [ ] Integration with hospital referral systems

## Support

For issues or questions:
- Technical: dev@telepharmacy.example.com
- Compliance: compliance@telepharmacy.example.com
- Agora Support: https://console.agora.io/support
