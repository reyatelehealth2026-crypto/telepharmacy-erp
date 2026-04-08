'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Download, Eye, Loader2, Filter } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { useApi } from '@/lib/use-api';
import { cn } from '@/lib/utils';

interface AdrReport {
  id: string;
  patientId: string;
  drugName: string;
  severity: string;
  causality?: string;
  status: string;
  reactionDescription: string;
  createdAt: string;
}

const SEVERITY_BADGE: Record<string, string> = {
  mild: 'bg-yellow-100 text-yellow-700',
  moderate: 'bg-orange-100 text-orange-700',
  severe: 'bg-red-100 text-red-700',
  life_threatening: 'bg-red-200 text-red-900',
};

const STATUS_BADGE: Record<string, string> = {
  reported: 'bg-amber-100 text-amber-700',
  under_review: 'bg-blue-100 text-blue-700',
  assessed: 'bg-green-100 text-green-700',
  closed: 'bg-slate-100 text-slate-700',
};

export default function AdrDashboardPage() {
  const [severity, setSeverity] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  const qs = new URLSearchParams();
  if (severity) qs.set('severity', severity);
  if (status) qs.set('status', status);
  qs.set('page', String(page));
  qs.set('limit', '20');

  const { data: adrResult, isLoading } = useApi<{ data: AdrReport[]; page: number; limit: number }>(`/v1/adr?${qs}`);
  const data = adrResult?.data ?? [];

  async function handleExport() {
    setExporting(true);
    try {
      const { apiFetch } = await import('@/lib/api-client');
      await apiFetch('/v1/adr/export');
      alert('ส่งออกข้อมูลสำเร็จ');
    } catch { alert('เกิดข้อผิดพลาด'); }
    finally { setExporting(false); }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="ADR Reports" description="รายงานอาการไม่พึงประสงค์จากยา — ส่ง อย.">
        <button onClick={handleExport} disabled={exporting} className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Export อย.
        </button>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select value={severity} onChange={e => { setSeverity(e.target.value); setPage(1); }} className="rounded-lg border px-3 py-1.5 text-sm">
          <option value="">ทุกความรุนแรง</option>
          <option value="mild">Mild</option>
          <option value="moderate">Moderate</option>
          <option value="severe">Severe</option>
          <option value="life_threatening">Life-threatening</option>
        </select>
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="rounded-lg border px-3 py-1.5 text-sm">
          <option value="">ทุกสถานะ</option>
          <option value="reported">Reported</option>
          <option value="under_review">Under Review</option>
          <option value="assessed">Assessed</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm">
        {isLoading ? (
          <div className="flex h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : !data || data.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">ไม่พบรายงาน ADR</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="px-4 py-3 font-medium">ยา</th>
                  <th className="px-4 py-3 font-medium">อาการ</th>
                  <th className="px-4 py-3 font-medium">ความรุนแรง</th>
                  <th className="px-4 py-3 font-medium">Causality</th>
                  <th className="px-4 py-3 font-medium">สถานะ</th>
                  <th className="px-4 py-3 font-medium">วันที่</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {data.map(r => (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="px-4 py-3 font-medium">{r.drugName}</td>
                    <td className="px-4 py-3 max-w-[200px] truncate">{r.reactionDescription}</td>
                    <td className="px-4 py-3">
                      <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', SEVERITY_BADGE[r.severity] ?? 'bg-muted')}>{r.severity}</span>
                    </td>
                    <td className="px-4 py-3 text-xs">{r.causality ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', STATUS_BADGE[r.status] ?? 'bg-muted')}>{r.status}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString('th-TH')}</td>
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/adr/${r.id}`} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
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
