'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  MapPin,
  CreditCard,
  QrCode,
  Truck,
  CheckCircle2,
  Pill,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCartStore } from '@/store/cart';
import { formatPrice } from '@/lib/utils';

export default function CheckoutPage() {
  const { items, subtotal } = useCartStore();
  const [paymentMethod, setPaymentMethod] = useState<'promptpay' | 'transfer'>('promptpay');
  const deliveryFee = subtotal() >= 500 ? 0 : 50;
  const total = subtotal() + deliveryFee;

  return (
    <div className="pb-32">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <Link href="/cart" className="rounded-full p-1 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold">สรุปคำสั่งซื้อ</h1>
      </div>

      <div className="space-y-4 px-4">
        {/* Delivery Address */}
        <div className="rounded-xl border p-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold">ที่อยู่จัดส่ง</h2>
          </div>
          <div className="mt-3 space-y-3">
            <Input placeholder="ชื่อผู้รับ" />
            <Input placeholder="เบอร์โทรศัพท์" type="tel" />
            <Input placeholder="ที่อยู่" />
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="แขวง/ตำบล" />
              <Input placeholder="เขต/อำเภอ" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="จังหวัด" />
              <Input placeholder="รหัสไปรษณีย์" />
            </div>
            <Input placeholder="หมายเหตุ (เช่น วางไว้หน้าประตู)" />
          </div>
        </div>

        {/* Order Items */}
        <div className="rounded-xl border p-4">
          <h2 className="text-sm font-bold">รายการสินค้า ({items.length})</h2>
          <div className="mt-3 space-y-2">
            {items.map((item) => (
              <div key={item.productId} className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Pill className="h-5 w-5 text-muted-foreground/30" />
                </div>
                <div className="flex-1">
                  <p className="text-sm">{item.name}</p>
                  <p className="text-xs text-muted-foreground">x{item.quantity}</p>
                </div>
                <span className="text-sm font-medium">
                  {formatPrice(item.price * item.quantity)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Delivery */}
        <div className="rounded-xl border p-4">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold">การจัดส่ง</h2>
          </div>
          <div className="mt-3 flex items-center justify-between rounded-lg bg-muted p-3">
            <div>
              <p className="text-sm font-medium">จัดส่งมาตรฐาน</p>
              <p className="text-xs text-muted-foreground">1-3 วันทำการ</p>
            </div>
            <span className={`text-sm font-medium ${deliveryFee === 0 ? 'text-primary' : ''}`}>
              {deliveryFee === 0 ? 'ฟรี' : formatPrice(deliveryFee)}
            </span>
          </div>
        </div>

        {/* Payment Method */}
        <div className="rounded-xl border p-4">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold">วิธีชำระเงิน</h2>
          </div>
          <div className="mt-3 space-y-2">
            <button
              onClick={() => setPaymentMethod('promptpay')}
              className={`flex w-full items-center gap-3 rounded-lg border p-3 transition-colors ${
                paymentMethod === 'promptpay'
                  ? 'border-primary bg-secondary'
                  : 'hover:bg-muted'
              }`}
            >
              <QrCode className="h-5 w-5 text-blue-600" />
              <div className="text-left">
                <p className="text-sm font-medium">PromptPay QR</p>
                <p className="text-xs text-muted-foreground">สแกนจ่ายผ่าน QR Code</p>
              </div>
              {paymentMethod === 'promptpay' && (
                <CheckCircle2 className="ml-auto h-5 w-5 text-primary" />
              )}
            </button>
            <button
              onClick={() => setPaymentMethod('transfer')}
              className={`flex w-full items-center gap-3 rounded-lg border p-3 transition-colors ${
                paymentMethod === 'transfer'
                  ? 'border-primary bg-secondary'
                  : 'hover:bg-muted'
              }`}
            >
              <CreditCard className="h-5 w-5 text-green-600" />
              <div className="text-left">
                <p className="text-sm font-medium">โอนเงิน + ส่งสลิป</p>
                <p className="text-xs text-muted-foreground">โอนเงินแล้วส่งรูปสลิป</p>
              </div>
              {paymentMethod === 'transfer' && (
                <CheckCircle2 className="ml-auto h-5 w-5 text-primary" />
              )}
            </button>
          </div>
        </div>

        {/* Discount Code */}
        <div className="rounded-xl border p-4">
          <h2 className="text-sm font-bold">โค้ดส่วนลด</h2>
          <div className="mt-3 flex gap-2">
            <Input placeholder="กรอกโค้ดส่วนลด" className="flex-1" />
            <Button variant="outline">ใช้โค้ด</Button>
          </div>
        </div>
      </div>

      {/* Fixed Bottom */}
      <div className="fixed bottom-16 left-0 right-0 z-40 border-t bg-white p-4">
        <div className="mx-auto max-w-lg space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">ยอดสินค้า</span>
            <span>{formatPrice(subtotal())}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">ค่าจัดส่ง</span>
            <span>{deliveryFee === 0 ? 'ฟรี' : formatPrice(deliveryFee)}</span>
          </div>
          <div className="flex justify-between border-t pt-2 text-base font-bold">
            <span>รวมทั้งหมด</span>
            <span className="text-primary">{formatPrice(total)}</span>
          </div>
          <Button className="w-full" size="lg">
            ยืนยันสั่งซื้อ · {formatPrice(total)}
          </Button>
        </div>
      </div>
    </div>
  );
}
