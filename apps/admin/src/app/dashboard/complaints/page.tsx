'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  MessageSquareWarning,
  Loader2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { StatCard } from '@/components/stat-card';
import { PageHeader } from '@/components/page-header';
import { useApi } from '@/lib/use-api';
import { cn } from '@/lib/utils';
import type {
  Complaint,
  ComplaintStatus,
  ComplaintSeverity,
  ComplaintCategory,
} from '@/lib/complaints';

interface ComplaintsResponse {
  data: Complaint[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

type StatusFilter = 'all' | ComplaintStatus;
type SeverityFilter = 'all' | ComplaintSeverity;
type CategoryFilter = 'all' | ComplaintCategory;

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'open', label: 'เปิด' },
  { key: 'in_progress', label: 'กำลังดำเนินการ' },
  { key: 'resolved', label: 'แก้ไขแล้ว' },
  { key: 'closed', label: 'ปิดแล้ว' },
];

const SEVERITY_OPTIONS: { key: SeverityFilter; label: string }[] = [
  { key: 'all', label: 'ทุกระดับ' },
  { key: 'low', label: 'ต่ำ' },
  { key: 'medium', label: 'ปานกลาง' },
  { key: 'high', label: 'สูง' },
  { key: 'critical', label: 'วิกฤต' },
];

const CATEGORY_OPTIONS: { key: CategoryFilter; label: string }[] = [
  { key: 'all', label: 'ทุกหมวดหมู่' },
  { key: 'service', label: 'บริการ' },
  { key: 'product_quality', label: 'คุณภาพสินค้า' },
  { key: 'delivery', label: 'การจัดส่ง' },
  { key: 'billing', label: 'การเรียกเก็บเงิน' },
  { key: 'other', label: 'อื่นๆ' },
];

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

function formatDate(dateStr: string | null) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
  });
}

export default function ComplaintsPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [page, setPage] = useState(1);

  const params = new URLSearchParams({ page: String(page), limit: '20' });
  if (statusFilter !== 'all') params.set('status', statusFilter);
  if (severityFilter !== 'all') params.set('severity', severityFilter);
  if (categoryFilter !== 'all') params.set('category', categoryFilter);

  const apiPath = `/v1/staff/complaints?${params}`;
  const { data: result, isLoading, mutate } = useApi<ComplaintsResponse>(apiPath);

  const complaints = result?.data ?? [];
  const meta = result?.meta ?? { page: 1, limit: 20, total: 0, totalPages: 0 };

  const openCount = complaints.filter((c) => c.status === 'open').length;
  const inProgressCount = complaints.filter((c) => c.status === 'in_progress').length;
  const resolvedCount = complaints.filter((c) => c.status === 'resolved').length;

  return (
    <div className="space-y-6">
      <PageHeader title="ข้อร้องเรียน" description="จัดการข้อร้องเรียนจากลูกค้าทั้งหมด">
        <button
          onClick={() => mutate()}
          className="inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors hover:bg-muted"
        >
          <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          รีเฟรช
        </button>
      </PageHeader>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="ข้อร้องเรียนทั้งหมด" value={meta.total} icon={MessageSquareWarning} />
        <StatCard title="เปิดอยู่" value={openCount} icon={AlertTriangle} description="รอดำเนินการ" />
        <StatCard title="กำลังดำเนินการ" value={inProgressCount} icon={Clock} description="อยู่ระหว่างแก้ไข" />
        <StatCard title="แก้ไขแล้ว" value={resolvedCount} icon={CheckCircle2} description="ดำเนินการเสร็จสิ้น" />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setStatusFilter(tab.key); setPage(1); }}
              className={cn(
                'shrink-0 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
                statusFilter === tab.key
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <select
          value={severityFilter}
          onChange={(e) => { setSeverityFilter(e.target.value as SeverityFilter); setPage(1); }}
          className="h-9 rounded-lg border bg-background px-3 text-sm"
        >
          {SEVERITY_OPTIONS.map((opt) => (
            <option key={opt.key} value={opt.key}>{opt.label}</option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value as CategoryFilter); setPage(1); }}
          className="h-9 rounded-lg border bg-background px-3 text-sm"
        >
          {CATEGORY_OPTIONS.map((opt) => (
            <option key={opt.key} value={opt.key}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                <th className="px-4 py-3 font-medium">ผู้ร้องเรียน</th>
                <th className="px-4 py-3 font-medium">หมวดหมู่</th>
                <th className="px-4 py-3 font-medium">ระดับความรุนแรง</th>
                <th className="px-4 py-3 font-medium">สถานะ</th>
                <th className="px-4 py-3 font-medium">วันที่สร้าง</th>
                <th className="px-4 py-3 font-medium">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                    <p className="mt-2">กำลังโหลด...</p>
                  </td>
                </tr>
              ) : complaints.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    <MessageSquareWarning className="mx-auto h-8 w-8" />
                    <p className="mt-2">ไม่พบข้อร้องเรียน</p>
                  </td>
                </tr>
              ) : (
                complaints.map((complaint) => (
                  <tr key={complaint.id} className="border-b transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <p className="font-medium">
                        {complaint.patient
                          ? `${complaint.patient.firstName} ${complaint.patient.lastName}`
                          : complaint.patientId.slice(0, 8)}
                      </p>
                      {complaint.patient?.phone && (
                        <p className="text-xs text-muted-foreground">{complaint.patient.phone}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                        {CATEGORY_LABEL[complaint.category] ?? complaint.category}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', SEVERITY_BADGE[complaint.severity] ?? 'bg-muted')}>
                        {SEVERITY_LABEL[complaint.severity] ?? complaint.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', STATUS_BADGE[complaint.status] ?? 'bg-muted')}>
                        {STATUS_LABEL[complaint.status] ?? complaint.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {formatDate(complaint.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/complaints/${complaint.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                      >
                        ดูรายละเอียด
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-xs text-muted-foreground">
              แสดง {(meta.page - 1) * meta.limit + 1}–{Math.min(meta.page * meta.limit, meta.total)} จาก {meta.total}
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-50"
              >
                ก่อนหน้า
              </button>
              <button
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={page >= meta.totalPages}
                className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-50"
              >
                ถัดไป
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
