# Redis Configuration for Telemedicine 2569 Compliance

## Namespace Structure

All telemedicine-related data in Redis uses the following namespace prefixes:

### KYC & Identity Verification
- `kyc:otp:{verificationId}` - OTP codes for phone verification (TTL: 5 minutes)
- `kyc:session:{patientId}` - KYC session state (TTL: 24 hours)
- `kyc:rate-limit:{patientId}` - Rate limiting for KYC attempts (TTL: 1 hour)

### Video Consultation
- `consultation:session:{sessionId}` - Active consultation session data (TTL: 24 hours)
- `consultation:queue:{pharmacistId}` - Consultation queue for pharmacists (TTL: 1 hour)
- `consultation:metrics:{sessionId}` - Real-time quality metrics (TTL: 7 days)

### Agora Video Platform
- `agora:token:{sessionId}` - Agora RTC tokens (TTL: 24 hours)
- `agora:recording:{sessionId}` - Recording session tracking (TTL: 48 hours)

### E-Consent
- `consent:scroll:{patientId}:{templateId}` - Scroll tracking state (TTL: 1 hour)
- `consent:signature:{patientId}` - Temporary signature data (TTL: 10 minutes)

### Scope Validation
- `scope:cache:{ruleId}` - Cached scope rules (TTL: 1 hour)
- `scope:validation:{consultationId}` - Validation results cache (TTL: 24 hours)

### Emergency Referral
- `referral:notification:{referralId}` - Notification tracking (TTL: 24 hours)
- `referral:follow-up:{referralId}` - Follow-up reminder queue (TTL: 48 hours)

### License Verification
- `license:cache:{pharmacistId}` - Cached license verification (TTL: 24 hours)
- `license:check-queue` - Monthly license check queue (persistent)

### Audit & Compliance
- `audit:hash-chain:latest` - Latest audit log hash for chain validation (persistent)
- `compliance:metrics:{date}` - Daily compliance metrics cache (TTL: 30 days)

## TTL Strategy

- **Short-lived (5-10 minutes)**: OTP codes, temporary signatures
- **Session-based (1-24 hours)**: Active sessions, tokens, scroll tracking
- **Cache (24 hours - 7 days)**: Validation results, metrics, license cache
- **Persistent**: Queue data, hash chain, critical tracking

## Memory Optimization

- Use Redis Streams for audit log buffering before PostgreSQL write
- Use Redis Sorted Sets for time-based expiry (consultation queue, reminders)
- Use Redis Hashes for structured session data
- Enable Redis key eviction policy: `allkeys-lru` (already configured in docker-compose.yml)

## Security

- All sensitive data (tokens, OTP) stored with encryption at application level
- No PHI (Protected Health Information) stored in Redis without encryption
- Redis AUTH enabled in production (configure REDIS_PASSWORD)
- Redis TLS enabled in production

## Monitoring

Monitor these key metrics:
- Memory usage per namespace
- Hit/miss ratio for cache keys
- Expired keys per second
- Connection count

## Example Usage

```typescript
// KYC OTP storage
await redis.setex(`kyc:otp:${verificationId}`, 300, otp);

// Consultation session
await redis.hset(`consultation:session:${sessionId}`, {
  patientId,
  pharmacistId,
  startedAt: Date.now(),
  status: 'in_progress'
});
await redis.expire(`consultation:session:${sessionId}`, 86400);

// Agora token
await redis.setex(`agora:token:${sessionId}`, 86400, encryptedToken);

// Scope validation cache
await redis.setex(
  `scope:validation:${consultationId}`,
  86400,
  JSON.stringify(validationResult)
);
```

## Backup Strategy

- Redis persistence enabled with AOF (Append-Only File) in docker-compose.yml
- Daily snapshots to separate storage
- Critical data (audit hash chain) replicated to PostgreSQL immediately
