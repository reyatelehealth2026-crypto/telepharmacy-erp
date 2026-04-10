'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useApi } from '@/lib/use-api';
import { api } from '@/lib/api-client';
import { PageHeader } from '@/components/page-header';
import { useAuth } from '@/lib/auth-context';
import {
  Loader2,
  ArrowLeft,
  RotateCcw,
  AlertTriangle,
  ExternalLink,
  Copy,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface WebhookEventRow {
  id: string;
  providerEventKey: string;
  dedupeKey: string;
  eventType: string;
  lineUserId: string | null;
  patientId: string | null;
  sessionId: string | null;
  status: string;
  payload: unknown;
  processingData: Record<string, unknown>;
  errorMessage: string | null;
  duplicateCount: number;
  replayedFromEventId: string | null;
  receivedAt: string;
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

function redactLinePayload(payload: unknown): unknown {
  try {
    const walk = (x: unknown): unknown => {
      if (x === null || x === undefined) return x;
      if (Array.isArray(x)) return x.map(walk);
      if (typeof x === 'object') {
        const o = x as Record<string, unknown>;
        const n: Record<string, unknown> = {};
        for (const k of Object.keys(o)) {
          if (k === 'replyToken' && typeof o[k] === 'string') {
            n[k] = '«redacted»';
          } else {
            n[k] = walk(o[k]);
          }
        }
        return n;
      }
      return x;
    };
    return walk(JSON.parse(JSON.stringify(payload)));
  } catch {
    return payload;
  }
}

export default function LineWebhookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;
  const { hasRole } = useAuth();
  const canReplay = hasRole('super_admin', 'pharmacist', 'customer_service');

  const { data, error, mutate } = useApi<WebhookEventRow>(`/v1/staff/line/webhooks/${eventId}`, {
    refreshInterval: 8000,
  });

  const [replaying, setReplaying] = useState(false);
  const [replayMsg, setReplayMsg] = useState<string | null>(null);

  async function handleReplay() {
    if (!data || data.status !== 'failed') return;
    if (
      !confirm(
        'Replay จะสร้างแถว log ใหม่และรันประมวลผลซ้ำจาก payload เดิม\nอาจส่งผลซ้ำทาง LINE (เช่น ข้อความตอบกลับ) — ใช้เมื่อแก้บั๊กแล้วเท่านั้น',
      )
    ) {
      return;
    }
    setReplaying(true);
    setReplayMsg(null);
    try {
      const { data: newRow } = await api.post<WebhookEventRow>(
        `/v1/staff/line/webhooks/${data.id}/replay`,
        {},
      );
      setReplayMsg('Replay สำเร็จ — ไปดูแถวใหม่');
      if (newRow?.id) {
        router.push(`/dashboard/line-webhooks/${newRow.id}`);
      }
    } catch (e: unknown) {
      setReplayMsg(e instanceof Error ? e.message : 'Replay ล้มเหลว');
    } finally {
      setReplaying(false);
      void mutate();
    }
  }

  function copyPayload() {
    const text = JSON.stringify(redactLinePayload(data?.payload ?? {}), null, 2);
    void navigator.clipboard.writeText(text);
  }

  if (error) {
    return (
      <div className="p-6">
        <p className="text-destructive">โหลดไม่สำเร็จ</p>
        <Link href="/dashboard/line-webhooks" className="mt-4 inline-block text-primary hover:underline">
          ← กลับรายการ
        </Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const safePayload = redactLinePayload(data.payload);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/dashboard/line-webhooks"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> รายการ webhook
        </Link>
      </div>

      <PageHeader title={`Webhook ${data.id.slice(0, 8)}…`} description={data.eventType} />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-4 text-sm">
          <h3 className="mb-3 font-semibold">สถานะ</h3>
          <dl className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-x-2 gap-y-2 text-xs">
            <dt className="text-muted-foreground">status</dt>
            <dd className="font-mono">{data.status}</dd>
            <dt className="text-muted-foreground">receivedAt</dt>
            <dd>{new Date(data.receivedAt).toLocaleString('th-TH')}</dd>
            <dt className="text-muted-foreground">processedAt</dt>
            <dd>{data.processedAt ? new Date(data.processedAt).toLocaleString('th-TH') : '—'}</dd>
            <dt className="text-muted-foreground">duplicateCount</dt>
            <dd>{data.duplicateCount}</dd>
            <dt className="text-muted-foreground">lineUserId</dt>
            <dd className="break-all font-mono text-[11px]">{data.lineUserId ?? '—'}</dd>
            <dt className="text-muted-foreground">patientId</dt>
            <dd>
              {data.patientId ? (
                <Link
                  href={`/dashboard/patients/${data.patientId}`}
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  {data.patientId} <ExternalLink className="h-3 w-3" />
                </Link>
              ) : (
                '—'
              )}
            </dd>
            <dt className="text-muted-foreground">sessionId</dt>
            <dd>
              {data.sessionId ? (
                <Link
                  href={`/dashboard/inbox`}
                  className="text-primary hover:underline"
                  title="เปิดกล่องข้อความแล้วเลือกเซสชัน"
                >
                  {data.sessionId.slice(0, 8)}… (inbox)
                </Link>
              ) : (
                '—'
              )}
            </dd>
            <dt className="text-muted-foreground">replayedFromEventId</dt>
            <dd>
              {data.replayedFromEventId ? (
                <Link
                  href={`/dashboard/line-webhooks/${data.replayedFromEventId}`}
                  className="text-primary hover:underline"
                >
                  {data.replayedFromEventId}
                </Link>
              ) : (
                '—'
              )}
            </dd>
          </dl>
        </div>

        <div className="rounded-xl border bg-card p-4 text-sm">
          <h3 className="mb-3 font-semibold">Audit replay</h3>
          <p className="text-xs text-muted-foreground">
            เมื่อกด Replay ระบบจะบันทึก <code className="rounded bg-muted px-1">replayByStaffId</code> และเวลาใน{' '}
            <code className="rounded bg-muted px-1">processingData</code> ของแถวใหม่ และตั้ง{' '}
            <code className="rounded bg-muted px-1">replayedFromEventId</code>
          </p>
          <pre className="mt-2 max-h-40 overflow-auto rounded-md bg-muted/50 p-2 text-[11px]">
            {JSON.stringify(data.processingData ?? {}, null, 2)}
          </pre>
          {data.status === 'failed' && data.errorMessage && (
            <div
              className={cn(
                'mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-950 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100',
              )}
            >
              <div className="mb-1 flex items-center gap-1 font-semibold">
                <AlertTriangle className="h-3.5 w-3.5" /> Error
              </div>
              <pre className="whitespace-pre-wrap font-sans">{data.errorMessage}</pre>
            </div>
          )}
          {canReplay && data.status === 'failed' && (
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                disabled={replaying}
                onClick={() => void handleReplay()}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {replaying ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                Replay (สร้างแถวใหม่ + ประมวลผล)
              </button>
              {replayMsg && <p className="text-xs text-muted-foreground">{replayMsg}</p>}
            </div>
          )}
          {!canReplay && data.status === 'failed' && (
            <p className="mt-3 text-xs text-muted-foreground">สิทธิ์ของคุณไม่สามารถ replay ได้</p>
          )}
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold">Payload (ซ่อน replyToken)</h3>
          <button
            type="button"
            onClick={copyPayload}
            className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-muted"
          >
            <Copy className="h-3 w-3" /> คัดลอก JSON
          </button>
        </div>
        <pre className="max-h-[480px] overflow-auto rounded-lg bg-muted/40 p-3 text-[11px] leading-relaxed">
          {JSON.stringify(safePayload, null, 2)}
        </pre>
      </div>
    </div>
  );
}
