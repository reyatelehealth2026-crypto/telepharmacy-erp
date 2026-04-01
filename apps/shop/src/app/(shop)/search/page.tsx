'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import {
  Search,
  SlidersHorizontal,
  Loader2,
  PackageX,
  X,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ProductCard } from '@/components/product/product-card';
import { getProducts, DRUG_CLASSIFICATION_OPTIONS } from '@/lib/products';
import type { Product } from '@/lib/products';
import { useSearchParams, useRouter } from 'next/navigation';

const popularSearches = ['พาราเซตามอล', 'วิตามินซี', 'ยาแก้ไอ', 'ครีมกันแดด', 'ยาแก้แพ้'];

const categoryOptions = [
  { label: 'ทั้งหมด', value: '' },
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

const PRICE_RANGES = [
  { label: 'ทุกราคา', min: 0, max: 0 },
  { label: 'ต่ำกว่า ฿100', min: 0, max: 100 },
  { label: '฿100 - ฿500', min: 100, max: 500 },
  { label: '฿500 - ฿1,000', min: 500, max: 1000 },
  { label: 'มากกว่า ฿1,000', min: 1000, max: 0 },
];

function SearchPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Search & filter state
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [activeCategory, setActiveCategory] = useState(
    searchParams.get('category') ?? '',
  );
  const [drugClassification, setDrugClassification] = useState(
    searchParams.get('drugClassification') ?? '',
  );
  const [priceRangeIdx, setPriceRangeIdx] = useState(
    Number(searchParams.get('priceRange') ?? '0'),
  );
  const [inStockOnly, setInStockOnly] = useState(
    searchParams.get('inStock') === 'true',
  );
  const [sortIdx, setSortIdx] = useState(
    Number(searchParams.get('sort') ?? '0'),
  );
  const [showFilters, setShowFilters] = useState(false);

  // Data state
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const LIMIT = 20;

  const activeFilterCount = [
    drugClassification,
    priceRangeIdx > 0,
    inStockOnly,
  ].filter(Boolean).length;

  const fetchProducts = useCallback(
    async (reset = false, currentPage = 1) => {
      setLoading(true);
      const sort = sortOptions[sortIdx] ?? sortOptions[0]!;
      const priceRange = PRICE_RANGES[priceRangeIdx] ?? PRICE_RANGES[0]!;
      try {
        const res = await getProducts({
          search: query || undefined,
          drugClassification: activeCategory || drugClassification || undefined,
          inStockOnly: inStockOnly || undefined,
          page: currentPage,
          limit: LIMIT,
          sortBy: sort.sortBy,
          sortOrder: sort.sortOrder,
        });

        // Client-side price range filtering (API doesn't support minPrice/maxPrice yet)
        let filtered = res.data;
        if (priceRange.min > 0 || priceRange.max > 0) {
          filtered = filtered.filter((p) => {
            const price = p.sellPrice ?? 0;
            if (priceRange.min > 0 && price < priceRange.min) return false;
            if (priceRange.max > 0 && price > priceRange.max) return false;
            return true;
          });
        }

        setProducts((prev) => (reset ? filtered : [...prev, ...filtered]));
        setTotal(reset ? filtered.length : total + filtered.length);
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
    [query, activeCategory, drugClassification, priceRangeIdx, inStockOnly, sortIdx],
  );

  // Fetch on mount and when search/filter/sort changes (debounced for text input)
  useEffect(() => {
    const timer = setTimeout(() => fetchProducts(true, 1), query ? 300 : 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, activeCategory, drugClassification, priceRangeIdx, inStockOnly, sortIdx]);

  // Sync search state to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (activeCategory) params.set('category', activeCategory);
    if (drugClassification) params.set('drugClassification', drugClassification);
    if (priceRangeIdx > 0) params.set('priceRange', String(priceRangeIdx));
    if (inStockOnly) params.set('inStock', 'true');
    if (sortIdx > 0) params.set('sort', String(sortIdx));
    const qs = params.toString();
    router.replace(qs ? `/search?${qs}` : '/search', { scroll: false });
  }, [query, activeCategory, drugClassification, priceRangeIdx, inStockOnly, sortIdx, router]);

  const clearAllFilters = () => {
    setActiveCategory('');
    setDrugClassification('');
    setPriceRangeIdx(0);
    setInStockOnly(false);
  };

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
          <Button
            variant={showFilters ? 'default' : 'outline'}
            size="icon"
            className="relative"
            onClick={() => setShowFilters(!showFilters)}
            aria-label="ตัวกรอง"
          >
            <SlidersHorizontal className="h-4 w-4" />
            {activeFilterCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-white">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </div>

        {/* Category Chips */}
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {categoryOptions.map((f) => (
            <button
              key={f.label}
              onClick={() => setActiveCategory(f.value)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                activeCategory === f.value
                  ? 'bg-primary text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="mx-4 rounded-xl border bg-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">ตัวกรองเพิ่มเติม</h3>
            {activeFilterCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="flex items-center gap-1 text-xs text-destructive"
              >
                <X className="h-3 w-3" />
                ล้างตัวกรอง
              </button>
            )}
          </div>

          {/* Drug Classification Filter */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              ประเภทยา
            </label>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setDrugClassification('')}
                className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                  !drugClassification
                    ? 'bg-primary text-white'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                ทั้งหมด
              </button>
              {DRUG_CLASSIFICATION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() =>
                    setDrugClassification(
                      drugClassification === opt.value ? '' : opt.value,
                    )
                  }
                  className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                    drugClassification === opt.value
                      ? 'bg-primary text-white'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Price Range Filter */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              ช่วงราคา
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PRICE_RANGES.map((range, idx) => (
                <button
                  key={range.label}
                  onClick={() => setPriceRangeIdx(idx)}
                  className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                    priceRangeIdx === idx
                      ? 'bg-primary text-white'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>

          {/* In-Stock Toggle */}
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-muted-foreground">
              เฉพาะสินค้ามีพร้อมส่ง
            </label>
            <button
              role="switch"
              aria-checked={inStockOnly}
              onClick={() => setInStockOnly(!inStockOnly)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                inStockOnly ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform ${
                  inStockOnly ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      )}

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
              `พบ ${(total ?? 0).toLocaleString()} รายการ`
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
            {(query || activeFilterCount > 0) && (
              <button
                onClick={() => {
                  setQuery('');
                  clearAllFilters();
                }}
                className="text-xs text-primary underline"
              >
                ล้างการค้นหาและตัวกรอง
              </button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchPageInner />
    </Suspense>
  );
}
