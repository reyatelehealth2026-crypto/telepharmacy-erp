'use client';

import { useState } from 'react';
import { Shield, CheckCircle, XCircle, Loader2, Eye, Clock } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { useApi } from '@/lib/use-api';
import { api } from '@/lib/api-client';
import { cn } from '@/lib/utils';

interface KycVerification {
  id: string;
  patientId: string;
  status: string;
  documentType: string;
  flaggedForReview: boolean;
  requiresGuardianConsent: boolean;
  createdAt: string;
  completedAt?: string;
}

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  documents_uploaded: 'bg-blue-100 text-blue-700',
  liveness_passed: 'bg-indigo-100 text-indigo-700',
  face_verified: 'bg-cyan-100 text-cyan-700',
  otp_verified: 'bg-purple-100 text-purple-700',
  verified: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  manual_review: 'bg-amber-100 text-amber-700',
};

export default function KycReviewPage() {
  // Note: This would need a staff KYC list endpoint. For now, we show the review interface.
  const [patientId, setPatientId] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const { data: status, isLoading } = useApi<any>(patientId ? `/v1/telemedicine/kyc/status/${patientId}` : null);
  const [reviewing, setReviewing] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');

  async function handleReview(approved: boolean) {
    if (!verificationId) return;
    setReviewing(true);
    try {
      await api.post(`/v1/telemedicine/kyc/${verificationId}/review`, { approved, reviewNotes });
      alert(approved ? 'อนุมัติแล้ว' : 'ปฏิเสธแล้ว');
      setPatientId('');
      setVerificationId('');
    } catch (e: any) { alert(e.message ?? 'Error'); }
    finally { setReviewing(false); }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="KYC Review" description="ตรวจสอบและอนุมัติการยืนยันตัวตน" />

      {/* Search */}
      <div className="flex gap-2">
        <input value={patientId} onChange={e => setPatientId(e.target.value)} placeholder="Patient ID" className="flex-1 rounded-lg border px-3 py-2 text-sm" />
      </div>

      {/* Status Display */}
      {isLoading && <div className="flex h-32 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}

      {status && (
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">KYC Status</h3>
            <span className={cn('rounded-full px-3 py-1 text-xs font-semibold', STATUS_BADGE[status.status] ?? 'bg-muted')}>
              {status.status}
            </span>
          </div>

          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Verification ID</dt><dd className="font-mono text-xs">{status.verificationId ?? '-'}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Next Step</dt><dd>{status.nextStep}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Flagged</dt><dd>{status.flaggedForReview ? 'ใช่' : 'ไม่'}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Guardian Consent</dt><dd>{status.requiresGuardianConsent ? 'ต้องการ' : 'ไม่ต้อง'}</dd></div>
          </dl>

          {/* Manual Review */}
          {(status.flaggedForReview || status.status === 'manual_review') && status.verificationId && (
            <div className="border-t pt-4 space-y-3">
              <h4 className="text-sm font-semibold">Manual Review</h4>
              <input value={status.verificationId} onChange={e => setVerificationId(e.target.value)} className="hidden" />
              <div>
                <label className="mb-1 block text-sm font-medium">หมายเหตุ</label>
                <textarea value={reviewNotes} onChange={e => setReviewNotes(e.target.value)} rows={3} className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="เหตุผลในการอนุมัติ/ปฏิเสธ..." />
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setVerificationId(status.verificationId); handleReview(true); }} disabled={reviewing} className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">
                  <CheckCircle className="h-4 w-4" /> อนุมัติ
                </button>
                <button onClick={() => { setVerificationId(status.verificationId); handleReview(false); }} disabled={reviewing} className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
                  <XCircle className="h-4 w-4" /> ปฏิเสธ
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {!status && !isLoading && patientId && (
        <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">ไม่พบข้อมูล KYC สำหรับ Patient ID นี้</div>
      )}
    </div>
  );
}
