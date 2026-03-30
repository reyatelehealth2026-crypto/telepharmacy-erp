import { Users, UserPlus, Heart, AlertTriangle } from 'lucide-react';
import { StatCard } from '@/components/stat-card';
import { PageHeader } from '@/components/page-header';
import { SkeletonTable } from '@/components/skeleton-table';

export default function PatientsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="ข้อมูลผู้ป่วย"
        description="จัดการข้อมูลผู้ป่วยและประวัติสุขภาพ"
      >
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="ค้นหาชื่อ, เลขผู้ป่วย, เบอร์โทร..."
            className="h-9 w-64 rounded-lg border px-3 text-sm outline-none ring-ring/20 placeholder:text-muted-foreground focus:ring-2"
          />
        </div>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="ผู้ป่วยทั้งหมด"
          value="1,234"
          icon={Users}
          trend={{ value: 5, label: 'เดือนนี้' }}
        />
        <StatCard
          title="ลงทะเบียนใหม่เดือนนี้"
          value="87"
          icon={UserPlus}
          trend={{ value: 12, label: 'จากเดือนก่อน' }}
        />
        <StatCard
          title="มีโรคประจำตัว"
          value="456"
          icon={Heart}
          description="37% ของผู้ป่วยทั้งหมด"
        />
        <StatCard
          title="มีประวัติแพ้ยา"
          value="189"
          icon={AlertTriangle}
          description="15% ของผู้ป่วยทั้งหมด"
        />
      </div>

      <SkeletonTable
        columns={[
          'เลขผู้ป่วย',
          'ชื่อ-นามสกุล',
          'อายุ',
          'จังหวัด',
          'แพ้ยา',
          'โรคประจำตัว',
          'ออเดอร์',
          'จัดการ',
        ]}
        rows={8}
      />
    </div>
  );
}
