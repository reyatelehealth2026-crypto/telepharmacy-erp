'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Loader2,
  Package,
  Truck,
  CreditCard,
  MapPin,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { useApi } from '@/lib/use-api';
import { api } from '@/lib/api-client';
import { cn } from '@/lib/utils';

interface OrderItem {
  id: string;
  itemNo: number;
  productName: string;
  sku: string | null;
  quantity: string;
  unit: string | null;
  unitPrice: string;
  totalPrice: string;
  drugClassification: string | null;
}

interface Payment {
  id: string;
  paymentNo: string;
  method: string;
  status: string;
  amount: string;
  paidAt: string | null;
}

interface Delivery {
  id: string;
  status: string;
  provider: string | null;
  trackingNo: string | null;
  coldChain: boolean;
  estimatedDelivery: string | null;
  deliveredAt: string | null;
}

interface OrderDetail {
  id: string;
  orderNo: string;
  patientId: string;
  orderType: string;
  status: string;
  subtotal: string;
  discountAmount: string;
  deliveryFee: string;
  coldChainFee: string;
  vatAmount: string;
  totalAmount: string;
  coldChainRequired: boolean;
  deliveryAddress: string | null;
  deliveryProvince: string | null;
  deliveryPhone: string | null;
  deliveryRecipient: string | null;
  notes: string | null;
  internalNotes: string | null;
  source: string;
  createdAt: string;
  paidAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  items?: OrderItem[];
  payments?: Payment[];
  deliveries?: Delivery[];
}

const STATUS_LABEL: Record<string, string> = {
  draft: 'ร่าง', awaiting_payment: 'รอชำระ', paid: 'ชำระแล้ว',
  processing: 'กำลังจัด', packed: 'แพ็คแล้ว', ready_to_ship: 'พร้อมส่ง',
  shipped: 'จัดส่งแล้ว', out_for_delivery: 'กำลังส่ง', delivered: 'ส่งถึง',
  completed: 'สำเร็จ', cancelled: 'ยกเลิก',
};

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700', awaiting_payment: 'bg-amber-100 text-amber-700',
  paid: 'bg-blue-100 text-blue-700', processing: 'bg-indigo-100 text-indigo-700',
  packed: 'bg-cyan-100 text-cyan-700', shipped: 'bg-purple-100 text-purple-700',
  delivered: 'bg-green-100 text-green-700', completed: 'bg-green-200 text-green-800',
  cancelled: 'bg-red-100 text-red-700',
};

const NEXT_STATUS: Record<string, { status: string; label: string; action?: string }[]> = {
  paid: [{ status: 'processing', label: 'เริ่มจัดยา' }],
  processing: [{ status: 'packed', label: 'แพ็คเสร็จ', action: 'pack' }],
  packed: [{ status: 'shipped', label: 'จัดส่ง', action: 'ship' }],
  shipped: [{ status: 'delivered', label: 'ส่งถึงแล้ว', action: 'deliver' }],
  delivered: [{ status: 'completed', label: 'เสร็จสิ้น' }],
};

