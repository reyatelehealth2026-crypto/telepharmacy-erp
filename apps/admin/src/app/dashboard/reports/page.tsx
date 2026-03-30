import {
  BarChart3,
  TrendingUp,
  Users,
  ClipboardList,
} from 'lucide-react';
import { StatCard } from '@/components/stat-card';
import { PageHeader } from '@/components/page-header';

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="รายงาน"
        description="วิเคราะห์ข้อมูลการดำเนินงาน"
      >
        <select className="h-9 rounded-lg border px-3 text-sm outline-none">
          <option>30 วันล่าสุด</option>
          <option>7 วันล่าสุด</option>
          <option>เดือนนี้</option>
          <option>เดือนก่อน</option>
          <option>ปีนี้</option>
        </select>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="ยอดขายรวม"
          value="฿345,200"
          icon={TrendingUp}
          trend={{ value: 18, label: 'จากเดือนก่อน' }}
        />
        <StatCard
          title="AOV"
          value="฿425"
          icon={BarChart3}
          trend={{ value: 5, label: 'จากเดือนก่อน' }}
        />
        <StatCard
          title="ลูกค้าซื้อซ้ำ"
          value="62%"
          icon={Users}
          trend={{ value: 3, label: 'จากเดือนก่อน' }}
        />
        <StatCard
          title="Rx Verify SLA"
          value="94%"
          icon={ClipboardList}
          description="ภายใน SLA ที่กำหนด"
        />
      </div>

      {/* Report Cards */}
      <div className="grid gap-6 lg:grid-cols-2">
        {[
          {
            title: 'ยอดขายรายวัน',
            description: 'กราฟยอดขาย 30 วันล่าสุด',
          },
          {
            title: 'สินค้าขายดี',
            description: 'Top 10 สินค้าขายดีที่สุด',
          },
          {
            title: 'ลูกค้าใหม่ vs กลับมาซื้อ',
            description: 'สัดส่วนลูกค้าใหม่และลูกค้าเก่า',
          },
          {
            title: 'Rx Volume & SLA',
            description: 'จำนวนใบสั่งยาและเวลา verify',
          },
        ].map((report) => (
          <div
            key={report.title}
            className="rounded-xl border bg-card p-6 shadow-sm"
          >
            <h3 className="font-semibold">{report.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {report.description}
            </p>
            <div className="mt-6 flex h-48 items-center justify-center rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">
                Chart placeholder — integrate Recharts / Tremor
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
