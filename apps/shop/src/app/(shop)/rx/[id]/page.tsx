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
  AlertCircle,
  Loader2,
  RefreshCw,
  ShoppingCart,
  XCircle,
  ImageIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth';
import { useAuthGuard } from '@/lib/use-auth-guard';
import { useCartStore } from '@/store/cart';
import { getPrescription, type Prescription, type RxStatus } from '@/lib/prescriptions';

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  received: { label: 'รับแล้ว', className: 'bg-gray-100 text-gray-700' },
  ai_processing: { label: 'AI กำลังประมวลผล', className: 'bg-blue-100 text-blue-800' },
  ai_completed: { label: 'รอเภสัชกร', className: 'bg-amber-100 text-amber-800' },
  pending_review: { label: 'เภสัชกรกำลังตรวจสอบ', className: 'bg-amber-100 text-amber-800' },
  approved: { label: 'อนุมัติแล้ว', className: 'bg-green-100 text-green-800' },
  rejected: { label: 'ไม่อนุมัติ', className: 'bg-red-100 text-red-800' },
  dispensing: { label: 'กำลังจัดยา', className: 'bg-purple-100 text-purple-800' },
  shipped: { label: 'จัดส่งแล้ว', className: 'bg-indigo-100 text-indigo-800' },
};

interface TimelineStep {
  status: string;
  label: string;
  description: string;
  done: boolean;
  active: boolean;
}

function buildTimeline(rx: Prescription): TimelineStep[] {
  const statusOrder: RxStatus[] = [
    'received',
    'ai_processing',
    'ai_completed',
    'approved',
    'dispensing',
    'shipped',
  ];

  const currentIdx = statusOrder.indexOf(rx.status as RxStatus);
  const isRejected = rx.status === 'rejected';

  const labels: Record<string, { label: string; desc: string }> = {
    received: { label: 'ส่งใบสั่งยาแล้ว', desc: 'ระบบรับใบสั่งยาของคุณแล้ว' },
    ai_processing: { label: 'กำลังอ่านใบสั่งยา (AI OCR)', desc: 'AI กำลังแยกชื่อยา ขนาด จำนวน' },
    ai_completed: { label: 'รอเภสัชกรตรวจสอบ', desc: 'เภสัชกรจะตรวจสอบความปลอดภัย' },
    approved: { label: 'เภสัชกรอนุมัติแล้ว', desc: 'ใบสั่งยาผ่านการตรวจสอบ' },
    dispensing: { label: 'กำลังจัดยา', desc: 'ร้านกำลังเตรียมยาตามใบสั่งยา' },
    shipped: { label: 'จัดส่งแล้ว', desc: 'ยาอยู่ระหว่างการจัดส่ง' },
  };

  return statusOrder.map((s, i) => ({
    status: s,
    label: labels[s]?.label ?? s,
    description: labels[s]?.desc ?? '',
    done: !isRejected && i < currentIdx,
    active: !isRejected && i === currentIdx,
  }));
}

