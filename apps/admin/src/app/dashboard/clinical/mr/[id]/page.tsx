'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import { useApi } from '@/lib/use-api';
import { api } from '@/lib/api-client';

interface MRDetail {
  id: string; patientId: string; status: string; medications: string[];
  concerns?: string; findings?: string; recommendations?: string;
  completedBy?: string; createdAt: string; completedAt?: string;
}

export default function MRDetailPage() {
  const { id } = useParams();
  const { data, isLoading, mutate } = useApi<MRDetail>(`/v1/drug-info/medication-review?id=${id}`);
  const [findings, setFindings] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleComplete() {
    if (!findings || !recommendations) return;
    setSubmitting(true);
    try {
      await api.patch(`/v1/drug-info/medication-review/${id}/complete`, { findings, recommendations });
      await mutate();
    } catch (e: any) { alert(e.message ?? 'Error'); }
    finally { setSubmitting(false); }
  }

  if (isLoading) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/clinical" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border hover:bg-muted"><ArrowLeft className="h-4 w-4" /></Link>
        <h1 className="text-xl font-bold">Medication Review</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
          <h3 className="text-sm font-semibold">ข้อมูลคำขอ</h3>
          <div className="text-sm"><span className="text-muted-foreground">ยาที่ใช้:</span> <span className="font-medium">{data?.medications?.join(', ') ?? '-'}</span></div>
          {data?.concerns && <div className="text-sm"><span className="text-muted-foreground">ข้อกังวล:</span> <span>{data.concerns}</span></div>}
          <div className="text-xs text-muted-foreground">สร้างเมื่อ: {data?.createdAt ? new Date(data.createdAt).toLocaleString('th-TH') : '-'}</div>
        </div>

        {data?.status === 'completed' ? (
          <div className="rounded-xl border border-green-200 bg-green-50 p-5 shadow-sm space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-green-700"><CheckCircle className="h-4 w-4" /> ดำเนินการแล้ว</h3>
            <div className="text-sm"><span className="text-muted-foreground">Findings:</span> <p className="mt-1">{data.findings}</p></div>
            <div className="text-sm"><span className="text-muted-foreground">Recommendations:</span> <p className="mt-1">{data.recommendations}</p></div>
          </div>
        ) : (
          <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-semibold">บันทึกผล Medication Review</h3>
            <div>
              <label className="mb-1 block text-sm font-medium">Findings *</label>
              <textarea value={findings} onChange={e => setFindings(e.target.value)} rows={4} className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="ผลการตรวจสอบยา..." />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Recommendations *</label>
              <textarea value={recommendations} onChange={e => setRecommendations(e.target.value)} rows={4} className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="คำแนะนำ..." />
            </div>
            <button onClick={handleComplete} disabled={!findings || !recommendations || submitting} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              บันทึก
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
