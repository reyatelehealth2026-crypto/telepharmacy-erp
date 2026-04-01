'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, X, Eye, Share2 } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { useApi } from '@/lib/use-api';
import {
  updateContent,
  publishContent,
  unpublishContent,
  type Content,
  type UpdateContentPayload,
  type ContentType,
} from '@/lib/content';

const CONTENT_TYPES: { value: ContentType; label: string }[] = [
  { value: 'health_article', label: 'บทความสุขภาพ' },
  { value: 'product_review', label: 'รีวิวสินค้า' },
  { value: 'faq', label: 'FAQ' },
  { value: 'drug_info', label: 'ข้อมูลยา' },
  { value: 'promotion_banner', label: 'แบนเนอร์โปรโมชั่น' },
];

const labelClass = 'block text-sm font-medium text-foreground mb-1.5';
const inputClass = 'w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50';

export default function EditContentPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const { data: article, isLoading: loadingArticle } = useApi<Content>(
    id ? `/v1/staff/content/${id}` : null,
  );

  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const [type, setType] = useState<ContentType>('health_article');
  const [titleTh, setTitleTh] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [slug, setSlug] = useState('');
  const [body, setBody] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [seoKeywords, setSeoKeywords] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [featuredImageUrl, setFeaturedImageUrl] = useState('');
  const [relatedProductIds, setRelatedProductIds] = useState('');

  useEffect(() => {
    if (article && !initialized) {
      setType(article.type);
      setTitleTh(article.titleTh);
      setTitleEn(article.titleEn ?? '');
      setSlug(article.slug);
      setBody(article.body ?? '');
      setExcerpt(article.excerpt ?? '');
      setMetaTitle(article.metaTitle ?? '');
      setMetaDescription(article.metaDescription ?? '');
      setSeoKeywords(article.seoKeywords?.join(', ') ?? '');
      setTags(article.tags ?? []);
      setFeaturedImageUrl(article.featuredImageUrl ?? '');
      setRelatedProductIds(article.relatedProductIds?.join(', ') ?? '');
      setInitialized(true);
    }
  }, [article, initialized]);

  function handleAddTag() {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) {
      setTags([...tags, t]);
    }
    setTagInput('');
  }

  function handleRemoveTag(tag: string) {
    setTags(tags.filter((tt) => tt !== tag));
  }

  function handleTagKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  }

  async function handleTogglePublish() {
    setPublishing(true);
    setError(null);
    try {
      if (article?.status === 'published') {
        await unpublishContent(id);
      } else {
        await publishContent(id);
      }
      router.refresh();
      window.location.reload();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาด';
      setError(msg);
    } finally {
      setPublishing(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload: UpdateContentPayload = {
        type,
        titleTh: titleTh.trim(),
        slug: slug.trim(),
      };

      payload.titleEn = titleEn.trim() || undefined;
      payload.body = body.trim() || undefined;
      payload.excerpt = excerpt.trim() || undefined;
      payload.metaTitle = metaTitle.trim() || undefined;
      payload.metaDescription = metaDescription.trim() || undefined;
      payload.seoKeywords = seoKeywords.trim() ? seoKeywords.split(',').map((s) => s.trim()).filter(Boolean) : [];
      payload.tags = tags;
      payload.featuredImageUrl = featuredImageUrl.trim() || undefined;
      payload.relatedProductIds = relatedProductIds.trim() ? relatedProductIds.split(',').map((s) => s.trim()).filter(Boolean) : [];

      await updateContent(id, payload);
      router.push('/dashboard/content');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาด';
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  if (loadingArticle) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="แก้ไขบทความ" description={article ? article.titleTh : ''}>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleTogglePublish}
            disabled={publishing}
            className={`inline-flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors ${
              article?.status === 'published'
                ? 'border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100'
                : 'bg-green-600 text-white hover:bg-green-700'
            } disabled:opacity-50`}
          >
            {publishing && <Loader2 className="h-4 w-4 animate-spin" />}
            {article?.status === 'published' ? 'ยกเลิกเผยแพร่' : 'เผยแพร่'}
          </button>
          <Link
            href="/dashboard/content"
            className="inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
            กลับ
          </Link>
        </div>
      </PageHeader>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="ยอดเข้าชม" value={article?.viewCount ?? 0} icon={Eye} />
        <StatCard title="แชร์" value={article?.shareCount ?? 0} icon={Share2} />
        <StatCard
          title="สถานะ"
          value={article?.status === 'published' ? 'เผยแพร่แล้ว' : 'ร่าง'}
          icon={Eye}
          description={article?.publishedAt ? `เผยแพร่เมื่อ ${new Date(article.publishedAt).toLocaleDateString('th-TH')}` : undefined}
        />
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Info */}
        <section className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">ข้อมูลพื้นฐาน</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelClass}>ประเภทเนื้อหา *</label>
              <select value={type} onChange={(e) => setType(e.target.value as ContentType)} className={inputClass}>
                {CONTENT_TYPES.map((ct) => (
                  <option key={ct.value} value={ct.value}>{ct.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>ชื่อบทความ (ไทย) *</label>
              <input type="text" value={titleTh} onChange={(e) => setTitleTh(e.target.value)} required className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>ชื่อบทความ (อังกฤษ)</label>
              <input type="text" value={titleEn} onChange={(e) => setTitleEn(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Slug *</label>
              <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} required className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>รูปภาพหลัก (URL)</label>
              <input type="url" value={featuredImageUrl} onChange={(e) => setFeaturedImageUrl(e.target.value)} placeholder="https://..." className={inputClass} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>เนื้อหาย่อ (Excerpt)</label>
              <textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={2} className={inputClass} />
            </div>
          </div>
        </section>

        {/* Body */}
        <section className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">เนื้อหาบทความ</h2>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={16}
            placeholder="เขียนเนื้อหาบทความที่นี่... (รองรับ HTML)"
            className={inputClass}
          />
        </section>

        {/* Tags */}
        <section className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">แท็ก</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder="พิมพ์แท็กแล้วกด Enter"
              className={inputClass}
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="shrink-0 rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
            >
              เพิ่ม
            </button>
          </div>
          {tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  {tag}
                  <button type="button" onClick={() => handleRemoveTag(tag)} className="hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </section>

        {/* SEO */}
        <section className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">SEO</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Meta Title</label>
              <input type="text" value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>SEO Keywords (คั่นด้วย ,)</label>
              <input type="text" value={seoKeywords} onChange={(e) => setSeoKeywords(e.target.value)} className={inputClass} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Meta Description</label>
              <textarea value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} rows={2} className={inputClass} />
            </div>
          </div>
        </section>

        {/* Related Products */}
        <section className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">สินค้าที่เกี่ยวข้อง</h2>
          <div>
            <label className={labelClass}>Product IDs (คั่นด้วย ,)</label>
            <input type="text" value={relatedProductIds} onChange={(e) => setRelatedProductIds(e.target.value)} placeholder="uuid1, uuid2" className={inputClass} />
          </div>
        </section>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Link
            href="/dashboard/content"
            className="inline-flex h-10 items-center rounded-lg border px-6 text-sm font-medium transition-colors hover:bg-muted"
          >
            ยกเลิก
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            บันทึกการเปลี่ยนแปลง
          </button>
        </div>
      </form>
    </div>
  );
}
