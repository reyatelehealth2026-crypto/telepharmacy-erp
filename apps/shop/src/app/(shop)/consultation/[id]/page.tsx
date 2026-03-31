'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Video, FileText, Clock, CheckCircle, Loader2, AlertTriangle } from 'lucide-react';
import { useAuthGuard } from '@/lib/use-auth-guard';
import { getConsultation, type Consultation } from '@/lib/telemedicine';
import { toast } from 'sonner';

const STATUS_LABEL: Record<string, string> = {
  requested: 'รอดำเนินการ',
  scope_validated: 'ผ่านการตรวจสอบ',
  consent_pending: 'รอยินยอม',
  consent_accepted: 'ยินยอมแล้ว',
  pharmacist_assigned: 'เภสัชกรรับเรื่อง',
  in_progress: 'กำลังปรึกษา',
  completed: 'เสร็จสิ้น',
  referred: 'ส่งต่อ',
  cancelled: 'ยกเลิก',
  expired: 'หมดอายุ',
};

const STATUS_COLOR: Record<string, string> = {
  requested: 'bg-amber-100 text-amber-700',
  consent_pending: 'bg-blue-100 text-blue-700',
  consent_accepted: 'bg-blue-100 text-blue-700',
  pharmacist_assigned: 'bg-indigo-100 text-indigo-700',
  in_progress: 'bg-green-100 text-green-700',
  completed: 'bg-green-200 text-green-800',
  cancelled: 'bg-red-100 text-red-700',
};

export default function ConsultationDetailPage() {
  const { id } = useParams();
  const { loading: authLoading, token } = useAuthGuard();
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !id) return;
    getConsultation(token, id as string)
      .then(data => setConsultation(data))
      .catch(err => toast.error(err.message))
      .finally(() => setLoading(false));
  }, [token, id]);

  if (authLoading || loading) return <div className="flex items-center justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!consultation) return <div className="flex flex-col items-center justify-center py-24 gap-2"><p className="text-muted-foreground">ไม่พบข้อมูล</p><Link href="/consultation" className="text-sm text-primary underline">กลับ</Link></div>;

  const canConsent = consultation.status === 'consent_pending' || consultation.status === 'scope_validated';
  const canJoinVideo = consultation.status === 'pharmacist_assigned' || consultation.status === 'in_progress' || consultation.status === 'consent_accepted';

  return (
    <div className="pb-20">
      <div className="flex items-center gap-3 px-4 py-3">
        <Link href="/consultation/history" className="rounded-full p-1 hover:bg-muted"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="text-lg font-bold">รายละเอียดการปรึกษา</h1>
      </div>

      <div className="space-y-4 px-4">
        {/* Status */}
        <div className="rounded-xl border p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">สถานะ</span>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLOR[consultation.status] ?? 'bg-muted'}`}>
              {STATUS_LABEL[consultation.status] ?? consultation.status}
            </span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{consultation.chiefComplaint}</p>
          <p className="mt-1 text-xs text-muted-foreground">สร้างเมื่อ: {new Date(consultation.createdAt).toLocaleString('th-TH')}</p>
        </div>

        {/* Pharmacist Info */}
        {consultation.pharmacistName && (
          <div className="rounded-xl border p-4">
            <p className="text-sm font-medium">เภสัชกร</p>
            <p className="text-sm">{consultation.pharmacistName}</p>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2">
          {canConsent && (
            <Link href={`/consultation/${id}/consent`} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground">
              <FileText className="h-4 w-4" /> ยินยอมรับบริการ (e-Consent)
            </Link>
          )}
          {canJoinVideo && (
            <Link href={`/consultation/${id}/video`} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white">
              <Video className="h-4 w-4" /> เข้าร่วมวิดีโอคอล
            </Link>
          )}
        </div>

        {/* Timeline */}
        <div className="rounded-xl border p-4">
          <h3 className="text-sm font-bold mb-3">Timeline</h3>
          <div className="space-y-3">
            {[
              { label: 'ส่งคำขอ', date: consultation.createdAt, done: true },
              { label: 'ยินยอม', date: null, done: ['consent_accepted', 'pharmacist_assigned', 'in_progress', 'completed'].includes(consultation.status) },
              { label: 'เภสัชกรรับเรื่อง', date: null, done: ['pharmacist_assigned', 'in_progress', 'completed'].includes(consultation.status) },
              { label: 'เริ่มปรึกษา', date: consultation.startedAt, done: ['in_progress', 'completed'].includes(consultation.status) },
              { label: 'เสร็จสิ้น', date: consultation.endedAt, done: consultation.status === 'completed' },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`h-3 w-3 rounded-full ${step.done ? 'bg-green-500' : 'bg-muted-foreground/30'}`} />
                <span className={`flex-1 text-sm ${step.done ? 'font-medium' : 'text-muted-foreground'}`}>{step.label}</span>
                {step.date && <span className="text-xs text-muted-foreground">{new Date(step.date).toLocaleString('th-TH')}</span>}
              </div>
            ))}
          </div>
        </div>

        {consultation.status === 'referred' && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-600" /><span className="text-sm font-medium text-amber-700">ส่งต่อพบแพทย์</span></div>
            <p className="mt-1 text-xs text-amber-600">เภสัชกรแนะนำให้พบแพทย์เพื่อรับการรักษาเพิ่มเติม</p>
          </div>
        )}
      </div>
    </div>
  );
}
