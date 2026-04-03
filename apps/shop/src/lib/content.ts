const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.re-ya.com';

export interface Article {
  id: string;
  type: string;
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
  status: string;
  publishedAt: string | null;
  authorId: string | null;
  viewCount: number;
  shareCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ArticleListResponse {
  data: Article[];
  meta: {
    page: number;
    limit: number;
  };
}

export interface ArticleQueryParams {
  type?: string;
  tags?: string;
  q?: string;
  page?: number;
  limit?: number;
}

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const json = await res.json();
  return json as T;
}

export async function getArticles(params: ArticleQueryParams = {}): Promise<ArticleListResponse> {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) qs.set(k, String(v));
  });
  const query = qs.toString() ? `?${qs}` : '';
  return apiFetch<ArticleListResponse>(`/v1/content${query}`);
}

export async function getArticleBySlug(slug: string): Promise<Article> {
  const res = await apiFetch<{ data: Article }>(`/v1/content/${slug}`);
  return res.data;
}

export async function incrementArticleView(id: string): Promise<void> {
  await fetch(`${API_BASE}/v1/content/${id}/view`, { method: 'POST' });
}