export default function PrescriptionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { loading: authLoading } = useAuthGuard();
  const { accessToken } = useAuthStore();
  const addItem = useCartStore((s) => s.addItem);
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

  const handleAddToCart = () => {
    if (!rx?.ocrResult?.medications) return;

    let addedCount = 0;
    for (const med of rx.ocrResult.medications) {
      addItem({
        productId: med.drugName, // use drug name as fallback ID
        name: med.drugName,
        price: 0,
        unit: med.dosage || 'หน่วย',
        requiresPrescription: true,
      });
      addedCount++;
    }

    toast.success(`เพิ่ม ${addedCount} รายการยาลงตะกร้าแล้ว`);
    router.push('/cart');
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
        <Link href="/rx" className="mt-4 text-sm text-primary">
          กลับไปดูรายการ
        </Link>
      </div>
    );
  }

  const badge = STATUS_BADGE[rx.status] ?? { label: rx.status, className: 'bg-gray-100 text-gray-700' };
  const timeline = buildTimeline(rx);
  const isRejected = rx.status === 'rejected';
  const isApproved = rx.status === 'approved';
  const hasMedications = rx.ocrResult?.medications && rx.ocrResult.medications.length > 0;

  return (
    <div className="pb-28">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/rx" className="rounded-full p-1 hover:bg-muted">
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
              <div className={`flex h-12 w-12 items-center justify-center rounded-full ${isRejected ? 'bg-red-50' : 'bg-primary/10'}`}>
                {isRejected ? (
                  <XCircle className="h-6 w-6 text-red-500" />
                ) : (
                  <FileText className="h-6 w-6 text-primary" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium">สถานะปัจจุบัน</p>
                <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}>
                  {badge.label}
                </span>
              </div>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            ส่งเมื่อ {new Date(rx.createdAt).toLocaleString('th-TH')}
          </p>
        </div>

        {/* Rejected Notice */}
        {isRejected && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <h2 className="text-sm font-bold text-red-800">ใบสั่งยาไม่ผ่านการอนุมัติ</h2>
            </div>
            <p className="text-sm text-red-700">
              {rx.pharmacistNotes || 'กรุณาติดต่อเภสัชกรเพื่อสอบถามรายละเอียดเพิ่มเติม'}
            </p>
          </div>
        )}

        {/* Prescription Images */}
        {rx.imageUrls && rx.imageUrls.length > 0 && (
          <div className="rounded-xl border p-4">
            <div className="flex items-center gap-2 mb-3">
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-bold">รูปใบสั่งยา ({rx.imageUrls.length} รูป)</h2>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {rx.imageUrls.map((url, i) => (
                <div key={i} className="aspect-square overflow-hidden rounded-lg bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`ใบสั่งยา ${i + 1}`}
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timeline */}
        {!isRejected && (
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
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* OCR Results — Medications */}
        {hasMedications && (
          <div className="rounded-xl border p-4">
            <h2 className="text-sm font-bold mb-3">
              {isApproved ? 'รายการยาที่อนุมัติ' : 'รายการยาที่ตรวจพบ'}
            </h2>
            <div className="space-y-3">
              {rx.ocrResult!.medications.map((med, i) => (
                <div key={i} className="flex items-start gap-2 rounded-lg bg-muted/50 p-3">
                  <Pill className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{med.drugName}</p>
                    <p className="text-xs text-muted-foreground">
                      {med.dosage && `${med.dosage}`}
                      {med.sig && ` · ${med.sig}`}
                      {med.quantity != null && ` · จำนวน ${med.quantity}`}
                    </p>
                  </div>
                  {isApproved && (
                    <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                  )}
                </div>
              ))}
            </div>
            {rx.ocrResult!.confidence > 0 && (
              <p className="mt-3 text-xs text-muted-foreground">
                ความมั่นใจ OCR: {(rx.ocrResult!.confidence * 100).toFixed(0)}%
              </p>
            )}
            {rx.ocrResult!.doctorName && (
              <p className="mt-1 text-xs text-muted-foreground">
                แพทย์ผู้สั่ง: {rx.ocrResult!.doctorName}
              </p>
            )}
            {rx.ocrResult!.hospitalName && (
              <p className="text-xs text-muted-foreground">
                สถานพยาบาล: {rx.ocrResult!.hospitalName}
              </p>
            )}
          </div>
        )}

        {/* Pharmacist Notes */}
        {rx.pharmacistNotes && !isRejected && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <User className="h-4 w-4 text-blue-600" />
              <h2 className="text-sm font-bold text-blue-800">หมายเหตุจากเภสัชกร</h2>
            </div>
            <p className="text-sm text-blue-700">{rx.pharmacistNotes}</p>
          </div>
        )}

        {/* Approved — Add to Cart */}
        {isApproved && hasMedications && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <h2 className="text-sm font-bold text-green-800">ใบสั่งยาอนุมัติแล้ว</h2>
            </div>
            <p className="text-xs text-green-700 mb-3">
              คุณสามารถสั่งซื้อยาตามใบสั่งยานี้ได้แล้ว
            </p>
            <Button
              className="w-full gap-2"
              onClick={handleAddToCart}
            >
              <ShoppingCart className="h-4 w-4" />
              สั่งซื้อยาตามใบสั่ง ({rx.ocrResult!.medications.length} รายการ)
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
