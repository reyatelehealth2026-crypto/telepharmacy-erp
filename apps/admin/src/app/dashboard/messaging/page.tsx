'use client';

import { useState } from 'react';
import {
  Send,
  Radio,
  Loader2,
  CheckCircle,
  XCircle,
  Plus,
  Clock,
  Users,
  BarChart3,
  RefreshCw,
  Eye,
  Calendar,
} from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { api } from '@/lib/api-client';
import { useApi } from '@/lib/use-api';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────

interface BroadcastCampaign {
  id: string;
  name: string;
  description?: string;
  content: unknown;
  altText?: string;
  segmentFilter: Record<string, unknown>;
  status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'failed' | 'cancelled';
  scheduledAt: string | null;
  sentAt: string | null;
  completedAt: string | null;
  totalRecipients: number;
  successCount: number;
  failureCount: number;
  createdAt: string;
  stats?: {
    total: number;
    sent: number;
    delivered: number;
    failed: number;
    pending: number;
  };
}

type TabType = 'campaigns' | 'create';

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700',
  scheduled: 'bg-blue-100 text-blue-700',
  sending: 'bg-amber-100 text-amber-700',
  completed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

const STATUS_LABEL: Record<string, string> = {
  draft: 'ร่าง',
  scheduled: 'กำหนดเวลา',
  sending: 'กำลังส่ง',
  completed: 'เสร็จสิ้น',
  failed: 'ล้มเหลว',
  cancelled: 'ยกเลิก',
};

