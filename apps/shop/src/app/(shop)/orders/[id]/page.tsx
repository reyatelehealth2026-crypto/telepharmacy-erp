'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Truck,
  MapPin,
  CreditCard,
  Pill,
  Copy,
  RotateCcw,
  Loader2,
  Package,
  CheckCircle,
  Clock,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/auth';
import { getOrder, reOrder, type Order, type OrderStatus } from '@/lib/orders';
import { useCartStore } from '@/store/cart';
import { formatPrice, formatDate } from '@/lib/utils';

const statusConfig: Record<OrderStatus, { label: string; gradient: string; icon: typeof Package }> = {
  awaiting_payment: { label: 'รอชำระเงิน', gradient: 'from-amber-500 to-orange-500', icon: Clock },
  paid: { label: 'ชำระแล้ว', gradient: 'from-blue-500 to-cyan-500', icon: CheckCircle },
  processing: { label: 'กำลังเตรียม', gradient: 'from-blue-500 to-indigo-500', icon: Package },
  packed: { label: 'แพ็คแล้ว', gradient: 'from-indigo-500 to-purple-500', icon: Package },
  shipped: { label: 'กำลังจัดส่ง', gradient: 'from-purple-500 to-blue-500', icon: Truck },
  delivered: { label: 'ส่งถึงแล้ว', gradient: 'from-green-500 to-emerald-500', icon: CheckCircle },
  completed: { label: 'เสร็จสิ้น', gradient: 'from-green-500 to-teal-500', icon: CheckCircle },
  cancelled: { label: 'ยกเลิก', gradient: 'from-red-500 to-rose-500', icon: XCircle },
};

/* Simplified 4-step tracking timeline: confirmed → preparing → shipped → delivered */
const trackingSteps = [
  { key: 'confirmed', label: 'ยืนยันคำสั่งซื้อ', icon: CheckCircle },
  { key: 'preparing', label: 'กำลังเตรียมสินค้า', icon: Package },
  { key: 'shipped', label: 'จัดส่งแล้ว', icon: Truck },
  { key: 'delivered', label: 'ส่งถึงแล้ว', icon: CheckCircle },
] as const;

/** Map every OrderStatus to which tracking step index it corresponds to */
function getTrackingStepIndex(status: OrderStatus): number {
  switch (status) {
    case 'awaiting_payment':
      return -1; // before confirmed
    case 'paid':
      return 0; // confirmed
    case 'processing':
    case 'packed':
      return 1; // preparing
    case 'shipped':
      return 2; // shipped
    case 'delivered':
    case 'completed':
      return 3; // delivered
    case 'cancelled':
      return -2; // special
    default:
      return -1;
  }
}

function buildTrackingTimeline(order: Order) {
  if (order.status === 'cancelled') {
    return trackingSteps.map((step) => ({
      ...step,
      done: false,
      active: false,
    }));
  }

  const currentIdx = getTrackingStepIndex(order.status);
  return trackingSteps.map((step, i) => ({
    ...step,
    done: i < currentIdx,
    active: i === currentIdx,
  }));
}

