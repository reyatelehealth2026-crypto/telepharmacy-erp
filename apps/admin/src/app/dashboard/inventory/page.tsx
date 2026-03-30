import { Warehouse, AlertTriangle, Clock, Package, TrendingDown } from 'lucide-react';
import { StatCard } from '@/components/stat-card';
import { PageHeader } from '@/components/page-header';
import { getAdminProducts } from '@/lib/products';
import { InventoryTable } from '@/components/products/inventory-table';

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const filter = sp.filter ?? 'all';
  const page = Number(sp.page ?? 1);

  const result = await getAdminProducts({ page, limit: 50 }).catch(() => ({
    data: [],
    meta: { page: 1, limit: 50, total: 0, totalPages: 0 },
  }));

  const allProducts = result.data;
  const lowStockProducts = allProducts.filter((p) => p.isLowStock && p.inStock);
  const outOfStockProducts = allProducts.filter((p) => !p.inStock);
  const totalStockValue = allProducts.reduce(
    (sum, p) => sum + (p.sellPrice ?? 0) * p.stockQty,
    0,
  );

  const filteredProducts =
    filter === 'low'
      ? lowStockProducts
      : filter === 'out'
        ? outOfStockProducts
        : allProducts;

  return (
    <div className="space-y-6">
      <PageHeader title="คลังสินค้า" description="จัดการสต็อกและข้อมูลจาก Odoo ERP">
        <div className="flex gap-2">
          <button className="inline-flex h-9 items-center rounded-lg border px-4 text-sm font-medium transition-colors hover:bg-muted">
            Export
          </button>
          <button className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
            รับสินค้าเข้า
          </button>
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

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {[
          { label: 'ทั้งหมด', value: 'all', count: allProducts.length },
          { label: 'สต็อกต่ำ', value: 'low', count: lowStockProducts.length },
          { label: 'สินค้าหมด', value: 'out', count: outOfStockProducts.length },
        ].map((tab) => (
          <a
            key={tab.value}
            href={`?filter=${tab.value}`}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === tab.value
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'
            }`}
          >
            {tab.label}
            <span
              className={`rounded-full px-1.5 py-0.5 text-xs ${
                filter === tab.value
                  ? 'bg-white/20 text-white'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {tab.count}
            </span>
          </a>
        ))}
      </div>

      <InventoryTable products={filteredProducts} />
    </div>
  );
}
