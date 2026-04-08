import { api } from './api';

export type RxStatus =
  | 'received'
  | 'ai_processing'
  | 'ai_completed'
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'dispensing'
  | 'shipped';

export interface Prescription {
  id: string;
  rxNo: string;
  status: RxStatus;
  patientId: string;
  imageUrls: string[];
  notes: string | null;
  ocrResult: {
    medications: Array<{
      drugName: string;
      dosage: string | null;
      sig: string | null;
      quantity: number | null;
    }>;
    doctorName: string | null;
    hospitalName: string | null;
    confidence: number;
  } | null;
  pharmacistNotes: string | null;
  verifiedAt: string | null;
  verifiedBy: string | null;
  itemCount: number;
  totalAmount: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface PrescriptionListResponse {
  data: Prescription[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface RxTimeline {
  status: RxStatus;
  label: string;
  timestamp: string | null;
  done: boolean;
  active: boolean;
}

export async function uploadPrescription(
  token: string,
  files: File[],
  notes?: string
): Promise<Prescription> {
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.re-ya.com';
  const formData = new FormData();
  files.forEach((file) => formData.append('images', file));
  if (notes) formData.append('notes', notes);

  const res = await fetch(`${API_BASE}/v1/prescriptions/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Upload failed' }));
    throw new Error(err.error?.message || err.message || `HTTP ${res.status}`);
  }

  const json = await res.json();
  return json.data as Prescription;
}

export async function getMyPrescriptions(
  token: string,
  page = 1,
  limit = 20
): Promise<PrescriptionListResponse> {
  const res = await api.get<any>(
    `/v1/patients/me/prescriptions?page=${page}&limit=${limit}`,
    token
  );
  // Unwrap backend envelope: { success, data: { data: [], meta: {} } } or { success, data: [] }
  const payload = res?.data ?? res;
  const items: Prescription[] = Array.isArray(payload) ? payload : (Array.isArray(payload?.data) ? payload.data : []);
  const meta = payload?.meta ?? { page, limit, total: items.length, totalPages: 1 };
  return { data: items, meta };
}

export async function getPrescription(token: string, id: string): Promise<Prescription> {
  const res = await api.get<{ data: Prescription }>(`/v1/prescriptions/${id}`, token);
  return res.data;
}

export function getRxStatusConfig(status: RxStatus): { label: string; color: string } {
  const map: Record<RxStatus, { label: string; color: string }> = {
    received: { label: 'รับแล้ว', color: 'bg-blue-100 text-blue-800' },
    ai_processing: { label: 'กำลัง OCR', color: 'bg-amber-100 text-amber-800' },
    ai_completed: { label: 'รอเภสัชกร', color: 'bg-amber-100 text-amber-800' },
    pending_review: { label: 'รอตรวจสอบ', color: 'bg-amber-100 text-amber-800' },
    approved: { label: 'อนุมัติแล้ว', color: 'bg-green-100 text-green-800' },
    rejected: { label: 'ไม่อนุมัติ', color: 'bg-red-100 text-red-800' },
    dispensing: { label: 'กำลังจัดยา', color: 'bg-purple-100 text-purple-800' },
    shipped: { label: 'จัดส่งแล้ว', color: 'bg-indigo-100 text-indigo-800' },
  };
  return map[status] ?? { label: status, color: 'bg-gray-100 text-gray-800' };
}

export function buildRxTimeline(rx: Prescription): RxTimeline[] {
  const statusOrder: RxStatus[] = [
    'received',
    'ai_processing',
    'ai_completed',
    'approved',
    'dispensing',
    'shipped',
  ];

  const currentIdx = statusOrder.indexOf(rx.status);
  const isRejected = rx.status === 'rejected';

  return statusOrder.map((s, i) => {
    const labels: Record<string, string> = {
      received: 'ส่งใบสั่งยาแล้ว',
      ai_processing: 'กำลังอ่านใบสั่งยา (AI OCR)',
      ai_completed: 'รอเภสัชกรตรวจสอบ',
      approved: 'เภสัชกรอนุมัติแล้ว',
      dispensing: 'กำลังจัดยา',
      shipped: 'จัดส่งแล้ว',
    };

    return {
      status: s,
      label: labels[s] ?? s,
      timestamp: i <= currentIdx ? rx.updatedAt : null,
      done: !isRejected && i < currentIdx,
      active: !isRejected && i === currentIdx,
    };
  });
}
