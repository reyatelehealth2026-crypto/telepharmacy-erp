'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Video, Clock, CheckCircle, Eye, Loader2, UserCheck } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { useApi } from '@/lib/use-api';
import { api } from '@/lib/api-client';
import { cn } from '@/lib/utils';

interface Consultation {
  consultationId: string;
  status: string;
  type: string;
  chiefComplaint: string;
  patientId: string;
  pharmacistId?: string;
  createdAt: string;
}

const STATUS_LABEL: Record<string, string> = {
  requested: 'รอดำเนินการ', scope_validated: 'ผ่านตรวจสอบ', consent_pending: 'รอยินยอม',
  consent_accepted: 'ยินยอมแล้ว', pharmacist_assigned: 'รับเรื่องแล้ว', in_progress: 'กำลังปรึกษา',
  completed: 'เสร็จสิ้น', referred: 'ส่งต่อ', cancelled: 'ยกเลิก',
};

const STATUS_BADGE: Record<string, string> = {
  requested: 'bg-amber-100 text-amber-700', consent_accepted: 'bg-blue-100 text-blue-700',
  pharmacist_assigned: 'bg-indigo-100 text-indigo-700', in_progress: 'bg-green-100 text-green-700',
  completed: 'bg-green-200 text-green-800', cancelled: 'bg-red-100 text-red-700',
};

export default function TelemedicinePage() {
  const [statusFilter, setStatusFilter] = useState('');
  const qs = statusFilter ? `?status=${statusFilter}` : '';
  const { data, isLoading } = useApi<{ data: Consultation[]; total: number }>(`/v1/telemedicine/consultations${qs}`);
  const consultations = data?.data ?? [];

  const pending = consultations.filter(c => ['requested', 'consent_accepted'].includes(c.status));
  const active = consultations.filter(c => ['pharmacist_assigned', 'in_progress'].includes(c.status));

  return (
    <div className="space-y-6">
      <PageHeader title="Telemedicine" description="จัดการคิวปรึกษาเภสัชกรทางไกล" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="รอดำเนินการ" value={pending.length} icon={Clock} />
        <StatCard title="กำลังปรึกษา" value={active.length} icon={Video} />
        <StatCard title="เสร็จสิ้น" value={consultations.filter(c => c.status === 'completed').length} icon={CheckCircle} />
        <StatCard title="ทั้งหมด" value={data?.total ?? 0} icon={Video} />
      </div>

      <div className="flex gap-2">
        {['', 'requested', 'consent_accepted', 'in_progress', 'completed'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} className={cn('rounded-lg px-3 py-1.5 text-sm font-medium', statusFilter === s ? 'bg-primary text-primary-foreground' : 'border hover:bg-muted')}>
            {s ? STATUS_LABEL[s] ?? s : 'ทั้งหมด'}
          </button>
        ))}
      </div>

      <div className="rounded-xl border bg-card shadow-sm">
        {isLoading ? (
          <div className="flex h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : consultations.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">ไม่มีรายการ</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">ประเภท</th>
                <th className="px-4 py-3 font-medium">อาการ</th>
                <th className="px-4 py-3 font-medium">สถานะ</th>
                <th className="px-4 py-3 font-medium">วันที่</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr></thead>
              <tbody>
                {consultations.map(c => (
                  <tr key={c.consultationId} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="px-4 py-3 capitalize">{c.type?.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3 max-w-[250px] truncate">{c.chiefComplaint}</td>
                    <td className="px-4 py-3">
                      <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', STATUS_BADGE[c.status] ?? 'bg-muted')}>
                        {STATUS_LABEL[c.status] ?? c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleString('th-TH')}</td>
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/telemedicine/${c.consultationId}`} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                        <Eye className="h-3 w-3" /> ดู
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
