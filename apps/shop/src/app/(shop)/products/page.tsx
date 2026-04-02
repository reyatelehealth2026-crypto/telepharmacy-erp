'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, PackageX, LayoutGrid } from 'lucide-react';
import { ProductCard } from '@/components/product/product-card';
import { getProducts } from '@/lib/products';
import type { Product } from '@/lib/products';

const categories = [
  { label: 'ทั้งหมด', value: null, icon: '🏪' },
  { label: 'ยาสามัญ', value: 'hhr', icon: '💊' },
  { label: 'ยาอันตราย', value: 'dangerous_drug', icon: '⚠️' },
  { label: 'ยาควบคุมพิเศษ', value: 'specially_controlled', icon: '🔴' },
  { label: 'อาหารเสริม', value: 'supplement', icon: '🧬' },
  { label: 'อุปกรณ์การแพทย์', value: 'device', icon: '🩺' },
  { label: 'เครื่องสำอาง', value: 'cosmetic', icon: '🧴' },
  { label: 'สมุนไพร', value: 'herbal', icon: '🌿' },
  { label: 'อาหาร', value: 'food', icon: '🍚' },
];

const sortOptions = [
  { label: 'ยอดนิยม', sortBy: 'sortOrder', sortOrder: 'asc' as const },
  { label: 'ราคาต่ำ-สูง', sortBy: 'sellPrice', sortOrder: 'asc' as const },
  { label: 'ราคาสูง-ต่ำ', sortBy: 'sellPrice', sortOrder: 'desc' as const },
  { label: 'ใหม่ล่าสุด', sortBy: 'createdAt', sortOrder: 'desc' as const },
];

export default function ProductsPage() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
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
          drugClassification: activeCategory ?? undefined,
          inStockOnly: false,
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
    [activeCategory, sortIdx],
  );

  useEffect(() => {
    fetchProducts(true, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory, sortIdx]);

  const activeLabel =
    categories.find((c) => c.value === activeCategory)?.label ?? 'ทั้งหมด';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="sticky top-[104px] z-30 bg-background px-4 pb-3 pt-3">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold">สินค้าทั้งหมด</h1>
        </div>

        {/* Category Filter Chips */}
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat.label}
              onClick={() => setActiveCategory(cat.value)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                activeCategory === cat.value
                  ? 'bg-primary text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results Header */}
      <div className="px-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {loading && products.length === 0 ? (
              <span className="flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> กำลังโหลดสินค้า...
              </span>
            ) : (
              <>
                <span className="font-medium text-foreground">{activeLabel}</span>
                {' - '}
                {(total ?? 0).toLocaleString()} รายการ
              </>
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

        {/* Product Grid */}
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
            <p className="text-sm">ไม่พบสินค้าในหมวดหมู่นี้</p>
            <button
              onClick={() => setActiveCategory(null)}
              className="text-xs text-primary underline"
            >
              ดูสินค้าทั้งหมด
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
