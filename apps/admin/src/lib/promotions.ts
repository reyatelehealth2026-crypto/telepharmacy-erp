import { api, apiFetch } from './api-client';

export type PromotionType =
  | 'percentage_discount'
  | 'fixed_discount'
  | 'buy_x_get_y'
  | 'bundle'
  | 'free_delivery'
  | 'free_gift'
  | 'points_multiplier';

export type PromotionStatus = 'draft' | 'active' | 'paused' | 'expired' | 'cancelled';

export type MembershipTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface Promotion {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: PromotionType;
  productIds: string[];
  categoryIds: string[];
  tierRequired: MembershipTier | null;
  minOrderAmount: string | null;
  maxDiscount: string | null;
  value: string | null;
  buyQuantity: number | null;
  getQuantity: number | null;
  usageLimit: number | null;
  usagePerCustomer: number | null;
  usageCount: number;
  startsAt: string | null;
  endsAt: string | null;
  status: PromotionStatus;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PromotionListResponse {
  data: Promotion[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreatePromotionPayload {
  code: string;
  name: string;
  description?: string;
  type: PromotionType;
  value?: number;
  minOrderAmount?: number;
  maxDiscount?: number;
  usageLimit?: number;
  usagePerCustomer?: number;
  startsAt?: string;
  endsAt?: string;
  tierRequired?: MembershipTier;
  productIds?: string[];
  categoryIds?: string[];
  buyQuantity?: number;
  getQuantity?: number;
}

export type UpdatePromotionPayload = Partial<CreatePromotionPayload>;

export async function getPromotions(params: {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
} = {}): Promise<{ data: Promotion[]; meta: PromotionListResponse['meta'] }> {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) qs.set(k, String(v));
  });
  const query = qs.toString() ? `?${qs}` : '';
  return apiFetch<Promotion[]>(`/v1/staff/promotions${query}`) as Promise<{
    data: Promotion[];
    meta: PromotionListResponse['meta'];
  }>;
}

export async function getPromotion(id: string) {
  return apiFetch<Promotion>(`/v1/staff/promotions/${id}`);
}

export async function createPromotion(payload: CreatePromotionPayload) {
  return api.post<Promotion>('/v1/staff/promotions', payload);
}

export async function updatePromotion(id: string, payload: UpdatePromotionPayload) {
  return api.patch<Promotion>(`/v1/staff/promotions/${id}`, payload);
}

export async function activatePromotion(id: string) {
  return api.patch<Promotion>(`/v1/staff/promotions/${id}/activate`);
}

export async function deactivatePromotion(id: string) {
  return api.patch<Promotion>(`/v1/staff/promotions/${id}/deactivate`);
}
