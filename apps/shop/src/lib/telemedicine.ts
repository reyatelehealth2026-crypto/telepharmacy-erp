import { api } from './api';

// ── Types ──────────────────────────────────────────────────────────────────

export interface Consultation {
  consultationId: string;
  status: string;
  type: string;
  chiefComplaint: string;
  pharmacistId?: string;
  pharmacistName?: string;
  channelName?: string;
  startedAt?: string;
  endedAt?: string;
  createdAt: string;
  scopeValidation?: { overallResult: string; canProceed: boolean };
  consentTemplate?: ConsentTemplate;
}

export interface ConsentTemplate {
  id: string;
  version: string;
  title: string;
  content: string;
  clauses: { id: string; title: string; content: string; required: boolean }[];
}

export interface ConsentStatus {
  hasActiveConsent: boolean;
  currentConsent: unknown;
  requiresNewConsent: boolean;
  reason: string | null;
}

export interface AgoraToken {
  token: string;
  channelName: string;
  uid: number;
  appId: string;
}

// ── Consultation API ───────────────────────────────────────────────────────

export async function getConsultation(token: string, id: string) {
  return api.get<Consultation>(`/v1/telemedicine/consultations/${id}`, token);
}

export async function listConsultations(token: string, params?: { status?: string[]; limit?: number }) {
  const qs = new URLSearchParams();
  if (params?.status) params.status.forEach(s => qs.append('status', s));
  if (params?.limit) qs.set('limit', String(params.limit));
  const q = qs.toString() ? `?${qs}` : '';
  return api.get<{ data: Consultation[]; total: number }>(`/v1/telemedicine/consultations${q}`, token);
}

// ── Consent API ────────────────────────────────────────────────────────────

export async function getConsentTemplate(token: string) {
  return api.get<ConsentTemplate>('/v1/telemedicine/consent/template', token);
}

export async function getConsentStatus(token: string) {
  return api.get<ConsentStatus>('/v1/telemedicine/consent/status', token);
}

export async function acceptConsent(token: string, data: {
  templateId: string;
  consultationId?: string;
  signatureDataUrl: string;
  scrolledToEnd: boolean;
  timeSpentSeconds: number;
}) {
  return api.post<{ success: boolean; consentId: string; pdfUrl: string }>('/v1/telemedicine/consent/accept', data, token);
}

export async function acceptConsultationConsent(token: string, consultationId: string, data: {
  templateId: string;
  signatureData: string;
  scrolledToEnd: boolean;
  timeSpentSeconds: number;
}) {
  return api.post<{ success: boolean }>(`/v1/telemedicine/consultations/${consultationId}/accept-consent`, data, token);
}

// ── Video Session API ──────────────────────────────────────────────────────

export async function getPatientToken(token: string, consultationId: string) {
  return api.get<AgoraToken>(`/v1/telemedicine/consultations/${consultationId}/token`, token);
}

export async function startSession(token: string, consultationId: string) {
  return api.post<{ success: boolean }>(`/v1/telemedicine/consultations/${consultationId}/start`, { actorType: 'patient' }, token);
}

export async function endSession(token: string, consultationId: string, data?: {
  pharmacistNotes?: string;
  avgBandwidthKbps?: number;
}) {
  return api.post<{ success: boolean }>(`/v1/telemedicine/consultations/${consultationId}/end`, { ...data, actorType: 'patient' }, token);
}
