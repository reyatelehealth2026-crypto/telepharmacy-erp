'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useApi } from '@/lib/use-api';
import { api } from '@/lib/api-client';
import { PageHeader } from '@/components/page-header';
import {
  Inbox,
  Send,
  Loader2,
  User,
  CheckCircle,
  UserCheck,
  AlertCircle,
  Phone,
  ShieldAlert,
  ShieldCheck,
  StickyNote,
  RotateCcw,
  Tag,
  Activity,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PatientTagRow {
  id: string;
  slug: string;
  label: string;
  color: string | null;
}

interface ChatSession {
  id: string;
  patientId: string;
  lineUserId: string | null;
  patientNo: string | null;
  sessionType: string;
  status: string;
  entryIntent: string | null;
  queueStatus: string | null;
  priority: string | null;
  assignedTo: string | null;
  transferredReason: string | null;
  messageCount: number;
  firstResponseAt: string | null;
  lastInboundAt: string | null;
  lastOutboundAt: string | null;
  lastStaffReadAt: string | null;
  followUpAt: string | null;
  reopenedAt: string | null;
  updatedAt: string;
  createdAt: string;
  patientFirstName: string;
  patientLastName: string;
  patientPhone: string | null;
  patientBirthDate: string | null;
  lineContactState: string | null;
  lineJourneyStep: string | null;
  isRegistered: boolean;
  hasUnread: boolean;
  tags?: PatientTagRow[];
  lastMessage: {
    content: string;
    role: string;
    messageKind?: string;
    createdAt: string;
  } | null;
}

interface ChatMessage {
  id: string;
  sessionId: string;
  role: string;
  messageKind?: string | null;
  content: string | null;
  messageType: string | null;
  createdAt: string;
  sentByStaff: string | null;
  metadata?: Record<string, unknown> | null;
}

interface CustomerSummary {
  patientId: string;
  patientNo: string | null;
  name: string;
  phone: string | null;
  isRegistered: boolean;
  lineContactState: string | null;
  lineJourneyStep: string | null;
  entryIntent: string | null;
  queueStatus: string | null;
  priority: string | null;
  tags?: PatientTagRow[];
}

interface QuickReplyRow {
  id: string;
  title: string;
  body: string;
  sortOrder: number;
  isActive: boolean;
}

interface ClinicalSnapshot {
  patientId: string;
  patientNo: string | null;
  name: string;
  phone: string | null;
  lineLinkedAt: string | null;
  lineContactState: string | null;
  lineJourneyStep: string | null;
  allergies: string[];
  chronicConditions: string[];
  currentMedicationCount: number;
  activeReminderCount: number;
  loyaltyPoints: number | null;
}

interface TimelineItemRow {
  id: string;
  kind: string;
  at: string;
  title: string;
  subtitle?: string;
  meta?: Record<string, unknown>;
}

interface NextActionRow {
  id: string;
  kind: string;
  severity: 'high' | 'medium' | 'low';
  label: string;
  href?: string;
}

interface Customer360Payload {
  sessionId: string;
  clinical: ClinicalSnapshot;
  timeline: TimelineItemRow[];
  nextActions: NextActionRow[];
}

const INTENT_LABELS: Record<string, string> = {
  consult: 'ปรึกษาเภสัชกร',
  register: 'สมัครสมาชิก',
  link_account: 'เชื่อมบัญชี',
  rx_upload: 'ใบสั่งยา',
  order_tracking: 'ติดตามออเดอร์',
  product_search: 'หาสินค้า',
  other: 'ทั่วไป',
};

const QUEUE_LABELS: Record<string, string> = {
  self_service: 'Self-service',
  needs_human: 'รอตอบ',
  assigned: 'รับเรื่องแล้ว',
  resolved: 'ปิดแล้ว',
};

const CONTACT_STATE_LABELS: Record<string, string> = {
  new_unregistered: 'ยังไม่ลงทะเบียน',
  stub_unfinished: 'ข้อมูลยังไม่ครบ',
  link_pending: 'รอเชื่อมบัญชี',
  linked_returning: 'สมาชิกเดิม',
};

const TIMELINE_KIND_LABELS: Record<string, string> = {
  chat_session: 'แชท',
  prescription: 'ใบสั่งยา',
  order: 'ออเดอร์',
  consultation: 'ปรึกษา',
  complaint: 'ร้องเรียน',
  adherence: 'ยาที่ติดตาม',
  notification: 'แจ้งเตือน',
};

function formatSessionTimestamp(primary?: string | null, fallback?: string | null) {
  const value = primary || fallback;
  if (!value || isNaN(new Date(value).getTime())) {
    return '-';
  }

  return new Date(value).toLocaleString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: 'short',
  });
}

