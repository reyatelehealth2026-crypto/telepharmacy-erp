import { ShoppingCart, DollarSign, Truck, PackageCheck } from 'lucide-react';
import { StatCard } from '@/components/stat-card';
import { PageHeader } from '@/components/page-header';
import { SkeletonTable } from '@/components/skeleton-table';

export default function OrdersPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="จัดการออเดอร์" description="ออเดอร์ทั้งหมดในระบบ">
        <button className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
          Export CSV
        </button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="ออเดอร์วันนี้"
          value="28"
          icon={ShoppingCart}
          trend={{ value: 8, label: 'จากเมื่อวาน' }}
        />
        <StatCard
          title="ยอดขายวันนี้"
          value="฿12,450"
          icon={DollarSign}
          trend={{ value: 12, label: 'จากเมื่อวาน' }}
        />
        <StatCard
          title="รอจัดส่ง"
          value="8"
          icon={Truck}
          description="3 cold chain"
        />
        <StatCard
          title="จัดส่งสำเร็จ"
          value="15"
          icon={PackageCheck}
          trend={{ value: 20, label: 'จากเมื่อวาน' }}
        />
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2 overflow-x-auto">
        {[
          'ทั้งหมด',
          'รอชำระ',
          'ชำระแล้ว',
          'กำลังดำเนินการ',
          'แพ็คแล้ว',
          'จัดส่งแล้ว',
          'สำเร็จ',
          'ยกเลิก',
        ].map((tab) => (
          <button
            key={tab}
            className="shrink-0 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors first:bg-primary first:text-primary-foreground hover:bg-muted"
          >
            {tab}
          </button>
        ))}
      </div>

      <SkeletonTable
        columns={[
          'เลขออเดอร์',
          'ลูกค้า',
          'ประเภท',
          'ยอดรวม',
          'สถานะ',
          'วันที่',
          'จัดการ',
        ]}
        rows={8}
      />
    </div>
  );
}
