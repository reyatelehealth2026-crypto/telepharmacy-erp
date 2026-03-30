import Link from 'next/link';
import { ArrowLeft, CheckCircle, Clock, AlertCircle, Pill, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

const mockPrescriptions = [
  {
    id: '1',
    rxNo: 'RX-20260330-001',
    status: 'approved',
    createdAt: '2026-03-30T07:00:00',
    itemCount: 3,
    totalAmount: 350,
  },
  {
    id: '2',
    rxNo: 'RX-20260329-002',
    status: 'ai_processing',
    createdAt: '2026-03-29T14:00:00',
    itemCount: 0,
    totalAmount: 0,
  },
];

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  received: { label: 'รับแล้ว', color: 'bg-blue-100 text-blue-800', icon: Clock },
  ai_processing: { label: 'กำลังตรวจสอบ', color: 'bg-amber-100 text-amber-800', icon: Clock },
  ai_completed: { label: 'รอเภสัชกร', color: 'bg-amber-100 text-amber-800', icon: Clock },
  approved: { label: 'อนุมัติแล้ว', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  rejected: { label: 'ไม่อนุมัติ', color: 'bg-red-100 text-red-800', icon: AlertCircle },
};

export default function RxStatusPage() {
  return (
    <div>
      <div className="flex items-center gap-3 px-4 py-3">
        <Link href="/" className="rounded-full p-1 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold">สถานะใบสั่งยา</h1>
      </div>

      <div className="space-y-3 px-4">
        {mockPrescriptions.map((rx) => {
          const config = statusConfig[rx.status] ?? { label: 'รับแล้ว', color: 'bg-blue-100 text-blue-800', icon: Clock };
          return (
            <Link
              key={rx.id}
              href={`/rx/${rx.id}`}
              className="flex items-center gap-3 rounded-xl border p-4 transition-colors hover:bg-muted/50"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{rx.rxNo}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${config.color}`}>
                    {config.label}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(rx.createdAt).toLocaleDateString('th-TH')}
                  {rx.itemCount > 0 && ` · ${rx.itemCount} รายการ`}
                  {rx.totalAmount > 0 && ` · ฿${rx.totalAmount}`}
                </p>
              </div>
            </Link>
          );
        })}

        {mockPrescriptions.length === 0 && (
          <div className="py-12 text-center">
            <Pill className="mx-auto h-12 w-12 text-muted-foreground/30" />
            <p className="mt-2 text-sm text-muted-foreground">ยังไม่มีใบสั่งยา</p>
            <Link
              href="/rx/upload"
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              ส่งใบสั่งยา
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
