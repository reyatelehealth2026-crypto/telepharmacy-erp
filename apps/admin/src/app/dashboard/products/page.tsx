import Link from 'next/link';
import { Pill, PackagePlus, Tag, TrendingUp, RefreshCw } from 'lucide-react';
import { StatCard } from '@/components/stat-card';
import { PageHeader } from '@/components/page-header';
import { getAdminProducts } from '@/lib/products';
import { ProductsTable } from '@/components/products/products-table';
import { OdooSyncButton } from '@/components/products/odoo-sync-button';

const drugClassificationLabel: Record<string, string> = {
  hhr: 'ยาสามัญ (HHR)',
  dangerous_drug: 'ยาอันตราย (DD)',
  specially_controlled: 'ยาควบคุมพิเศษ',
  supplement: 'อาหารเสริม',
  device: 'อุปกรณ์',
  cosmetic: 'เครื่องสำอาง',
  herbal: 'สมุนไพร',
  food: 'อาหาร',
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string; filter?: string }>;
}) {
  const sp = await searchParams;
  const page = Number(sp.page ?? 1);
  const search = sp.search ?? '';

  const result = await getAdminProducts({ search, page, limit: 20 }).catch(() => ({
    data: [],
    meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
  }));

  const total = result.meta.total;
  const lowStockCount = result.data.filter((p) => p.isLowStock).length;
  const ddCount = result.data.filter((p) => p.drugClassification === 'dangerous_drug').length;

  return (
    <div className="space-y-6">
      <PageHeader title="จัดการสินค้า" description="สินค้าและยาในระบบ">
        <div className="flex gap-2">
          <OdooSyncButton />
          <Link href="/dashboard/products/new" className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
            <PackagePlus className="mr-2 h-4 w-4" />
            เพิ่มสินค้า
          </Link>
        </div>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="สินค้าทั้งหมด"
          value={total.toLocaleString()}
          icon={Pill}
          description={`${result.data.filter((p) => p.status === 'active').length} active`}
        />
        <StatCard
          title="ยาอันตราย (DD)"
          value={ddCount.toLocaleString()}
          icon={Tag}
          description="ต้องมีเภสัชกรจ่าย"
        />
        <StatCard
          title="สต็อกต่ำ"
          value={lowStockCount.toLocaleString()}
          icon={RefreshCw}
          description="ต้องสั่งซื้อเพิ่ม"
        />
        <StatCard
          title="Sync จาก Odoo"
          value={result.data.filter((p) => p.odooCode).length.toLocaleString()}
          icon={TrendingUp}
          description="รายการที่เชื่อมกับ Odoo"
        />
      </div>

      <ProductsTable
        products={result.data}
        meta={result.meta}
        search={search}
        drugClassificationLabel={drugClassificationLabel}
      />
    </div>
  );
}
