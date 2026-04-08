'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ShoppingCart,
  DollarSign,
  Truck,
  PackageCheck,
  Loader2,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { StatCard } from '@/components/stat-card';
import { PageHeader } from '@/components/page-header';
import { useApi } from '@/lib/use-api';
import { cn } from '@/lib/utils';

interface Order {
  id: string;
  orderNo: string;
  patientId: string;
  orderType: string;
  status: string;
  totalAmount: string;
  coldChainRequired: boolean;
  source: string;
  createdAt: string;
}

interface OrdersResponse {
  data: Order[];
  meta: { page: number; limit: number; total?: number; totalPages?: number };
}

type StatusFilter = 'all' | 'awaiting_payment' | 'paid' | 'processing' | 'packed' | 'shipped' | 'delivered' | 'completed' | 'cancelled';

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'awaiting_payment', label: 'รอชำระ' },
  { key: 'paid', label: 'ชำระแล้ว' },
  { key: 'processing', label: 'กำลังจัด' },
  { key: 'packed', label: 'แพ็คแล้ว' },
  { key: 'shipped', label: 'จัดส่งแล้ว' },
  { key: 'delivered', label: 'ส่งถึง' },
  { key: 'completed', label: 'สำเร็จ' },
  { key: 'cancelled', label: 'ยกเลิก' },
];

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700',
  awaiting_payment: 'bg-amber-100 text-amber-700',
  paid: 'bg-blue-100 text-blue-700',
  processing: 'bg-indigo-100 text-indigo-700',
  packed: 'bg-cyan-100 text-cyan-700',
  ready_to_ship: 'bg-teal-100 text-teal-700',
  shipped: 'bg-purple-100 text-purple-700',
  out_for_delivery: 'bg-violet-100 text-violet-700',
  delivered: 'bg-green-100 text-green-700',
  completed: 'bg-green-200 text-green-800',
  cancelled: 'bg-red-100 text-red-700',
};

const STATUS_LABEL: Record<string, string> = {
  draft: 'ร่าง',
  awaiting_payment: 'รอชำระ',
  paid: 'ชำระแล้ว',
  processing: 'กำลังจัด',
  packed: 'แพ็คแล้ว',
  ready_to_ship: 'พร้อมส่ง',
  shipped: 'จัดส่งแล้ว',
  out_for_delivery: 'กำลังส่ง',
  delivered: 'ส่งถึง',
  completed: 'สำเร็จ',
  cancelled: 'ยกเลิก',
};

export default function OrdersPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);

  const apiPath = `/v1/staff/orders?page=${page}&limit=20${statusFilter !== 'all' ? `&status=${statusFilter}` : ''}`;
  const { data: result, isLoading, mutate } = useApi<OrdersResponse>(apiPath);

  const orders = result?.data ?? [];
  const meta = {
    page: result?.meta?.page ?? 1,
    limit: result?.meta?.limit ?? 20,
    total: result?.meta?.total ?? 0,
    totalPages: result?.meta?.totalPages ?? 0,
  };

  return (
    <div className="space-y-6">
      <PageHeader title="จัดการออเดอร์" description="ออเดอร์ทั้งหมดในระบบ">
        <div className="flex gap-2">
          <Link
            href="/dashboard/orders/pending-slips"
            className="inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors hover:bg-muted"
          >
            ตรวจสลิป
          </Link>
          <button
            onClick={() => mutate()}
            className="inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors hover:bg-muted"
          >
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            รีเฟรช
          </button>
        </div>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="ออเดอร์ทั้งหมด"
          value={isLoading ? '...' : meta.total.toLocaleString()}
          icon={ShoppingCart}
        />
        <StatCard
          title="ตัวกรองสถานะ"
          value={STATUS_TABS.find((t) => t.key === statusFilter)?.label ?? 'ทั้งหมด'}
          icon={DollarSign}
        />
        <StatCard
          title="หน้า"
          value={`${meta.page}/${meta.totalPages || 1}`}
          icon={Truck}
          description={`แสดง ${orders.length} รายการ`}
        />
        <StatCard
          title="จำนวนที่แสดง"
          value={String(orders.length)}
          icon={PackageCheck}
        />
      </div>

      {/* Status Tabs */}
      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setStatusFilter(tab.key); setPage(1); }}
            className={cn(
              'shrink-0 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
              statusFilter === tab.key
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Orders Table */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                <th className="px-4 py-3 font-medium">เลขออเดอร์</th>
                <th className="px-4 py-3 font-medium">ประเภท</th>
                <th className="px-4 py-3 font-medium">ยอดรวม</th>
                <th className="px-4 py-3 font-medium">สถานะ</th>
                <th className="px-4 py-3 font-medium">Cold Chain</th>
                <th className="px-4 py-3 font-medium">ช่องทาง</th>
                <th className="px-4 py-3 font-medium">วันที่</th>
                <th className="px-4 py-3 font-medium">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                    <p className="mt-2">กำลังโหลด...</p>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    <ShoppingCart className="mx-auto h-8 w-8" />
                    <p className="mt-2">ไม่พบออเดอร์</p>
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="border-b transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs">{order.orderNo}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">{order.orderType}</span>
                    </td>
                    <td className="px-4 py-3 font-medium">
                      ฿{parseFloat(order.totalAmount ?? '0').toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', STATUS_BADGE[order.status] ?? 'bg-muted')}>
                        {STATUS_LABEL[order.status] ?? order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {order.coldChainRequired ? (
                        <span className="text-xs font-medium text-blue-600">❄️ ใช่</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground capitalize">{order.source}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString('th-TH')}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/orders/${order.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        ดู
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-xs text-muted-foreground">
              แสดง {(meta.page - 1) * meta.limit + 1}–{Math.min(meta.page * meta.limit, meta.total)} จาก {meta.total}
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-50"
              >
                ก่อนหน้า
              </button>
              <button
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={page >= meta.totalPages}
                className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-50"
              >
                ถัดไป
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
