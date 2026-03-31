import { registerAs } from '@nestjs/config';

export const telemedicineConfig = registerAs('telemedicine', () => ({
  // Agora.io Video Platform
  agora: {
    appId: process.env.AGORA_APP_ID || '',
    appCertificate: process.env.AGORA_APP_CERTIFICATE || '',
    tokenExpirySeconds: parseInt(
      process.env.AGORA_TOKEN_EXPIRY_SECONDS || '86400',
      10,
    ), // 24 hours
  },

  // AWS Rekognition for KYC
  awsRekognition: {
    region: process.env.AWS_REKOGNITION_REGION || 'ap-southeast-1',
    accessKeyId: process.env.AWS_REKOGNITION_ACCESS_KEY || '',
    secretAccessKey: process.env.AWS_REKOGNITION_SECRET_KEY || '',
  },

  // ThaiSMS for OTP
  thaiSms: {
    apiKey: process.env.THAI_SMS_API_KEY || '',
    sender: process.env.THAI_SMS_SENDER || 'Telepharmacy',
  },

  // Audit Trail Encryption
  audit: {
    encryptionKey: process.env.AUDIT_ENCRYPTION_KEY || '', // 256-bit hex key
  },

  // Thai Pharmacy Council API
  pharmacyCouncilApiKey: process.env.PHARMACY_COUNCIL_API_KEY || '',

  // Storage Configuration (MinIO)
  storage: {
    documentsBucket: process.env.TELEMEDICINE_DOCUMENTS_BUCKET || 'telemedicine-documents',
    recordingsBucket: process.env.TELEMEDICINE_RECORDINGS_BUCKET || 'telemedicine-recordings',
    referralsBucket: process.env.TELEMEDICINE_REFERRALS_BUCKET || 'telemedicine-referrals',
    auditReportsBucket: process.env.AUDIT_REPORTS_BUCKET || 'audit-reports',
  },

  // Recording Configuration
  recording: {
    retentionYears: parseInt(process.env.RECORDING_RETENTION_YEARS || '5', 10),
    immutablePolicy: process.env.RECORDING_IMMUTABLE_POLICY === 'true',
  },

  // KYC Configuration
  kyc: {
    validityYears: parseInt(process.env.KYC_VALIDITY_YEARS || '1', 10),
    faceMatchThreshold: parseFloat(
      process.env.KYC_FACE_MATCH_THRESHOLD || '90',
    ),
    livenessThreshold: parseFloat(process.env.KYC_LIVENESS_THRESHOLD || '85'),
    otpExpiryMinutes: parseInt(process.env.KYC_OTP_EXPIRY_MINUTES || '5', 10),
    otpMaxAttempts: parseInt(process.env.KYC_OTP_MAX_ATTEMPTS || '3', 10),
  },

  // Consultation Configuration
  consultation: {
    maxDurationMinutes: parseInt(
      process.env.CONSULTATION_MAX_DURATION_MINUTES || '60',
      10,
    ),
    autoEndAfterIdleMinutes: parseInt(
      process.env.CONSULTATION_AUTO_END_IDLE_MINUTES || '10',
      10,
    ),
  },

  // Referral Configuration
  referral: {
    followUpDelayMinutes: parseInt(
      process.env.REFERRAL_FOLLOWUP_DELAY_MINUTES || '15',
      10,
    ),
  },

  // License Verification
  license: {
    expiryReminderDays: parseInt(
      process.env.LICENSE_EXPIRY_REMINDER_DAYS || '60',
      10,
    ),
    recheckIntervalDays: parseInt(
      process.env.LICENSE_RECHECK_INTERVAL_DAYS || '30',
      10,
    ),
  },

  // Compliance Monitoring
  compliance: {
    kycSuccessRateTarget: parseFloat(
      process.env.COMPLIANCE_KYC_SUCCESS_RATE_TARGET || '95',
    ),
    consultationCompletionRateTarget: parseFloat(
      process.env.COMPLIANCE_CONSULTATION_COMPLETION_RATE_TARGET || '90',
    ),
    referralRateThreshold: parseFloat(
      process.env.COMPLIANCE_REFERRAL_RATE_THRESHOLD || '15',
    ),
  },
}));
