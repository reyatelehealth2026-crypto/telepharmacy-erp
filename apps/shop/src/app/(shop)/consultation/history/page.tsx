'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Video, Clock, ChevronRight } from 'lucide-react';
import { useAuthGuard } from '@/lib/use-auth-guard';
import { listConsultations, type Consultation } from '@/lib/telemedicine';

const STATUS_LABEL: Record<string, string> = {
  requested: 'รอดำเนินการ', consent_pending: 'รอยินยอม', consent_accepted: 'ยินยอมแล้ว',
  pharmacist_assigned: 'เภสัชกรรับเรื่อง', in_progress: 'กำลังปรึกษา', completed: 'เสร็จสิ้น',
  referred: 'ส่งต่อ', cancelled: 'ยกเลิก', expired: 'หมดอายุ',
};

const STATUS_COLOR: Record<string, string> = {
  requested: 'bg-amber-100 text-amber-700', in_progress: 'bg-green-100 text-green-700',
  completed: 'bg-green-200 text-green-800', cancelled: 'bg-red-100 text-red-700',
};

export default function ConsultationHistoryPage() {
  const { loading: authLoading, token } = useAuthGuard();
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    listConsultations(token, { limit: 50 })
      .then(res => setConsultations(res.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  if (authLoading || loading) return <div className="flex items-center justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="pb-20">
      <div className="flex items-center gap-3 px-4 py-3">
        <Link href="/consultation" className="rounded-full p-1 hover:bg-muted"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="text-lg font-bold">ประวัติการปรึกษา</h1>
      </div>

      <div className="space-y-2 px-4">
        {consultations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <Video className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">ยังไม่มีประวัติการปรึกษา</p>
            <Link href="/consultation" className="mt-2 text-sm text-primary underline">ปรึกษาเภสัชกร</Link>
          </div>
        ) : (
          consultations.map(c => (
            <Link key={c.consultationId} href={`/consultation/${c.consultationId}`} className="flex items-center gap-3 rounded-xl border p-4 hover:bg-muted/50">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Video className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{c.chiefComplaint}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[c.status] ?? 'bg-muted'}`}>
                    {STATUS_LABEL[c.status] ?? c.status}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" /> {new Date(c.createdAt).toLocaleDateString('th-TH')}
                  </span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
