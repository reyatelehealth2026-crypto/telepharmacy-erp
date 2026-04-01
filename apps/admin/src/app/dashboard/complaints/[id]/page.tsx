'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Loader2,
  User,
  ShoppingCart,
  ImageIcon,
  CheckCircle2,
} from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { useApi } from '@/lib/use-api';
import { cn } from '@/lib/utils';
import {
  resolveComplaint,
  updateComplaintStatus,
  type Complaint,
  type ComplaintStatus,
} from '@/lib/complaints';

const STATUS_BADGE: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-500',
};

const STATUS_LABEL: Record<string, string> = {
  open: 'เปิด',
  in_progress: 'กำลังดำเนินการ',
  resolved: 'แก้ไขแล้ว',
  closed: 'ปิดแล้ว',
};

const SEVERITY_BADGE: Record<string, string> = {
  low: 'bg-slate-100 text-slate-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

const SEVERITY_LABEL: Record<string, string> = {
  low: 'ต่ำ',
  medium: 'ปานกลาง',
  high: 'สูง',
  critical: 'วิกฤต',
};

const CATEGORY_LABEL: Record<string, string> = {
  service: 'บริการ',
  product_quality: 'คุณภาพสินค้า',
  delivery: 'การจัดส่ง',
  billing: 'การเรียกเก็บเงิน',
  other: 'อื่นๆ',
};

const STATUS_TRANSITIONS: { from: ComplaintStatus; to: ComplaintStatus; label: string }[] = [
  { from: 'open', to: 'in_progress', label: 'เริ่มดำเนินการ' },
  { from: 'in_progress', to: 'open', label: 'กลับเป็นเปิด' },
  { from: 'resolved', to: 'closed', label: 'ปิดข้อร้องเรียน' },
];

function formatDateTime(dateStr: string | null) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ComplaintDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const { data: complaint, isLoading, mutate } = useApi<Complaint>(
    id ? `/v1/staff/complaints/${id}` : null,
  );

  const [resolution, setResolution] = useState('');
  const [resolving, setResolving] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleResolve(e: React.FormEvent) {
    e.preventDefault();
    if (!resolution.trim()) return;
    setResolving(true);
    setError(null);
    try {
      await resolveComplaint(id, resolution.trim());
      await mutate();
      setResolution('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาด';
      setError(msg);
    } finally {
      setResolving(false);
    }
  }

  async function handleStatusChange(newStatus: ComplaintStatus) {
    setUpdatingStatus(true);
    setError(null);
    try {
      await updateComplaintStatus(id, newStatus);
      await mutate();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาด';
      setError(msg);
    } finally {
      setUpdatingStatus(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!complaint) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <p>ไม่พบข้อร้องเรียน</p>
        <Link href="/dashboard/complaints" className="mt-4 text-sm text-primary hover:underline">
          กลับไปรายการข้อร้องเรียน
        </Link>
      </div>
    );
  }

  const availableTransitions = STATUS_TRANSITIONS.filter((t) => t.from === complaint.status);
  const images = complaint.images ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="รายละเอียดข้อร้องเรียน" description={`#${complaint.id.slice(0, 8)}`}>
        <div className="flex gap-2">
          {availableTransitions.map((t) => (
            <button
              key={t.to}
              onClick={() => handleStatusChange(t.to)}
              disabled={updatingStatus}
              className="inline-flex h-9 items-center gap-2 rounded-lg border px-4 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
            >
              {updatingStatus && <Loader2 className="h-4 w-4 animate-spin" />}
              {t.label}
            </button>
          ))}
          <Link
            href="/dashboard/complaints"
            className="inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
            กลับ
          </Link>
        </div>
      </PageHeader>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Complaint info */}
          <section className="rounded-xl border bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">ข้อมูลข้อร้องเรียน</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">หมวดหมู่</p>
                <span className="mt-1 inline-block rounded-full bg-muted px-2 py-0.5 text-sm">
                  {CATEGORY_LABEL[complaint.category] ?? complaint.category}
                </span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">ระดับความรุนแรง</p>
                <span className={cn('mt-1 inline-block rounded-full px-2 py-0.5 text-sm font-medium', SEVERITY_BADGE[complaint.severity])}>
                  {SEVERITY_LABEL[complaint.severity] ?? complaint.severity}
                </span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">สถานะ</p>
                <span className={cn('mt-1 inline-block rounded-full px-2 py-0.5 text-sm font-medium', STATUS_BADGE[complaint.status])}>
                  {STATUS_LABEL[complaint.status] ?? complaint.status}
                </span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">วันที่สร้าง</p>
                <p className="mt-1 text-sm">{formatDateTime(complaint.createdAt)}</p>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xs text-muted-foreground">รายละเอียด</p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{complaint.description}</p>
            </div>
          </section>

          {/* Images */}
          {images.length > 0 && (
            <section className="rounded-xl border bg-card p-6 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                <ImageIcon className="h-5 w-5" />
                รูปภาพแนบ ({images.length})
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {images.map((img, idx) => (
                  <a
                    key={idx}
                    href={img}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative aspect-square overflow-hidden rounded-lg border bg-muted"
                  >
                    <img
                      src={img}
                      alt={`ภาพแนบ ${idx + 1}`}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* Resolution section */}
          {complaint.status === 'resolved' || complaint.status === 'closed' ? (
            <section className="rounded-xl border border-green-200 bg-green-50 p-6 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-green-800">
                <CheckCircle2 className="h-5 w-5" />
                ผลการแก้ไข
              </h2>
              <p className="whitespace-pre-wrap text-sm text-green-900">{complaint.resolution}</p>
              <p className="mt-3 text-xs text-green-700">
                แก้ไขเมื่อ {formatDateTime(complaint.resolvedAt)}
              </p>
            </section>
          ) : (
            <section className="rounded-xl border bg-card p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold">แก้ไขข้อร้องเรียน</h2>
              <form onSubmit={handleResolve} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    ผลการแก้ไข *
                  </label>
                  <textarea
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    rows={4}
                    required
                    placeholder="อธิบายวิธีการแก้ไขปัญหา..."
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={resolving || !resolution.trim()}
                    className="inline-flex h-10 items-center gap-2 rounded-lg bg-green-600 px-6 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                  >
                    {resolving && <Loader2 className="h-4 w-4 animate-spin" />}
                    บันทึกการแก้ไข
                  </button>
                </div>
              </form>
            </section>
          )}
        </div>

        {/* Sidebar info */}
        <div className="space-y-6">
          {/* Patient info */}
          <section className="rounded-xl border bg-card p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <User className="h-5 w-5" />
              ข้อมูลผู้ร้องเรียน
            </h2>
            {complaint.patient ? (
              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">ชื่อ</p>
                  <p className="font-medium">{complaint.patient.firstName} {complaint.patient.lastName}</p>
                </div>
                {complaint.patient.phone && (
                  <div>
                    <p className="text-xs text-muted-foreground">โทรศัพท์</p>
                    <p>{complaint.patient.phone}</p>
                  </div>
                )}
                <div>
                  <Link
                    href={`/dashboard/patients/${complaint.patientId}`}
                    className="text-xs text-primary hover:underline"
                  >
                    ดูโปรไฟล์ผู้ป่วย →
                  </Link>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Patient ID: {complaint.patientId.slice(0, 8)}...</p>
            )}
          </section>

          {/* Related order */}
          {complaint.order && (
            <section className="rounded-xl border bg-card p-6 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                <ShoppingCart className="h-5 w-5" />
                ออเดอร์ที่เกี่ยวข้อง
              </h2>
              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">เลขออเดอร์</p>
                  <p className="font-medium">{complaint.order.orderNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">ยอดรวม</p>
                  <p>฿{Number(complaint.order.totalAmount).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">สถานะ</p>
                  <p>{complaint.order.status}</p>
                </div>
                <div>
                  <Link
                    href={`/dashboard/orders/${complaint.order.id}`}
                    className="text-xs text-primary hover:underline"
                  >
                    ดูรายละเอียดออเดอร์ →
                  </Link>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
