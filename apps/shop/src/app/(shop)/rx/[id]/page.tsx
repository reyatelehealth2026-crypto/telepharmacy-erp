'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  FileText,
  Clock,
  CheckCircle,
  User,
  Pill,
  Truck,
  AlertCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth';
import { useAuthGuard } from '@/lib/use-auth-guard';
import { getPrescription, type Prescription, getRxStatusConfig } from '@/lib/prescriptions';

interface TimelineStep {
  status: string;
  label: string;
  description: string;
  done: boolean;
  active: boolean;
  timestamp?: string;
}

function buildTimeline(rx: Prescription): TimelineStep[] {
  const steps: TimelineStep[] = [
    { status: 'received', label: 'ส่งใบสั่งยาแล้ว', description: 'ระบบรับใบสั่งยาของคุณแล้ว', done: true, active: false },
    { status: 'ai_processing', label: 'กำลังอ่านใบสั่งยา (AI OCR)', description: 'AI กำลังแยกชื่อยา ขนาด จำนวน', done: false, active: rx.status === 'ai_processing' },
    { status: 'ai_completed', label: 'รอเภสัชกรตรวจสอบ', description: 'เภสัชกรจะตรวจสอบความปลอดภัย', done: false, active: rx.status === 'ai_completed' || rx.status === 'pending_review' },
    { status: 'approved', label: 'เภสัชกรอนุมัติแล้ว', description: 'ใบสั่งยาผ่านการตรวจสอบ', done: ['approved', 'dispensing', 'shipped'].includes(rx.status), active: rx.status === 'approved' },
    { status: 'dispensing', label: 'กำลังจัดยา', description: 'ร้านกำลังเตรียมยาตามใบสั่งยา', done: ['dispensing', 'shipped'].includes(rx.status), active: rx.status === 'dispensing' },
    { status: 'shipped', label: 'จัดส่งแล้ว', description: 'ยาอยู่ระหว่างการจัดส่ง', done: rx.status === 'shipped', active: rx.status === 'shipped' },
  ];
  return steps;
}

export default function PrescriptionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { loading: authLoading, token } = useAuthGuard();
  const { accessToken } = useAuthStore();
  const [rx, setRx] = useState<Prescription | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    fetchRx();
  }, [accessToken]);

  const fetchRx = async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const { id } = await params;
      const data = await getPrescription(accessToken, id);
      setRx(data);
    } catch {
      toast.error('โหลดข้อมูลไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchRx();
    setRefreshing(false);
  };

  if (authLoading) return <div className="flex items-center justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!rx) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center px-4">
        <FileText className="h-12 w-12 text-muted-foreground/30" />
        <p className="mt-2 text-sm text-muted-foreground">ไม่พบใบสั่งยา</p>
        <Link href="/rx/status" className="mt-4 text-sm text-primary">
          กลับไปดูรายการ
        </Link>
      </div>
    );
  }

  const statusConfig = getRxStatusConfig(rx.status);
  const timeline = buildTimeline(rx);

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/rx/status" className="rounded-full p-1 hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold">รายละเอียดใบสั่งยา</h1>
            <p className="text-xs text-muted-foreground">{rx.rxNo}</p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="rounded-full p-2 hover:bg-muted disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="space-y-4 px-4">
        {/* Status Card */}
        <div className="rounded-xl border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">สถานะปัจจุบัน</p>
                <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusConfig.color}`}>
                  {statusConfig.label}
                </span>
              </div>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            ส่งเมื่อ {new Date(rx.createdAt).toLocaleString('th-TH')}
          </p>
        </div>

        {/* Timeline */}
        <div className="rounded-xl border p-4">
          <h2 className="text-sm font-bold mb-4">ความคืบหน้า</h2>
          <div className="space-y-0">
            {timeline.map((step, i) => (
              <div key={step.status} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                      step.done
                        ? 'border-primary bg-primary text-white'
                        : step.active
                          ? 'border-primary bg-white'
                          : 'border-muted bg-muted'
                    }`}
                  >
                    {step.done ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : step.active ? (
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    ) : null}
                  </div>
                  {i < timeline.length - 1 && (
                    <div className={`w-0.5 flex-1 ${step.done ? 'bg-primary' : 'bg-muted'}`} />
                  )}
                </div>
                <div className={`pb-6 ${step.active ? '' : step.done ? '' : 'opacity-50'}`}>
                  <p className={`text-sm ${step.active ? 'font-bold' : 'font-medium'}`}>
                    {step.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                  {step.timestamp && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(step.timestamp).toLocaleString('th-TH')}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Medications */}
        {rx.ocrResult?.medications && rx.ocrResult.medications.length > 0 && (
          <div className="rounded-xl border p-4">
            <h2 className="text-sm font-bold mb-3">รายการยาที่ตรวจพบ</h2>
            <div className="space-y-3">
              {rx.ocrResult.medications.map((med, i) => (
                <div key={i} className="flex items-start gap-2 rounded-lg bg-muted/50 p-3">
                  <Pill className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{med.drugName}</p>
                    <p className="text-xs text-muted-foreground">
                      {med.dosage} {med.sig && `· ${med.sig}`} {med.quantity && `· จำนวน ${med.quantity}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              ความมั่นใจ OCR: {(rx.ocrResult.confidence * 100).toFixed(0)}%
            </p>
          </div>
        )}

        {/* Pharmacist Notes */}
        {rx.pharmacistNotes && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <User className="h-4 w-4 text-blue-600" />
              <h2 className="text-sm font-bold text-blue-800">หมายเหตุจากเภสัชกร</h2>
            </div>
            <p className="text-sm text-blue-700">{rx.pharmacistNotes}</p>
          </div>
        )}

        {/* Actions */}
        {rx.status === 'approved' && (
          <Link
            href={`/checkout?rxId=${rx.id}`}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            สั่งซื้อยาจากใบสั่งยานี้
          </Link>
        )}
      </div>
    </div>
  );
}


