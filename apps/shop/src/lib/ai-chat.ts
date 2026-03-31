import { api } from './api';

export interface AiChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AiChatResponse {
  message: string;
  products?: Array<{
    id: string;
    name: string;
    price: number;
    reason: string;
  }>;
  shouldTransfer: boolean;
  transferReason?: string;
  disclaimer?: string;
}

export async function sendAiChat(
  token: string,
  message: string,
  history: AiChatMessage[] = [],
): Promise<AiChatResponse> {
  const res = await api.post<{ data: AiChatResponse }>('/v1/ai/chat', { message, history }, token);
  return res.data;
}
