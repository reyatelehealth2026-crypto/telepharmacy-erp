const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.re-ya.com';

export interface Product {
  id: string;
  sku: string;
  odooCode: string | null;
  nameTh: string;
  nameEn: string | null;
  slug: string;
  shortSlug: string;
  brand: string | null;
  genericName: string | null;
  manufacturer: string | null;
  drugClassification: string | null;
  requiresPrescription: boolean;
  requiresPharmacist: boolean;
  dosageForm: string | null;
  strength: string | null;
  packSize: string | null;
  unit: string | null;
  barcode: string | null;
  fdaRegistrationNo: string | null;
  images: string[];
  imageUrl: string | null;
  sellPrice: number | null;
  memberPrice: number | null;
  comparePrice: number | null;
  stockQty: number;
  inStock: boolean;
  isLowStock: boolean;
  isFeatured: boolean;
  isNew: boolean;
  tags: string[];
  categoryId: string | null;
  shortDescription: string | null;
  fullDescription: string | null;
  howToUse: string | null;
  warnings: string | null;
  sideEffects: string | null;
  contraindications: string | null;
  odooLastSyncAt: string | null;
  stockSyncAt: string | null;
}

export interface ProductListResponse {
  data: Product[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ProductQueryParams {
  search?: string;
  categoryId?: string;
  drugClassification?: string;
  requiresPrescription?: boolean;
  inStockOnly?: boolean;
  isFeatured?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/** Drug classifications that require a prescription */
export const PRESCRIPTION_REQUIRED_CLASSIFICATIONS = [
  'dangerous_drug',
  'specially_controlled',
  'psychotropic',
  'narcotic',
] as const;

/** All drug classification options with Thai labels */
export const DRUG_CLASSIFICATION_OPTIONS = [
  { value: 'hhr', label: 'ยาสามัญประจำบ้าน' },
  { value: 'dangerous_drug', label: 'ยาอันตราย' },
  { value: 'specially_controlled', label: 'ยาควบคุมพิเศษ' },
  { value: 'psychotropic', label: 'วัตถุออกฤทธิ์' },
  { value: 'narcotic', label: 'ยาเสพติด' },
  { value: 'device', label: 'เครื่องมือแพทย์' },
  { value: 'supplement', label: 'อาหารเสริม' },
  { value: 'cosmetic', label: 'เครื่องสำอาง' },
  { value: 'herbal', label: 'สมุนไพร' },
  { value: 'food', label: 'อาหาร' },
] as const;

export function requiresPrescriptionForClassification(classification: string | null): boolean {
  return PRESCRIPTION_REQUIRED_CLASSIFICATIONS.includes(classification as any);
}

/**
 * Pick the best image URL for cards — same idea as catalog/search: prefer our CDN
 * (MinIO / API) when multiple URLs exist; legacy Odoo hosts often 404.
 */
export function productCardImageUrl(product: Product): string | undefined {
  const merged = [...(product.images ?? []), product.imageUrl].filter(
    (u): u is string => typeof u === 'string' && u.length > 0,
  );
  const seen = new Set<string>();
  const unique = merged.filter((u) => (seen.has(u) ? false : (seen.add(u), true)));
  const preferCdn = (u: string) =>
    /minio\.re-ya\.com/i.test(u) ||
    /api\.re-ya\.com/i.test(u) ||
    /^https?:\/\/localhost(?::9000)?\//i.test(u);
  const cdn = unique.find(preferCdn);
  return cdn ?? unique[0];
}

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const json = await res.json();
  return json.data as T;
}

export async function getProducts(params: ProductQueryParams = {}): Promise<ProductListResponse> {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) qs.set(k, String(v));
  });
  const query = qs.toString() ? `?${qs}` : '';
  return apiFetch<ProductListResponse>(`/v1/products${query}`);
}

export async function getProduct(identifier: string): Promise<Product> {
  return apiFetch<Product>(`/v1/products/${identifier}`);
}

export async function getFeaturedProducts(limit = 8): Promise<Product[]> {
  const qs = (params: ProductQueryParams) => {
    const p = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) p.set(k, String(v));
    });
    return p.toString() ? `?${p.toString()}` : '';
  };

  const fetchFresh = async (params: ProductQueryParams): Promise<ProductListResponse> => {
    const path = `/v1/products${qs(params)}`;
    const res = await fetch(`${API_BASE}${path}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`API error ${res.status}`);
    const json = await res.json();
    return json.data as ProductListResponse;
  };

  // Match default /search listing: sortOrder asc (ยอดนิยม), not createdAt — and no stale Next cache
  const featured = await fetchFresh({
    isFeatured: true,
    inStockOnly: false,
    limit,
    sortBy: 'sortOrder',
    sortOrder: 'asc',
  });
  if (featured.data.length > 0) return featured.data;

  return (
    await fetchFresh({
      inStockOnly: false,
      limit,
      sortBy: 'sortOrder',
      sortOrder: 'asc',
    })
  ).data;
}

export async function searchProducts(query: string, limit = 20): Promise<Product[]> {
  const res = await getProducts({ search: query, limit });
  return res.data;
}
