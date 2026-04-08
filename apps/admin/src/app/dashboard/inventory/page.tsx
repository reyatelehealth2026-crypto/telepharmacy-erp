import { Warehouse, AlertTriangle, Package, TrendingDown } from 'lucide-react';
import { StatCard } from '@/components/stat-card';
import { PageHeader } from '@/components/page-header';
import { getAdminProducts } from '@/lib/products';
import { InventoryTable } from '@/components/products/inventory-table';
import { OdooSyncButton } from '@/components/products/odoo-sync-button';

const PER_PAGE_OPTIONS = [20, 50, 100, 200];

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; page?: string; limit?: string }>;
}) {
  const sp = await searchParams;
  const filter = sp.filter ?? 'all';
  const page = Number(sp.page ?? 1);
  const limit = PER_PAGE_OPTIONS.includes(Number(sp.limit)) ? Number(sp.limit) : 50;

  const inStockOnly = filter === 'in' ? true : undefined;

  const result = await getAdminProducts({
    page,
    limit,
    sortBy: 'sku',
    sortOrder: 'desc',
    inStockOnly,
    status: 'active',
  }).catch(() => ({
    data: [],
    meta: { page: 1, limit, total: 0, totalPages: 0 },
  }));

  const allProducts = result.data;
  const lowStockProducts = allProducts.filter((p) => p.isLowStock && p.inStock);
  const outOfStockProducts = allProducts.filter((p) => !p.inStock);
  const totalStockValue = allProducts.reduce(
    (sum, p) => sum + (p.sellPrice ?? 0) * p.stockQty,
    0,
  );

  return (
    <div className="space-y-6">
      <PageHeader title="คลังสินค้า" description="จัดการสต็อกและข้อมูลจาก Odoo ERP">
        <div className="flex flex-wrap gap-2">
          <OdooSyncButton />
          <a href="/dashboard/inventory/movements" className="inline-flex h-9 items-center rounded-lg border px-4 text-sm font-medium transition-colors hover:bg-muted">
            ประวัติเคลื่อนไหว
          </a>
          <a href="/dashboard/inventory/receive" className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
            รับสินค้าเข้า
          </a>
        </div>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="มูลค่าสต็อก (ประมาณ)"
          value={`฿${(totalStockValue / 1_000_000).toFixed(1)}M`}
          icon={Warehouse}
        />
        <StatCard
          title="สต็อกต่ำ"
          value={lowStockProducts.length.toLocaleString()}
          icon={AlertTriangle}
          description="ต้องสั่งซื้อเพิ่ม"
        />
        <StatCard
          title="สินค้าหมด"
          value={outOfStockProducts.length.toLocaleString()}
          icon={TrendingDown}
          description="ไม่มีสต็อกเหลือ"
        />
        <StatCard
          title="สินค้าทั้งหมด"
          value={result.meta.total.toLocaleString()}
          icon={Package}
          description={`${allProducts.filter((p) => p.odooCode).length} เชื่อมกับ Odoo`}
        />
      </div>

      {/* Controls row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Filter tabs */}
        <div className="flex gap-2">
          {[
            { label: 'ทั้งหมด', value: 'all' },
            { label: 'สต็อกต่ำ', value: 'low' },
            { label: 'สินค้าหมด', value: 'out' },
          ].map((tab) => {
            const count = tab.value === 'low' ? lowStockProducts.length
              : tab.value === 'out' ? outOfStockProducts.length
              : allProducts.length;
            return (
              <a
                key={tab.value}
                href={`?filter=${tab.value}&limit=${limit}`}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                  filter === tab.value
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
              >
                {tab.label}
                <span className={`rounded-full px-1.5 py-0.5 text-xs ${
                  filter === tab.value ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
                }`}>
                  {count}
                </span>
              </a>
            );
          })}
        </div>

        {/* Per-page selector */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>แสดง</span>
          <div className="flex gap-1">
            {PER_PAGE_OPTIONS.map((n) => (
              <a
                key={n}
                href={`?filter=${filter}&limit=${n}`}
                className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                  limit === n
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
              >
                {n}
              </a>
            ))}
          </div>
          <span>รายการ / หน้า</span>
        </div>
      </div>

      <InventoryTable
        products={
          filter === 'low' ? lowStockProducts
          : filter === 'out' ? outOfStockProducts
          : allProducts
        }
        total={result.meta.total}
        currentPage={page}
        totalPages={result.meta.totalPages}
        limit={limit}
        filter={filter}
      />
    </div>
  );
}
