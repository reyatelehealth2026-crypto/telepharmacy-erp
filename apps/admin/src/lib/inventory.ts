import { api, apiFetch } from './api-client';

export interface StockMovement {
  id: string;
  productId: string;
  productName?: string;
  lotId?: string;
  lotNo?: string;
  movementType: string;
  quantity: number;
  reason?: string;
  reference?: string;
  createdBy?: string;
  createdAt: string;
}

export interface Lot {
  id: string;
  productId: string;
  lotNo: string;
  quantity: number;
  expiryDate: string;
  receivedAt: string;
  costPrice?: number;
}

export async function getMovements(params?: { productId?: string; movementType?: string; page?: number; limit?: number }) {
  const qs = new URLSearchParams();
  if (params) Object.entries(params).forEach(([k, v]) => { if (v !== undefined) qs.set(k, String(v)); });
  const q = qs.toString() ? `?${qs}` : '';
  return apiFetch<StockMovement[]>(`/v1/staff/inventory/movements${q}`);
}

export async function getLotsByProduct(productId: string) {
  return apiFetch<Lot[]>(`/v1/staff/inventory/products/${productId}/lots`);
}

export async function receiveLot(data: { productId: string; lotNo: string; quantity: number; expiryDate: string; costPrice?: number }) {
  return api.post('/v1/staff/inventory/lots', data);
}

export async function adjustStock(data: { productId: string; lotId?: string; quantity: number; movementType: string; reason: string }) {
  return api.post('/v1/staff/inventory/adjustments', data);
}

export async function writeOffStock(data: { productId: string; lotId?: string; quantity: number; reason: string }) {
  return api.post('/v1/staff/inventory/write-off', { ...data, movementType: 'write_off' });
}
