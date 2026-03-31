'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { useApi } from '@/lib/use-api';
import { api } from '@/lib/api-client';
import { cn } from '@/lib/utils';

interface AdrDetail {
  id: string;
  patientId: string;
  drugName: string;
  genericName?: string;
  reactionDescription: string;
  severity: string;
  causality?: string;
  status: string;
  onsetDate?: string;
  doseAtOnset?: string;
  route?: string;
  indication?: string;
  outcome?: string;
  rechallenge?: string;
  dechallenge?: string;
  notes?: string;
  causalityNotes?: string;
  reportedBy?: string;
  assessedBy?: string;
  createdAt: string;
}

const CAUSALITY_OPTIONS = ['certain', 'probable', 'possible', 'unlikely', 'conditional', 'unassessable'];

export default function AdrDetailPage() {
  const { id } = useParams();
  const { data: report, isLoading, mutate } = useApi<AdrDetail>(`/v1/adr/${id}`);
  const [causality, setCausality] = useState('');
  const [causalityNotes, setCausalityNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleAssess() {
    if (!causality) return;
    setSubmitting(true);
    try {
      await api.patch(`/v1/adr/${id}/assess`, { causality, causalityNotes });
      await mutate();
    } catch (e: any) { alert(e.message ?? 'Error'); }
    finally { setSubmitting(false); }
  }

  if (isLoading) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (!report) return <div className="flex h-96 flex-col items-center justify-center gap-2"><p className="text-muted-foreground">ไม่พบรายงาน</p><Link href="/dashboard/adr" className="text-sm text-primary underline">กลับ</Link></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/adr" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border hover:bg-muted"><ArrowLeft className="h-4 w-4" /></Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold">ADR: {report.drugName}</h1>
          <p className="text-sm text-muted-foreground">{new Date(report.createdAt).toLocaleString('th-TH')}</p>
        </div>
        <span className={cn('rounded-full px-3 py-1 text-xs font-semibold', report.severity === 'severe' || report.severity === 'life_threatening' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700')}>
          {report.severity}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Drug & Reaction Info */}
        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold">ข้อมูลยา</h3>
            <dl className="space-y-2 text-sm">
              {[
                ['ชื่อยา', report.drugName],
                ['ชื่อสามัญ', report.genericName],
                ['ขนาดยาขณะเกิด', report.doseAtOnset],
                ['วิธีให้ยา', report.route],
                ['ข้อบ่งใช้', report.indication],
              ].filter(([, v]) => v).map(([l, v]) => (
                <div key={l} className="flex justify-between"><dt className="text-muted-foreground">{l}</dt><dd className="font-medium">{v}</dd></div>
              ))}
            </dl>
          </div>
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold">อาการไม่พึงประสงค์</h3>
            <p className="text-sm">{report.reactionDescription}</p>
            {report.onsetDate && <p className="mt-2 text-xs text-muted-foreground">วันที่เริ่มอาการ: {new Date(report.onsetDate).toLocaleDateString('th-TH')}</p>}
            <dl className="mt-3 space-y-1 text-sm">
              {report.outcome && <div className="flex justify-between"><dt className="text-muted-foreground">ผลลัพธ์</dt><dd>{report.outcome}</dd></div>}
              {report.dechallenge && <div className="flex justify-between"><dt className="text-muted-foreground">Dechallenge</dt><dd>{report.dechallenge}</dd></div>}
              {report.rechallenge && <div className="flex justify-between"><dt className="text-muted-foreground">Rechallenge</dt><dd>{report.rechallenge}</dd></div>}
            </dl>
          </div>
        </div>

        {/* Assessment */}
        <div className="space-y-4">
          {report.causality ? (
            <div className="rounded-xl border border-green-200 bg-green-50 p-5 shadow-sm">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-green-700"><CheckCircle className="h-4 w-4" /> ประเมินแล้ว</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-muted-foreground">Causality</dt><dd className="font-medium capitalize">{report.causality}</dd></div>
                {report.causalityNotes && <div><dt className="text-muted-foreground">หมายเหตุ</dt><dd className="mt-1">{report.causalityNotes}</dd></div>}
                {report.assessedBy && <div className="flex justify-between"><dt className="text-muted-foreground">ประเมินโดย</dt><dd>{report.assessedBy}</dd></div>}
              </dl>
            </div>
          ) : (
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><AlertTriangle className="h-4 w-4 text-amber-500" /> Causality Assessment</h3>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm font-medium">Causality (WHO-UMC)</label>
                  <select value={causality} onChange={e => setCausality(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm">
                    <option value="">เลือก...</option>
                    {CAUSALITY_OPTIONS.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">หมายเหตุ</label>
                  <textarea value={causalityNotes} onChange={e => setCausalityNotes(e.target.value)} rows={3} className="w-full rounded-lg border px-3 py-2 text-sm" />
                </div>
                <button onClick={handleAssess} disabled={!causality || submitting} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                  บันทึกการประเมิน
                </button>
              </div>
            </div>
          )}
          {report.notes && (
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <h3 className="mb-2 text-sm font-semibold">หมายเหตุเพิ่มเติม</h3>
              <p className="text-sm text-muted-foreground">{report.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
