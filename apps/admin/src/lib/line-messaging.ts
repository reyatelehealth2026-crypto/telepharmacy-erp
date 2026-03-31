import { api } from './api-client';

export async function sendLineMessage(to: string, message: string) {
  return api.post('/v1/line/send', { to, type: 'text', message });
}

export async function broadcastMessage(message: unknown, altText?: string) {
  return api.post('/v1/line/broadcast', { message, altText });
}
