import { api } from './api';

// ── Types ──────────────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  type: string;
  channel: string;
  title: string;
  body: string | null;
  status: string;
  readAt: string | null;
  sentAt: string | null;
  referenceType: string | null;
  referenceId: string | null;
  createdAt: string;
}

interface NotificationsResponse {
  data: Notification[];
  unreadCount: number;
  total: number;
  page: number;
  limit: number;
}

// ── API helpers ────────────────────────────────────────────────────────────

export async function getMyNotifications(
  token: string,
  page = 1,
  limit = 30,
): Promise<NotificationsResponse> {
  const res = await api.get<any>(
    `/v1/notifications/me?page=${page}&limit=${limit}`,
    token,
  );
  return res as NotificationsResponse;
}

export async function markRead(
  token: string,
  notificationId: string,
): Promise<void> {
  await api.patch(`/v1/notifications/${notificationId}/read`, {}, token);
}

export async function markAllRead(token: string): Promise<void> {
  await api.post('/v1/notifications/read-all', {}, token);
}
