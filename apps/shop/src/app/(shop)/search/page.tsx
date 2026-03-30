'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, SlidersHorizontal, Loader2, PackageX } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ProductCard } from '@/components/product/product-card';
import { getProducts } from '@/lib/products';
import type { Product } from '@/lib/products';
import { useSearchParams } from 'next/navigation';

const popularSearches = ['พาราเซตามอล', 'วิตามินซี', 'ยาแก้ไอ', 'ครีมกันแดด', 'ยาแก้แพ้'];

const filterOptions = [
  { label: 'ทั้งหมด', value: null },
  { label: 'ยาสามัญ', value: 'hhr' },
  { label: 'วิตามิน', value: 'supplement' },
  { label: 'อุปกรณ์', value: 'device' },
  { label: 'สมุนไพร', value: 'herbal' },
  { label: 'ดูแลผิว', value: 'cosmetic' },
];

const sortOptions = [
  { label: 'ยอดนิยม', sortBy: 'sortOrder', sortOrder: 'asc' as const },
  { label: 'ราคาต่ำ-สูง', sortBy: 'sellPrice', sortOrder: 'asc' as const },
  { label: 'ราคาสูง-ต่ำ', sortBy: 'sellPrice', sortOrder: 'desc' as const },
  { label: 'ใหม่ล่าสุด', sortBy: 'createdAt', sortOrder: 'desc' as const },
];

export default function SearchPage() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [activeFilter, setActiveFilter] = useState<string | null>(
    searchParams.get('category') ?? null,
  );
  const [sortIdx, setSortIdx] = useState(0);
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const LIMIT = 20;

  const fetchProducts = useCallback(
    async (reset = false, currentPage = 1) => {
      setLoading(true);
      const sort = sortOptions[sortIdx] ?? sortOptions[0]!;
      try {
        const res = await getProducts({
          search: query || undefined,
          drugClassification: activeFilter ?? undefined,
          page: currentPage,
          limit: LIMIT,
          sortBy: sort.sortBy,
          sortOrder: sort.sortOrder,
        });
        setProducts((prev) => (reset ? res.data : [...prev, ...res.data]));
        setTotal(res.meta.total);
        setHasMore(currentPage < res.meta.totalPages);
        if (reset) setPage(2);
        else setPage((p) => p + 1);
      } catch {
        // keep previous results on error
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [query, activeFilter, sortIdx],
  );

  // Fetch on mount and when search/filter/sort changes
  useEffect(() => {
    const timer = setTimeout(() => fetchProducts(true, 1), query ? 300 : 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, activeFilter, sortIdx]);

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="sticky top-14 z-30 bg-background px-4 pb-3 pt-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="ค้นหายา หรือพิมพ์อาการ..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="icon">
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        </div>

        {/* Filter Chips */}
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {filterOptions.map((f) => (
            <button
              key={f.label}
              onClick={() => setActiveFilter(f.value)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                activeFilter === f.value
                  ? 'bg-primary text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Popular Searches */}
      {!query && products.length === 0 && !loading && (
        <div className="px-4">
          <h3 className="text-sm font-medium text-muted-foreground">ค้นหายอดนิยม</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {popularSearches.map((term) => (
              <button
                key={term}
                onClick={() => setQuery(term)}
                className="rounded-full border px-3 py-1.5 text-xs transition-colors hover:bg-muted"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      <div className="px-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {loading && products.length === 0 ? (
              <span className="flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> กำลังค้นหา...
              </span>
            ) : (
              `พบ ${total.toLocaleString()} รายการ`
            )}
          </p>
          <select
            className="rounded-md border bg-background px-2 py-1 text-xs"
            value={sortIdx}
            onChange={(e) => setSortIdx(Number(e.target.value))}
          >
            {sortOptions.map((s, i) => (
              <option key={s.label} value={i}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {products.length > 0 ? (
          <>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  id={product.id}
                  name={product.nameTh}
                  brand={product.brand ?? undefined}
                  imageUrl={product.imageUrl ?? undefined}
                  price={product.sellPrice ?? 0}
                  memberPrice={product.memberPrice ?? undefined}
                  comparePrice={product.comparePrice ?? undefined}
                  unit={product.unit ?? 'ชิ้น'}
                  inStock={product.inStock}
                  requiresPrescription={product.requiresPrescription}
                  drugClassification={product.drugClassification ?? 'hhr'}
                  tags={product.tags}
                />
              ))}
            </div>

            {hasMore && (
              <button
                onClick={() => fetchProducts(false, page)}
                disabled={loading}
                className="mt-4 w-full rounded-lg border py-2.5 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
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
        ) : !loading ? (
          <div className="mt-8 flex flex-col items-center gap-2 text-muted-foreground">
            <PackageX className="h-12 w-12 opacity-30" />
            <p className="text-sm">ไม่พบสินค้าที่ค้นหา</p>
            {query && (
              <button
                onClick={() => setQuery('')}
                className="text-xs text-primary underline"
              >
                ล้างการค้นหา
              </button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
