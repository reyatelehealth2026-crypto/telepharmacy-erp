import { api } from './api';

// ── Types ──────────────────────────────────────────────────────────────────

export interface Reminder {
  id: string;
  patientId: string;
  drugName: string;
  sig: string | null;
  reminderTimes: string[];
  reminderDays: number[];
  isActive: boolean;
  lastRemindedAt: string | null;
  lastConfirmedAt: string | null;
  weeklyAdherence: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdherenceStats {
  patientId: string;
  totalReminders: number;
  confirmedReminders: number;
  adherenceRate: number;
  activeReminders: number;
  medications: {
    id: string;
    drugName: string;
    sig: string | null;
    lastRemindedAt: string | null;
    lastConfirmedAt: string | null;
    weeklyAdherence: string | null;
  }[];
}

export interface CreateReminderPayload {
  drugName: string;
  sig?: string;
  reminderTimes: string[];
  reminderDays: number[];
}

// ── API helpers ────────────────────────────────────────────────────────────

function unwrap<T>(res: any): T {
  return res.data as T;
}

export async function getMyReminders(
  token: string,
  isActive?: boolean,
): Promise<Reminder[]> {
  const qs = isActive !== undefined ? `?isActive=${isActive}` : '';
  const res = await api.get<any>(`/v1/adherence/my-reminders${qs}`, token);
  return res.data ?? [];
}

export async function createReminder(
  token: string,
  data: CreateReminderPayload,
): Promise<Reminder> {
  const res = await api.post<any>('/v1/adherence/my-reminders', data, token);
  return unwrap<Reminder>(res);
}

export async function acknowledgeReminder(
  token: string,
  reminderId: string,
): Promise<Reminder> {
  const res = await api.patch<any>(
    `/v1/adherence/reminders/${reminderId}/acknowledge`,
    {},
    token,
  );
  return unwrap<Reminder>(res);
}

export async function toggleReminder(
  token: string,
  reminderId: string,
): Promise<Reminder> {
  const res = await api.patch<any>(
    `/v1/adherence/my-reminders/${reminderId}/toggle`,
    {},
    token,
  );
  return unwrap<Reminder>(res);
}

export async function deleteReminder(
  token: string,
  reminderId: string,
): Promise<void> {
  await api.delete(`/v1/adherence/my-reminders/${reminderId}`, token);
}

export async function getMyStats(token: string): Promise<AdherenceStats> {
  const res = await api.get<any>('/v1/adherence/my-stats', token);
  return unwrap<AdherenceStats>(res);
}
