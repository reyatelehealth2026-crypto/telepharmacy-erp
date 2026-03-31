'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CreditCard, CheckCircle, XCircle, Loader2, Eye } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { useApi } from '@/lib/use-api';
import { api } from '@/lib/api-client';

interface PendingOrder {
  id: string; orderNo: string; totalAmount: string; status: string;
  createdAt: string; patientId: string; slipUrl?: string;
}

export default function PendingSlipsPage() {
  const { data, isLoading, mutate } = useApi<PendingOrder[]>('/v1/staff/orders/pending-slip');
  const [processing, setProcessing] = useState<string | null>(null);

  async function handleVerify(orderId: string, approved: boolean) {
    setProcessing(orderId);
    try {
      await api.post(`/v1/staff/orders/${orderId}/verify-slip`, {
        approved, notes: approved ? 'ตรวจสอบแล้ว' : 'สลิปไม่ถูกต้อง',
      });
      await mutate();
    } catch (e: any) { alert(e.message ?? 'Error'); }
    finally { setProcessing(null); }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="ตรวจสอบสลิป" description="คิวออเดอร์ที่รอตรวจสลิปการชำระเงิน" />

      <div className="rounded-xl border bg-card shadow-sm">
        {isLoading ? (
          <div className="flex h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : !data || data.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2 text-muted-foreground">
            <CheckCircle className="h-8 w-8" />
            <p className="text-sm">ไม่มีสลิปรอตรวจสอบ</p>
          </div>
        ) : (
          <div className="divide-y">
            {data.map(order => (
              <div key={order.id} className="flex items-center gap-4 p-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium">{order.orderNo}</span>
                    <span className="text-sm font-medium">฿{parseFloat(order.totalAmount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleString('th-TH')}</p>
                </div>
                {order.slipUrl && (
                  <a href={order.slipUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs hover:bg-muted">
                    <Eye className="h-3 w-3" /> ดูสลิป
                  </a>
                )}
                <Link href={`/dashboard/orders/${order.id}`} className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs hover:bg-muted">
                  <Eye className="h-3 w-3" /> ดูออเดอร์
                </Link>
                <button
                  onClick={() => handleVerify(order.id, true)}
                  disabled={processing === order.id}
                  className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {processing === order.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                  อนุมัติ
                </button>
                <button
                  onClick={() => handleVerify(order.id, false)}
                  disabled={processing === order.id}
                  className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  <XCircle className="h-3 w-3" /> ปฏิเสธ
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
