const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.re-ya.com';

export interface AdminProduct {
  id: string;
  sku: string;
  odooCode: string | null;
  nameTh: string;
  nameEn: string | null;
  brand: string | null;
  genericName: string | null;
  drugClassification: string | null;
  requiresPrescription: boolean;
  dosageForm: string | null;
  strength: string | null;
  packSize: string | null;
  unit: string | null;
  images: string[];
  imageUrl: string | null;
  sellPrice: number | null;
  memberPrice: number | null;
  comparePrice: number | null;
  stockQty: number;
  inStock: boolean;
  isLowStock: boolean;
  minStock: number | null;
  reorderPoint: number | null;
  isFeatured: boolean;
  isNew: boolean;
  status: string;
  categoryId: string | null;
  shortDescription: string | null;
  howToUse: string | null;
  warnings: string | null;
  barcode: string | null;
  tags: string[] | null;
  odooLastSyncAt: string | null;
  stockSyncAt: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface ProductListResponse {
  data: AdminProduct[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SyncResult {
  synced: number;
  errors: number;
  details?: string[];
}

async function apiFetch<T>(path: string, token?: string): Promise<T> {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    headers,
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const json = await res.json();
  return json.data as T;
}

export async function getAdminProducts(
  params: {
    search?: string;
    page?: number;
    limit?: number;
    inStockOnly?: boolean;
    status?: string;
  } = {},
): Promise<ProductListResponse> {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) qs.set(k, String(v));
  });
  const query = qs.toString() ? `?${qs}` : '';
  return apiFetch<ProductListResponse>(`/v1/products${query}`);
}

export async function getAdminProduct(id: string): Promise<AdminProduct> {
  return apiFetch<AdminProduct>(`/v1/products/${id}`);
}

export async function syncProductsFromOdoo(
  token: string,
  codes?: string[],
): Promise<SyncResult> {
  const res = await fetch(`${API_BASE}/v1/products/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(codes?.length ? { codes } : {}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any)?.error?.message ?? `Sync failed: ${res.status}`);
  }
  const json = await res.json();
  return json.data as SyncResult;
}

/** Login as staff and return access token */
export async function staffLogin(email: string, password: string): Promise<string> {
  const res = await fetch(`${API_BASE}/v1/auth/staff-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error('เข้าสู่ระบบไม่สำเร็จ');
  const json = await res.json();
  return json.data?.accessToken ?? '';
}