const paymentLabels: Record<string, string> = {
  promptpay: 'PromptPay',
  credit_card: 'บัตรเครดิต',
  cod: 'เก็บเงินปลายทาง',
};

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { accessToken } = useAuthStore();
  const { addItem, clearCart } = useCartStore();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [reordering, setReordering] = useState(false);

  useEffect(() => {
    if (!accessToken) {
      router.replace('/login');
      return;
    }

    getOrder(accessToken, id)
      .then(setOrder)
      .catch((err) => toast.error(err.message || 'โหลดข้อมูลออเดอร์ไม่สำเร็จ'))
      .finally(() => setLoading(false));
  }, [accessToken, id, router]);

  async function handleReorder() {
    if (!accessToken || !order) return;
    setReordering(true);
    try {
      // Populate cart store from order items directly
      clearCart();
      for (const item of order.items) {
        addItem({
          productId: item.productId,
          name: item.name,
          price: item.unitPrice,
          imageUrl: item.imageUrl,
          unit: 'เม็ด',
          requiresPrescription: false,
        });
        // addItem always adds 1; adjust to actual quantity
        if (item.quantity > 1) {
          useCartStore.getState().updateQuantity(item.productId, item.quantity);
        }
      }
      // Also notify backend to create a new draft order
      await reOrder(accessToken, order.id).catch(() => {});
      toast.success('เพิ่มสินค้าลงตะกร้าแล้ว');
      router.push('/cart');
    } catch (err: any) {
      toast.error(err.message || 'สั่งซื้อซ้ำไม่สำเร็จ');
    } finally {
      setReordering(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-muted-foreground">ไม่พบข้อมูลออเดอร์</p>
        <Link href="/orders" className="mt-2 inline-block text-sm text-primary underline">
          กลับไปหน้าคำสั่งซื้อ
        </Link>
      </div>
    );
  }

  const config = statusConfig[order.status] ?? statusConfig.processing;
  const StatusIcon = config.icon;
  const steps = buildTrackingTimeline(order);

  return (
    <div className="pb-24">
      <div className="flex items-center gap-3 px-4 py-3">
        <Link href="/orders" className="rounded-full p-1 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold">รายละเอียดออเดอร์</h1>
      </div>

      <div className="space-y-4 px-4">
        {/* Status Header */}
        <div className={`rounded-xl bg-gradient-to-r ${config.gradient} p-4 text-white`}>
          <div className="flex items-center gap-2">
            <StatusIcon className="h-5 w-5" />
            <span className="font-bold">{config.label}</span>
          </div>
          <p className="mt-1 text-sm text-white/80">
            {order.orderNo} · {formatDate(order.createdAt)}
          </p>
          {order.delivery.estimatedDelivery && (
            <p className="mt-0.5 text-sm text-white/80">
              คาดว่าถึง {formatDate(order.delivery.estimatedDelivery)}
            </p>
          )}
        </div>

        {/* Tracking Number & Carrier */}
        {order.delivery.trackingNo && (
          <div className="rounded-xl border p-4">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold">ข้อมูลการจัดส่ง</h2>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <div>
                <p className="text-sm">
                  เลข Tracking: <span className="font-medium">{order.delivery.trackingNo}</span>
                </p>
                {order.delivery.provider && (
                  <p className="text-xs text-muted-foreground">ขนส่ง: {order.delivery.provider}</p>
                )}
              </div>
              <button
                className="rounded-lg border p-2 hover:bg-muted"
                onClick={() => {
                  navigator.clipboard.writeText(order.delivery.trackingNo!);
                  toast.success('คัดลอกเลข Tracking แล้ว');
                }}
              >
                <Copy className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        )}

        {/* Visual Tracking Timeline — confirmed → preparing → shipped → delivered */}
        {order.status !== 'cancelled' && (
          <div className="rounded-xl border p-4">
            <h2 className="text-sm font-bold">สถานะการจัดส่ง</h2>
            <div className="mt-4 space-y-0">
              {steps.map((step, i) => {
                const StepIcon = step.icon;
                return (
                  <div key={step.key} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex h-7 w-7 items-center justify-center rounded-full border-2 ${
                          step.done
                            ? 'border-primary bg-primary text-white'
                            : step.active
                              ? 'border-primary bg-white'
                              : 'border-muted bg-muted'
                        }`}
                      >
                        {step.done ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : step.active ? (
                          <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                        ) : (
                          <StepIcon className="h-3.5 w-3.5 text-muted-foreground/50" />
                        )}
                      </div>
                      {i < steps.length - 1 && (
                        <div className={`h-8 w-0.5 ${step.done ? 'bg-primary' : 'bg-muted'}`} />
                      )}
                    </div>
                    <div className="-mt-0.5 pb-4">
                      <p
                        className={`text-sm ${
                          step.done || step.active ? 'font-medium' : 'text-muted-foreground'
                        }`}
                      >
                        {step.label}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Cancelled Notice */}
        {order.status === 'cancelled' && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              <h2 className="text-sm font-bold text-red-800">คำสั่งซื้อถูกยกเลิก</h2>
            </div>
            <p className="mt-1 text-xs text-red-700">
              คำสั่งซื้อนี้ถูกยกเลิกแล้ว หากมีข้อสงสัยกรุณาติดต่อร้าน
            </p>
          </div>
        )}

        {/* Items */}
        <div className="rounded-xl border p-4">
          <h2 className="text-sm font-bold">รายการสินค้า ({order.items.length} รายการ)</h2>
          <div className="mt-3 space-y-3">
            {order.items.map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Pill className="h-5 w-5 text-muted-foreground/30" />
                </div>
                <div className="flex-1">
                  <p className="text-sm">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatPrice(item.unitPrice)} x {item.quantity}
                  </p>
                </div>
                <span className="text-sm font-medium">{formatPrice(item.totalPrice)}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 space-y-1 border-t pt-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">ยอดสินค้า</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            {order.discountAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">ส่วนลด</span>
                <span className="text-green-600">-{formatPrice(order.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">ค่าจัดส่ง</span>
              <span>{order.deliveryFee === 0 ? 'ฟรี' : formatPrice(order.deliveryFee)}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>รวมทั้งหมด</span>
              <span className="text-primary">{formatPrice(order.totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* Payment */}
        <div className="rounded-xl border p-4">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold">การชำระเงิน</h2>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {paymentLabels[order.payment.method] ?? order.payment.method}
            </span>
            <Badge variant={order.payment.status === 'successful' ? 'success' : 'warning'}>
              {order.payment.status === 'successful' ? 'ชำระแล้ว' : 'รอชำระ'}
            </Badge>
          </div>
          {order.payment.paidAt && (
            <p className="mt-1 text-xs text-muted-foreground">
              ชำระเมื่อ {formatDate(order.payment.paidAt)}
            </p>
          )}
        </div>

        {/* Delivery Address */}
        <div className="rounded-xl border p-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold">ที่อยู่จัดส่ง</h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{order.delivery.address}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1 gap-2" onClick={handleReorder} disabled={reordering}>
            {reordering ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
            สั่งซื้อซ้ำ
          </Button>
          <Button variant="outline" className="flex-1" asChild>
            <Link href="/chat">💬 ติดต่อร้าน</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
