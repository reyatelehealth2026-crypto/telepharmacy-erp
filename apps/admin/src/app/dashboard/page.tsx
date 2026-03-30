import {
  ShoppingCart,
  Users,
  ClipboardList,
  DollarSign,
  AlertTriangle,
  Package,
  TrendingUp,
  Clock,
} from 'lucide-react';
import { StatCard } from '@/components/stat-card';
import { PageHeader } from '@/components/page-header';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="ภาพรวมการดำเนินงานวันนี้"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="ยอดขายวันนี้"
          value="฿12,450"
          icon={DollarSign}
          trend={{ value: 12, label: 'จากเมื่อวาน' }}
        />
        <StatCard
          title="ออเดอร์วันนี้"
          value="28"
          icon={ShoppingCart}
          trend={{ value: 8, label: 'จากเมื่อวาน' }}
        />
        <StatCard
          title="ใบสั่งยารอตรวจ"
          value="5"
          icon={ClipboardList}
          description="2 urgent, 1 high"
        />
        <StatCard
          title="ลูกค้าใหม่วันนี้"
          value="7"
          icon={Users}
          trend={{ value: 15, label: 'จากเมื่อวาน' }}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pending Actions */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">รอดำเนินการ</h2>
          <div className="mt-4 space-y-3">
            {[
              {
                icon: ClipboardList,
                label: 'ใบสั่งยารอ verify',
                count: 5,
                color: 'text-amber-500',
                bgColor: 'bg-amber-500/10',
              },
              {
                icon: AlertTriangle,
                label: 'สลิปรอตรวจสอบ',
                count: 3,
                color: 'text-destructive',
                bgColor: 'bg-destructive/10',
              },
              {
                icon: Package,
                label: 'ออเดอร์รอแพ็ค',
                count: 8,
                color: 'text-blue-500',
                bgColor: 'bg-blue-500/10',
              },
              {
                icon: TrendingUp,
                label: 'สต็อกต่ำ',
                count: 12,
                color: 'text-orange-500',
                bgColor: 'bg-orange-500/10',
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-lg border px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-lg ${item.bgColor}`}
                  >
                    <item.icon className={`h-4 w-4 ${item.color}`} />
                  </div>
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold">
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">ออเดอร์ล่าสุด</h2>
          <div className="mt-4 space-y-3">
            {[
              {
                orderNo: 'REYA-20260330-001',
                patient: 'สมชาย ใจดี',
                amount: '฿350',
                status: 'paid',
                statusLabel: 'ชำระแล้ว',
                time: '10 นาทีที่แล้ว',
              },
              {
                orderNo: 'REYA-20260330-002',
                patient: 'สมหญิง รักดี',
                amount: '฿1,250',
                status: 'processing',
                statusLabel: 'กำลังดำเนินการ',
                time: '25 นาทีที่แล้ว',
              },
              {
                orderNo: 'REYA-20260330-003',
                patient: 'วิชัย มั่นคง',
                amount: '฿89',
                status: 'shipped',
                statusLabel: 'จัดส่งแล้ว',
                time: '1 ชม.ที่แล้ว',
              },
              {
                orderNo: 'REYA-20260330-004',
                patient: 'นภา สว่าง',
                amount: '฿520',
                status: 'awaiting',
                statusLabel: 'รอชำระ',
                time: '2 ชม.ที่แล้ว',
              },
            ].map((order) => (
              <div
                key={order.orderNo}
                className="flex items-center justify-between rounded-lg border px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium">{order.orderNo}</p>
                  <p className="text-xs text-muted-foreground">
                    {order.patient}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{order.amount}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {order.time}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
