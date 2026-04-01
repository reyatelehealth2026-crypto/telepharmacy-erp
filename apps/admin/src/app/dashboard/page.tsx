'use client';

import Link from 'next/link';
import {
  ShoppingCart,
  Users,
  ClipboardList,
  DollarSign,
  AlertTriangle,
  Package,
  TrendingUp,
  Clock,
  Loader2,
} from 'lucide-react';
import { StatCard } from '@/components/stat-card';
import { PageHeader } from '@/components/page-header';
import { useApi } from '@/lib/use-api';
import { cn } from '@/lib/utils';

interface Summary {
  sales: { totalAmount: number; totalOrders: number; aov: number };
  prescriptions: { total: number; verified: number; rejected: number; pending: number; verifyRate: number };
  interventions: { total: number; rate: number };
  newPatients: number;
}

interface QueueItem {
  id: string;
  rxNo: string;
  aiPriority: string;
  status: string;
  createdAt: string;
}

interface QueueResponse {
  data: QueueItem[];
  total: number;
}

interface Order {
  id: string;
  orderNo: string;
  totalAmount: string;
  status: string;
  createdAt: string;
}

interface OrdersResponse {
  data: Order[];
}

const STATUS_LABEL: Record<string, string> = {
  awaiting_payment: 'รอชำระ',
  paid: 'ชำระแล้ว',
  processing: 'กำลังจัด',
  packed: 'แพ็คแล้ว',
  shipped: 'จัดส่งแล้ว',
  delivered: 'ส่งถึง',
  completed: 'สำเร็จ',
};

const STATUS_COLOR: Record<string, string> = {
  awaiting_payment: 'text-amber-600',
  paid: 'text-blue-600',
  processing: 'text-indigo-600',
  shipped: 'text-purple-600',
  delivered: 'text-green-600',
  completed: 'text-green-700',
};

function fmtBaht(n: number) {
  return `฿${n.toLocaleString('th-TH', { minimumFractionDigits: 0 })}`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} นาทีที่แล้ว`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} ชม.ที่แล้ว`;
  return `${Math.floor(hrs / 24)} วันที่แล้ว`;
}

export default function DashboardPage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();
  const nowISO = new Date().toISOString();

  const { data: summary, isLoading: summaryLoading } = useApi<Summary>(
    `/v1/staff/reports/summary?from=${encodeURIComponent(todayISO)}&to=${encodeURIComponent(nowISO)}`,
  );
  const { data: queue } = useApi<QueueResponse>('/v1/prescriptions/queue?limit=50');
  const { data: recentOrders } = useApi<OrdersResponse>('/v1/staff/orders?limit=5');
  const { data: lowStock } = useApi<unknown[]>('/v1/staff/reports/low-stock');

  const queueCount = queue?.data?.length ?? 0;
  const urgentCount = queue?.data?.filter((q) => q.aiPriority === 'urgent' || q.aiPriority === 'high').length ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="ภาพรวมการดำเนินงานวันนี้"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="ยอดขายวันนี้"
          value={summaryLoading ? '...' : fmtBaht(summary?.sales.totalAmount ?? 0)}
          icon={DollarSign}
          description={summary ? `${summary.sales.totalOrders} ออเดอร์` : undefined}
        />
        <StatCard
          title="ออเดอร์วันนี้"
          value={summaryLoading ? '...' : String(summary?.sales.totalOrders ?? 0)}
          icon={ShoppingCart}
          description={summary ? `AOV ${fmtBaht(summary.sales.aov)}` : undefined}
        />
        <StatCard
          title="ใบสั่งยารอตรวจ"
          value={String(queueCount)}
          icon={ClipboardList}
          description={urgentCount > 0 ? `${urgentCount} urgent/high` : undefined}
        />
        <StatCard
          title="ผู้ป่วยใหม่วันนี้"
          value={summaryLoading ? '...' : String(summary?.newPatients ?? 0)}
          icon={Users}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pending Actions */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">รอดำเนินการ</h2>
          <div className="mt-4 space-y-3">
            <Link
              href="/dashboard/pharmacist"
              className="flex items-center justify-between rounded-lg border px-4 py-3 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
                  <ClipboardList className="h-4 w-4 text-amber-500" />
                </div>
                <span className="text-sm font-medium">ใบสั่งยารอ verify</span>
              </div>
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold">
                {queueCount}
              </span>
            </Link>
            <Link
              href="/dashboard/pharmacist"
              className="flex items-center justify-between rounded-lg border px-4 py-3 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                </div>
                <span className="text-sm font-medium">Urgent/High Priority</span>
              </div>
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold">
                {urgentCount}
              </span>
            </Link>
            <Link
              href="/dashboard/orders?status=processing"
              className="flex items-center justify-between rounded-lg border px-4 py-3 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
                  <Package className="h-4 w-4 text-blue-500" />
                </div>
                <span className="text-sm font-medium">ออเดอร์กำลังจัด</span>
              </div>
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold">
                -
              </span>
            </Link>
            <Link
              href="/dashboard/inventory?filter=low"
              className="flex items-center justify-between rounded-lg border px-4 py-3 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10">
                  <TrendingUp className="h-4 w-4 text-orange-500" />
                </div>
                <span className="text-sm font-medium">สต็อกต่ำ</span>
              </div>
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold">
                {Array.isArray(lowStock) ? lowStock.length : '-'}
              </span>
            </Link>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">ออเดอร์ล่าสุด</h2>
            <Link href="/dashboard/orders" className="text-xs text-primary hover:underline">
              ดูทั้งหมด →
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {recentOrders?.data && recentOrders.data.length > 0 ? (
              recentOrders.data.map((order) => (
                <Link
                  key={order.id}
                  href={`/dashboard/orders/${order.id}`}
                  className="flex items-center justify-between rounded-lg border px-4 py-3 transition-colors hover:bg-muted/50"
                >
                  <div>
                    <p className="text-sm font-medium">{order.orderNo}</p>
                    <p className={cn('text-xs', STATUS_COLOR[order.status] ?? 'text-muted-foreground')}>
                      {STATUS_LABEL[order.status] ?? order.status}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">
                      ฿{(parseFloat(order.totalAmount ?? '0') || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {timeAgo(order.createdAt)}
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                {recentOrders ? 'ไม่มีออเดอร์' : <Loader2 className="h-5 w-5 animate-spin" />}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
