'use client';

import { useState } from 'react';
import { AlertTriangle, XCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import type { AdminProduct } from '@/lib/products';

interface Props {
  products: AdminProduct[];
}

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

function formatSyncTime(dateStr: string | null): string {
  if (!dateStr) return 'ไม่เคย sync';
  const d = new Date(dateStr);
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

  const handleRefreshStock = async (productId: string) => {
    setRefreshing(productId);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'}/v1/products/${productId}/stock`);
    } finally {
      setRefreshing(null);
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">สินค้า</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">SKU / Odoo</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">สต็อก</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Reorder Point</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">สถานะ</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">Sync ล่าสุด</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">รีเฟรช</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {products.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-3xl">📦</span>
                    <p>ไม่มีสินค้าในหมวดนี้</p>
                  </div>
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr
                  key={product.id}
                  className={`transition-colors hover:bg-muted/30 ${
                    !product.inStock ? 'bg-red-50/30' : product.isLowStock ? 'bg-amber-50/30' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium">{product.nameTh}</p>
                      {product.brand && (
                        <p className="text-xs text-muted-foreground">{product.brand}</p>
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
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
