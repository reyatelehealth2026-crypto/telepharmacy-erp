'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useApi } from '@/lib/use-api';
import { PageHeader } from '@/components/page-header';
import {
  Loader2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Activity,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardPayload {
  summary: {
    total: number;
    received: number;
    processing: number;
    processed: number;
    failed: number;
    duplicates: number;
    today: number;
    failedLast24h: number;
  };
  duplicateHitRate: number;
  failureRate: number;
  trend: Array<{
    date: string;
    total: number;
    failed: number;
    duplicateHits: number;
  }>;
  recentFailures: Array<{
    id: string;
    eventType: string;
    receivedAt: string;
    errorMessage: string | null;
    lineUserId: string | null;
  }>;
}

interface ListPayload {
  items: Array<{
    id: string;
    eventType: string;
    status: string;
    lineUserId: string | null;
    receivedAt: string;
    errorMessage: string | null;
    duplicateCount: number;
    replayedFromEventId: string | null;
  }>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const STATUS_OPTIONS = [
  { value: '', label: 'ทุกสถานะ' },
  { value: 'received', label: 'received' },
  { value: 'processing', label: 'processing' },
  { value: 'processed', label: 'processed' },
  { value: 'failed', label: 'failed' },
];

function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

export default function LineWebhooksPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [eventType, setEventType] = useState('');
  const [lineUserId, setLineUserId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [failedOnly, setFailedOnly] = useState(false);
  const limit = 25;

  const listPath = useMemo(() => {
    const p = new URLSearchParams();
    p.set('page', String(page));
    p.set('limit', String(limit));
    if (status) p.set('status', status);
    if (eventType.trim()) p.set('eventType', eventType.trim());
    if (lineUserId.trim()) p.set('lineUserId', lineUserId.trim());
    if (from) p.set('from', from);
    if (to) p.set('to', to);
    if (failedOnly) p.set('failedOnly', 'true');
    return `/v1/staff/line/webhooks?${p.toString()}`;
  }, [page, status, eventType, lineUserId, from, to, failedOnly]);

  const { data: dashboard, mutate: mutateDash } = useApi<DashboardPayload>(
    '/v1/staff/line/webhooks/dashboard',
    { refreshInterval: 60000 },
  );

  const { data: list, mutate: mutateList } = useApi<ListPayload>(listPath, {
    refreshInterval: 15000,
  });

  function resetFilters() {
    setStatus('');
    setEventType('');
    setLineUserId('');
    setFrom('');
    setTo('');
    setFailedOnly(false);
    setPage(1);
  }

  const maxTrendFailed = Math.max(1, ...(dashboard?.trend.map((t) => t.failed) ?? [1]));

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title="LINE Webhook"
          description="สถิติ ค้นหา และ replay เหตุการณ์ที่ล้มเหลว (audit ในฐานข้อมูล)"
        />
        <button
          type="button"
          onClick={() => {
            void mutateDash();
            void mutateList();
          }}
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted"
        >
          <RefreshCw className="h-4 w-4" />
          รีเฟรช
        </button>
      </div>

      {!dashboard ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            <StatCard label="ทั้งหมด (แถว log)" value={dashboard.summary.total} />
            <StatCard label="สำเร็จ (processed)" value={dashboard.summary.processed} tone="ok" />
            <StatCard label="ล้มเหลว" value={dashboard.summary.failed} tone="bad" />
            <StatCard label="ล้มเหลว 24 ชม." value={dashboard.summary.failedLast24h} tone="bad" />
            <StatCard label="วันนี้" value={dashboard.summary.today} />
            <StatCard label="กำลังประมวลผล" value={dashboard.summary.processing} />
            <StatCard label="ครั้งซ้ำ (duplicate hits)" value={dashboard.summary.duplicates} />
            <StatCard label="อัตราล้มเหลวโดยรวม" value={pct(dashboard.failureRate)} raw />
            <StatCard label="สัดส่วน duplicate / inbound" value={pct(dashboard.duplicateHitRate)} raw />
          </div>

          <div className="rounded-xl border bg-card p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium">
              <Activity className="h-4 w-4" />
              แนวโน้ม 14 วัน (failed / วัน)
            </div>
            <div className="flex h-36 items-end gap-1">
              {dashboard.trend.length === 0 ? (
                <p className="text-sm text-muted-foreground">ยังไม่มีข้อมูล</p>
              ) : (
                dashboard.trend.map((t) => {
                  const h = Math.round((t.failed / maxTrendFailed) * 100);
                  return (
                    <div
                      key={String(t.date)}
                      className="flex min-w-0 flex-1 flex-col items-center gap-1"
                      title={`${t.date}: failed ${t.failed}, total ${t.total}, dup hits ${t.duplicateHits}`}
                    >
                      <div className="flex w-full flex-1 items-end justify-center">
                        <div
                          className="w-[70%] max-w-[24px] rounded-t bg-rose-500/80"
                          style={{ height: `${Math.max(h, 4)}%` }}
                        />
                      </div>
                      <span className="truncate text-[9px] text-muted-foreground">
                        {String(t.date).slice(5)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {dashboard.recentFailures.length > 0 && (
            <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4 dark:border-rose-900 dark:bg-rose-950/30">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-rose-900 dark:text-rose-100">
                <AlertTriangle className="h-4 w-4" />
                ล้มเหลวล่าสุด
              </div>
              <ul className="space-y-2 text-sm">
                {dashboard.recentFailures.map((f) => (
                  <li key={f.id} className="flex flex-wrap items-start justify-between gap-2 border-b border-rose-200/60 pb-2 last:border-0 dark:border-rose-800">
                    <div>
                      <Link
                        href={`/dashboard/line-webhooks/${f.id}`}
                        className="font-mono text-xs text-primary hover:underline"
                      >
                        {f.id.slice(0, 8)}…
                      </Link>
                      <span className="ml-2 text-muted-foreground">{f.eventType}</span>
                      <p className="mt-0.5 text-xs text-rose-800 dark:text-rose-200">
                        {f.errorMessage ?? '—'}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {new Date(f.receivedAt).toLocaleString('th-TH')}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      <div className="rounded-xl border bg-card">
        <div className="border-b p-4">
          <h2 className="text-sm font-semibold">ค้นหาเหตุการณ์</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <label className="text-xs">
              <span className="text-muted-foreground">สถานะ</span>
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value || 'all'} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs">
              <span className="text-muted-foreground">event type</span>
              <input
                value={eventType}
                onChange={(e) => {
                  setEventType(e.target.value);
                  setPage(1);
                }}
                placeholder="message, follow, …"
                className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm"
              />
            </label>
            <label className="text-xs">
              <span className="text-muted-foreground">line user id</span>
              <input
                value={lineUserId}
                onChange={(e) => {
                  setLineUserId(e.target.value);
                  setPage(1);
                }}
                className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 font-mono text-xs"
              />
            </label>
            <label className="flex items-end gap-2 text-xs">
              <input
                type="checkbox"
                checked={failedOnly}
                onChange={(e) => {
                  setFailedOnly(e.target.checked);
                  setPage(1);
                }}
                className="rounded border-input"
              />
              <span>เฉพาะ failed</span>
            </label>
            <label className="text-xs">
              <span className="text-muted-foreground">จากวันที่</span>
              <input
                type="date"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  setPage(1);
                }}
                className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm"
              />
            </label>
            <label className="text-xs">
              <span className="text-muted-foreground">ถึงวันที่</span>
              <input
                type="date"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  setPage(1);
                }}
                className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm"
              />
            </label>
            <div className="flex items-end">
              <button
                type="button"
                onClick={resetFilters}
                className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
              >
                ล้างตัวกรอง
              </button>
            </div>
          </div>
        </div>

        {!list ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">รับเมื่อ</th>
                    <th className="px-3 py-2">ประเภท</th>
                    <th className="px-3 py-2">สถานะ</th>
                    <th className="px-3 py-2">LINE user</th>
                    <th className="px-3 py-2">dup</th>
                    <th className="px-3 py-2">replay</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {list.items.map((row) => (
                    <tr key={row.id} className="border-b border-border/60 hover:bg-muted/30">
                      <td className="whitespace-nowrap px-3 py-2 text-xs">
                        {new Date(row.receivedAt).toLocaleString('th-TH')}
                      </td>
                      <td className="px-3 py-2">{row.eventType}</td>
                      <td className="px-3 py-2">
                        <StatusPill status={row.status} />
                      </td>
                      <td className="max-w-[140px] truncate px-3 py-2 font-mono text-xs">
                        {row.lineUserId ?? '—'}
                      </td>
                      <td className="px-3 py-2 text-xs">{row.duplicateCount}</td>
                      <td className="px-3 py-2 text-xs">
                        {row.replayedFromEventId ? (
                          <Link
                            href={`/dashboard/line-webhooks/${row.replayedFromEventId}`}
                            className="text-primary hover:underline"
                          >
                            จาก {row.replayedFromEventId.slice(0, 6)}…
                          </Link>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Link
                          href={`/dashboard/line-webhooks/${row.id}`}
                          className="text-primary text-xs hover:underline"
                        >
                          รายละเอียด
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3 text-sm">
              <span className="text-muted-foreground">
                ทั้งหมด {list.total} รายการ · หน้า {list.page}/{list.totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="inline-flex items-center gap-1 rounded-md border px-2 py-1 disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" /> ก่อนหน้า
                </button>
                <button
                  type="button"
                  disabled={page >= list.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="inline-flex items-center gap-1 rounded-md border px-2 py-1 disabled:opacity-40"
                >
                  ถัดไป <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
  raw,
}: {
  label: string;
  value: string | number;
  tone?: 'ok' | 'bad';
  raw?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-lg border p-3',
        tone === 'ok' && 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900',
        tone === 'bad' && 'border-rose-200 bg-rose-50/50 dark:border-rose-900',
      )}
    >
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className={cn('mt-1 text-xl font-semibold tabular-nums', !raw && 'tracking-tight')}>
        {typeof value === 'number' && !raw ? value.toLocaleString('th-TH') : value}
      </p>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const cls =
    status === 'failed'
      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200'
      : status === 'processed'
        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
        : status === 'processing'
          ? 'bg-amber-100 text-amber-900'
          : 'bg-slate-100 text-slate-700';
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', cls)}>
      {status === 'processed' && <CheckCircle2 className="mr-0.5 inline h-3 w-3" />}
      {status === 'failed' && <AlertTriangle className="mr-0.5 inline h-3 w-3" />}
      {status}
    </span>
  );
}
