import { api, apiFetch } from './api-client';

export type ComplaintStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type ComplaintSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ComplaintCategory = 'service' | 'product_quality' | 'delivery' | 'billing' | 'other';

export interface Complaint {
  id: string;
  patientId: string;
  orderId: string | null;
  chatSessionId: string | null;
  severity: ComplaintSeverity;
  category: ComplaintCategory;
  description: string;
  images: string[] | null;
  status: ComplaintStatus;
  resolution: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  patient?: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    lineUserId: string | null;
  };
  order?: {
    id: string;
    orderNumber: string;
    totalAmount: string;
    status: string;
  } | null;
}

export interface ComplaintListResponse {
  data: Complaint[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export async function getComplaints(params: {
  page?: number;
  limit?: number;
  status?: string;
  severity?: string;
  category?: string;
} = {}): Promise<{ data: Complaint[]; meta: ComplaintListResponse['meta'] }> {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) qs.set(k, String(v));
  });
  const query = qs.toString() ? `?${qs}` : '';
  return apiFetch<Complaint[]>(`/v1/staff/complaints${query}`) as Promise<{
    data: Complaint[];
    meta: ComplaintListResponse['meta'];
  }>;
}

export async function getComplaint(id: string) {
  return apiFetch<Complaint>(`/v1/staff/complaints/${id}`);
}

export async function resolveComplaint(id: string, resolution: string) {
  return api.patch<Complaint>(`/v1/staff/complaints/${id}/resolve`, { resolution });
}

export async function updateComplaintStatus(id: string, status: ComplaintStatus) {
  return api.patch<Complaint>(`/v1/staff/complaints/${id}/status`, { status });
}
