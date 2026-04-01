'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { Search, Loader2, FileText, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getArticles, type Article } from '@/lib/content';
import { formatDate } from '@/lib/utils';

const LIMIT = 10;

function ArticlesPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const fetchArticles = useCallback(
    async (reset = false, currentPage = 1) => {
      setLoading(true);
      try {
        const res = await getArticles({
          q: query || undefined,
          type: 'health_article',
          page: currentPage,
          limit: LIMIT,
        });
        const data = res.data ?? [];
        setArticles((prev) => (reset ? data : [...prev, ...data]));
        setHasMore(data.length === LIMIT);
        if (reset) setPage(2);
        else setPage((p) => p + 1);
      } catch {
        // keep previous results on error
      } finally {
        setLoading(false);
      }
    },
    [query],
  );

  // Fetch on mount and when search changes
  useEffect(() => {
    const timer = setTimeout(() => fetchArticles(true, 1), query ? 300 : 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // Sync search state to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    const qs = params.toString();
    router.replace(qs ? `/articles?${qs}` : '/articles', { scroll: false });
  }, [query, router]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="px-4 pt-4">
        <h1 className="text-lg font-bold">บทความสุขภาพ</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          อ่านบทความเกี่ยวกับสุขภาพและการใช้ยา
        </p>
      </div>

      {/* Search Bar */}
      <div className="px-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="ค้นหาบทความ..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Articles List */}
      <div className="space-y-3 px-4">
        {loading && articles.length === 0 ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : articles.length > 0 ? (
          <>
            {articles.map((article) => (
              <Link
                key={article.id}
                href={`/articles/${article.slug}`}
                className="block overflow-hidden rounded-xl border transition-colors hover:bg-muted/50"
              >
                {article.featuredImageUrl && (
                  <div className="relative aspect-[2/1] w-full bg-muted">
                    <Image
                      src={article.featuredImageUrl}
                      alt={article.titleTh}
                      fill
                      className="object-cover"
                      sizes="(max-width: 512px) 100vw, 512px"
                    />
                  </div>
                )}
                <div className="p-4">
                  <h2 className="line-clamp-2 text-sm font-semibold leading-snug">
                    {article.titleTh}
                  </h2>
                  {article.excerpt && (
                    <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">
                      {article.excerpt}
                    </p>
                  )}
                  <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                    {article.publishedAt && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(article.publishedAt)}
                      </span>
                    )}
                    {article.viewCount > 0 && (
                      <span>{article.viewCount.toLocaleString()} อ่าน</span>
                    )}
                  </div>
                  {article.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {article.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            ))}

            {hasMore && (
              <button
                onClick={() => fetchArticles(false, page)}
                disabled={loading}
                className="mt-2 w-full rounded-lg border py-2.5 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> กำลังโหลด...
                  </span>
                ) : (
                  'โหลดเพิ่มเติม'
                )}
              </button>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
            <FileText className="h-12 w-12 opacity-30" />
            <p className="text-sm">ไม่พบบทความ</p>
            {query && (
              <button
                onClick={() => setQuery('')}
                className="text-xs text-primary underline"
              >
                ล้างการค้นหา
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ArticlesPage() {
  return (
    <Suspense>
      <ArticlesPageInner />
    </Suspense>
  );
}