function formatDate(dateStr: string | null) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDatetimeLocal(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ─── Main Page ──────────────────────────────────────────────

export default function MessagingPage() {
  const [tab, setTab] = useState<TabType>('campaigns');
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'success' | 'error'>('success');

  const showMsg = (text: string, type: 'success' | 'error' = 'success') => {
    setMsg(text);
    setMsgType(type);
    setTimeout(() => setMsg(''), 4000);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="LINE Messaging" description="จัดการแคมเปญ Broadcast และส่งข้อความถึงลูกค้าผ่าน LINE">
        <button
          onClick={() => setTab('create')}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          สร้างแคมเปญ
        </button>
      </PageHeader>

      {msg && (
        <div
          className={cn(
            'rounded-lg border p-3 text-sm flex items-center gap-2',
            msgType === 'success'
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-red-200 bg-red-50 text-red-700',
          )}
        >
          {msgType === 'success' ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          {msg}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => setTab('campaigns')}
          className={cn(
            'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
            tab === 'campaigns' ? 'bg-primary text-primary-foreground' : 'border hover:bg-muted',
          )}
        >
          <Radio className="mr-1.5 inline h-4 w-4" />
          แคมเปญทั้งหมด
        </button>
        <button
          onClick={() => setTab('create')}
          className={cn(
            'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
            tab === 'create' ? 'bg-primary text-primary-foreground' : 'border hover:bg-muted',
          )}
        >
          <Plus className="mr-1.5 inline h-4 w-4" />
          สร้างแคมเปญใหม่
        </button>
      </div>

      {tab === 'campaigns' && <CampaignsList showMsg={showMsg} />}
      {tab === 'create' && <CreateCampaignForm showMsg={showMsg} onCreated={() => setTab('campaigns')} />}
    </div>
  );
}

// ─── Campaigns List ─────────────────────────────────────────

function CampaignsList({ showMsg }: { showMsg: (t: string, type?: 'success' | 'error') => void }) {
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: result, isLoading, mutate } = useApi<{ data: BroadcastCampaign[]; meta: { page: number; limit: number } }>(
    `/v1/staff/line/broadcast?page=${page}&limit=20`,
  );

  const campaigns = result?.data ?? [];

  // Stats
  const totalCampaigns = campaigns.length;
  const activeCampaigns = campaigns.filter((c) => c.status === 'sending' || c.status === 'scheduled').length;
  const totalRecipients = campaigns.reduce((sum, c) => sum + c.totalRecipients, 0);
  const totalSuccess = campaigns.reduce((sum, c) => sum + c.successCount, 0);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="แคมเปญทั้งหมด" value={totalCampaigns} icon={Radio} />
        <StatCard title="กำลังดำเนินการ" value={activeCampaigns} icon={Clock} description="กำลังส่ง / กำหนดเวลา" />
        <StatCard title="ผู้รับทั้งหมด" value={totalRecipients.toLocaleString()} icon={Users} />
        <StatCard title="ส่งสำเร็จ" value={totalSuccess.toLocaleString()} icon={BarChart3} />
      </div>

      <div className="rounded-xl border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-semibold">รายการแคมเปญ</h2>
          <button
            onClick={() => mutate()}
            className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
            รีเฟรช
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                <th className="px-4 py-3 font-medium">ชื่อแคมเปญ</th>
                <th className="px-4 py-3 font-medium">สถานะ</th>
                <th className="px-4 py-3 font-medium">ผู้รับ</th>
                <th className="px-4 py-3 font-medium">สำเร็จ / ล้มเหลว</th>
                <th className="px-4 py-3 font-medium">กำหนดส่ง</th>
                <th className="px-4 py-3 font-medium">สร้างเมื่อ</th>
                <th className="px-4 py-3 font-medium">ดู</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                    <p className="mt-2">กำลังโหลด...</p>
                  </td>
                </tr>
              ) : campaigns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    <Radio className="mx-auto h-8 w-8" />
                    <p className="mt-2">ยังไม่มีแคมเปญ</p>
                  </td>
                </tr>
              ) : (
                campaigns.map((c) => (
                  <tr key={c.id} className="border-b transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <p className="font-medium">{c.name}</p>
                      {c.description && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{c.description}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', STATUS_BADGE[c.status] ?? 'bg-muted')}>
                        {STATUS_LABEL[c.status] ?? c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">{c.totalRecipients.toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs">
                      <span className="text-green-600">{c.successCount.toLocaleString()}</span>
                      {' / '}
                      <span className="text-red-600">{c.failureCount.toLocaleString()}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(c.scheduledAt)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(c.createdAt)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelectedId(selectedId === c.id ? null : c.id)}
                        className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-muted"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        รายละเอียด
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedId && <CampaignDetail campaignId={selectedId} onClose={() => setSelectedId(null)} />}
    </>
  );
}

// ─── Campaign Detail ────────────────────────────────────────

function CampaignDetail({ campaignId, onClose }: { campaignId: string; onClose: () => void }) {
  const { data: result, isLoading } = useApi<BroadcastCampaign>(`/v1/staff/line/broadcast/${campaignId}`);
  const campaign = result;

  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex h-20 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!campaign) return null;

  const stats = campaign.stats;
  const deliveryRate = campaign.totalRecipients > 0
    ? Math.round((campaign.successCount / campaign.totalRecipients) * 100)
    : 0;

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{campaign.name}</h3>
          {campaign.description && <p className="text-sm text-muted-foreground">{campaign.description}</p>}
        </div>
        <button onClick={onClose} className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted">
          ปิด
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">สถานะ</p>
          <span className={cn('mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium', STATUS_BADGE[campaign.status])}>
            {STATUS_LABEL[campaign.status] ?? campaign.status}
          </span>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">ผู้รับทั้งหมด</p>
          <p className="mt-1 text-lg font-bold">{campaign.totalRecipients.toLocaleString()}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">อัตราส่งสำเร็จ</p>
          <p className="mt-1 text-lg font-bold">{deliveryRate}%</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">ล้มเหลว</p>
          <p className="mt-1 text-lg font-bold text-red-600">{campaign.failureCount.toLocaleString()}</p>
        </div>
      </div>

      {stats && (
        <div className="rounded-lg border p-4">
          <h4 className="text-sm font-medium mb-3">สถิติการส่ง</h4>
          <div className="h-4 w-full rounded-full bg-muted overflow-hidden flex">
            {stats.sent > 0 && (
              <div
                className="h-full bg-green-500"
                style={{ width: `${(stats.sent / stats.total) * 100}%` }}
                title={`ส่งแล้ว: ${stats.sent}`}
              />
            )}
            {stats.failed > 0 && (
              <div
                className="h-full bg-red-500"
                style={{ width: `${(stats.failed / stats.total) * 100}%` }}
                title={`ล้มเหลว: ${stats.failed}`}
              />
            )}
            {stats.pending > 0 && (
              <div
                className="h-full bg-amber-400"
                style={{ width: `${(stats.pending / stats.total) * 100}%` }}
                title={`รอส่ง: ${stats.pending}`}
              />
            )}
          </div>
          <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500" /> ส่งแล้ว {stats.sent}</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" /> ล้มเหลว {stats.failed}</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" /> รอส่ง {stats.pending}</span>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 text-sm">
        <div>
          <span className="text-muted-foreground">กำหนดส่ง:</span>{' '}
          {formatDate(campaign.scheduledAt) || 'ส่งทันที'}
        </div>
        <div>
          <span className="text-muted-foreground">ส่งเมื่อ:</span>{' '}
          {formatDate(campaign.sentAt)}
        </div>
        <div>
          <span className="text-muted-foreground">เสร็จสิ้นเมื่อ:</span>{' '}
          {formatDate(campaign.completedAt)}
        </div>
        <div>
          <span className="text-muted-foreground">สร้างเมื่อ:</span>{' '}
          {formatDate(campaign.createdAt)}
        </div>
      </div>
    </div>
  );
}

// ─── Create Campaign Form ───────────────────────────────────

const ic = 'w-full rounded-lg border px-3 py-2 text-sm';
const bc = 'inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50';

function CreateCampaignForm({
  showMsg,
  onCreated,
}: {
  showMsg: (t: string, type?: 'success' | 'error') => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    messageText: '',
    altText: '',
    scheduleEnabled: false,
    scheduledAt: '',
    segmentProvince: '',
  });
  const [sending, setSending] = useState(false);

  const update = (key: string, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  async function handleCreate() {
    if (!form.name || !form.messageText) {
      showMsg('กรุณากรอกชื่อแคมเปญและข้อความ', 'error');
      return;
    }

    setSending(true);
    try {
      const content = {
        type: 'bubble',
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [{ type: 'text', text: form.messageText, wrap: true }],
        },
      };

      const segmentFilter: Record<string, string> = {};
      if (form.segmentProvince) segmentFilter.province = form.segmentProvince;

      const payload: Record<string, unknown> = {
        name: form.name,
        description: form.description || undefined,
        content,
        altText: form.altText || form.messageText.slice(0, 400),
        segmentFilter: Object.keys(segmentFilter).length > 0 ? segmentFilter : undefined,
      };

      if (form.scheduleEnabled && form.scheduledAt) {
        payload.scheduledAt = new Date(form.scheduledAt).toISOString();
      }

      await api.post('/v1/staff/line/broadcast', payload);
      showMsg('สร้างแคมเปญสำเร็จ');
      setForm({
        name: '',
        description: '',
        messageText: '',
        altText: '',
        scheduleEnabled: false,
        scheduledAt: '',
        segmentProvince: '',
      });
      onCreated();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาด';
      showMsg(message, 'error');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="max-w-2xl rounded-xl border bg-card p-6 shadow-sm space-y-5">
      <h2 className="text-lg font-semibold">สร้างแคมเปญ Broadcast ใหม่</h2>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
        ⚠️ Broadcast จะส่งถึงผู้ใช้ทุกคนที่ตรงตามเงื่อนไข Segment ที่กำหนด
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">ชื่อแคมเปญ *</label>
          <input
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            className={ic}
            placeholder="เช่น โปรโมชั่นเดือนมกราคม"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">รายละเอียด</label>
          <input
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            className={ic}
            placeholder="คำอธิบายแคมเปญ (ไม่บังคับ)"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">ข้อความ *</label>
          <textarea
            value={form.messageText}
            onChange={(e) => update('messageText', e.target.value)}
            rows={4}
            className={ic}
            placeholder="พิมพ์ข้อความที่ต้องการส่ง..."
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Alt Text</label>
          <input
            value={form.altText}
            onChange={(e) => update('altText', e.target.value)}
            className={ic}
            placeholder="ข้อความแสดงใน notification (ถ้าไม่กรอกจะใช้ข้อความหลัก)"
          />
        </div>

        <div className="rounded-lg border p-4 space-y-3">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4" /> Segment Filter
          </h3>
          <div>
            <label className="mb-1 block text-sm font-medium">จังหวัด</label>
            <input
              value={form.segmentProvince}
              onChange={(e) => update('segmentProvince', e.target.value)}
              className={ic}
              placeholder="เช่น กรุงเทพฯ (ว่างไว้ = ส่งทุกจังหวัด)"
            />
          </div>
        </div>

        <div className="rounded-lg border p-4 space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={form.scheduleEnabled}
              onChange={(e) => update('scheduleEnabled', e.target.checked)}
              className="rounded"
            />
            <span className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" /> กำหนดเวลาส่ง
            </span>
          </label>
          {form.scheduleEnabled && (
            <div>
              <label className="mb-1 block text-sm font-medium">วันเวลาที่ต้องการส่ง</label>
              <input
                type="datetime-local"
                value={form.scheduledAt}
                onChange={(e) => update('scheduledAt', e.target.value)}
                className={ic}
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={handleCreate} disabled={!form.name || !form.messageText || sending} className={bc}>
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {form.scheduleEnabled ? 'กำหนดเวลาส่ง' : 'ส่ง Broadcast ทันที'}
        </button>
      </div>
    </div>
  );
}
