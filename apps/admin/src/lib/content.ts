import { api, apiFetch } from './api-client';

export type ContentType =
  | 'health_article'
  | 'product_review'
  | 'faq'
  | 'drug_info'
  | 'promotion_banner';

export type ContentStatus = 'draft' | 'published';

export interface Content {
  id: string;
  type: ContentType;
  titleTh: string;
  titleEn: string | null;
  slug: string;
  body: string | null;
  excerpt: string | null;
  relatedProductIds: string[];
  metaTitle: string | null;
  metaDescription: string | null;
  tags: string[];
  seoKeywords: string[];
  featuredImageUrl: string | null;
  status: ContentStatus;
  publishedAt: string | null;
  authorId: string | null;
  viewCount: number;
  shareCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ContentListResponse {
  data: Content[];
  meta: { page: number; limit: number };
}

export interface CreateContentPayload {
  type: ContentType;
  titleTh: string;
  titleEn?: string;
  slug: string;
  body?: string;
  excerpt?: string;
  tags?: string[];
  seoKeywords?: string[];
  metaTitle?: string;
  metaDescription?: string;
  featuredImageUrl?: string;
  relatedProductIds?: string[];
}

export type UpdateContentPayload = Partial<CreateContentPayload>;


export async function getContents(params: {
  page?: number;
  limit?: number;
  type?: string;
  tags?: string;
  q?: string;
} = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) qs.set(k, String(v));
  });
  const query = qs.toString() ? `?${qs}` : '';
  return apiFetch<Content[]>(`/v1/staff/content${query}`);
}

export async function getContent(id: string) {
  return apiFetch<Content>(`/v1/staff/content/${id}`);
}

export async function createContent(payload: CreateContentPayload) {
  return api.post<Content>('/v1/staff/content', payload);
}

export async function updateContent(id: string, payload: UpdateContentPayload) {
  return api.patch<Content>(`/v1/staff/content/${id}`, payload);
}

export async function publishContent(id: string) {
  return api.post<Content>(`/v1/staff/content/${id}/publish`);
}

export async function unpublishContent(id: string) {
  return api.post<Content>(`/v1/staff/content/${id}/unpublish`);
}

export async function deleteContent(id: string) {
  return api.delete(`/v1/staff/content/${id}`);
}
