const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.re-ya.com';

export interface Product {
  id: string;
  sku: string;
  odooCode: string | null;
  nameTh: string;
  nameEn: string | null;
  slug: string;
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

export async function getProduct(id: string): Promise<Product> {
  return apiFetch<Product>(`/v1/products/${id}`);
}

export async function getFeaturedProducts(limit = 8): Promise<Product[]> {
  // Try featured first, fallback to all products if none marked as featured
  const featured = await getProducts({ isFeatured: true, inStockOnly: false, limit });
  if (featured.data.length > 0) return featured.data;
  const all = await getProducts({ inStockOnly: false, limit, sortBy: 'createdAt', sortOrder: 'desc' });
  return all.data;
}

export async function searchProducts(query: string, limit = 20): Promise<Product[]> {
  const res = await getProducts({ search: query, limit });
  return res.data;
}
