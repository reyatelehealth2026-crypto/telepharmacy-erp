'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth';
import { useAuthGuard } from '@/lib/use-auth-guard';
import { getMyPrescriptions, type Prescription, getRxStatusConfig } from '@/lib/prescriptions';

export default function RxStatusPage() {
  const router = useRouter();
  const { loading: authLoading } = useAuthGuard();
  const { accessToken } = useAuthStore();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchPrescriptions();
  }, [accessToken]);

  const fetchPrescriptions = async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await getMyPrescriptions(accessToken, 1, 20);
      setPrescriptions(res.data);
    } catch {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPrescriptions();
    setRefreshing(false);
  };

  if (authLoading || loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="pb-20">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="rounded-full p-1 hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold">ใบสั่งยาของฉัน</h1>
            <p className="text-xs text-muted-foreground">{prescriptions.length} รายการ</p>
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

      <div className="space-y-3 px-4">
        {prescriptions.map((rx) => {
          const statusConfig = getRxStatusConfig(rx.status);
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
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusConfig.color}`}>
                    {statusConfig.label}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(rx.createdAt).toLocaleDateString('th-TH')}
                  {rx.itemCount > 0 && ` · ${rx.itemCount} รายการ`}
                  {rx.totalAmount != null && ` · ${rx.totalAmount.toLocaleString()} ฿`}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </Link>
          );
        })}

        {prescriptions.length === 0 && (
          <div className="py-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground/30" />
            <p className="mt-2 text-sm text-muted-foreground">ยังไม่มีใบสั่งยา</p>
            <Link
              href="/rx/upload"
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              ส่งใบสั่งยา
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
