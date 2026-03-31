import { api, apiFetch } from './api-client';

export interface AdrReport {
  id: string;
  patientId: string;
  drugName: string;
  genericName?: string;
  reactionDescription: string;
  severity: string;
  causality?: string;
  status: string;
  onsetDate?: string;
  reportedBy?: string;
  assessedBy?: string;
  assessedAt?: string;
  createdAt: string;
}

export interface AdrDetail extends AdrReport {
  patientName?: string;
  doseAtOnset?: string;
  route?: string;
  indication?: string;
  outcome?: string;
  rechallenge?: string;
  dechallenge?: string;
  notes?: string;
  causalityNotes?: string;
}

export async function getAdrReports(params?: {
  severity?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  const qs = new URLSearchParams();
  if (params) Object.entries(params).forEach(([k, v]) => { if (v !== undefined) qs.set(k, String(v)); });
  const q = qs.toString() ? `?${qs}` : '';
  return apiFetch<AdrReport[]>(`/v1/adr${q}`);
}

export async function getAdrDetail(id: string) {
  return apiFetch<AdrDetail>(`/v1/adr/${id}`);
}

export async function assessAdr(id: string, data: { causality: string; causalityNotes?: string }) {
  return api.patch(`/v1/adr/${id}/assess`, data);
}

export async function exportAdrRegulatory(fromDate?: string, toDate?: string) {
  const qs = new URLSearchParams();
  if (fromDate) qs.set('fromDate', fromDate);
  if (toDate) qs.set('toDate', toDate);
  const q = qs.toString() ? `?${qs}` : '';
  return apiFetch<unknown>(`/v1/adr/export${q}`);
}
