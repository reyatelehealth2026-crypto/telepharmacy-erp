'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  FileText,
  Loader2,
  RefreshCw,
  ChevronRight,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth';
import { useAuthGuard } from '@/lib/use-auth-guard';
import { getMyPrescriptions, type Prescription, type RxStatus } from '@/lib/prescriptions';

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

const LIMIT = 20;

export default function PrescriptionListPage() {
  const { loading: authLoading } = useAuthGuard();
  const { accessToken } = useAuthStore();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const fetchPrescriptions = useCallback(
    async (reset = false, currentPage = 1) => {
      if (!accessToken) return;
      if (reset) setLoading(true);
      try {
        const res = await getMyPrescriptions(accessToken, currentPage, LIMIT);
        const data = res.data ?? [];
        setPrescriptions((prev) => (reset ? data : [...prev, ...data]));
        setHasMore(data.length === LIMIT);
        if (reset) setPage(2);
        else setPage((p) => p + 1);
      } catch {
        // keep previous results
      } finally {
        setLoading(false);
      }
    },
    [accessToken],
  );

  useEffect(() => {
    fetchPrescriptions(true, 1);
  }, [fetchPrescriptions]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPrescriptions(true, 1);
    setRefreshing(false);
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="rounded-full p-1 hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold">ใบสั่งยาของฉัน</h1>
            <p className="text-xs text-muted-foreground">
              {prescriptions.length} รายการ
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="rounded-full p-2 hover:bg-muted disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <Link href="/rx/upload">
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              ส่งใบสั่งยา
            </Button>
          </Link>
        </div>
      </div>

      {/* List */}
      <div className="space-y-3 px-4">
        {loading && prescriptions.length === 0 ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : prescriptions.length > 0 ? (
          <>
            {prescriptions.map((rx) => {
              const badge = STATUS_BADGE[rx.status] ?? {
                label: rx.status,
                className: 'bg-gray-100 text-gray-700',
              };
              return (
                <Link
                  key={rx.id}
                  href={`/rx/${rx.id}`}
                  className="flex items-center gap-3 rounded-xl border p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{rx.rxNo}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(rx.createdAt).toLocaleDateString('th-TH', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                      {rx.itemCount > 0 && ` · ${rx.itemCount} รายการยา`}
                      {rx.totalAmount != null && rx.totalAmount > 0 && ` · ฿${rx.totalAmount.toLocaleString()}`}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </Link>
              );
            })}

            {hasMore && (
              <button
                onClick={() => fetchPrescriptions(false, page)}
                disabled={loading}
                className="mt-2 w-full rounded-lg border py-2.5 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> กำลังโหลด...
                  </span>
                ) : (
                  'โหลดเพิ่มเติม'
                )}
              </button>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
            <FileText className="h-12 w-12 opacity-30" />
            <p className="text-sm">ยังไม่มีใบสั่งยา</p>
            <p className="text-xs">ส่งใบสั่งยาเพื่อสั่งซื้อยาตามใบสั่งแพทย์</p>
            <Link href="/rx/upload">
              <Button size="sm" className="mt-2 gap-1.5">
                <Plus className="h-4 w-4" />
                ส่งใบสั่งยา
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
