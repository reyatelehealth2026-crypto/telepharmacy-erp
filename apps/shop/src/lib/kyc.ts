import { useAuthStore } from '@/store/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.re-ya.com';

function getToken() {
  return useAuthStore.getState().accessToken;
}

async function authFetch(path: string, init?: RequestInit) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(err.error?.message || err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── KYC Status ─────────────────────────────────────────────────────────────

export interface KycStatus {
  hasKyc: boolean;
  verificationId?: string;
  status: string;
  nextStep: string;
  requiresGuardianConsent?: boolean;
  flaggedForReview?: boolean;
  completedAt?: string;
  expiresAt?: string;
}

export async function getKycStatus(patientId: string): Promise<KycStatus> {
  return authFetch(`/v1/telemedicine/kyc/status/${patientId}`);
}

// ── Step 1: Upload Document ────────────────────────────────────────────────

export interface UploadDocumentResult {
  success: boolean;
  verificationId: string;
  extractedData: { nationalId: string; thaiName: string; englishName?: string; dateOfBirth?: string; address?: string };
  requiresGuardianConsent: boolean;
  nextStep: string;
}

export async function uploadDocument(patientId: string, file: File, documentType = 'thai_national_id'): Promise<UploadDocumentResult> {
  const fd = new FormData();
  fd.append('document', file);
  fd.append('patientId', patientId);
  fd.append('documentType', documentType);
  return authFetch('/v1/telemedicine/kyc/upload-document', { method: 'POST', body: fd });
}

// ── Step 2: Liveness Check ─────────────────────────────────────────────────

export interface LivenessResult {
  success: boolean;
  passed: boolean;
  score: number;
  nextStep: string;
}

export async function livenessCheck(verificationId: string, videoBlob: Blob): Promise<LivenessResult> {
  const fd = new FormData();
  fd.append('video', videoBlob, 'liveness.webm');
  fd.append('verificationId', verificationId);
  fd.append('gestures', JSON.stringify(['blink', 'turn_left', 'turn_right']));
  return authFetch('/v1/telemedicine/kyc/liveness-check', { method: 'POST', body: fd });
}

// ── Step 3: Face Compare ───────────────────────────────────────────────────

export interface FaceCompareResult {
  success: boolean;
  matched: boolean;
  confidence: number;
  requiresReview: boolean;
  nextStep: string;
}

export async function faceCompare(verificationId: string, selfieFile: File): Promise<FaceCompareResult> {
  const fd = new FormData();
  fd.append('selfie', selfieFile);
  fd.append('verificationId', verificationId);
  return authFetch('/v1/telemedicine/kyc/face-compare', { method: 'POST', body: fd });
}

// ── Step 4: Send OTP ───────────────────────────────────────────────────────

export async function sendOtp(verificationId: string): Promise<{ success: boolean; expiresIn: number }> {
  return authFetch('/v1/telemedicine/kyc/send-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ verificationId }),
  });
}

// ── Step 5: Verify OTP ─────────────────────────────────────────────────────

export async function verifyOtp(verificationId: string, otp: string): Promise<{ success: boolean; verified: boolean; nextStep: string }> {
  return authFetch('/v1/telemedicine/kyc/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ verificationId, otp }),
  });
}
