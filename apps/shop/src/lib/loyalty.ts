import { api } from './api';

// ── Types ──────────────────────────────────────────────────────────────────

export interface LoyaltySummary {
  points: number;
  tier: string;
  lifetimePoints: number;
}

export interface LoyaltyTransaction {
  id: string;
  type: 'earn' | 'redeem' | 'expire' | 'adjust';
  points: number;
  description: string;
  orderId: string | null;
  createdAt: string;
}

interface PaginatedTransactions {
  data: LoyaltyTransaction[];
  page: number;
  limit: number;
}

// ── API helpers ────────────────────────────────────────────────────────────

function unwrap<T>(res: any): T {
  return res.data as T;
}

export async function getMyLoyalty(token: string): Promise<LoyaltySummary> {
  const res = await api.get<any>('/v1/loyalty/me', token);
  return unwrap<LoyaltySummary>(res);
}

export async function getTransactions(
  token: string,
  page = 1,
  limit = 20,
): Promise<PaginatedTransactions> {
  const res = await api.get<any>(
    `/v1/loyalty/transactions?page=${page}&limit=${limit}`,
    token,
  );
  return res as PaginatedTransactions;
}

export async function redeemPoints(
  token: string,
  points: number,
  orderId?: string,
): Promise<{ success: boolean }> {
  return api.post('/v1/loyalty/redeem', { points, orderId }, token);
}