function formatTime(value?: string | null) {
  if (!value || isNaN(new Date(value).getTime())) {
    return '';
  }

  return new Date(value).toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function followUpIsDue(iso: string | null) {
  if (!iso || isNaN(new Date(iso).getTime())) return false;
  return new Date(iso) <= new Date();
}

function toDatetimeLocalValue(iso: string | null) {
  if (!iso || isNaN(new Date(iso).getTime())) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function MiniBadge({ label, className }: { label: string; className: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium', className)}>
      {label}
    </span>
  );
}

export default function InboxPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('active');
  const [queueFilter, setQueueFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'normal' | 'urgent'>('all');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [tagFilter, setTagFilter] = useState('');
  const [followUpFilter, setFollowUpFilter] = useState<'all' | 'due' | 'scheduled' | 'none'>('all');

  const inboxPath = useMemo(() => {
    const p = new URLSearchParams();
    p.set('status', statusFilter);
    p.set('limit', '50');
    if (queueFilter !== 'all') p.set('queueStatus', queueFilter);
    if (priorityFilter !== 'all') p.set('priority', priorityFilter);
    if (unreadOnly) p.set('unreadOnly', 'true');
    if (tagFilter) p.set('tagId', tagFilter);
    if (followUpFilter !== 'all') p.set('followUp', followUpFilter);
    return `/v1/staff/line/inbox?${p.toString()}`;
  }, [statusFilter, queueFilter, priorityFilter, unreadOnly, tagFilter, followUpFilter]);

  const { data: sessions, mutate: mutateSessions } = useApi<ChatSession[]>(
    inboxPath,
    { refreshInterval: 5000 },
  );

  const { data: tagOptions } = useApi<PatientTagRow[]>('/v1/staff/line/patient-tags', {
    refreshInterval: 60000,
  });

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="shrink-0 px-6 pt-4 pb-2">
        <PageHeader title="กล่องข้อความ" description="สนทนากับลูกค้าผ่าน LINE" />
      </div>

      <div className="flex min-h-0 flex-1 gap-0 border-t">
        <div className="w-80 shrink-0 overflow-y-auto border-r bg-muted/30">
          <div className="sticky top-0 z-10 space-y-2 border-b bg-background p-2">
            <div className="flex gap-1">
              {['active', 'resolved'].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setStatusFilter(s);
                    setSelectedId(null);
                  }}
                  className={cn(
                    'rounded-md px-3 py-1 text-xs font-medium',
                    statusFilter === s
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted',
                  )}
                >
                  {s === 'active' ? 'เปิดอยู่' : 'แก้ไขแล้ว'}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1">
              {[
                { value: 'all', label: 'ทั้งหมด' },
                { value: 'needs_human', label: 'รอตอบ' },
                { value: 'assigned', label: 'รับเรื่องแล้ว' },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => {
                    setQueueFilter(item.value);
                    setSelectedId(null);
                  }}
                  className={cn(
                    'rounded-full border px-2 py-1 text-[11px] font-medium',
                    queueFilter === item.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background text-muted-foreground hover:bg-muted',
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1">
              {[
                { value: 'all' as const, label: 'ความสำคัญ: ทั้งหมด' },
                { value: 'normal' as const, label: 'ปกติ' },
                { value: 'urgent' as const, label: 'ด่วน' },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => {
                    setPriorityFilter(item.value);
                    setSelectedId(null);
                  }}
                  className={cn(
                    'rounded-full border px-2 py-1 text-[10px] font-medium',
                    priorityFilter === item.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background text-muted-foreground hover:bg-muted',
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-[11px] text-muted-foreground">
              <input
                type="checkbox"
                checked={unreadOnly}
                onChange={(e) => {
                  setUnreadOnly(e.target.checked);
                  setSelectedId(null);
                }}
                className="rounded border-input"
              />
              เฉพาะที่ยังไม่ได้อ่าน
            </label>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-medium text-muted-foreground">แท็ก</span>
              <select
                value={tagFilter}
                onChange={(e) => {
                  setTagFilter(e.target.value);
                  setSelectedId(null);
                }}
                className="w-full rounded-md border bg-background px-2 py-1 text-[11px]"
              >
                <option value="">ทั้งหมด</option>
                {(tagOptions ?? []).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap gap-1">
              {[
                { value: 'all' as const, label: 'นัด: ทั้งหมด' },
                { value: 'due' as const, label: 'ถึงกำหนด' },
                { value: 'scheduled' as const, label: 'ยังไม่ถึง' },
                { value: 'none' as const, label: 'ไม่มีนัด' },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => {
                    setFollowUpFilter(item.value);
                    setSelectedId(null);
                  }}
                  className={cn(
                    'rounded-full border px-2 py-0.5 text-[10px] font-medium',
                    followUpFilter === item.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background text-muted-foreground hover:bg-muted',
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {!sessions ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              <Inbox className="mx-auto mb-2 h-8 w-8" />
              ไม่มีข้อความ
            </div>
          ) : (
            sessions.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedId(s.id)}
                className={cn(
                  'flex w-full flex-col gap-1 border-b px-4 py-3 text-left transition-colors',
                  selectedId === s.id ? 'bg-primary/10' : 'hover:bg-muted/50',
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm font-medium">
                      {s.patientFirstName} {s.patientLastName}
                    </span>
                    {s.hasUnread && <span className="h-2 w-2 shrink-0 rounded-full bg-sky-500" title="ยังไม่ได้อ่าน" />}
                  </div>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {formatSessionTimestamp(s.updatedAt, s.createdAt)}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">{s.patientNo ?? 'ไม่มีรหัสสมาชิก'}</p>
                {s.lastMessage && (
                  <p className="truncate text-xs text-muted-foreground">
                    {s.lastMessage.role === 'pharmacist' && s.lastMessage.messageKind !== 'internal_note' && '🧑‍⚕️ '}
                    {s.lastMessage.role === 'bot' && '🤖 '}
                    {(s.lastMessage.role === 'system' || s.lastMessage.messageKind === 'system_event') && '⚙️ '}
                    {s.lastMessage.content}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-1.5">
                  <MiniBadge
                    label={s.status === 'active' ? 'เปิด' : 'แก้ไขแล้ว'}
                    className={s.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}
                  />
                  <MiniBadge
                    label={QUEUE_LABELS[s.queueStatus ?? ''] ?? 'ไม่ระบุคิว'}
                    className={
                      s.queueStatus === 'needs_human'
                        ? 'bg-amber-100 text-amber-700'
                        : s.queueStatus === 'assigned'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-slate-100 text-slate-700'
                    }
                  />
                  {s.priority === 'urgent' && <MiniBadge label="ด่วน" className="bg-red-100 text-red-700" />}
                  {!s.isRegistered && <MiniBadge label="ยังไม่ลงทะเบียน" className="bg-orange-100 text-orange-700" />}
                  {s.lineContactState && (
                    <MiniBadge
                      label={CONTACT_STATE_LABELS[s.lineContactState] ?? s.lineContactState}
                      className="bg-violet-100 text-violet-700"
                    />
                  )}
                  {s.followUpAt && (
                    <MiniBadge
                      label={
                        followUpIsDue(s.followUpAt)
                          ? `ถึงกำหนด ${formatSessionTimestamp(s.followUpAt, null)}`
                          : `นัด ${formatSessionTimestamp(s.followUpAt, null)}`
                      }
                      className={followUpIsDue(s.followUpAt) ? 'bg-rose-100 text-rose-800' : 'bg-cyan-100 text-cyan-800'}
                    />
                  )}
                  {(s.tags ?? []).slice(0, 3).map((t) => (
                    <span
                      key={t.id}
                      className="rounded border border-border bg-background px-1.5 py-0 text-[9px] text-muted-foreground"
                      style={t.color ? { borderColor: t.color, color: t.color } : undefined}
                    >
                      {t.label}
                    </span>
                  ))}
                  <span className="text-[10px] text-muted-foreground">
                    {INTENT_LABELS[s.entryIntent ?? 'other'] ?? 'ทั่วไป'}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>

        {selectedId ? (
          <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              <ChatPanel sessionId={selectedId} onUpdate={() => mutateSessions()} />
            </div>
            <Customer360Panel sessionId={selectedId} />
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Inbox className="mx-auto mb-3 h-12 w-12" />
              <p className="text-sm">เลือกการสนทนาจากรายการด้านซ้าย</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Customer360Panel({ sessionId }: { sessionId: string }) {
  const { data, error } = useApi<Customer360Payload>(`/v1/staff/line/inbox/${sessionId}/customer-360`, {
    refreshInterval: 30000,
  });

  if (error) {
    return (
      <aside className="flex w-full shrink-0 flex-col border-t bg-muted/10 lg:w-[380px] lg:border-l lg:border-t-0">
        <div className="p-3 text-xs text-destructive">โหลดบริบทลูกค้าไม่สำเร็จ</div>
      </aside>
    );
  }

  if (!data) {
    return (
      <aside className="flex w-full shrink-0 flex-col border-t bg-muted/10 lg:w-[380px] lg:border-l lg:border-t-0">
        <div className="flex items-center gap-2 border-b px-3 py-2 text-sm font-medium">
          <Activity className="h-4 w-4" />
          บริบทลูกค้า
        </div>
        <div className="flex flex-1 items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </aside>
    );
  }

  const { clinical, nextActions, timeline } = data;

  return (
    <aside className="flex max-h-[46vh] w-full shrink-0 flex-col border-t bg-muted/10 lg:max-h-none lg:w-[380px] lg:border-l lg:border-t-0">
      <div className="flex items-center gap-2 border-b px-3 py-2 text-sm font-medium">
        <Activity className="h-4 w-4 text-primary" />
        บริบทลูกค้า
        <Link
          href={`/dashboard/patients/${clinical.patientId}`}
          className="ml-auto inline-flex items-center gap-0.5 text-[11px] font-normal text-primary hover:underline"
        >
          โปรไฟล์ <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      <div className="shrink-0 space-y-2 border-b px-3 py-2 text-xs">
        <p className="font-medium text-foreground">{clinical.name}</p>
        <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
          <span>แต้มสะสม</span>
          <span className="text-right text-foreground">{clinical.loyaltyPoints ?? '—'}</span>
          <span>ยาปัจจุบัน</span>
          <span className="text-right text-foreground">{clinical.currentMedicationCount} รายการ</span>
          <span>แจ้งเตือนยา</span>
          <span className="text-right text-foreground">{clinical.activeReminderCount} รายการ</span>
          <span>สถานะ LINE</span>
          <span className="text-right text-foreground">
            {clinical.lineContactState ? CONTACT_STATE_LABELS[clinical.lineContactState] ?? clinical.lineContactState : '—'}
          </span>
        </div>
        {clinical.allergies.length > 0 && (
          <div>
            <p className="mb-0.5 text-[10px] font-medium text-amber-800">แพ้ยา</p>
            <p className="text-[11px] leading-snug text-amber-950">{clinical.allergies.join(', ')}</p>
          </div>
        )}
        {clinical.chronicConditions.length > 0 && (
          <div>
            <p className="mb-0.5 text-[10px] font-medium text-slate-700">โรคเรื้อรัง</p>
            <p className="text-[11px] leading-snug">{clinical.chronicConditions.join(', ')}</p>
          </div>
        )}
      </div>

      {nextActions.length > 0 && (
        <div className="shrink-0 border-b px-3 py-2">
          <p className="mb-1.5 text-[11px] font-semibold text-foreground">งานถัดไป / ควรดู</p>
          <ul className="space-y-1.5">
            {nextActions.map((a) => (
              <li key={a.id}>
                {a.href ? (
                  <Link
                    href={a.href}
                    className={cn(
                      'flex items-start gap-1.5 rounded-md border px-2 py-1.5 text-[11px] leading-snug hover:bg-muted/80',
                      a.severity === 'high' && 'border-rose-200 bg-rose-50/80 text-rose-950',
                      a.severity === 'medium' && 'border-amber-200 bg-amber-50/50',
                      a.severity === 'low' && 'border-border bg-background',
                    )}
                  >
                    <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-60" />
                    <span className="flex-1">{a.label}</span>
                    <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 opacity-50" />
                  </Link>
                ) : (
                  <div
                    className={cn(
                      'rounded-md border px-2 py-1.5 text-[11px] leading-snug',
                      a.severity === 'high' && 'border-rose-200 bg-rose-50/80 text-rose-950',
                      a.severity === 'medium' && 'border-amber-200 bg-amber-50/50',
                    )}
                  >
                    {a.label}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
        <p className="mb-2 text-[11px] font-semibold text-muted-foreground">ไทม์ไลน์ (ล่าสุด)</p>
        <ul className="space-y-2">
          {timeline.map((item) => (
            <li key={`${item.kind}-${item.id}`} className="border-l-2 border-primary/25 pl-2">
              <p className="text-[10px] text-muted-foreground">
                {new Date(item.at).toLocaleString('th-TH', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                · {TIMELINE_KIND_LABELS[item.kind] ?? item.kind}
              </p>
              <p className="text-[12px] font-medium leading-snug">{item.title}</p>
              {item.subtitle && (
                <p className="text-[11px] text-muted-foreground line-clamp-2">{item.subtitle}</p>
              )}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

function ChatPanel({ sessionId, onUpdate }: { sessionId: string; onUpdate: () => void }) {
  const [input, setInput] = useState('');
  const [noteDraft, setNoteDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [noteSaving, setNoteSaving] = useState(false);
  const [followLocal, setFollowLocal] = useState('');
  const [tagSaving, setTagSaving] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const tagsSyncedRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data, mutate } = useApi<{
    session: ChatSession;
    customerSummary: CustomerSummary;
    messages: ChatMessage[];
  }>(`/v1/staff/line/inbox/${sessionId}`, { refreshInterval: 3000 });

  const { data: tagList, mutate: mutateTagList } = useApi<PatientTagRow[]>('/v1/staff/line/patient-tags', {
    refreshInterval: 60000,
  });

  const { data: quickReplies } = useApi<QuickReplyRow[]>('/v1/staff/line/quick-replies', { refreshInterval: 120000 });

  const session = data?.session;
  const customerSummary = data?.customerSummary;
  const messages = data?.messages ?? [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  useEffect(() => {
    tagsSyncedRef.current = false;
  }, [sessionId]);

  useEffect(() => {
    if (!data?.customerSummary || tagsSyncedRef.current) return;
    setSelectedTagIds(data.customerSummary.tags?.map((t) => t.id) ?? []);
    tagsSyncedRef.current = true;
  }, [data?.customerSummary, sessionId]);

  useEffect(() => {
    setFollowLocal(toDatetimeLocalValue(session?.followUpAt ?? null));
  }, [session?.followUpAt, sessionId]);

  async function handleSend() {
    if (!input.trim() || sending) return;
    setSending(true);
    try {
      await api.post(`/v1/staff/line/inbox/${sessionId}/reply`, { content: input.trim() });
      setInput('');
      mutate();
      onUpdate();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'ส่งไม่สำเร็จ');
    } finally {
      setSending(false);
    }
  }

  async function handleSaveNote() {
    if (!noteDraft.trim() || noteSaving) return;
    setNoteSaving(true);
    try {
      await api.post(`/v1/staff/line/inbox/${sessionId}/notes`, { content: noteDraft.trim() });
      setNoteDraft('');
      mutate();
      onUpdate();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ');
    } finally {
      setNoteSaving(false);
    }
  }

  async function handleAssign() {
    await api.patch(`/v1/staff/line/inbox/${sessionId}/assign`);
    mutate();
    onUpdate();
  }

  async function handleResolve() {
    if (!confirm('ต้องการปิดการสนทนานี้?')) return;
    await api.patch(`/v1/staff/line/inbox/${sessionId}/resolve`);
    mutate();
    onUpdate();
  }

  async function handleReopen() {
    await api.patch(`/v1/staff/line/inbox/${sessionId}/reopen`);
    mutate();
    onUpdate();
  }

  async function handleSaveFollowUp() {
    let iso: string | null = null;
    if (followLocal.trim()) {
      const d = new Date(followLocal);
      if (Number.isNaN(d.getTime())) {
        alert('วันเวลาไม่ถูกต้อง');
        return;
      }
      iso = d.toISOString();
    }
    await api.patch(`/v1/staff/line/inbox/${sessionId}/follow-up`, { followUpAt: iso });
    mutate();
    onUpdate();
  }

  async function handleClearFollowUp() {
    await api.patch(`/v1/staff/line/inbox/${sessionId}/follow-up`, { followUpAt: null });
    setFollowLocal('');
    mutate();
    onUpdate();
  }

  async function handleSaveTags() {
    setTagSaving(true);
    try {
      await api.patch(`/v1/staff/line/inbox/${sessionId}/tags`, { tagIds: selectedTagIds });
      mutate();
      onUpdate();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'บันทึกแท็กไม่สำเร็จ');
    } finally {
      setTagSaving(false);
    }
  }

  async function handleCreateTag() {
    const label = window.prompt('ชื่อแท็กใหม่');
    if (!label?.trim()) return;
    const slug = label
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_-]/gi, '');
    if (!slug) {
      alert('ไม่สามารถสร้าง slug ได้');
      return;
    }
    try {
      await api.post('/v1/staff/line/patient-tags', { slug, label: label.trim() });
      await mutateTagList();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'สร้างแท็กไม่สำเร็จ');
    }
  }

  function toggleTag(id: string) {
    setSelectedTagIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  if (!data) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <User className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {session?.patientFirstName} {session?.patientLastName}
            </p>
            <p className="text-xs text-muted-foreground">{session?.patientNo ?? 'ไม่มีรหัสสมาชิก'}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {session?.status === 'active' && !session?.assignedTo && (
            <button
              type="button"
              onClick={() => void handleAssign()}
              className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted"
            >
              <UserCheck className="mr-1 inline h-3 w-3" /> รับเรื่อง
            </button>
          )}
          {session?.status === 'active' && (
            <button
              type="button"
              onClick={() => void handleResolve()}
              className="rounded-md border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100"
            >
              <CheckCircle className="mr-1 inline h-3 w-3" /> แก้ไขแล้ว
            </button>
          )}
          {session?.status === 'resolved' && (
            <button
              type="button"
              onClick={() => void handleReopen()}
              className="rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100"
            >
              <RotateCcw className="mr-1 inline h-3 w-3" /> เปิดใหม่
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-3 border-b bg-muted/20 px-4 py-3 lg:grid-cols-2">
        <div className="rounded-xl border bg-background p-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <User className="h-4 w-4 text-primary" />
            ข้อมูลลูกค้า
          </div>
          <div className="mt-2 space-y-1.5 text-xs text-muted-foreground">
            <p>{customerSummary?.name ?? '-'}</p>
            <p className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" />
              {customerSummary?.phone ?? 'ไม่มีเบอร์โทร'}
            </p>
            <p className="flex items-center gap-1.5">
              {customerSummary?.isRegistered ? (
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <ShieldAlert className="h-3.5 w-3.5 text-orange-600" />
              )}
              {customerSummary?.isRegistered ? 'ลงทะเบียนแล้ว' : 'ข้อมูลยังไม่ครบ'}
            </p>
            <p>{session?.lineUserId ? `LINE: ${session.lineUserId.slice(0, 12)}...` : 'ไม่มี LINE ID'}</p>
          </div>
        </div>

        <div className="rounded-xl border bg-background p-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <AlertCircle className="h-4 w-4 text-primary" />
            สรุปเคส
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <MiniBadge
              label={QUEUE_LABELS[customerSummary?.queueStatus ?? ''] ?? 'ไม่ระบุคิว'}
              className={
                customerSummary?.queueStatus === 'needs_human'
                  ? 'bg-amber-100 text-amber-700'
                  : customerSummary?.queueStatus === 'assigned'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-slate-100 text-slate-700'
              }
            />
            <MiniBadge
              label={INTENT_LABELS[customerSummary?.entryIntent ?? 'other'] ?? 'ทั่วไป'}
              className="bg-primary/10 text-primary"
            />
            {customerSummary?.priority === 'urgent' && <MiniBadge label="ด่วน" className="bg-red-100 text-red-700" />}
            {customerSummary?.lineContactState && (
              <MiniBadge
                label={CONTACT_STATE_LABELS[customerSummary.lineContactState] ?? customerSummary.lineContactState}
                className="bg-violet-100 text-violet-700"
              />
            )}
          </div>
          <div className="mt-2 space-y-1 text-xs text-muted-foreground">
            <p>สถานะ journey: {customerSummary?.lineJourneyStep ?? '-'}</p>
            <p>เหตุผลส่งต่อ: {session?.transferredReason ?? '-'}</p>
            <p>ตอบครั้งแรก: {formatSessionTimestamp(session?.firstResponseAt, null)}</p>
            {session?.reopenedAt && <p>เปิดใหม่ล่าสุด: {formatSessionTimestamp(session.reopenedAt, null)}</p>}
          </div>
        </div>

        <div className="rounded-xl border bg-background p-3 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Tag className="h-4 w-4 text-primary" />
              แท็กลูกค้า
            </div>
            <button
              type="button"
              onClick={() => void handleCreateTag()}
              className="text-[11px] text-primary hover:underline"
            >
              + สร้างแท็ก
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {(tagList ?? []).map((t) => (
              <label
                key={t.id}
                className={cn(
                  'flex cursor-pointer items-center gap-1.5 rounded-full border px-2 py-1 text-[11px]',
                  selectedTagIds.includes(t.id) ? 'border-primary bg-primary/10' : 'border-border bg-muted/40',
                )}
              >
                <input
                  type="checkbox"
                  checked={selectedTagIds.includes(t.id)}
                  onChange={() => toggleTag(t.id)}
                  className="rounded border-input"
                />
                <span style={t.color ? { color: t.color } : undefined}>{t.label}</span>
              </label>
            ))}
          </div>
          <button
            type="button"
            disabled={tagSaving}
            onClick={() => void handleSaveTags()}
            className="mt-2 rounded-md bg-secondary px-3 py-1.5 text-xs font-medium hover:bg-secondary/80 disabled:opacity-50"
          >
            {tagSaving ? 'กำลังบันทึก...' : 'บันทึกแท็ก'}
          </button>
        </div>

        <div className="rounded-xl border bg-background p-3 lg:col-span-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <AlertCircle className="h-4 w-4 text-primary" />
            ติดตาม / นัดถัดไป
          </div>
          <div className="mt-2 flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-muted-foreground">วันเวลา</span>
              <input
                type="datetime-local"
                value={followLocal}
                onChange={(e) => setFollowLocal(e.target.value)}
                className="rounded-md border bg-background px-2 py-1.5 text-xs"
              />
            </div>
            <button
              type="button"
              onClick={() => void handleSaveFollowUp()}
              className="rounded-md bg-secondary px-3 py-1.5 text-xs font-medium hover:bg-secondary/80"
            >
              บันทึกนัด
            </button>
            <button
              type="button"
              onClick={() => void handleClearFollowUp()}
              className="rounded-md border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
            >
              ล้างนัด
            </button>
          </div>
          {session?.followUpAt && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              บันทึกปัจจุบัน: {formatSessionTimestamp(session.followUpAt, null)}{' '}
              {followUpIsDue(session.followUpAt) ? '(ถึงกำหนดแล้ว)' : ''}
            </p>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m) => {
          const kind = m.messageKind ?? undefined;
          if (kind === 'internal_note') {
            return (
              <div key={m.id} className="flex justify-center">
                <div className="max-w-[85%] rounded-xl border border-dashed border-violet-300 bg-violet-50 px-4 py-2 text-sm text-violet-950">
                  <p className="mb-1 flex items-center gap-1 text-[10px] font-medium text-violet-700">
                    <StickyNote className="h-3 w-3" /> บันทึกภายใน (ลูกค้าไม่เห็น)
                  </p>
                  <p className="whitespace-pre-wrap">{m.content}</p>
                  <p className="mt-1 text-[10px] text-violet-600/80">{formatTime(m.createdAt)}</p>
                </div>
              </div>
            );
          }
          return (
            <div
              key={m.id}
              className={cn(
                'flex',
                m.role === 'system' || kind === 'system_event'
                  ? 'justify-center'
                  : m.role === 'user'
                    ? 'justify-start'
                    : 'justify-end',
              )}
            >
              <div
                className={cn(
                  'max-w-[70%] rounded-2xl px-4 py-2 text-sm',
                  m.role === 'user'
                    ? 'bg-muted text-foreground'
                    : m.role === 'pharmacist'
                      ? 'bg-primary text-primary-foreground'
                      : m.role === 'bot'
                        ? 'bg-blue-100 text-blue-900'
                        : 'max-w-[85%] border border-amber-200 bg-amber-50 text-amber-900',
                )}
              >
                {m.role !== 'user' && (
                  <p className="mb-0.5 text-[10px] font-medium opacity-70">
                    {m.role === 'pharmacist'
                      ? '🧑‍⚕️ เภสัชกร'
                      : m.role === 'bot'
                        ? '🤖 Bot'
                        : '⚙️ ระบบ'}
                  </p>
                )}
                <p className="whitespace-pre-wrap">{m.content}</p>
                <p
                  className={cn(
                    'mt-1 text-[10px]',
                    m.role === 'pharmacist'
                      ? 'text-primary-foreground/60'
                      : m.role === 'system' || kind === 'system_event'
                        ? 'text-amber-700/70'
                        : 'text-muted-foreground',
                  )}
                >
                  {formatTime(m.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="border-t p-3 space-y-3">
        {session?.status === 'active' && (
          <>
            <div className="flex flex-wrap gap-2">
              <span className="w-full text-[10px] font-medium text-muted-foreground">ข้อความด่วน</span>
              {(quickReplies ?? []).map((q) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setInput(q.body)}
                  className="rounded-full border border-border bg-muted/50 px-2 py-1 text-[10px] hover:bg-muted"
                >
                  {q.title}
                </button>
              ))}
            </div>
            <div className="rounded-lg border border-dashed bg-muted/20 p-2">
              <div className="mb-1 flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                <StickyNote className="h-3 w-3" /> บันทึกภายใน
              </div>
              <textarea
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                placeholder="เพิ่มบันทึกให้ทีม (ไม่ส่งถึงลูกค้า)"
                rows={2}
                className="w-full resize-none rounded-md border bg-background px-2 py-1.5 text-xs"
              />
              <button
                type="button"
                disabled={!noteDraft.trim() || noteSaving}
                onClick={() => void handleSaveNote()}
                className="mt-1 rounded-md bg-violet-600 px-3 py-1 text-[11px] font-medium text-white hover:bg-violet-700 disabled:opacity-50"
              >
                {noteSaving ? 'กำลังบันทึก...' : 'บันทึกโน้ต'}
              </button>
            </div>
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && void handleSend()}
                placeholder="พิมพ์ข้อความตอบกลับ..."
                className="flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={!input.trim() || sending}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                ส่ง
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground">ข้อความตอบกลับจะถูกส่งถึงลูกค้าผ่าน LINE โดยตรง</p>
          </>
        )}
      </div>
    </div>
  );
}
