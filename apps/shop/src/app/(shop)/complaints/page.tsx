'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, MessageSquareWarning, Plus, Calendar } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth';
import { getMyComplaints, type Complaint, type ComplaintStatus } from '@/lib/complaints';
import { formatDate } from '@/lib/utils';

const LIMIT = 20;

const STATUS_CONFIG: Record<ComplaintStatus, { label: string; variant: 'warning' | 'default' | 'success' | 'secondary' }> = {
  open: { label: 'เปิด', variant: 'warning' },
  in_progress: { label: 'กำลังดำเนินการ', variant: 'default' },
  resolved: { label: 'แก้ไขแล้ว', variant: 'success' },
  closed: { label: 'ปิดแล้ว', variant: 'secondary' },
};

const CATEGORY_LABELS: Record<string, string> = {
  service: 'บริการ',
  product_quality: 'คุณภาพสินค้า',
  delivery: 'การจัดส่ง',
  billing: 'การเรียกเก็บเงิน',
  other: 'อื่นๆ',
};

export default function ComplaintsPage() {
  const { accessToken } = useAuthStore();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const fetchComplaints = useCallback(
    async (reset = false, currentPage = 1) => {
      if (!accessToken) return;
      setLoading(true);
      try {
        const res = await getMyComplaints(accessToken, currentPage, LIMIT);
        const data = res.data ?? [];
        setComplaints((prev) => (reset ? data : [...prev, ...data]));
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
    fetchComplaints(true, 1);
  }, [fetchComplaints]);

  if (!accessToken) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-muted-foreground">
        <p className="text-sm">กรุณาเข้าสู่ระบบเพื่อดูข้อร้องเรียน</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4">
        <div>
          <h1 className="text-lg font-bold">ข้อร้องเรียน</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">ติดตามสถานะข้อร้องเรียนของคุณ</p>
        </div>
        <Link href="/complaints/new">
          <Button size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            แจ้งปัญหา
          </Button>
        </Link>
      </div>

      {/* List */}
      <div className="space-y-3 px-4">
        {loading && complaints.length === 0 ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : complaints.length > 0 ? (
          <>
            {complaints.map((c) => {
              const statusCfg = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.open;
              return (
                <div
                  key={c.id}
                  className="rounded-xl border p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">
                          {CATEGORY_LABELS[c.category] ?? c.category}
                        </span>
                        <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">
                        {c.description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(c.createdAt)}
                    </span>
                    {c.images && (c.images as string[]).length > 0 && (
                      <span>{(c.images as string[]).length} รูปภาพ</span>
                    )}
                    {c.orderId && <span>มีออเดอร์อ้างอิง</span>}
                  </div>

                  {c.resolution && (
                    <div className="mt-3 rounded-lg bg-muted/50 p-2.5">
                      <p className="text-[10px] font-medium text-muted-foreground">การแก้ไข</p>
                      <p className="mt-0.5 line-clamp-2 text-xs">{c.resolution}</p>
                    </div>
                  )}
                </div>
              );
            })}

            {hasMore && (
              <button
                onClick={() => fetchComplaints(false, page)}
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
            <MessageSquareWarning className="h-12 w-12 opacity-30" />
            <p className="text-sm">ยังไม่มีข้อร้องเรียน</p>
            <Link href="/complaints/new" className="text-xs text-primary underline">
              แจ้งปัญหาใหม่
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
