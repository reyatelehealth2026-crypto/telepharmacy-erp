import { api } from './api';

export interface ChatSession {
  id: string;
  patientId: string;
  sessionType: string;
  assignedTo: string | null;
  status: string;
  messageCount: number;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'system' | 'pharmacist';
  content: string | null;
  messageType: string;
  createdAt: string;
}

export async function getOrCreateSession(
  token: string,
): Promise<ChatSession> {
  const res = await api.post<{ data: ChatSession }>(
    '/v1/chat/sessions',
    {},
    token,
  );
  return res.data;
}

export async function getMessages(
  token: string,
  sessionId: string,
  after?: string,
): Promise<{ data: ChatMessage[]; assignedTo: string | null; status: string }> {
  const qs = after ? `?after=${encodeURIComponent(after)}` : '';
  return api.get(`/v1/chat/sessions/${sessionId}/messages${qs}`, token);
}

export async function sendChatMessage(
  token: string,
  sessionId: string,
  content: string,
): Promise<ChatMessage> {
  const res = await api.post<{ data: ChatMessage }>(
    `/v1/chat/sessions/${sessionId}/messages`,
    { content },
    token,
  );
  return res.data;
}
