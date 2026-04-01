'use client';

import { useState, useEffect } from 'react';
import {
  Settings,
  Shield,
  Bell,
  Database,
  Save,
  UserPlus,
  RefreshCw,
  CheckCircle,
  XCircle,
  Loader2,
  Plug,
  Eye,
  EyeOff,
  MessageSquare,
  CreditCard,
  Truck,
} from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { api } from '@/lib/api-client';
import { useApi } from '@/lib/use-api';

export default function SettingsPage() {
  const [tab, setTab] = useState('line');
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'success' | 'error'>('success');

  const showMsg = (text: string, type: 'success' | 'error' = 'success') => {
    setMsg(text);
    setMsgType(type);
    setTimeout(() => setMsg(''), 3000);
  };

  const tabs = [
    { id: 'line', I: MessageSquare, l: 'LINE' },
    { id: 'payment', I: CreditCard, l: 'ชำระเงิน' },
    { id: 'delivery', I: Truck, l: 'จัดส่ง' },
    { id: 'noti', I: Bell, l: 'แจ้งเตือน' },
    { id: 'general', I: Settings, l: 'ทั่วไป' },
    { id: 'staff', I: Shield, l: 'Staff' },
    { id: 'integrations', I: Plug, l: 'Integrations' },
    { id: 'sys', I: Database, l: 'ระบบ' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="ตั้งค่า" description="การตั้งค่าระบบ" />
      {msg && (
        <div
          className={`rounded-lg border p-3 text-sm flex items-center gap-2 ${msgType === 'success' ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}
        >
          {msgType === 'success' ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />} {msg}
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
        <nav className="flex gap-1 overflow-x-auto lg:flex-col">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={
                'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap lg:w-full text-left ' +
                (tab === t.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')
              }
            >
              <t.I className="h-4 w-4" />
              {t.l}
            </button>
          ))}
        </nav>
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          {tab === 'line' && <LineSettingsTab showMsg={showMsg} />}
          {tab === 'payment' && <PaymentSettingsTab showMsg={showMsg} />}
          {tab === 'delivery' && <DeliverySettingsTab showMsg={showMsg} />}
          {tab === 'noti' && <NotificationSettingsTab showMsg={showMsg} />}
          {tab === 'general' && <GeneralTab showMsg={showMsg} />}
          {tab === 'staff' && <StaffTab showMsg={showMsg} />}
          {tab === 'integrations' && <IntegrationsTab showMsg={showMsg} />}
          {tab === 'sys' && <SystemTab showMsg={showMsg} />}
        </div>
      </div>
    </div>
  );
}

const ic = 'w-full rounded-lg border px-3 py-2 text-sm';
const bc =
  'inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50';

// ─── LINE Settings ──────────────────────────────────────────

function LineSettingsTab({ showMsg }: { showMsg: (t: string, type?: 'success' | 'error') => void }) {
  const { data, isLoading } = useApi<Record<string, { value: unknown; source: string; envVar: string }>>(
    '/v1/system/config/integrations/line',
  );
  const [form, setForm] = useState({
    channelId: '',
    channelSecret: '',
    channelAccessToken: '',
    liffId: '',
  });
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) {
      setForm({
        channelId: data.channelId?.source === 'env' ? '' : String(data.channelId?.value ?? ''),
        channelSecret: data.channelSecret?.source === 'env' ? '' : String(data.channelSecret?.value ?? ''),
        channelAccessToken: data.channelAccessToken?.source === 'env' ? '' : String(data.channelAccessToken?.value ?? ''),
        liffId: data.liffId?.source === 'env' ? '' : String(data.liffId?.value ?? ''),
      });
    }
  }, [data]);

  const save = async () => {
    setSaving(true);
    try {
      await api.patch('/v1/system/config/integrations/line', form);
      showMsg('บันทึกการตั้งค่า LINE สำเร็จ');
    } catch (e: unknown) {
      showMsg(e instanceof Error ? e.message : 'เกิดข้อผิดพลาด', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading)
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );

  const fields: { key: keyof typeof form; label: string; sensitive?: boolean; envVar?: string }[] = [
    { key: 'channelId', label: 'Channel ID', envVar: data?.channelId?.envVar },
    { key: 'channelSecret', label: 'Channel Secret', sensitive: true, envVar: data?.channelSecret?.envVar },
    { key: 'channelAccessToken', label: 'Channel Access Token', sensitive: true, envVar: data?.channelAccessToken?.envVar },
    { key: 'liffId', label: 'LIFF ID', envVar: data?.liffId?.envVar },
  ];

  return (
    <>
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <MessageSquare className="h-5 w-5" /> ตั้งค่า LINE Channel
      </h2>
      <p className="text-sm text-muted-foreground">
        กำหนดค่า LINE Messaging API Channel สำหรับส่งข้อความและ LIFF
      </p>
      <div className="grid gap-4 max-w-xl">
        {fields.map((f) => {
          const fieldData = data?.[f.key];
          const isVisible = showSecrets[f.key];
          return (
            <div key={f.key}>
              <label className="mb-1 flex items-center gap-2 text-sm font-medium">
                {f.label}
                {fieldData?.source === 'env' && (
                  <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-normal text-blue-700">ENV</span>
                )}
                {fieldData?.source === 'db' && (
                  <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-normal text-green-700">DB</span>
                )}
              </label>
              <div className="relative">
                <input
                  type={f.sensitive && !isVisible ? 'password' : 'text'}
                  value={form[f.key]}
                  onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={fieldData?.source === 'env' ? '(ใช้ค่าจาก ENV — กรอกเพื่อ override)' : ''}
                  className={ic}
                />
                {f.sensitive && (
                  <button
                    type="button"
                    onClick={() => setShowSecrets((p) => ({ ...p, [f.key]: !p[f.key] }))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                )}
              </div>
              {f.envVar && <p className="mt-0.5 text-[10px] text-muted-foreground font-mono">ENV: {f.envVar}</p>}
            </div>
          );
        })}
      </div>
      <button onClick={save} disabled={saving} className={bc}>
        <Save className="h-4 w-4" />
        {saving ? 'กำลังบันทึก...' : 'บันทึก'}
      </button>
    </>
  );
}

// ─── Payment Settings ───────────────────────────────────────

function PaymentSettingsTab({ showMsg }: { showMsg: (t: string, type?: 'success' | 'error') => void }) {
  const { data, isLoading } = useApi<Record<string, { value: unknown; source: string; envVar: string }>>(
    '/v1/system/config/integrations/payment',
  );
  const [form, setForm] = useState({
    omisePublicKey: '',
    omiseSecretKey: '',
    promptpayEnabled: true,
    creditCardEnabled: false,
    transferEnabled: true,
  });
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) {
      setForm((prev) => ({
        ...prev,
        omisePublicKey: data.omisePublicKey?.source === 'env' ? '' : String(data.omisePublicKey?.value ?? ''),
        omiseSecretKey: data.omiseSecretKey?.source === 'env' ? '' : String(data.omiseSecretKey?.value ?? ''),
      }));
    }
  }, [data]);

  const save = async () => {
    setSaving(true);
    try {
      await api.patch('/v1/system/config/integrations/payment', {
        omisePublicKey: form.omisePublicKey,
        omiseSecretKey: form.omiseSecretKey,
      });
      showMsg('บันทึกการตั้งค่าชำระเงินสำเร็จ');
    } catch (e: unknown) {
      showMsg(e instanceof Error ? e.message : 'เกิดข้อผิดพลาด', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading)
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );

  return (
    <>
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <CreditCard className="h-5 w-5" /> ตั้งค่าชำระเงิน
      </h2>
      <p className="text-sm text-muted-foreground">กำหนดค่า Payment Gateway (Omise / PromptPay)</p>

      <div className="grid gap-4 max-w-xl">
        <div>
          <label className="mb-1 flex items-center gap-2 text-sm font-medium">
            Omise Public Key
            {data?.omisePublicKey?.source === 'env' && (
              <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-normal text-blue-700">ENV</span>
            )}
          </label>
          <input
            value={form.omisePublicKey}
            onChange={(e) => setForm((p) => ({ ...p, omisePublicKey: e.target.value }))}
            placeholder={data?.omisePublicKey?.source === 'env' ? '(ใช้ค่าจาก ENV)' : 'pkey_...'}
            className={ic}
          />
        </div>
        <div>
          <label className="mb-1 flex items-center gap-2 text-sm font-medium">
            Omise Secret Key
            {data?.omiseSecretKey?.source === 'env' && (
              <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-normal text-blue-700">ENV</span>
            )}
          </label>
          <div className="relative">
            <input
              type={showSecrets.omiseSecretKey ? 'text' : 'password'}
              value={form.omiseSecretKey}
              onChange={(e) => setForm((p) => ({ ...p, omiseSecretKey: e.target.value }))}
              placeholder={data?.omiseSecretKey?.source === 'env' ? '(ใช้ค่าจาก ENV)' : 'skey_...'}
              className={ic}
            />
            <button
              type="button"
              onClick={() => setShowSecrets((p) => ({ ...p, omiseSecretKey: !p.omiseSecretKey }))}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showSecrets.omiseSecretKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="rounded-lg border p-4 space-y-3">
          <h3 className="text-sm font-medium">ช่องทางชำระเงินที่เปิดใช้งาน</h3>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={form.promptpayEnabled}
              onChange={(e) => setForm((p) => ({ ...p, promptpayEnabled: e.target.checked }))}
              className="rounded"
            />
            <span className="text-sm">PromptPay QR</span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={form.creditCardEnabled}
              onChange={(e) => setForm((p) => ({ ...p, creditCardEnabled: e.target.checked }))}
              className="rounded"
            />
            <span className="text-sm">บัตรเครดิต / เดบิต</span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={form.transferEnabled}
              onChange={(e) => setForm((p) => ({ ...p, transferEnabled: e.target.checked }))}
              className="rounded"
            />
            <span className="text-sm">โอนเงินผ่านธนาคาร</span>
          </label>
        </div>
      </div>

      <button onClick={save} disabled={saving} className={bc}>
        <Save className="h-4 w-4" />
        {saving ? 'กำลังบันทึก...' : 'บันทึก'}
      </button>
    </>
  );
}

// ─── Delivery Settings ──────────────────────────────────────

function DeliverySettingsTab({ showMsg }: { showMsg: (t: string, type?: 'success' | 'error') => void }) {
  const [form, setForm] = useState({
    freeDeliveryThreshold: '500',
    standardDeliveryFee: '50',
    expressDeliveryFee: '100',
    standardDeliveryDays: '3-5',
    expressDeliveryDays: '1-2',
    enableExpress: true,
    enableCOD: false,
    maxWeight: '20',
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await api.patch('/v1/system/config/delivery', form);
      showMsg('บันทึกการตั้งค่าจัดส่งสำเร็จ');
    } catch (e: unknown) {
      showMsg(e instanceof Error ? e.message : 'เกิดข้อผิดพลาด', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Truck className="h-5 w-5" /> ตั้งค่าจัดส่ง
      </h2>
      <p className="text-sm text-muted-foreground">กำหนดค่าจัดส่งและเงื่อนไขส่งฟรี</p>

      <div className="grid gap-4 max-w-xl">
        <div className="rounded-lg border p-4 space-y-4">
          <h3 className="text-sm font-medium">ค่าจัดส่ง</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">ค่าส่งมาตรฐาน (บาท)</label>
              <input
                type="number"
                value={form.standardDeliveryFee}
                onChange={(e) => setForm((p) => ({ ...p, standardDeliveryFee: e.target.value }))}
                className={ic}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">ระยะเวลาส่งมาตรฐาน (วัน)</label>
              <input
                value={form.standardDeliveryDays}
                onChange={(e) => setForm((p) => ({ ...p, standardDeliveryDays: e.target.value }))}
                className={ic}
                placeholder="3-5"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">ค่าส่งด่วน (บาท)</label>
              <input
                type="number"
                value={form.expressDeliveryFee}
                onChange={(e) => setForm((p) => ({ ...p, expressDeliveryFee: e.target.value }))}
                className={ic}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">ระยะเวลาส่งด่วน (วัน)</label>
              <input
                value={form.expressDeliveryDays}
                onChange={(e) => setForm((p) => ({ ...p, expressDeliveryDays: e.target.value }))}
                className={ic}
                placeholder="1-2"
              />
            </div>
          </div>
        </div>

        <div className="rounded-lg border p-4 space-y-4">
          <h3 className="text-sm font-medium">เงื่อนไขส่งฟรี</h3>
          <div>
            <label className="mb-1 block text-sm font-medium">ยอดสั่งซื้อขั้นต่ำสำหรับส่งฟรี (บาท)</label>
            <input
              type="number"
              value={form.freeDeliveryThreshold}
              onChange={(e) => setForm((p) => ({ ...p, freeDeliveryThreshold: e.target.value }))}
              className={ic}
              placeholder="500"
            />
            <p className="mt-1 text-xs text-muted-foreground">ตั้ง 0 เพื่อปิดส่งฟรี</p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">น้ำหนักสูงสุดต่อออเดอร์ (กก.)</label>
            <input
              type="number"
              value={form.maxWeight}
              onChange={(e) => setForm((p) => ({ ...p, maxWeight: e.target.value }))}
              className={ic}
            />
          </div>
        </div>

        <div className="rounded-lg border p-4 space-y-3">
          <h3 className="text-sm font-medium">ตัวเลือกจัดส่ง</h3>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={form.enableExpress}
              onChange={(e) => setForm((p) => ({ ...p, enableExpress: e.target.checked }))}
              className="rounded"
            />
            <span className="text-sm">เปิดใช้งานจัดส่งด่วน</span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={form.enableCOD}
              onChange={(e) => setForm((p) => ({ ...p, enableCOD: e.target.checked }))}
              className="rounded"
            />
            <span className="text-sm">เปิดใช้งานเก็บเงินปลายทาง (COD)</span>
          </label>
        </div>
      </div>

      <button onClick={save} disabled={saving} className={bc}>
        <Save className="h-4 w-4" />
        {saving ? 'กำลังบันทึก...' : 'บันทึก'}
      </button>
    </>
  );
}

// ─── Notification Settings ──────────────────────────────────

function NotificationSettingsTab({ showMsg }: { showMsg: (t: string, type?: 'success' | 'error') => void }) {
  const { data, isLoading } = useApi<{
    newOrder: boolean;
    lowStock: boolean;
    rxPending: boolean;
  }>('/v1/system/config/notifications');
  const [form, setForm] = useState({
    // Staff notifications
    newOrder: true,
    lowStock: true,
    rxPending: true,
    newComplaint: true,
    newConsultation: true,
    // Patient notification types
    orderConfirmation: true,
    orderShipped: true,
    orderDelivered: true,
    prescriptionStatus: true,
    medicationReminder: true,
    promotionalMessages: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) {
      setForm((prev) => ({
        ...prev,
        newOrder: data.newOrder ?? true,
        lowStock: data.lowStock ?? true,
        rxPending: data.rxPending ?? true,
      }));
    }
  }, [data]);

  const save = async () => {
    setSaving(true);
    try {
      await api.patch('/v1/system/config/notifications', form);
      showMsg('บันทึกการตั้งค่าแจ้งเตือนสำเร็จ');
    } catch (e: unknown) {
      showMsg(e instanceof Error ? e.message : 'เกิดข้อผิดพลาด', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading)
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );

  return (
    <>
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Bell className="h-5 w-5" /> ตั้งค่าการแจ้งเตือน
      </h2>
      <p className="text-sm text-muted-foreground">กำหนดการแจ้งเตือนสำหรับ Staff และ Patient</p>

      <div className="grid gap-4 max-w-xl">
        <div className="rounded-lg border p-4 space-y-3">
          <h3 className="text-sm font-medium">การแจ้งเตือน Staff (Admin Dashboard)</h3>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={form.newOrder}
              onChange={(e) => setForm((p) => ({ ...p, newOrder: e.target.checked }))}
              className="rounded"
            />
            <span className="text-sm">ออเดอร์ใหม่</span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={form.lowStock}
              onChange={(e) => setForm((p) => ({ ...p, lowStock: e.target.checked }))}
              className="rounded"
            />
            <span className="text-sm">สต็อกต่ำ</span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={form.rxPending}
              onChange={(e) => setForm((p) => ({ ...p, rxPending: e.target.checked }))}
              className="rounded"
            />
            <span className="text-sm">ใบสั่งยารอตรวจ</span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={form.newComplaint}
              onChange={(e) => setForm((p) => ({ ...p, newComplaint: e.target.checked }))}
              className="rounded"
            />
            <span className="text-sm">ข้อร้องเรียนใหม่</span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={form.newConsultation}
              onChange={(e) => setForm((p) => ({ ...p, newConsultation: e.target.checked }))}
              className="rounded"
            />
            <span className="text-sm">คำขอปรึกษาเภสัชกรใหม่</span>
          </label>
        </div>

        <div className="rounded-lg border p-4 space-y-3">
          <h3 className="text-sm font-medium">การแจ้งเตือน Patient (LINE Push)</h3>
          <p className="text-xs text-muted-foreground">เปิด/ปิดประเภทการแจ้งเตือนที่ส่งถึงลูกค้าผ่าน LINE</p>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={form.orderConfirmation}
              onChange={(e) => setForm((p) => ({ ...p, orderConfirmation: e.target.checked }))}
              className="rounded"
            />
            <span className="text-sm">ยืนยันออเดอร์</span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={form.orderShipped}
              onChange={(e) => setForm((p) => ({ ...p, orderShipped: e.target.checked }))}
              className="rounded"
            />
            <span className="text-sm">จัดส่งสินค้า</span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={form.orderDelivered}
              onChange={(e) => setForm((p) => ({ ...p, orderDelivered: e.target.checked }))}
              className="rounded"
            />
            <span className="text-sm">สินค้าถึงปลายทาง</span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={form.prescriptionStatus}
              onChange={(e) => setForm((p) => ({ ...p, prescriptionStatus: e.target.checked }))}
              className="rounded"
            />
            <span className="text-sm">สถานะใบสั่งยา</span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={form.medicationReminder}
              onChange={(e) => setForm((p) => ({ ...p, medicationReminder: e.target.checked }))}
              className="rounded"
            />
            <span className="text-sm">เตือนทานยา</span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={form.promotionalMessages}
              onChange={(e) => setForm((p) => ({ ...p, promotionalMessages: e.target.checked }))}
              className="rounded"
            />
            <span className="text-sm">ข้อความโปรโมชั่น</span>
          </label>
        </div>
      </div>

      <button onClick={save} disabled={saving} className={bc}>
        <Save className="h-4 w-4" />
        {saving ? 'กำลังบันทึก...' : 'บันทึก'}
      </button>
    </>
  );
}

// ─── General Tab ────────────────────────────────────────────

function GeneralTab({ showMsg }: { showMsg: (t: string, type?: 'success' | 'error') => void }) {
  const { data, isLoading } = useApi<{
    pharmacyName: string;
    phone: string;
    email: string;
    address: string;
    openHours: string;
  }>('/v1/system/config/pharmacy');
  const [g, setG] = useState({
    pharmacyName: 'REYA Pharmacy',
    phone: '',
    email: '',
    address: '',
    openHours: '09:00-21:00',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) setG(data);
  }, [data]);

  const save = async () => {
    setSaving(true);
    try {
      await api.patch('/v1/system/config/pharmacy', g);
      showMsg('บันทึกเรียบร้อย');
    } catch (e: unknown) {
      showMsg(e instanceof Error ? e.message : 'เกิดข้อผิดพลาด', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading)
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );

  return (
    <>
      <h2 className="text-lg font-semibold">ตั้งค่าทั่วไป</h2>
      <div className="grid gap-4 sm:grid-cols-2 max-w-xl">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium">ชื่อร้าน</label>
          <input
            value={g.pharmacyName}
            onChange={(e) => setG((p) => ({ ...p, pharmacyName: e.target.value }))}
            className={ic}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">โทรศัพท์</label>
          <input value={g.phone} onChange={(e) => setG((p) => ({ ...p, phone: e.target.value }))} className={ic} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">อีเมล</label>
          <input value={g.email} onChange={(e) => setG((p) => ({ ...p, email: e.target.value }))} className={ic} />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium">ที่อยู่</label>
          <textarea
            value={g.address}
            onChange={(e) => setG((p) => ({ ...p, address: e.target.value }))}
            rows={2}
            className={ic}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">เวลาเปิด-ปิด</label>
          <input
            value={g.openHours}
            onChange={(e) => setG((p) => ({ ...p, openHours: e.target.value }))}
            className={ic}
          />
        </div>
      </div>
      <button onClick={save} disabled={saving} className={bc}>
        <Save className="h-4 w-4" />
        {saving ? 'กำลังบันทึก...' : 'บันทึก'}
      </button>
    </>
  );
}

// ─── Staff Tab ──────────────────────────────────────────────

function StaffTab({ showMsg }: { showMsg: (t: string, type?: 'success' | 'error') => void }) {
  const [s, setS] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'pharmacist_tech',
  });

  const addStaff = async () => {
    if (!s.email || !s.password) {
      showMsg('กรุณากรอก Email และ Password', 'error');
      return;
    }
    try {
      await api.post('/v1/auth/staff-register', s);
      showMsg('เพิ่ม Staff สำเร็จ');
      setS({ email: '', password: '', firstName: '', lastName: '', role: 'pharmacist_tech' });
    } catch (e: unknown) {
      showMsg(e instanceof Error ? e.message : 'เกิดข้อผิดพลาด', 'error');
    }
  };

  return (
    <>
      <h2 className="text-lg font-semibold">จัดการ Staff</h2>
      <div className="rounded-lg border p-4 space-y-3">
        <h3 className="font-medium text-sm">เพิ่ม Staff ใหม่</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Email *</label>
            <input
              type="email"
              value={s.email}
              onChange={(e) => setS((p) => ({ ...p, email: e.target.value }))}
              className={ic}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Password *</label>
            <input
              type="password"
              value={s.password}
              onChange={(e) => setS((p) => ({ ...p, password: e.target.value }))}
              className={ic}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">ชื่อ</label>
            <input
              value={s.firstName}
              onChange={(e) => setS((p) => ({ ...p, firstName: e.target.value }))}
              className={ic}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">นามสกุล</label>
            <input
              value={s.lastName}
              onChange={(e) => setS((p) => ({ ...p, lastName: e.target.value }))}
              className={ic}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Role</label>
            <select
              value={s.role}
              onChange={(e) => setS((p) => ({ ...p, role: e.target.value }))}
              className={ic}
            >
              <option value="pharmacist_tech">Pharmacy Tech</option>
              <option value="pharmacist">Pharmacist</option>
              <option value="customer_service">Customer Service</option>
              <option value="accounting">Accounting</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>
        </div>
        <button onClick={addStaff} className={bc}>
          <UserPlus className="h-4 w-4" />
          เพิ่ม Staff
        </button>
      </div>
    </>
  );
}

// ─── System Tab ─────────────────────────────────────────────

function SystemTab({ showMsg }: { showMsg: (t: string, type?: 'success' | 'error') => void }) {
  const {
    data: health,
    isLoading: healthLoading,
    mutate: refreshHealth,
  } = useApi<Record<string, string>>('/v1/health');
  const [syncing, setSyncing] = useState(false);
  const [checking, setChecking] = useState<string | null>(null);

  const checkService = async (name: string, path: string) => {
    setChecking(name);
    try {
      await api.get(path);
      showMsg(`${name}: OK`);
    } catch (e: unknown) {
      showMsg(`${name}: ${e instanceof Error ? e.message : 'Error'}`, 'error');
    } finally {
      setChecking(null);
    }
  };

  const syncProducts = async () => {
    setSyncing(true);
    try {
      const res = await api.post<{ synced: number; errors: number }>('/v1/products/sync', {});
      showMsg(`Sync สำเร็จ: ${res.data?.synced ?? 0} สินค้า`);
    } catch (e: unknown) {
      showMsg(e instanceof Error ? e.message : 'Error', 'error');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <>
      <h2 className="text-lg font-semibold">ข้อมูลระบบ</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">API URL</p>
          <p className="font-mono text-sm truncate">{process.env.NEXT_PUBLIC_API_URL || 'localhost:3000'}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Environment</p>
          <p className="font-mono text-sm">{process.env.NODE_ENV || 'development'}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">API Status</p>
          {healthLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <p className={`text-sm font-medium ${health?.status === 'ok' ? 'text-green-600' : 'text-red-600'}`}>
              {health?.status === 'ok' ? '✅ Online' : '❌ Offline'}
            </p>
          )}
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Service Health</h3>
          <button
            onClick={() => refreshHealth()}
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            <RefreshCw className="h-3 w-3" /> Refresh
          </button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            { name: 'PostgreSQL', status: health?.database },
            { name: 'Redis', status: health?.redis },
            { name: 'Meilisearch', status: health?.meilisearch },
            { name: 'MinIO', status: health?.minio },
          ].map((svc) => (
            <div key={svc.name} className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm">{svc.name}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  svc.status === 'ok' || svc.status === 'connected'
                    ? 'bg-green-100 text-green-700'
                    : svc.status
                      ? 'bg-red-100 text-red-700'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {svc.status === 'ok' || svc.status === 'connected' ? 'Online' : (svc.status ?? 'Unknown')}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold mb-2">Actions</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={syncProducts}
            disabled={syncing}
            className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm hover:bg-muted disabled:opacity-50"
          >
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Sync Products
            (Odoo)
          </button>
          <button
            onClick={() => checkService('Odoo', '/v1/products/odoo-status')}
            disabled={!!checking}
            className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm hover:bg-muted disabled:opacity-50"
          >
            {checking === 'Odoo' ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Check Odoo
          </button>
          <button
            onClick={() => checkService('API', '/v1/health')}
            disabled={!!checking}
            className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm hover:bg-muted disabled:opacity-50"
          >
            {checking === 'API' ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Check API
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Integration Groups Config ──────────────────────────────

const INTEGRATION_LABELS: Record<
  string,
  { title: string; description: string; fields: { key: string; label: string; sensitive?: boolean; placeholder?: string }[] }
> = {
  odoo: {
    title: 'Odoo ERP',
    description: 'เชื่อมต่อ Odoo สำหรับ sync สินค้าและสต็อก',
    fields: [
      { key: 'baseUrl', label: 'Base URL', placeholder: 'https://erp.example.com' },
      { key: 'apiUser', label: 'API User (Email)' },
      { key: 'apiToken', label: 'API Token', sensitive: true },
      { key: 'syncIntervalMs', label: 'Sync Interval (ms)', placeholder: '1800000' },
      { key: 'stockCacheTtlSec', label: 'Stock Cache TTL (sec)', placeholder: '300' },
    ],
  },
  ai: {
    title: 'Gemini AI',
    description: 'ตั้งค่า Google Gemini API สำหรับ AI Chatbot และ OCR',
    fields: [{ key: 'geminiApiKey', label: 'API Key', sensitive: true }],
  },
  meilisearch: {
    title: 'Meilisearch',
    description: 'ตั้งค่า Search Engine',
    fields: [
      { key: 'host', label: 'Host URL', placeholder: 'http://localhost:7700' },
      { key: 'masterKey', label: 'Master Key', sensitive: true },
    ],
  },
  telemedicine: {
    title: 'Telemedicine Services',
    description: 'ตั้งค่า Agora, AWS Rekognition, ThaiSMS สำหรับ Telemedicine',
    fields: [
      { key: 'agoraAppId', label: 'Agora App ID' },
      { key: 'agoraAppCertificate', label: 'Agora App Certificate', sensitive: true },
      { key: 'awsRegion', label: 'AWS Region', placeholder: 'ap-southeast-1' },
      { key: 'awsAccessKeyId', label: 'AWS Access Key ID' },
      { key: 'awsSecretAccessKey', label: 'AWS Secret Access Key', sensitive: true },
      { key: 'thaiSmsApiKey', label: 'ThaiSMS API Key', sensitive: true },
      { key: 'thaiSmsSender', label: 'ThaiSMS Sender Name', placeholder: 'Telepharmacy' },
      { key: 'auditEncryptionKey', label: 'Audit Encryption Key', sensitive: true },
      { key: 'pharmacyCouncilApiKey', label: 'Pharmacy Council API Key', sensitive: true },
    ],
  },
};

function IntegrationsTab({ showMsg }: { showMsg: (t: string, type?: 'success' | 'error') => void }) {
  const [activeGroup, setActiveGroup] = useState<string | null>(null);

  return (
    <>
      <h2 className="text-lg font-semibold">ตั้งค่า Integrations อื่นๆ</h2>
      <p className="text-sm text-muted-foreground">
        จัดการ API Keys และ Tokens ต่างๆ (LINE และ Payment ย้ายไปแท็บเฉพาะแล้ว)
      </p>
      <div className="space-y-3">
        {Object.entries(INTEGRATION_LABELS).map(([group, info]) => (
          <div key={group} className="rounded-lg border">
            <button
              onClick={() => setActiveGroup(activeGroup === group ? null : group)}
              className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/50"
            >
              <div>
                <p className="font-medium text-sm">{info.title}</p>
                <p className="text-xs text-muted-foreground">{info.description}</p>
              </div>
              <span className="text-xs text-muted-foreground">{activeGroup === group ? '▲' : '▼'}</span>
            </button>
            {activeGroup === group && (
              <IntegrationGroupForm group={group} fields={info.fields} showMsg={showMsg} />
            )}
          </div>
        ))}
      </div>
    </>
  );
}

interface FieldDef {
  key: string;
  label: string;
  sensitive?: boolean;
  placeholder?: string;
}
interface FieldData {
  value: unknown;
  source: 'db' | 'env' | 'unset';
  envVar: string;
}

function IntegrationGroupForm({
  group,
  fields,
  showMsg,
}: {
  group: string;
  fields: FieldDef[];
  showMsg: (t: string, type?: 'success' | 'error') => void;
}) {
  const { data, isLoading, mutate } = useApi<Record<string, FieldData>>(
    `/v1/system/config/integrations/${group}`,
  );
  const [values, setValues] = useState<Record<string, string>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) {
      const init: Record<string, string> = {};
      for (const f of fields) {
        const d = data[f.key];
        init[f.key] = d?.source === 'env' ? '' : String(d?.value ?? '');
      }
      setValues(init);
    }
  }, [data, fields]);

  const save = async () => {
    setSaving(true);
    try {
      await api.patch(`/v1/system/config/integrations/${group}`, values);
      showMsg('บันทึกเรียบร้อย');
      mutate();
    } catch (e: unknown) {
      showMsg(e instanceof Error ? e.message : 'เกิดข้อผิดพลาด', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading)
    return (
      <div className="flex h-20 items-center justify-center border-t p-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );

  return (
    <div className="border-t p-4 space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map((f) => {
          const fieldData = data?.[f.key];
          const isSensitive = f.sensitive;
          const isVisible = showSecrets[f.key];
          return (
            <div key={f.key} className={f.key === 'channelAccessToken' ? 'sm:col-span-2' : ''}>
              <label className="mb-1 flex items-center gap-2 text-sm font-medium">
                {f.label}
                {fieldData?.source === 'env' && (
                  <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-normal text-blue-700">ENV</span>
                )}
                {fieldData?.source === 'db' && (
                  <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-normal text-green-700">DB</span>
                )}
                {fieldData?.source === 'unset' && (
                  <span className="rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-normal text-orange-700">
                    ยังไม่ตั้งค่า
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type={isSensitive && !isVisible ? 'password' : 'text'}
                  value={values[f.key] ?? ''}
                  onChange={(e) => setValues((p) => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={
                    fieldData?.source === 'env' ? '(ใช้ค่าจาก ENV — กรอกเพื่อ override)' : (f.placeholder ?? '')
                  }
                  className={ic}
                />
                {isSensitive && (
                  <button
                    type="button"
                    onClick={() => setShowSecrets((p) => ({ ...p, [f.key]: !p[f.key] }))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                )}
              </div>
              {fieldData?.envVar && (
                <p className="mt-0.5 text-[10px] text-muted-foreground font-mono">ENV: {fieldData.envVar}</p>
              )}
            </div>
          );
        })}
      </div>
      <button onClick={save} disabled={saving} className={bc}>
        <Save className="h-4 w-4" />
        {saving ? 'กำลังบันทึก...' : 'บันทึก'}
      </button>
    </div>
  );
}
