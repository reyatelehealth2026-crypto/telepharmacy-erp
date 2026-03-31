'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Shield, CheckCircle, Clock, Camera, FileText, Phone, Mail, AlertTriangle } from 'lucide-react';
import { useAuthGuard } from '@/lib/use-auth-guard';
import { getKycStatus, type KycStatus } from '@/lib/kyc';

const STEP_CONFIG = [
  { key: 'upload_document', label: 'อัปโหลดบัตรประชาชน', icon: FileText, href: '/profile/kyc/document' },
  { key: 'liveness_check', label: 'ตรวจสอบใบหน้า', icon: Camera, href: '/profile/kyc/liveness' },
  { key: 'face_compare', label: 'เปรียบเทียบใบหน้า', icon: Camera, href: '/profile/kyc/liveness' },
  { key: 'send_otp', label: 'ยืนยัน OTP', icon: Phone, href: '/profile/kyc/otp' },
  { key: 'verify_otp', label: 'ยืนยัน OTP', icon: Phone, href: '/profile/kyc/otp' },
  { key: 'verify_email', label: 'ยืนยันอีเมล', icon: Mail, href: '' },
  { key: 'completed', label: 'ยืนยันตัวตนสำเร็จ', icon: CheckCircle, href: '' },
];

export default function KycPage() {
  const { loading: authLoading, patient } = useAuthGuard();
  const [status, setStatus] = useState<KycStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patient?.id) return;
    getKycStatus(patient.id)
      .then(setStatus)
      .catch(() => setStatus({ hasKyc: false, status: 'not_started', nextStep: 'upload_document' }))
      .finally(() => setLoading(false));
  }, [patient]);

  if (authLoading || loading) return <div className="flex items-center justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  const currentStepIdx = STEP_CONFIG.findIndex(s => s.key === status?.nextStep);
  const isCompleted = status?.status === 'verified' || status?.nextStep === 'completed';

  return (
    <div className="pb-20">
      <div className="flex items-center gap-3 px-4 py-3">
        <Link href="/profile" className="rounded-full p-1 hover:bg-muted"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="text-lg font-bold">ยืนยันตัวตน (KYC)</h1>
      </div>

      <div className="space-y-4 px-4">
        {/* Status Banner */}
        {isCompleted ? (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div>
              <p className="font-medium text-green-700">ยืนยันตัวตนสำเร็จ</p>
              <p className="text-xs text-green-600">คุณสามารถใช้บริการ Telemedicine ได้แล้ว</p>
            </div>
          </div>
        ) : status?.flaggedForReview ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-amber-600" />
            <div>
              <p className="font-medium text-amber-700">รอการตรวจสอบ</p>
              <p className="text-xs text-amber-600">เจ้าหน้าที่กำลังตรวจสอบข้อมูลของคุณ</p>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              <p className="font-medium text-blue-700">ยืนยันตัวตนเพื่อใช้บริการ Telemedicine</p>
            </div>
            <p className="mt-1 text-xs text-blue-600">ตาม พ.ร.บ. เทเลเมดิซีน พ.ศ. 2569 ต้องยืนยันตัวตนก่อนรับบริการ</p>
          </div>
        )}

        {/* Steps */}
        <div className="space-y-2">
          {STEP_CONFIG.map((step, idx) => {
            const isDone = idx < currentStepIdx || isCompleted;
            const isCurrent = idx === currentStepIdx && !isCompleted;
            const Icon = step.icon;

            return (
              <div key={step.key} className={`flex items-center gap-3 rounded-xl border p-4 ${isCurrent ? 'border-primary bg-primary/5' : ''}`}>
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isDone ? 'bg-green-100 text-green-600' : isCurrent ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                  {isDone ? <CheckCircle className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <span className={`flex-1 text-sm ${isDone ? 'text-green-700 line-through' : isCurrent ? 'font-medium' : 'text-muted-foreground'}`}>
                  {step.label}
                </span>
                {isCurrent && step.href && (
                  <Link href={step.href} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
                    ดำเนินการ
                  </Link>
                )}
              </div>
            );
          })}
        </div>

        {/* Info */}
        <div className="rounded-xl border p-4 text-xs text-muted-foreground space-y-1">
          <p>• ข้อมูลจะถูกเข้ารหัสและจัดเก็บอย่างปลอดภัย</p>
          <p>• ใช้เวลาประมาณ 5-10 นาที</p>
          <p>• ต้องใช้กล้องหน้าสำหรับตรวจสอบใบหน้า</p>
          <p>• ต้องมีบัตรประชาชนตัวจริง</p>
        </div>
      </div>
    </div>
  );
}