export default function OrderDetailPage() {
  const params = useParams();
  const orderId = params.id as string;
  const { data: order, isLoading, mutate } = useApi<OrderDetail>(`/v1/staff/orders/${orderId}`);
  const [submitting, setSubmitting] = useState(false);

  async function handleStatusAction(action?: string, newStatus?: string) {
    setSubmitting(true);
    try {
      if (action === 'pack') {
        await api.post(`/v1/staff/orders/${orderId}/pack`);
      } else if (action === 'ship') {
        await api.post(`/v1/staff/orders/${orderId}/ship`, {
          provider: 'kerry',
          trackingNo: '',
        });
      } else if (action === 'deliver') {
        await api.post(`/v1/staff/orders/${orderId}/deliver`);
      } else if (newStatus) {
        await api.patch(`/v1/staff/orders/${orderId}/status`, { status: newStatus });
      }
      await mutate();
    } catch (err: any) {
      alert(err.message ?? 'เกิดข้อผิดพลาด');
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-2">
        <p className="text-muted-foreground">ไม่พบออเดอร์</p>
        <Link href="/dashboard/orders" className="text-sm text-primary underline">กลับ</Link>
      </div>
    );
  }

  const nextActions = NEXT_STATUS[order.status] ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/orders"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{order.orderNo}</h1>
          <p className="text-sm text-muted-foreground">
            {order.orderType} · {order.source} · {new Date(order.createdAt).toLocaleString('th-TH')}
          </p>
        </div>
        <span className={cn('rounded-full px-3 py-1 text-xs font-semibold', STATUS_BADGE[order.status] ?? 'bg-muted')}>
          {STATUS_LABEL[order.status] ?? order.status}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Column 1: Items */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
              <Package className="h-4 w-4" /> รายการสินค้า ({order.items?.length ?? 0})
            </h3>
            {order.items && order.items.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 font-medium">#</th>
                      <th className="pb-2 font-medium">สินค้า</th>
                      <th className="pb-2 text-right font-medium">จำนวน</th>
                      <th className="pb-2 text-right font-medium">ราคา/หน่วย</th>
                      <th className="pb-2 text-right font-medium">รวม</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item, idx) => (
                      <tr key={item.id} className="border-b last:border-0">
                        <td className="py-2 text-muted-foreground">{idx + 1}</td>
                        <td className="py-2">
                          <p className="font-medium">{item.productName}</p>
                          {item.sku && <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>}
                          {item.drugClassification && (
                            <span className="mt-0.5 inline-block rounded bg-amber-50 px-1.5 py-0.5 text-xs text-amber-700">
                              {item.drugClassification}
                            </span>
                          )}
                        </td>
                        <td className="py-2 text-right">{item.quantity} {item.unit ?? ''}</td>
                        <td className="py-2 text-right">฿{parseFloat(item.unitPrice).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                        <td className="py-2 text-right font-medium">฿{parseFloat(item.totalPrice).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">ไม่มีรายการสินค้า</p>
            )}

            {/* Totals */}
            <div className="mt-4 space-y-1 border-t pt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">ยอดสินค้า</span>
                <span>฿{parseFloat(order.subtotal).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
              </div>
              {parseFloat(order.discountAmount) > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>ส่วนลด</span>
                  <span>-฿{parseFloat(order.discountAmount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">ค่าจัดส่ง</span>
                <span>฿{parseFloat(order.deliveryFee).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
              </div>
              {parseFloat(order.coldChainFee) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">❄️ ค่า Cold Chain</span>
                  <span>฿{parseFloat(order.coldChainFee).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">VAT</span>
                <span>฿{parseFloat(order.vatAmount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between border-t pt-2 text-base font-bold">
                <span>รวมทั้งสิ้น</span>
                <span>฿{parseFloat(order.totalAmount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {order.notes && (
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <h3 className="mb-2 text-sm font-semibold">หมายเหตุจากลูกค้า</h3>
              <p className="text-sm text-muted-foreground">{order.notes}</p>
            </div>
          )}
        </div>

        {/* Column 2: Delivery, Payment, Actions */}
        <div className="space-y-4">
          {/* Delivery Info */}
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <MapPin className="h-4 w-4" /> ข้อมูลจัดส่ง
            </h3>
            <dl className="space-y-2 text-sm">
              {order.deliveryRecipient && (
                <div><dt className="text-xs text-muted-foreground">ผู้รับ</dt><dd className="font-medium">{order.deliveryRecipient}</dd></div>
              )}
              {order.deliveryPhone && (
                <div><dt className="text-xs text-muted-foreground">เบอร์โทร</dt><dd>{order.deliveryPhone}</dd></div>
              )}
              {order.deliveryAddress && (
                <div><dt className="text-xs text-muted-foreground">ที่อยู่</dt><dd>{order.deliveryAddress}{order.deliveryProvince ? `, ${order.deliveryProvince}` : ''}</dd></div>
              )}
              {order.coldChainRequired && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-2 text-xs text-blue-700">
                  ❄️ ออเดอร์นี้ต้องใช้ Cold Chain
                </div>
              )}
            </dl>

            {order.deliveries && order.deliveries.length > 0 && (
              <div className="mt-3 space-y-2 border-t pt-3">
                {order.deliveries.map((d) => (
                  <div key={d.id} className="rounded-lg border p-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-medium capitalize">{d.provider ?? '-'}</span>
                      <span className={cn('rounded-full px-2 py-0.5 font-medium', d.status === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-muted')}>
                        {d.status}
                      </span>
                    </div>
                    {d.trackingNo && <p className="mt-1 text-muted-foreground">Tracking: {d.trackingNo}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payment Info */}
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <CreditCard className="h-4 w-4" /> การชำระเงิน
            </h3>
            {order.payments && order.payments.length > 0 ? (
              <div className="space-y-2">
                {order.payments.map((p) => (
                  <div key={p.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="capitalize">{p.method}</span>
                      <span className="font-medium">฿{parseFloat(p.amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-mono">{p.paymentNo}</span>
                      <span className={cn('rounded-full px-2 py-0.5 font-medium', p.status === 'successful' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700')}>
                        {p.status}
                      </span>
                    </div>
                    {p.paidAt && <p className="mt-1 text-xs text-muted-foreground">ชำระเมื่อ {new Date(p.paidAt).toLocaleString('th-TH')}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">ยังไม่มีข้อมูลชำระเงิน</p>
            )}
          </div>

          {/* Actions */}
          {nextActions.length > 0 && (
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold">ดำเนินการ</h3>
              <div className="space-y-2">
                {nextActions.map((act) => (
                  <button
                    key={act.status}
                    onClick={() => handleStatusAction(act.action, act.status)}
                    disabled={submitting}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                    {act.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold">Timeline</h3>
            <div className="space-y-2 text-xs">
              <TimelineItem label="สร้างออเดอร์" date={order.createdAt} />
              <TimelineItem label="ชำระเงิน" date={order.paidAt} />
              <TimelineItem label="จัดส่ง" date={order.shippedAt} />
              <TimelineItem label="ส่งถึง" date={order.deliveredAt} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TimelineItem({ label, date }: { label: string; date: string | null }) {
  return (
    <div className="flex items-center gap-2">
      <div className={cn('h-2 w-2 shrink-0 rounded-full', date ? 'bg-green-500' : 'bg-muted-foreground/30')} />
      <span className={cn('flex-1', date ? 'font-medium' : 'text-muted-foreground')}>{label}</span>
      <span className="text-muted-foreground">
        {date ? new Date(date).toLocaleString('th-TH') : '-'}
      </span>
    </div>
  );
}
