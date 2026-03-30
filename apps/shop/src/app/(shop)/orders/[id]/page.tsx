'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Truck, MapPin, CreditCard, Pill, Copy, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatPrice } from '@/lib/utils';

const mockOrder = {
  id: '1',
  orderNo: 'REYA-20260330-001',
  status: 'shipped',
  orderType: 'otc',
  createdAt: '2026-03-30T07:00:00',
  paidAt: '2026-03-30T07:10:00',
  items: [
    { name: 'พาราเซตามอล 500mg', quantity: 2, unitPrice: 35, totalPrice: 70 },
    { name: 'วิตามินซี 1000mg', quantity: 1, unitPrice: 89, totalPrice: 89 },
  ],
  subtotal: 159,
  discountAmount: 0,
  deliveryFee: 50,
  totalAmount: 209,
  delivery: {
    provider: 'Kerry Express',
    trackingNo: 'KRY123456789',
    status: 'in_transit',
    estimatedDelivery: '2026-04-01',
    address: '123 ถ.สุขุมวิท แขวงคลองเนียม เขตคลองสาน กรุงเทพฯ 10600',
  },
  payment: {
    method: 'promptpay',
    status: 'successful',
    paidAt: '2026-03-30T07:10:00',
  },
};

const trackingSteps = [
  { label: 'สั่งซื้อสำเร็จ', time: '30 มี.ค. 07:00', done: true },
  { label: 'ชำระเงินแล้ว', time: '30 มี.ค. 07:10', done: true },
  { label: 'เตรียมสินค้า', time: '30 มี.ค. 09:00', done: true },
  { label: 'จัดส่งแล้ว', time: '30 มี.ค. 14:00', done: true },
  { label: 'กำลังจัดส่ง', time: 'คาด 1 เม.ย.', done: false, active: true },
  { label: 'ส่งถึงแล้ว', time: '', done: false },
];

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <div className="pb-24">
      <div className="flex items-center gap-3 px-4 py-3">
        <Link href="/orders" className="rounded-full p-1 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold">รายละเอียดออเดอร์</h1>
      </div>

      <div className="space-y-4 px-4">
        {/* Status */}
        <div className="rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 p-4 text-white">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            <span className="font-bold">กำลังจัดส่ง</span>
          </div>
          <p className="mt-1 text-sm text-white/80">
            {mockOrder.orderNo} · คาดว่าถึง 1 เม.ย. 2569
          </p>
          {mockOrder.delivery.trackingNo && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-sm">Tracking: {mockOrder.delivery.trackingNo}</span>
              <button className="rounded p-0.5 hover:bg-white/20">
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Tracking Timeline */}
        <div className="rounded-xl border p-4">
          <h2 className="text-sm font-bold">สถานะการจัดส่ง</h2>
          <div className="mt-3 space-y-0">
            {trackingSteps.map((step, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={`h-3 w-3 rounded-full ${
                      step.done
                        ? 'bg-primary'
                        : step.active
                          ? 'border-2 border-primary bg-white'
                          : 'bg-muted'
                    }`}
                  />
                  {i < trackingSteps.length - 1 && (
                    <div className={`h-8 w-0.5 ${step.done ? 'bg-primary' : 'bg-muted'}`} />
                  )}
                </div>
                <div className="-mt-0.5 pb-4">
                  <p className={`text-sm ${step.done || step.active ? 'font-medium' : 'text-muted-foreground'}`}>
                    {step.label}
                  </p>
                  {step.time && (
                    <p className="text-xs text-muted-foreground">{step.time}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Items */}
        <div className="rounded-xl border p-4">
          <h2 className="text-sm font-bold">รายการสินค้า</h2>
          <div className="mt-3 space-y-3">
            {mockOrder.items.map((item, i) => (
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
              <span>{formatPrice(mockOrder.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">ค่าจัดส่ง</span>
              <span>{formatPrice(mockOrder.deliveryFee)}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>รวมทั้งหมด</span>
              <span className="text-primary">{formatPrice(mockOrder.totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* Delivery Address */}
        <div className="rounded-xl border p-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold">ที่อยู่จัดส่ง</h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{mockOrder.delivery.address}</p>
        </div>

        {/* Payment */}
        <div className="rounded-xl border p-4">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold">การชำระเงิน</h2>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">PromptPay</span>
            <Badge variant="success">ชำระแล้ว</Badge>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1">
            <RotateCcw className="h-4 w-4" />
            สั่งซื้อซ้ำ
          </Button>
          <Button variant="outline" className="flex-1">
            💬 ติดต่อร้าน
          </Button>
        </div>
      </div>
    </div>
  );
}
