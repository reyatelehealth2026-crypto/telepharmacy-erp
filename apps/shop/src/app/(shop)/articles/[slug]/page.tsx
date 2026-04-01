'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, Eye, Share2, Loader2, ShoppingBag } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getArticleBySlug, incrementArticleView, type Article } from '@/lib/content';
import { formatDate } from '@/lib/utils';

export default function ArticleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;

    getArticleBySlug(slug)
      .then((data) => {
        setArticle(data);
        // Increment view count in background
        if (data.id) incrementArticleView(data.id);
      })
      .catch(() => setError('ไม่พบบทความที่ต้องการ'))
      .finally(() => setLoading(false));
  }, [slug]);

  const handleShare = async () => {
    const url = window.location.href;
    const title = article?.titleTh ?? 'บทความสุขภาพ';

    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // User cancelled share
      }
    } else {
      await navigator.clipboard.writeText(url);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-muted-foreground">
        <p className="text-sm">{error ?? 'ไม่พบบทความ'}</p>
        <Button variant="outline" size="sm" onClick={() => router.push('/articles')}>
          กลับไปหน้าบทความ
        </Button>
      </div>
    );
  }

  return (
    <div>
      {/* Back button + Share */}
      <div className="flex items-center justify-between px-4 pt-3">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          กลับ
        </button>
        <button
          onClick={handleShare}
          className="flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs transition-colors hover:bg-muted"
        >
          <Share2 className="h-3.5 w-3.5" />
          แชร์
        </button>
      </div>

      {/* Featured Image */}
      {article.featuredImageUrl && (
        <div className="relative mt-3 aspect-[2/1] w-full bg-muted">
          <Image
            src={article.featuredImageUrl}
            alt={article.titleTh}
            fill
            className="object-cover"
            sizes="(max-width: 512px) 100vw, 512px"
            priority
          />
        </div>
      )}

      {/* Article Content */}
      <div className="px-4 py-4">
        {/* Tags */}
        {article.tags.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {article.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px]">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Title */}
        <h1 className="text-xl font-bold leading-tight">{article.titleTh}</h1>

        {/* Meta */}
        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
          {article.publishedAt && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(article.publishedAt)}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {article.viewCount.toLocaleString()} อ่าน
          </span>
        </div>

        {/* Body */}
        {article.body && (
          <div
            className="prose prose-sm mt-6 max-w-none text-foreground prose-headings:text-foreground prose-p:text-foreground/90 prose-a:text-primary"
            dangerouslySetInnerHTML={{ __html: article.body }}
          />
        )}

        {/* Related Products */}
        {article.relatedProductIds.length > 0 && (
          <div className="mt-8">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <ShoppingBag className="h-4 w-4" />
              สินค้าที่เกี่ยวข้อง
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {article.relatedProductIds.map((productId) => (
                <Link
                  key={productId}
                  href={`/product/${productId}`}
                  className="rounded-lg border px-3 py-2 text-xs font-medium transition-colors hover:bg-muted"
                >
                  ดูสินค้า →
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
