'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, ArrowUpDown } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { useApi } from '@/lib/use-api';
import { cn } from '@/lib/utils';

interface Movement {
  id: string; productId: string; productName?: string; lotNo?: string;
  movementType: string; quantity: number; reason?: string; reference?: string;
  createdBy?: string; createdAt: string;
}

const TYPE_BADGE: Record<string, string> = {
  receive: 'bg-green-100 text-green-700',
  sale: 'bg-blue-100 text-blue-700',
  adjustment: 'bg-amber-100 text-amber-700',
  write_off: 'bg-red-100 text-red-700',
  return: 'bg-purple-100 text-purple-700',
  transfer: 'bg-cyan-100 text-cyan-700',
};

const TYPE_LABEL: Record<string, string> = {
  receive: 'รับเข้า', sale: 'ขาย', adjustment: 'ปรับสต็อก',
  write_off: 'ตัดจำหน่าย', return: 'คืน', transfer: 'โอน',
};

export default function MovementsPage() {
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);

  const qs = new URLSearchParams();
  if (type) qs.set('movement_type', type);
  qs.set('page', String(page));
  qs.set('limit', '30');

  const { data, isLoading } = useApi<Movement[]>(`/v1/staff/inventory/movements?${qs}`);

  return (
    <div className="space-y-6">
      <PageHeader title="ประวัติเคลื่อนไหวสต็อก" description="รายการรับ-จ่าย-ปรับสต็อกทั้งหมด">
        <Link href="/dashboard/inventory" className="inline-flex h-9 items-center gap-2 rounded-lg border px-4 text-sm hover:bg-muted">
          <ArrowLeft className="h-4 w-4" /> กลับคลังสินค้า
        </Link>
      </PageHeader>

      <div className="flex gap-2">
        {['', 'receive', 'sale', 'adjustment', 'write_off'].map(t => (
          <button key={t} onClick={() => { setType(t); setPage(1); }}
            className={cn('rounded-lg px-3 py-1.5 text-sm font-medium', type === t ? 'bg-primary text-primary-foreground' : 'border hover:bg-muted')}>
            {t ? TYPE_LABEL[t] ?? t : 'ทั้งหมด'}
          </button>
        ))}
      </div>

      <div className="rounded-xl border bg-card shadow-sm">
        {isLoading ? (
          <div className="flex h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : !data || data.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">ไม่มีรายการ</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">สินค้า</th>
                <th className="px-4 py-3 font-medium">Lot</th>
                <th className="px-4 py-3 font-medium">ประเภท</th>
                <th className="px-4 py-3 text-right font-medium">จำนวน</th>
                <th className="px-4 py-3 font-medium">เหตุผล</th>
                <th className="px-4 py-3 font-medium">วันที่</th>
              </tr></thead>
              <tbody>
                {data.map(m => (
                  <tr key={m.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="px-4 py-3 font-medium">{m.productName ?? m.productId.slice(0, 8)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{m.lotNo ?? '-'}</td>
                    <td className="px-4 py-3"><span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', TYPE_BADGE[m.movementType] ?? 'bg-muted')}>{TYPE_LABEL[m.movementType] ?? m.movementType}</span></td>
                    <td className={cn('px-4 py-3 text-right font-medium', m.quantity > 0 ? 'text-green-600' : 'text-red-600')}>{m.quantity > 0 ? '+' : ''}{m.quantity}</td>
                    <td className="px-4 py-3 max-w-[200px] truncate text-muted-foreground">{m.reason ?? '-'}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(m.createdAt).toLocaleString('th-TH')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex justify-center gap-2">
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-50">ก่อนหน้า</button>
        <span className="px-3 py-1.5 text-sm text-muted-foreground">หน้า {page}</span>
        <button onClick={() => setPage(p => p + 1)} disabled={!data || data.length < 30} className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-50">ถัดไป</button>
      </div>
    </div>
  );
}
