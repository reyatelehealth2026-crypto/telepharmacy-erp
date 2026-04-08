'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Pill, Activity, Eye, Loader2, Clock } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { useApi } from '@/lib/use-api';
import { cn } from '@/lib/utils';

interface MR { id: string; patientId: string; status: string; medications: string[]; concerns?: string; createdAt: string; }
interface TDM { id: string; patientId: string; drugName: string; status: string; createdAt: string; }
interface ListResult<T> { data: T[]; page: number; limit: number; }

export default function ClinicalPage() {
  const [tab, setTab] = useState<'mr' | 'tdm'>('mr');
  const { data: mrResult, isLoading: mrLoading } = useApi<ListResult<MR>>('/v1/drug-info/medication-review?limit=50');
  const { data: tdmResult, isLoading: tdmLoading } = useApi<ListResult<TDM>>('/v1/drug-info/tdm?limit=50');

  const mrData = mrResult?.data ?? [];
  const tdmData = tdmResult?.data ?? [];

  const mrPending = mrData.filter(r => r.status === 'pending' || r.status === 'in_progress');
  const tdmPending = tdmData.filter(r => r.status === 'pending' || r.status === 'in_progress');

  return (
    <div className="space-y-6">
      <PageHeader title="Clinical Services" description="Medication Review & TDM Queue" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="MR รอดำเนินการ" value={mrPending.length} icon={Pill} />
        <StatCard title="MR ทั้งหมด" value={mrData.length} icon={Pill} />
        <StatCard title="TDM รอดำเนินการ" value={tdmPending.length} icon={Activity} />
        <StatCard title="TDM ทั้งหมด" value={tdmData.length} icon={Activity} />
      </div>

      <div className="flex gap-2">
        {(['mr', 'tdm'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={cn('rounded-lg px-4 py-2 text-sm font-medium', tab === t ? 'bg-primary text-primary-foreground' : 'border hover:bg-muted')}>
            {t === 'mr' ? 'Medication Review' : 'TDM'}
          </button>
        ))}
      </div>

      {tab === 'mr' && (
        <div className="rounded-xl border bg-card shadow-sm">
          {mrLoading ? (
            <div className="flex h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : !mrData || mrData.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">ไม่มีคำขอ MR</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left text-muted-foreground">
                  <th className="px-4 py-3 font-medium">ยาที่ใช้</th>
                  <th className="px-4 py-3 font-medium">ข้อกังวล</th>
                  <th className="px-4 py-3 font-medium">สถานะ</th>
                  <th className="px-4 py-3 font-medium">วันที่</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr></thead>
                <tbody>
                  {mrData.map(r => (
                    <tr key={r.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="px-4 py-3">{r.medications?.join(', ') ?? '-'}</td>
                      <td className="px-4 py-3 max-w-[200px] truncate text-muted-foreground">{r.concerns ?? '-'}</td>
                      <td className="px-4 py-3"><span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', r.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700')}>{r.status}</span></td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString('th-TH')}</td>
                      <td className="px-4 py-3"><Link href={`/dashboard/clinical/mr/${r.id}`} className="inline-flex items-center gap-1 text-xs text-primary hover:underline"><Eye className="h-3 w-3" /> ดำเนินการ</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'tdm' && (
        <div className="rounded-xl border bg-card shadow-sm">
          {tdmLoading ? (
            <div className="flex h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : !tdmData || tdmData.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">ไม่มีคำขอ TDM</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left text-muted-foreground">
                  <th className="px-4 py-3 font-medium">ยา</th>
                  <th className="px-4 py-3 font-medium">สถานะ</th>
                  <th className="px-4 py-3 font-medium">วันที่</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr></thead>
                <tbody>
                  {tdmData.map(r => (
                    <tr key={r.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="px-4 py-3 font-medium">{r.drugName}</td>
                      <td className="px-4 py-3"><span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', r.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700')}>{r.status}</span></td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString('th-TH')}</td>
                      <td className="px-4 py-3"><Link href={`/dashboard/clinical/tdm/${r.id}`} className="inline-flex items-center gap-1 text-xs text-primary hover:underline"><Eye className="h-3 w-3" /> บันทึกผล</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
