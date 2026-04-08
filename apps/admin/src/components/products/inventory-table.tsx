'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { AlertTriangle, XCircle, CheckCircle2, RefreshCw, Search, ShoppingCart, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import type { AdminProduct } from '@/lib/products';

type SortField = 'none' | 'sellPrice' | 'stockQty';
type SortDir = 'asc' | 'desc';

interface Props {
  products: AdminProduct[];
}

const DRUG_CLASS_BADGE: Record<string, { label: string; className: string }> = {
  dangerous_drug: { label: 'ยาอันตราย', className: 'bg-red-100 text-red-700' },
  prescription_drug: { label: 'ยาต้องใบสั่ง', className: 'bg-orange-100 text-orange-700' },
  otc: { label: 'OTC', className: 'bg-green-100 text-green-700' },
  special_control: { label: 'ควบคุมพิเศษ', className: 'bg-purple-100 text-purple-700' },
  herbal: { label: 'สมุนไพร', className: 'bg-emerald-100 text-emerald-700' },
};

function StockBadge({ product }: { product: AdminProduct }) {
  if (!product.inStock) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
        <XCircle className="h-3 w-3" />
        หมด
      </span>
    );
  }
  if (product.isLowStock) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
        <AlertTriangle className="h-3 w-3" />
        ต่ำ
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
      <CheckCircle2 className="h-3 w-3" />
      ปกติ
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

export function InventoryTable({ products }: Props) {
  const [refreshing, setRefreshing] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('none');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
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

    if (sortField !== 'none') {
      list.sort((a, b) => {
        let av = 0, bv = 0;
        if (sortField === 'sellPrice') {
          av = a.sellPrice ?? 0;
          bv = b.sellPrice ?? 0;
        } else if (sortField === 'stockQty') {
          av = a.stockQty;
          bv = b.stockQty;
        }
        return sortDir === 'asc' ? av - bv : bv - av;
      });
    }
    return list;
  }, [products, search, sortField, sortDir]);

  const handleRefreshStock = async (productId: string) => {
    setRefreshing(productId);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'https://api.re-ya.com'}/v1/products/${productId}/stock`);
    } finally {
      setRefreshing(null);
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border">
      {/* Search bar */}
      <div className="flex items-center gap-2 border-b px-4 py-2">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ค้นหาชื่อ, SKU, ยาสามัญ, แบรนด์..."
          className="w-full bg-transparent py-1 text-sm outline-none placeholder:text-muted-foreground"
        />
        {search && (
          <button onClick={() => setSearch('')} className="text-xs text-muted-foreground hover:text-foreground">
            ล้าง
          </button>
        )}
        {sortField !== 'none' && (
          <button
            onClick={() => setSortField('none')}
            className="inline-flex shrink-0 items-center gap-1 rounded-full border bg-primary/5 px-2 py-0.5 text-xs text-primary hover:bg-muted"
          >
            <ArrowUpDown className="h-3 w-3" />
            {sortField === 'sellPrice' ? 'ราคา' : 'สต็อก'} {sortDir === 'asc' ? '↑' : '↓'}
            <span className="ml-0.5 text-muted-foreground">×</span>
          </button>
        )}
        <span className="shrink-0 text-xs text-muted-foreground">
          {filtered.length}/{products.length} รายการ
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">สินค้า</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">SKU / Odoo</th>
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
                <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-3xl">📦</span>
                    <p>{search ? `ไม่พบสินค้าที่ตรงกับ "${search}"` : 'ไม่มีสินค้าในหมวดนี้'}</p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((product) => {
                const drugBadge = product.drugClassification
                  ? DRUG_CLASS_BADGE[product.drugClassification]
                  : null;
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
                        {drugBadge && (
                          <span className={`mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${drugBadge.className}`}>
                            {drugBadge.label}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs text-muted-foreground">{product.sku}</p>
                      {product.odooCode && (
                        <p className="mt-0.5 font-mono text-xs text-blue-600">
                          Odoo: {product.odooCode}
                        </p>
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
                      <span
                        className={`text-base font-bold ${
                          !product.inStock
                            ? 'text-red-600'
                            : product.isLowStock
                              ? 'text-amber-600'
                              : 'text-foreground'
                        }`}
                      >
                        {product.stockQty.toLocaleString()}
                      </span>
                      {product.unit && (
                        <span className="ml-1 text-xs text-muted-foreground">{product.unit}</span>
                      )}
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
                            className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2 py-1 text-[10px] font-medium text-amber-700 hover:bg-amber-100"
                            title="สั่งซื้อเพิ่ม"
                          >
                            <ShoppingCart className="h-3 w-3" />
                            สั่งซื้อ
                          </Link>
                        )}
                        {product.odooCode ? (
                          <button
                            onClick={() => handleRefreshStock(product.id)}
                            disabled={refreshing === product.id}
                            className="rounded-md border p-1.5 transition-colors hover:bg-muted disabled:opacity-50"
                            title="รีเฟรชสต็อกจาก Odoo"
                          >
                            <RefreshCw
                              className={`h-3.5 w-3.5 ${refreshing === product.id ? 'animate-spin' : ''}`}
                            />
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
    </div>
  );
}
