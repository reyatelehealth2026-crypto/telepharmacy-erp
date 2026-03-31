import { api, apiFetch } from './api-client';

export interface MedicationReview {
  id: string;
  patientId: string;
  patientName?: string;
  status: string;
  medications: string[];
  concerns?: string;
  findings?: string;
  recommendations?: string;
  completedBy?: string;
  createdAt: string;
  completedAt?: string;
}

export interface TdmRequest {
  id: string;
  patientId: string;
  patientName?: string;
  drugName: string;
  status: string;
  indication?: string;
  currentDose?: string;
  targetRange?: string;
  measuredLevel?: number;
  unit?: string;
  recommendation?: string;
  completedBy?: string;
  createdAt: string;
  completedAt?: string;
}

export async function getMedicationReviews(params?: { status?: string; page?: number; limit?: number }) {
  const qs = new URLSearchParams();
  if (params) Object.entries(params).forEach(([k, v]) => { if (v !== undefined) qs.set(k, String(v)); });
  const q = qs.toString() ? `?${qs}` : '';
  return apiFetch<MedicationReview[]>(`/v1/drug-info/medication-review${q}`);
}

export async function completeMedicationReview(id: string, data: { findings: string; recommendations: string }) {
  return api.patch(`/v1/drug-info/medication-review/${id}/complete`, data);
}

export async function getTdmRequests(params?: { status?: string; page?: number; limit?: number }) {
  const qs = new URLSearchParams();
  if (params) Object.entries(params).forEach(([k, v]) => { if (v !== undefined) qs.set(k, String(v)); });
  const q = qs.toString() ? `?${qs}` : '';
  return apiFetch<TdmRequest[]>(`/v1/drug-info/tdm${q}`);
}

export async function recordTdmResult(id: string, data: { measuredLevel: number; unit: string; recommendation: string }) {
  return api.patch(`/v1/drug-info/tdm/${id}/result`, data);
}
