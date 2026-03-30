import { ClipboardList, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { StatCard } from '@/components/stat-card';
import { PageHeader } from '@/components/page-header';
import { SkeletonTable } from '@/components/skeleton-table';

export default function PharmacistQueuePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="คิวใบสั่งยา"
        description="ตรวจสอบและ verify ใบสั่งยาจากผู้ป่วย"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="รอตรวจสอบ"
          value="5"
          icon={ClipboardList}
          description="2 urgent"
        />
        <StatCard
          title="Urgent / High"
          value="3"
          icon={AlertTriangle}
          description="ต้องดำเนินการภายใน 15 นาที"
        />
        <StatCard
          title="เวลาเฉลี่ย verify"
          value="12 นาที"
          icon={Clock}
          trend={{ value: -8, label: 'จากสัปดาห์ก่อน' }}
        />
        <StatCard
          title="verify วันนี้"
          value="18"
          icon={CheckCircle}
          trend={{ value: 5, label: 'จากเมื่อวาน' }}
        />
      </div>

      {/* Priority Tabs */}
      <div className="flex gap-2">
        {['ทั้งหมด', 'Urgent', 'High', 'Medium', 'Low'].map((tab) => (
          <button
            key={tab}
            className="rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors first:bg-primary first:text-primary-foreground hover:bg-muted"
          >
            {tab}
          </button>
        ))}
      </div>

      <SkeletonTable
        columns={[
          'เลข Rx',
          'ผู้ป่วย',
          'Priority',
          'รอ (นาที)',
          'Safety Alerts',
          'สถานะ',
          'จัดการ',
        ]}
        rows={5}
      />
    </div>
  );
}
