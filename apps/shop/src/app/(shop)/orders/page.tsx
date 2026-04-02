'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Package, Truck, CheckCircle, Clock, XCircle, ClipboardList, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/auth';
import { getMyOrders, type Order, type OrderStatus } from '@/lib/orders';
import { formatPrice, formatDate } from '@/lib/utils';

const statusConfig: Record<OrderStatus, { label: string; badgeClass: string; icon: typeof Package }> = {
  awaiting_payment: { label: 'รอชำระเงิน', badgeClass: 'bg-amber-100 text-amber-800', icon: Clock },
  paid: { label: 'ชำระแล้ว', badgeClass: 'bg-blue-100 text-blue-800', icon: CheckCircle },
  processing: { label: 'กำลังเตรียม', badgeClass: 'bg-blue-100 text-blue-800', icon: Package },
  packed: { label: 'แพ็คแล้ว', badgeClass: 'bg-indigo-100 text-indigo-800', icon: Package },
  shipped: { label: 'จัดส่งแล้ว', badgeClass: 'bg-purple-100 text-purple-800', icon: Truck },
  delivered: { label: 'ส่งถึงแล้ว', badgeClass: 'bg-emerald-100 text-emerald-800', icon: CheckCircle },
  completed: { label: 'เสร็จสิ้น', badgeClass: 'bg-emerald-100 text-emerald-800', icon: CheckCircle },
  cancelled: { label: 'ยกเลิก', badgeClass: 'bg-red-100 text-red-800', icon: XCircle },
};

export default function OrdersPage() {
  const router = useRouter();
  const { accessToken } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) {
      router.replace('/login');
      return;
    }

    getMyOrders(accessToken)
      .then((res) => {
        const list = Array.isArray(res) ? res : (res?.data ?? []);
        setOrders(list);
      })
      .catch((err) => toast.error(err.message || 'โหลดคำสั่งซื้อไม่สำเร็จ'))
      .finally(() => setLoading(false));
  }, [accessToken, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      <div className="px-4 pt-4">
        <h1 className="text-lg font-bold">ประวัติคำสั่งซื้อ</h1>
        {orders.length > 0 && (
          <p className="mt-1 text-xs text-muted-foreground">{orders.length} รายการ</p>
        )}
      </div>

      <div className="mt-4 space-y-3 px-4 pb-6">
        {orders.map((order) => {
          const config = statusConfig[order.status] ?? statusConfig.processing;
          const Icon = config.icon;
          return (
            <Link
              key={order.id}
              href={`/orders/${order.id}`}
              className="block rounded-xl border p-4 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{order.orderNo}</span>
                <Badge className={config.badgeClass}>
                  <Icon className="mr-1 h-3 w-3" />
                  {config.label}
                </Badge>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {formatDate(order.createdAt)} · {order.items.length} รายการ
              </p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm font-bold">{formatPrice(order.totalAmount)}</span>
                {order.delivery?.trackingNo && (
                  <span className="text-xs text-muted-foreground">
                    Tracking: {order.delivery.trackingNo}
                  </span>
                )}
              </div>
            </Link>
          );
        })}

        {orders.length === 0 && (
          <div className="py-12 text-center">
            <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground/30" />
            <p className="mt-2 text-sm text-muted-foreground">ยังไม่มีคำสั่งซื้อ</p>
            <Link
              href="/search"
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              เลือกซื้อสินค้า
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
