import { registerAs } from '@nestjs/config';

export const telemedicineConfig = registerAs('telemedicine', () => ({
  // AWS Rekognition for face verification
  aws: {
    region: process.env.AWS_REGION || 'ap-southeast-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },

  // Agora.io video platform
  agora: {
    appId: process.env.AGORA_APP_ID,
    appCertificate: process.env.AGORA_APP_CERTIFICATE,
    tokenExpirySeconds: 86400, // 24 hours
  },

  // ThaiSMS for OTP
  sms: {
    apiKey: process.env.THAI_SMS_API_KEY,
    sender: process.env.THAI_SMS_SENDER || 'Telepharmacy',
  },

  // KYC settings
  kyc: {
    otpExpirySeconds: 300, // 5 minutes
    otpMaxAttempts: 3,
    emailVerificationExpiryHours: 24,
    kycValidityYears: 1,
    faceMatchMinConfidence: 90,
    ocrMinConfidence: 95,
  },

  // Video consultation settings
  consultation: {
    minResolution: '720p',
    minFrameRate: 30,
    minBandwidthKbps: 500,
    reconnectTimeoutSeconds: 60,
    maxConcurrentSessions: 10,
  },

  // Audit trail
  audit: {
    encryptionKey: process.env.AUDIT_ENCRYPTION_KEY,
    retentionYears: 10,
  },

  // License verification
  license: {
    pharmacyCouncilApiUrl: process.env.PHARMACY_COUNCIL_API_URL,
    pharmacyCouncilApiKey: process.env.PHARMACY_COUNCIL_API_KEY,
    checkIntervalDays: 30,
    expiryReminderDays: 60,
  },

  // MinIO buckets
  storage: {
    documentsBucket: 'telemedicine-documents',
    recordingsBucket: 'telemedicine-recordings',
    referralsBucket: 'telemedicine-referrals',
    auditReportsBucket: 'audit-reports',
  },

  // Redis namespaces
  redis: {
    kycOtpPrefix: 'kyc:otp:',
    kycSessionPrefix: 'kyc:session:',
    consultationSessionPrefix: 'consultation:session:',
    agoraTokenPrefix: 'agora:token:',
    consentScrollPrefix: 'consent:scroll:',
    scopeCachePrefix: 'scope:cache:',
    licenseCachePrefix: 'license:cache:',
    auditHashKey: 'audit:hash-chain:latest',
  },

  // Data residency
  dataResidency: {
    allowedRegions: ['th', 'thailand', 'ap-southeast-1'],
    enforceThailandOnly: true,
  },
}));
