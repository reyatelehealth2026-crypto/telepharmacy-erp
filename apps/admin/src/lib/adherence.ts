import { api, apiFetch } from './api-client';

export interface Reminder {
  id: string;
  patientId: string;
  drugName: string;
  dosage?: string;
  frequency?: string;
  times: string[];
  isActive: boolean;
  createdAt: string;
}

export interface AdherenceStats {
  totalReminders: number;
  activeReminders: number;
  adherenceRate: number;
  takenCount: number;
  missedCount: number;
  streak: number;
}

export async function getStaffReminders(params?: { patientId?: string; isActive?: string; page?: number; limit?: number }) {
  const qs = new URLSearchParams();
  if (params) Object.entries(params).forEach(([k, v]) => { if (v !== undefined) qs.set(k, String(v)); });
  const q = qs.toString() ? `?${qs}` : '';
  return apiFetch<Reminder[]>(`/v1/staff/adherence/reminders${q}`);
}

export async function getPatientAdherenceStats(patientId: string) {
  return apiFetch<AdherenceStats>(`/v1/staff/adherence/stats/${patientId}`);
}

export async function createStaffReminder(data: { patientId: string; drugName: string; dosage?: string; frequency?: string; times: string[] }) {
  return api.post('/v1/staff/adherence/reminders', data);
}

export async function sendReminderNow(id: string) {
  return api.post(`/v1/staff/adherence/reminders/${id}/send-now`);
}
