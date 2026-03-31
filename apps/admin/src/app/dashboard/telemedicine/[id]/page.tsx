'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Video, CheckCircle, UserCheck } from 'lucide-react';
import { useApi } from '@/lib/use-api';
import { api } from '@/lib/api-client';
import { cn } from '@/lib/utils';

interface ConsultationDetail {
  consultationId: string;
  status: string;
  type: string;
  chiefComplaint: string;
  symptoms?: string[];
  patientId: string;
  pharmacistId?: string;
  channelName?: string;
  agoraToken?: string;
  agoraUid?: number;
  startedAt?: string;
  endedAt?: string;
  createdAt: string;
  scopeValidation?: { overallResult: string; canProceed: boolean; triggeredRules?: any[] };
}

const STATUS_LABEL: Record<string, string> = {
  requested: 'รอดำเนินการ', consent_accepted: 'ยินยอมแล้ว', pharmacist_assigned: 'รับเรื่องแล้ว',
  in_progress: 'กำลังปรึกษา', completed: 'เสร็จสิ้น', referred: 'ส่งต่อ', cancelled: 'ยกเลิก',
};

export default function ConsultationDetailAdminPage() {
  const { id } = useParams();
  const { data, isLoading, mutate } = useApi<ConsultationDetail>(`/v1/telemedicine/consultations/${id}`);
  const [accepting, setAccepting] = useState(false);

  async function handleAccept() {
    setAccepting(true);
    try {
      await api.post(`/v1/telemedicine/consultations/${id}/accept`);
      await mutate();
    } catch (e: any) { alert(e.message ?? 'Error'); }
    finally { setAccepting(false); }
  }

  if (isLoading) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (!data) return <div className="flex h-96 flex-col items-center justify-center gap-2"><p className="text-muted-foreground">ไม่พบข้อมูล</p><Link href="/dashboard/telemedicine" className="text-sm text-primary underline">กลับ</Link></div>;

  const canAccept = ['consent_accepted', 'requested', 'scope_validated'].includes(data.status);
  const canJoinVideo = ['pharmacist_assigned', 'in_progress'].includes(data.status);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/telemedicine" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border hover:bg-muted"><ArrowLeft className="h-4 w-4" /></Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Consultation</h1>
          <p className="text-sm text-muted-foreground">{data.type?.replace(/_/g, ' ')} · {new Date(data.createdAt).toLocaleString('th-TH')}</p>
        </div>
        <span className={cn('rounded-full px-3 py-1 text-xs font-semibold', data.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700')}>
          {STATUS_LABEL[data.status] ?? data.status}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold">ข้อมูลการปรึกษา</h3>
            <dl className="space-y-2 text-sm">
              <div><dt className="text-muted-foreground">อาการ</dt><dd className="mt-1">{data.chiefComplaint}</dd></div>
              {data.symptoms && data.symptoms.length > 0 && (
                <div><dt className="text-muted-foreground">อาการร่วม</dt><dd className="mt-1">{data.symptoms.join(', ')}</dd></div>
              )}
              <div className="flex justify-between"><dt className="text-muted-foreground">Patient ID</dt><dd className="font-mono text-xs">{data.patientId}</dd></div>
            </dl>
          </div>

          {data.scopeValidation && (
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold">Scope Validation</h3>
              <div className="flex items-center gap-2">
                <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', data.scopeValidation.overallResult === 'passed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
                  {data.scopeValidation.overallResult}
                </span>
                <span className="text-xs text-muted-foreground">{data.scopeValidation.canProceed ? 'สามารถดำเนินการได้' : 'ไม่สามารถดำเนินการ'}</span>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {/* Actions */}
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold">ดำเนินการ</h3>
            <div className="space-y-2">
              {canAccept && (
                <button onClick={handleAccept} disabled={accepting} className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {accepting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
                  รับเรื่อง
                </button>
              )}
              {canJoinVideo && data.channelName && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
                  <p className="font-medium">พร้อมเริ่มวิดีโอคอล</p>
                  <p className="mt-1 text-xs">Channel: {data.channelName}</p>
                  {data.agoraToken && <p className="text-xs font-mono truncate">Token: {data.agoraToken.slice(0, 30)}...</p>}
                </div>
              )}
              {data.status === 'completed' && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                  <p className="font-medium">ปรึกษาเสร็จสิ้น</p>
                  {data.startedAt && <p className="text-xs">เริ่ม: {new Date(data.startedAt).toLocaleString('th-TH')}</p>}
                  {data.endedAt && <p className="text-xs">จบ: {new Date(data.endedAt).toLocaleString('th-TH')}</p>}
                </div>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold">Timeline</h3>
            <div className="space-y-2 text-xs">
              {[
                { label: 'สร้างคำขอ', date: data.createdAt },
                { label: 'เริ่มปรึกษา', date: data.startedAt },
                { label: 'จบการปรึกษา', date: data.endedAt },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className={cn('h-2 w-2 rounded-full', item.date ? 'bg-green-500' : 'bg-muted-foreground/30')} />
                  <span className={cn('flex-1', item.date ? 'font-medium' : 'text-muted-foreground')}>{item.label}</span>
                  <span className="text-muted-foreground">{item.date ? new Date(item.date).toLocaleString('th-TH') : '-'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
