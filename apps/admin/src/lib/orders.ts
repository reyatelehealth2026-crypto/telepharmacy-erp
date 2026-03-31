import { api, apiFetch } from './api-client';

export interface PendingSlipOrder {
  id: string;
  orderNo: string;
  totalAmount: string;
  status: string;
  createdAt: string;
  patientId: string;
  slipUrl?: string;
  ocrResult?: Record<string, unknown>;
}

export async function getPendingSlips() {
  return apiFetch<PendingSlipOrder[]>('/v1/staff/orders/pending-slip');
}

export async function verifySlip(orderId: string, approved: boolean, notes?: string) {
  return api.post(`/v1/staff/orders/${orderId}/verify-slip`, { approved, notes });
}

export async function refundOrder(orderId: string, reason: string, amount?: number) {
  return api.post(`/v1/staff/orders/${orderId}/refund`, { reason, amount });
}
