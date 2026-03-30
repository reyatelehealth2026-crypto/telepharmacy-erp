'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  ClipboardList,
  AlertTriangle,
  Clock,
  CheckCircle,
  Eye,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { StatCard } from '@/components/stat-card';
import { PageHeader } from '@/components/page-header';
import { useApi } from '@/lib/use-api';
import { cn } from '@/lib/utils';
import { SLA_MINUTES } from '@/lib/auth-types';

interface QueueItem {
  id: string;
  rxNo: string;
  patientId: string;
  status: string;
  source: string;
  aiPriority: string;
  aiChecksPassed: boolean | null;
  aiChecksResult: { hasIssues?: boolean; overallRisk?: string; alerts?: unknown[] } | null;
  ocrStatus: string;
  createdAt: string;
  verifiedAt: string | null;
}

interface QueueResponse {
  data: QueueItem[];
  page: number;
  limit: number;
  total: number;
}

const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700 border-red-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  low: 'bg-green-100 text-green-700 border-green-200',
};

const STATUS_LABELS: Record<string, string> = {
  received: 'รอ OCR',
  ai_processing: 'AI กำลังวิเคราะห์',
  ai_completed: 'รอเภสัชกร',
  pharmacist_reviewing: 'กำลังตรวจ',
};

function getWaitMinutes(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
}

function SlaCountdown({ priority, createdAt }: { priority: string; createdAt: string }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(interval);
  }, []);

  const sla = SLA_MINUTES[priority] ?? 60;
  const elapsed = (now - new Date(createdAt).getTime()) / 60000;
  const remaining = Math.max(0, sla - elapsed);
  const isOverdue = remaining <= 0;
  const isWarning = remaining > 0 && remaining <= 5;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs font-medium',
        isOverdue && 'text-red-600',
        isWarning && 'text-amber-600',
        !isOverdue && !isWarning && 'text-muted-foreground',
      )}
    >
      <Clock className="h-3 w-3" />
      {isOverdue
        ? `เกิน ${Math.floor(elapsed - sla)} นาที`
        : `เหลือ ${Math.floor(remaining)} นาที`}
    </span>
  );
}

type PriorityFilter = 'all' | 'urgent' | 'high' | 'medium' | 'low';

export default function PharmacistQueuePage() {
  const [filter, setFilter] = useState<PriorityFilter>('all');

  const { data: queue, isLoading, mutate } = useApi<QueueResponse>(
    '/v1/prescriptions/queue?limit=50',
  );

  const items = useMemo(() => {
    if (!queue?.data) return [];
    const sorted = [...queue.data].sort(
      (a, b) => (PRIORITY_ORDER[a.aiPriority] ?? 9) - (PRIORITY_ORDER[b.aiPriority] ?? 9),
    );
    if (filter === 'all') return sorted;
    return sorted.filter((item) => item.aiPriority === filter);
  }, [queue, filter]);

  const counts = useMemo(() => {
    const all = queue?.data ?? [];
    return {
      all: all.length,
      urgent: all.filter((i) => i.aiPriority === 'urgent').length,
      high: all.filter((i) => i.aiPriority === 'high').length,
      medium: all.filter((i) => i.aiPriority === 'medium').length,
      low: all.filter((i) => i.aiPriority === 'low').length,
    };
  }, [queue]);

  const urgentHigh = counts.urgent + counts.high;

  // Auto-refresh every 15 seconds
  useEffect(() => {
    const interval = setInterval(() => mutate(), 15_000);
    return () => clearInterval(interval);
  }, [mutate]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="คิวใบสั่งยา"
        description="ตรวจสอบและ verify ใบสั่งยาจากผู้ป่วย"
      >
        <button
          onClick={() => mutate()}
          className="inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors hover:bg-muted"
        >
          <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          รีเฟรช
        </button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="รอตรวจสอบ"
          value={isLoading ? '...' : String(counts.all)}
          icon={ClipboardList}
          description={urgentHigh > 0 ? `${urgentHigh} urgent/high` : undefined}
        />
        <StatCard
          title="Urgent / High"
          value={isLoading ? '...' : String(urgentHigh)}
          icon={AlertTriangle}
          description="ต้องดำเนินการภายใน 15 นาที"
        />
        <StatCard
          title="เวลารอเฉลี่ย"
          value={
            isLoading
              ? '...'
              : items.length > 0
                ? `${Math.round(items.reduce((s, i) => s + getWaitMinutes(i.createdAt), 0) / items.length)} นาที`
                : '0 นาที'
          }
          icon={Clock}
        />
        <StatCard
          title="กำลังตรวจ"
          value={
            isLoading
              ? '...'
              : String(items.filter((i) => i.status === 'pharmacist_reviewing').length)
          }
          icon={CheckCircle}
        />
      </div>

      {/* Priority Filter Tabs */}
      <div className="flex gap-2">
        {(
          [
            { key: 'all', label: 'ทั้งหมด' },
            { key: 'urgent', label: 'Urgent' },
            { key: 'high', label: 'High' },
            { key: 'medium', label: 'Medium' },
            { key: 'low', label: 'Low' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
              filter === tab.key
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted',
            )}
          >
            {tab.label}
            <span
              className={cn(
                'rounded-full px-1.5 py-0.5 text-xs',
                filter === tab.key
                  ? 'bg-white/20 text-white'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              {counts[tab.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Queue Table */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                <th className="px-4 py-3 font-medium">เลข Rx</th>
                <th className="px-4 py-3 font-medium">Priority</th>
                <th className="px-4 py-3 font-medium">SLA</th>
                <th className="px-4 py-3 font-medium">รอ (นาที)</th>
                <th className="px-4 py-3 font-medium">Safety</th>
                <th className="px-4 py-3 font-medium">OCR</th>
                <th className="px-4 py-3 font-medium">สถานะ</th>
                <th className="px-4 py-3 font-medium">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                    <p className="mt-2">กำลังโหลดคิว...</p>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    <CheckCircle className="mx-auto h-8 w-8 text-green-500" />
                    <p className="mt-2 font-medium">ไม่มีใบสั่งยารอตรวจสอบ</p>
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="border-b transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs">{item.rxNo}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-block rounded-full border px-2 py-0.5 text-xs font-semibold capitalize',
                          PRIORITY_COLORS[item.aiPriority] ?? 'bg-muted',
                        )}
                      >
                        {item.aiPriority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <SlaCountdown priority={item.aiPriority} createdAt={item.createdAt} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {getWaitMinutes(item.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      {item.aiChecksResult?.hasIssues ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          {(item.aiChecksResult.alerts as unknown[])?.length ?? 0} alerts
                        </span>
                      ) : item.aiChecksPassed === true ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                          <CheckCircle className="h-3.5 w-3.5" />
                          ผ่าน
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">รอ AI</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'text-xs',
                          item.ocrStatus === 'completed' && 'text-green-600',
                          item.ocrStatus === 'pending' && 'text-amber-600',
                          item.ocrStatus === 'failed' && 'text-red-600',
                        )}
                      >
                        {item.ocrStatus === 'completed' ? 'สำเร็จ' : item.ocrStatus === 'pending' ? 'กำลังประมวลผล' : item.ocrStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-muted-foreground">
                        {STATUS_LABELS[item.status] ?? item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/pharmacist/${item.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        ตรวจสอบ
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
