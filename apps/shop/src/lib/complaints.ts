const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.re-ya.com';

export type ComplaintCategory = 'service' | 'product_quality' | 'delivery' | 'billing' | 'other';
export type ComplaintSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ComplaintStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface Complaint {
  id: string;
  patientId: string;
  orderId: string | null;
  chatSessionId: string | null;
  severity: ComplaintSeverity;
  category: string;
  description: string;
  images: string[];
  status: ComplaintStatus;
  resolution: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateComplaintPayload {
  category: ComplaintCategory;
  description: string;
  severity?: ComplaintSeverity;
  images?: string[];
  orderId?: string;
}

export interface ComplaintListResponse {
  data: Complaint[];
  meta: { page: number; limit: number; total?: number };
}

async function authFetch<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `API error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function createComplaint(
  token: string,
  payload: CreateComplaintPayload,
): Promise<Complaint> {
  const res = await authFetch<{ data: Complaint } | Complaint>('/v1/complaints', token, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return 'data' in res && res.data ? res.data : (res as Complaint);
}

export async function getMyComplaints(
  token: string,
  page = 1,
  limit = 20,
): Promise<ComplaintListResponse> {
  return authFetch<ComplaintListResponse>(
    `/v1/complaints?page=${page}&limit=${limit}`,
    token,
  );
}
