'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Package, Truck, CheckCircle, Clock, XCircle, ClipboardList, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth';
import { getMyOrders, type Order } from '@/lib/orders';
import { formatPrice } from '@/lib/utils';

const statusConfig: Record<string, { label: string; color: string; icon: typeof Package }> = {
  awaiting_payment: { label: 'รอชำระเงิน', color: 'text-amber-600', icon: Clock },
  paid: { label: 'ชำระแล้ว', color: 'text-blue-600', icon: CheckCircle },
  processing: { label: 'กำลังเตรียม', color: 'text-blue-600', icon: Package },
  packed: { label: 'แพ็คแล้ว', color: 'text-indigo-600', icon: Package },
  shipped: { label: 'จัดส่งแล้ว', color: 'text-purple-600', icon: Truck },
  delivered: { label: 'ส่งถึงแล้ว', color: 'text-green-600', icon: CheckCircle },
  completed: { label: 'เสร็จสิ้น', color: 'text-green-600', icon: CheckCircle },
  cancelled: { label: 'ยกเลิก', color: 'text-red-600', icon: XCircle },
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
      .then((res) => setOrders(res.data))
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
      </div>

      <div className="mt-4 space-y-3 px-4">
        {orders.map((order) => {
          const config = statusConfig[order.status] ?? { label: 'กำลังเตรียม', color: 'text-blue-600', icon: Package };
          const Icon = config.icon;
          return (
            <Link
              key={order.id}
              href={`/orders/${order.id}`}
              className="block rounded-xl border p-4 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{order.orderNo}</span>
                <div className={`flex items-center gap-1 text-xs font-medium ${config.color}`}>
                  <Icon className="h-3.5 w-3.5" />
                  {config.label}
                </div>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {new Date(order.createdAt).toLocaleDateString('th-TH')} · {order.items.length} รายการ
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
