'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  AlertTriangle, XCircle, CheckCircle2, RefreshCw, Search,
  ShoppingCart, ArrowUpDown, ArrowUp, ArrowDown,
  LayoutGrid, List, EyeOff,
} from 'lucide-react';
import type { AdminProduct } from '@/lib/products';

type SortField = 'none' | 'sku' | 'sellPrice' | 'stockQty';
type SortDir = 'asc' | 'desc';

interface Props {
  products: AdminProduct[];
  total?: number;
  currentPage?: number;
  totalPages?: number;
  limit?: number;
  filter?: string;
}

const DRUG_CLASS_LABEL: Record<string, string> = {
  dangerous_drug: 'ยาอันตราย',
  prescription_drug: 'ยาต้องใบสั่ง',
  hhr: 'ยาสามัญ (HHR)',
  otc: 'OTC',
  special_control: 'ควบคุมพิเศษ',
  specially_controlled: 'ควบคุมพิเศษ',
  herbal: 'สมุนไพร',
  supplement: 'อาหารเสริม',
  device: 'อุปกรณ์',
  cosmetic: 'เครื่องสำอาง',
};

const DRUG_CLASS_COLOR: Record<string, string> = {
  dangerous_drug: 'bg-red-100 text-red-700',
  prescription_drug: 'bg-orange-100 text-orange-700',
  hhr: 'bg-blue-100 text-blue-700',
  otc: 'bg-green-100 text-green-700',
  special_control: 'bg-purple-100 text-purple-700',
  specially_controlled: 'bg-purple-100 text-purple-700',
  herbal: 'bg-emerald-100 text-emerald-700',
  supplement: 'bg-teal-100 text-teal-700',
  device: 'bg-gray-100 text-gray-700',
  cosmetic: 'bg-pink-100 text-pink-700',
};

function extractOdooCategory(shortDescription: string | null): string | null {
  if (!shortDescription) return null;
  const match = shortDescription.match(/หมวด:\s*([^|]+)/);
  return match?.[1]?.trim() ?? null;
}

function StockBadge({ product }: { product: AdminProduct }) {
  if (!product.inStock) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
        <XCircle className="h-3 w-3" />หมด
      </span>
    );
  }
  if (product.isLowStock) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
        <AlertTriangle className="h-3 w-3" />ต่ำ
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
      <CheckCircle2 className="h-3 w-3" />ปกติ
    </span>
  );
}

