'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import { useApi } from '@/lib/use-api';
import { api } from '@/lib/api-client';

interface TDMDetail {
  id: string; patientId: string; drugName: string; status: string;
  indication?: string; currentDose?: string; targetRange?: string;
  measuredLevel?: number; unit?: string; recommendation?: string;
  createdAt: string; completedAt?: string;
}

export default function TDMDetailPage() {
  const { id } = useParams();
  const { data, isLoading, mutate } = useApi<TDMDetail>(`/v1/drug-info/tdm?id=${id}`);
  const [measuredLevel, setMeasuredLevel] = useState('');
  const [unit, setUnit] = useState('mcg/mL');
  const [recommendation, setRecommendation] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleRecord() {
    if (!measuredLevel || !recommendation) return;
    setSubmitting(true);
    try {
      await api.patch(`/v1/drug-info/tdm/${id}/result`, {
        measuredLevel: parseFloat(measuredLevel), unit, recommendation,
      });
      await mutate();
    } catch (e: any) { alert(e.message ?? 'Error'); }
    finally { setSubmitting(false); }
  }

  if (isLoading) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/clinical" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border hover:bg-muted"><ArrowLeft className="h-4 w-4" /></Link>
        <h1 className="text-xl font-bold">TDM: {data?.drugName ?? ''}</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
          <h3 className="text-sm font-semibold">ข้อมูลคำขอ TDM</h3>
          <dl className="space-y-2 text-sm">
            {[['ยา', data?.drugName], ['ข้อบ่งใช้', data?.indication], ['ขนาดยาปัจจุบัน', data?.currentDose], ['Target Range', data?.targetRange]].filter(([,v]) => v).map(([l,v]) => (
              <div key={l} className="flex justify-between"><dt className="text-muted-foreground">{l}</dt><dd className="font-medium">{v}</dd></div>
            ))}
          </dl>
          <div className="text-xs text-muted-foreground">สร้างเมื่อ: {data?.createdAt ? new Date(data.createdAt).toLocaleString('th-TH') : '-'}</div>
        </div>

        {data?.status === 'completed' ? (
          <div className="rounded-xl border border-green-200 bg-green-50 p-5 shadow-sm space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-green-700"><CheckCircle className="h-4 w-4" /> บันทึกผลแล้ว</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">ระดับยาที่วัดได้</dt><dd className="font-medium">{data.measuredLevel} {data.unit}</dd></div>
              <div><dt className="text-muted-foreground">คำแนะนำ</dt><dd className="mt-1">{data.recommendation}</dd></div>
            </dl>
          </div>
        ) : (
          <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-semibold">บันทึกผล TDM</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">ระดับยาที่วัดได้ *</label>
                <input type="number" step="0.01" value={measuredLevel} onChange={e => setMeasuredLevel(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">หน่วย</label>
                <select value={unit} onChange={e => setUnit(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm">
                  <option>mcg/mL</option><option>mg/L</option><option>ng/mL</option><option>mmol/L</option>
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">คำแนะนำ *</label>
              <textarea value={recommendation} onChange={e => setRecommendation(e.target.value)} rows={4} className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="คำแนะนำการปรับขนาดยา..." />
            </div>
            <button onClick={handleRecord} disabled={!measuredLevel || !recommendation || submitting} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              บันทึกผล
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
