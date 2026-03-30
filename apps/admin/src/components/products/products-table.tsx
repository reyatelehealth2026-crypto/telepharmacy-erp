'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search, AlertTriangle, CheckCircle2, XCircle, ExternalLink, Pill } from 'lucide-react';
import type { AdminProduct, ProductListResponse } from '@/lib/products';

interface Props {
  products: AdminProduct[];
  meta: ProductListResponse['meta'];
  search: string;
  drugClassificationLabel: Record<string, string>;
}

const statusBadge = (status: string) => {
  const map: Record<string, { label: string; cls: string }> = {
    active: { label: 'Active', cls: 'bg-emerald-100 text-emerald-700' },
    inactive: { label: 'Inactive', cls: 'bg-gray-100 text-gray-600' },
    draft: { label: 'Draft', cls: 'bg-amber-100 text-amber-700' },
    discontinued: { label: 'Discontinued', cls: 'bg-red-100 text-red-700' },
  };
  const s = map[status] ?? { label: status, cls: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.cls}`}>
      {s.label}
    </span>
  );
};

export function ProductsTable({ products, meta, search: initialSearch, drugClassificationLabel }: Props) {
  const [search, setSearch] = useState(initialSearch);

  return (
    <div className="space-y-4">
      {/* Search + Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="ค้นหาสินค้า SKU หรือชื่อ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border bg-background py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {['ทั้งหมด', 'ยาสามัญ (HHR)', 'ยาอันตราย (DD)', 'อุปกรณ์', 'อาหารเสริม', 'สมุนไพร', 'ร่าง'].map(
            (tab, i) => (
              <button
                key={tab}
                className={`shrink-0 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                  i === 0 ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                }`}
              >
                {tab}
              </button>
            ),
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="w-16 px-4 py-3 text-left font-medium text-muted-foreground">รูป</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">SKU</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">ชื่อสินค้า</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">ประเภทยา</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">ราคาขาย</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">สต็อก</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Odoo</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">สถานะ</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-3xl">📦</span>
                      <p>ยังไม่มีสินค้า</p>
                      <p className="text-xs">กด &quot;Sync จาก Odoo&quot; เพื่อดึงข้อมูลสินค้า</p>
                    </div>
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="relative h-10 w-10 overflow-hidden rounded-lg bg-muted">
                        {product.imageUrl ? (
                          <Image
                            src={product.imageUrl}
                            alt={product.nameTh}
                            fill
                            className="object-cover"
                            sizes="40px"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <Pill className="h-5 w-5 text-muted-foreground/40" />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {product.sku}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium">{product.nameTh}</p>
                        {product.brand && (
                          <p className="text-xs text-muted-foreground">{product.brand}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {drugClassificationLabel[product.drugClassification ?? ''] ?? product.drugClassification ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {product.sellPrice ? `฿${product.sellPrice.toLocaleString()}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`font-medium ${
                          !product.inStock
                            ? 'text-red-600'
                            : product.isLowStock
                              ? 'text-amber-600'
                              : 'text-emerald-600'
                        }`}
                      >
                        {product.stockQty.toLocaleString()}
                      </span>
                      {product.isLowStock && product.inStock && (
                        <AlertTriangle className="ml-1 inline h-3 w-3 text-amber-500" />
                      )}
                      {!product.inStock && (
                        <XCircle className="ml-1 inline h-3 w-3 text-red-500" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {product.odooCode ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                          <CheckCircle2 className="h-3 w-3" />
                          {product.odooCode}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">{statusBadge(product.status)}</td>
                    <td className="px-4 py-3 text-center">
                      <Link
                        href={`/dashboard/products/${product.id}`}
                        className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors hover:bg-muted"
                      >
                        <ExternalLink className="h-3 w-3" />
                        ดู
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
            <span>
              แสดง {(meta.page - 1) * meta.limit + 1}–
              {Math.min(meta.page * meta.limit, meta.total)} จาก {meta.total.toLocaleString()} รายการ
            </span>
            <div className="flex gap-1">
              {Array.from({ length: Math.min(meta.totalPages, 5) }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={`?page=${p}`}
                  className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                    p === meta.page
                      ? 'bg-primary text-primary-foreground'
                      : 'border hover:bg-muted'
                  }`}
                >
                  {p}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