function StockBar({ product }: { product: AdminProduct }) {
  if (!product.reorderPoint || product.reorderPoint <= 0) return null;
  const pct = Math.min(100, Math.round((product.stockQty / (product.reorderPoint * 2)) * 100));
  const color = product.stockQty === 0 ? 'bg-red-500' : product.isLowStock ? 'bg-amber-400' : 'bg-emerald-500';
  return (
    <div className="mt-1 h-1 w-16 rounded-full bg-muted">
      <div className={`h-1 rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function formatSyncTime(dateStr: string | null): string {
  if (!dateStr) return 'ไม่เคย sync';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'เมื่อกี้';
  if (mins < 60) return `${mins} นาทีที่แล้ว`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} ชั่วโมงที่แล้ว`;
  return d.toLocaleDateString('th-TH');
}

export function InventoryTable({ products, total, currentPage = 1, totalPages = 1, limit = 50, filter = 'all' }: Props) {
  const [refreshing, setRefreshing] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('sku');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [hideOutOfStock, setHideOutOfStock] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [gridCols, setGridCols] = useState<2 | 3 | 4>(3);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir(field === 'sku' ? 'desc' : 'desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="ml-1 inline h-3 w-3 opacity-40" />;
    return sortDir === 'asc'
      ? <ArrowUp className="ml-1 inline h-3 w-3 text-primary" />
      : <ArrowDown className="ml-1 inline h-3 w-3 text-primary" />;
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = q
      ? products.filter(
          (p) =>
            p.nameTh.toLowerCase().includes(q) ||
            (p.nameEn ?? '').toLowerCase().includes(q) ||
            (p.sku ?? '').toLowerCase().includes(q) ||
            (p.genericName ?? '').toLowerCase().includes(q) ||
            (p.brand ?? '').toLowerCase().includes(q),
        )
      : [...products];

    if (hideOutOfStock) {
      list = list.filter((p) => p.inStock);
    }

    list.sort((a, b) => {
      let av: number | string = 0, bv: number | string = 0;
      if (sortField === 'sellPrice') {
        av = a.sellPrice ?? 0;
        bv = b.sellPrice ?? 0;
        return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
      } else if (sortField === 'stockQty') {
        av = a.stockQty;
        bv = b.stockQty;
        return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
      } else if (sortField === 'sku') {
        av = a.sku ?? '';
        bv = b.sku ?? '';
        return sortDir === 'asc'
          ? (av as string).localeCompare(bv as string)
          : (bv as string).localeCompare(av as string);
      }
      return 0;
    });

    return list;
  }, [products, search, sortField, sortDir, hideOutOfStock]);

  const handleRefreshStock = async (productId: string) => {
    setRefreshing(productId);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'https://api.re-ya.com'}/v1/products/${productId}/stock`);
    } finally {
      setRefreshing(null);
    }
  };

  const gridColClass = gridCols === 2 ? 'grid-cols-2' : gridCols === 3 ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-2 md:grid-cols-4';

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="overflow-hidden rounded-xl border">
        <div className="flex flex-wrap items-center gap-2 border-b bg-muted/30 px-4 py-2">
          {/* Search */}
          <div className="flex min-w-48 flex-1 items-center gap-2">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อ, SKU, ยาสามัญ, แบรนด์..."
              className="w-full bg-transparent py-1 text-sm outline-none placeholder:text-muted-foreground"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-xs text-muted-foreground hover:text-foreground">ล้าง</button>
            )}
          </div>

          {/* Hide OOS toggle */}
          <button
            onClick={() => setHideOutOfStock((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              hideOutOfStock ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-muted'
            }`}
          >
            <EyeOff className="h-3.5 w-3.5" />
            ซ่อนสินค้าหมด
          </button>

          {/* Sort active indicator */}
          {sortField !== 'none' && (
            <button
              onClick={() => { setSortField('sku'); setSortDir('desc'); }}
              className="inline-flex shrink-0 items-center gap-1 rounded-full border bg-primary/5 px-2 py-0.5 text-xs text-primary hover:bg-muted"
            >
              <ArrowUpDown className="h-3 w-3" />
              {sortField === 'sellPrice' ? 'ราคา' : sortField === 'stockQty' ? 'สต็อก' : 'SKU'} {sortDir === 'asc' ? '↑' : '↓'}
            </button>
          )}

          <span className="shrink-0 text-xs text-muted-foreground">
            {filtered.length}/{products.length} รายการ
          </span>

          {/* View toggle */}
          <div className="flex items-center gap-1 rounded-lg border p-0.5">
            <button
              onClick={() => setViewMode('table')}
              className={`rounded p-1.5 transition-colors ${viewMode === 'table' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
              title="มุมมองตาราง"
            >
              <List className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`rounded p-1.5 transition-colors ${viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
              title="มุมมอง Grid"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Grid col selector */}
          {viewMode === 'grid' && (
            <div className="flex gap-1">
              {([2, 3, 4] as const).map((n) => (
                <button
                  key={n}
                  onClick={() => setGridCols(n)}
                  className={`rounded border px-2 py-0.5 text-xs font-medium ${gridCols === n ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                >
                  {n} คอล
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        {viewMode === 'table' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">สินค้า</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    <button onClick={() => toggleSort('sku')} className="inline-flex items-center hover:text-foreground">
                      SKU<SortIcon field="sku" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">หมวดหมู่</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    <button onClick={() => toggleSort('sellPrice')} className="inline-flex items-center hover:text-foreground">
                      ราคาขาย<SortIcon field="sellPrice" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    <button onClick={() => toggleSort('stockQty')} className="inline-flex items-center hover:text-foreground">
                      สต็อก<SortIcon field="stockQty" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Reorder</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">สถานะ</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">Sync</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-3xl">📦</span>
                        <p>{search ? `ไม่พบสินค้าที่ตรงกับ "${search}"` : 'ไม่มีสินค้าในหมวดนี้'}</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((product) => {
                    const catLabel = product.drugClassification
                      ? DRUG_CLASS_LABEL[product.drugClassification] ?? product.drugClassification
                      : extractOdooCategory(product.shortDescription);
                    const catColor = product.drugClassification
                      ? DRUG_CLASS_COLOR[product.drugClassification] ?? 'bg-gray-100 text-gray-700'
                      : 'bg-gray-100 text-gray-600';
                    return (
                      <tr
                        key={product.id}
                        className={`transition-colors hover:bg-muted/30 ${
                          !product.inStock ? 'bg-red-50/30' : product.isLowStock ? 'bg-amber-50/30' : ''
                        }`}
                      >
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium leading-snug">{product.nameTh}</p>
                            {product.genericName && (
                              <p className="text-xs text-muted-foreground">{product.genericName}</p>
                            )}
                            {product.brand && !product.genericName && (
                              <p className="text-xs text-muted-foreground">{product.brand}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-mono text-xs font-semibold">{product.sku}</p>
                          {product.odooCode && (
                            <p className="mt-0.5 font-mono text-xs text-blue-600">Odoo: {product.odooCode}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {catLabel ? (
                            <span className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-medium ${catColor}`}>
                              {catLabel}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {product.sellPrice != null ? (
                            <span className="font-medium">
                              ฿{product.sellPrice.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`text-base font-bold ${
                            !product.inStock ? 'text-red-600' : product.isLowStock ? 'text-amber-600' : 'text-foreground'
                          }`}>
                            {product.stockQty.toLocaleString()}
                          </span>
                          {product.unit && <span className="ml-1 text-xs text-muted-foreground">{product.unit}</span>}
                          <StockBar product={product} />
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-muted-foreground">
                          {product.reorderPoint ?? '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <StockBadge product={product} />
                        </td>
                        <td className="px-4 py-3 text-center text-xs text-muted-foreground">
                          {formatSyncTime(product.stockSyncAt)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {(product.isLowStock || !product.inStock) && (
                              <Link
                                href="/dashboard/inventory/receive"
                                className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-medium text-amber-700 hover:bg-amber-100"
                              >
                                <ShoppingCart className="h-3 w-3" />สั่งซื้อ
                              </Link>
                            )}
                            {product.odooCode ? (
                              <button
                                onClick={() => handleRefreshStock(product.id)}
                                disabled={refreshing === product.id}
                                className="rounded-md border p-1.5 transition-colors hover:bg-muted disabled:opacity-50"
                                title="รีเฟรชสต็อกจาก Odoo"
                              >
                                <RefreshCw className={`h-3.5 w-3.5 ${refreshing === product.id ? 'animate-spin' : ''}`} />
                              </button>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* Grid view */
          <div className={`grid gap-3 p-4 ${gridColClass}`}>
            {filtered.length === 0 ? (
              <div className="col-span-full py-12 text-center text-muted-foreground">
                <span className="text-3xl">📦</span>
                <p className="mt-2">{search ? `ไม่พบสินค้าที่ตรงกับ "${search}"` : 'ไม่มีสินค้า'}</p>
              </div>
            ) : (
              filtered.map((product) => {
                const catLabel = product.drugClassification
                  ? DRUG_CLASS_LABEL[product.drugClassification] ?? product.drugClassification
                  : extractOdooCategory(product.shortDescription);
                const catColor = product.drugClassification
                  ? DRUG_CLASS_COLOR[product.drugClassification] ?? 'bg-gray-100 text-gray-700'
                  : 'bg-gray-100 text-gray-600';
                return (
                  <div
                    key={product.id}
                    className={`flex flex-col gap-2 rounded-xl border p-3 transition-colors hover:bg-muted/20 ${
                      !product.inStock ? 'border-red-200 bg-red-50/20' : product.isLowStock ? 'border-amber-200 bg-amber-50/20' : ''
                    }`}
                  >
                    {/* Image */}
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.nameTh}
                        className="h-28 w-full rounded-lg object-contain bg-muted/30"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <div className="flex h-28 items-center justify-center rounded-lg bg-muted/30">
                        <span className="text-3xl">💊</span>
                      </div>
                    )}

                    {/* Name */}
                    <div className="flex-1">
                      <p className="line-clamp-2 text-sm font-medium leading-snug">{product.nameTh}</p>
                      {product.genericName && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">{product.genericName}</p>
                      )}
                    </div>

                    {/* SKU + Category */}
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono text-xs text-muted-foreground">{product.sku}</span>
                      {catLabel && (
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${catColor}`}>{catLabel}</span>
                      )}
                    </div>

                    {/* Price + Stock */}
                    <div className="flex items-center justify-between border-t pt-2">
                      <span className="text-sm font-bold">
                        {product.sellPrice != null ? `฿${product.sellPrice.toLocaleString('th-TH')}` : '-'}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-sm font-bold ${
                          !product.inStock ? 'text-red-600' : product.isLowStock ? 'text-amber-600' : 'text-emerald-600'
                        }`}>
                          {product.stockQty.toLocaleString()}
                        </span>
                        <StockBadge product={product} />
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1">
                      {(product.isLowStock || !product.inStock) && (
                        <Link
                          href="/dashboard/inventory/receive"
                          className="flex-1 rounded-md border border-amber-200 bg-amber-50 py-1 text-center text-[10px] font-medium text-amber-700 hover:bg-amber-100"
                        >
                          สั่งซื้อ
                        </Link>
                      )}
                      {product.odooCode && (
                        <button
                          onClick={() => handleRefreshStock(product.id)}
                          disabled={refreshing === product.id}
                          className="rounded-md border p-1.5 hover:bg-muted disabled:opacity-50"
                          title="รีเฟรชสต็อก"
                        >
                          <RefreshCw className={`h-3 w-3 ${refreshing === product.id ? 'animate-spin' : ''}`} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            หน้า {currentPage} / {totalPages} (ทั้งหมด {total?.toLocaleString()} รายการ)
          </span>
          <div className="flex gap-1">
            {currentPage > 1 && (
              <a
                href={`?filter=${filter}&limit=${limit}&page=${currentPage - 1}`}
                className="rounded-md border px-3 py-1.5 text-xs hover:bg-muted"
              >
                ← ก่อนหน้า
              </a>
            )}
            {currentPage < totalPages && (
              <a
                href={`?filter=${filter}&limit=${limit}&page=${currentPage + 1}`}
                className="rounded-md border px-3 py-1.5 text-xs hover:bg-muted"
              >
                ถัดไป →
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
