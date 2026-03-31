'use client';

import { useState, useEffect } from 'react';
import { Settings, Shield, Bell, Database, Save, UserPlus, RefreshCw, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { api } from '@/lib/api-client';
import { useApi } from '@/lib/use-api';

export default function SettingsPage() {
  const [tab, setTab] = useState('general');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'success' | 'error'>('success');

  const showMsg = (text: string, type: 'success' | 'error' = 'success') => {
    setMsg(text); setMsgType(type); setTimeout(() => setMsg(''), 3000);
  };

  const tabs = [
    { id: 'general', I: Settings, l: 'ทั่วไป' },
    { id: 'staff', I: Shield, l: 'Staff' },
    { id: 'noti', I: Bell, l: 'แจ้งเตือน' },
    { id: 'sys', I: Database, l: 'ระบบ' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="ตั้งค่า" description="การตั้งค่าระบบ" />
      {msg && <div className={`rounded-lg border p-3 text-sm flex items-center gap-2 ${msgType === 'success' ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
        {msgType === 'success' ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />} {msg}
      </div>}
      <div className="grid gap-6 lg:grid-cols-[180px_1fr]">
        <nav className="flex gap-1 lg:flex-col">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={"flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium w-full text-left " + (tab === t.id ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
              <t.I className="h-4 w-4" />{t.l}
            </button>
          ))}
        </nav>
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          {tab === 'general' && <GeneralTab showMsg={showMsg} />}
          {tab === 'staff' && <StaffTab showMsg={showMsg} />}
          {tab === 'noti' && <NotificationTab showMsg={showMsg} />}
          {tab === 'sys' && <SystemTab showMsg={showMsg} />}
        </div>
      </div>
    </div>
  );
}

const ic = 'w-full rounded-lg border px-3 py-2 text-sm';
const bc = 'inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50';

function GeneralTab({ showMsg }: { showMsg: (t: string, type?: 'success' | 'error') => void }) {
  const { data, isLoading } = useApi<{ pharmacyName: string; phone: string; email: string; address: string; openHours: string }>('/v1/system/config/pharmacy');
  const [g, setG] = useState({ pharmacyName: 'REYA Pharmacy', phone: '', email: '', address: '', openHours: '09:00-21:00' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (data) setG(data); }, [data]);

  const save = async () => {
    setSaving(true);
    try {
      await api.patch('/v1/system/config/pharmacy', g);
      showMsg('บันทึกเรียบร้อย');
    } catch (e: any) { showMsg(e.message, 'error'); }
    finally { setSaving(false); }
  };

  if (isLoading) return <div className="flex h-32 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <>
      <h2 className="text-lg font-semibold">ตั้งค่าทั่วไป</h2>
      <div className="grid gap-4 sm:grid-cols-2 max-w-xl">
        <div className="sm:col-span-2"><label className="mb-1 block text-sm font-medium">ชื่อร้าน</label><input value={g.pharmacyName} onChange={e => setG(p => ({...p, pharmacyName: e.target.value}))} className={ic} /></div>
        <div><label className="mb-1 block text-sm font-medium">โทรศัพท์</label><input value={g.phone} onChange={e => setG(p => ({...p, phone: e.target.value}))} className={ic} /></div>
        <div><label className="mb-1 block text-sm font-medium">อีเมล</label><input value={g.email} onChange={e => setG(p => ({...p, email: e.target.value}))} className={ic} /></div>
        <div className="sm:col-span-2"><label className="mb-1 block text-sm font-medium">ที่อยู่</label><textarea value={g.address} onChange={e => setG(p => ({...p, address: e.target.value}))} rows={2} className={ic} /></div>
        <div><label className="mb-1 block text-sm font-medium">เวลาเปิด-ปิด</label><input value={g.openHours} onChange={e => setG(p => ({...p, openHours: e.target.value}))} className={ic} /></div>
      </div>
      <button onClick={save} disabled={saving} className={bc}><Save className="h-4 w-4" />{saving ? 'กำลังบันทึก...' : 'บันทึก'}</button>
    </>
  );
}

function StaffTab({ showMsg }: { showMsg: (t: string, type?: 'success' | 'error') => void }) {
  const [s, setS] = useState({ email: '', password: '', firstName: '', lastName: '', role: 'pharmacist_tech' });

  const addStaff = async () => {
    if (!s.email || !s.password) { showMsg('กรุณากรอก Email และ Password', 'error'); return; }
    try {
      await api.post('/v1/auth/staff-register', s);
      showMsg('เพิ่ม Staff สำเร็จ');
      setS({ email: '', password: '', firstName: '', lastName: '', role: 'pharmacist_tech' });
    } catch (e: any) { showMsg(e?.message || 'เกิดข้อผิดพลาด', 'error'); }
  };

  return (
    <>
      <h2 className="text-lg font-semibold">จัดการ Staff</h2>
      <div className="rounded-lg border p-4 space-y-3">
        <h3 className="font-medium text-sm">เพิ่ม Staff ใหม่</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="mb-1 block text-sm font-medium">Email *</label><input type="email" value={s.email} onChange={e => setS(p => ({...p, email: e.target.value}))} className={ic} /></div>
          <div><label className="mb-1 block text-sm font-medium">Password *</label><input type="password" value={s.password} onChange={e => setS(p => ({...p, password: e.target.value}))} className={ic} /></div>
          <div><label className="mb-1 block text-sm font-medium">ชื่อ</label><input value={s.firstName} onChange={e => setS(p => ({...p, firstName: e.target.value}))} className={ic} /></div>
          <div><label className="mb-1 block text-sm font-medium">นามสกุล</label><input value={s.lastName} onChange={e => setS(p => ({...p, lastName: e.target.value}))} className={ic} /></div>
          <div><label className="mb-1 block text-sm font-medium">Role</label><select value={s.role} onChange={e => setS(p => ({...p, role: e.target.value}))} className={ic}>
            <option value="pharmacist_tech">Pharmacy Tech</option>
            <option value="pharmacist">Pharmacist</option>
            <option value="customer_service">Customer Service</option>
            <option value="accounting">Accounting</option>
            <option value="super_admin">Super Admin</option>
          </select></div>
        </div>
        <button onClick={addStaff} className={bc}><UserPlus className="h-4 w-4" />เพิ่ม Staff</button>
      </div>
    </>
  );
}

function NotificationTab({ showMsg }: { showMsg: (t: string, type?: 'success' | 'error') => void }) {
  const { data, isLoading } = useApi<{ newOrder: boolean; lowStock: boolean; rxPending: boolean }>('/v1/system/config/notifications');
  const [n, setN] = useState({ newOrder: true, lowStock: true, rxPending: true });
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (data) setN(data); }, [data]);

  const save = async () => {
    setSaving(true);
    try {
      await api.patch('/v1/system/config/notifications', n);
      showMsg('บันทึกเรียบร้อย');
    } catch (e: any) { showMsg(e.message, 'error'); }
    finally { setSaving(false); }
  };

  if (isLoading) return <div className="flex h-32 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <>
      <h2 className="text-lg font-semibold">การแจ้งเตือน</h2>
      <div className="space-y-3">
        <label className="flex items-center gap-3"><input type="checkbox" checked={n.newOrder} onChange={e => setN(p => ({...p, newOrder: e.target.checked}))} className="rounded" /><span className="text-sm">ออเดอร์ใหม่</span></label>
        <label className="flex items-center gap-3"><input type="checkbox" checked={n.lowStock} onChange={e => setN(p => ({...p, lowStock: e.target.checked}))} className="rounded" /><span className="text-sm">สต็อกต่ำ</span></label>
        <label className="flex items-center gap-3"><input type="checkbox" checked={n.rxPending} onChange={e => setN(p => ({...p, rxPending: e.target.checked}))} className="rounded" /><span className="text-sm">ใบสั่งยารอตรวจ</span></label>
      </div>
      <button onClick={save} disabled={saving} className={bc}><Save className="h-4 w-4" />{saving ? 'กำลังบันทึก...' : 'บันทึก'}</button>
    </>
  );
}

function SystemTab({ showMsg }: { showMsg: (t: string, type?: 'success' | 'error') => void }) {
  const { data: health, isLoading: healthLoading, mutate: refreshHealth } = useApi<any>('/v1/health');
  const [syncing, setSyncing] = useState(false);
  const [checking, setChecking] = useState<string | null>(null);

  const checkService = async (name: string, path: string) => {
    setChecking(name);
    try {
      await api.get(path);
      showMsg(`${name}: OK`);
    } catch (e: any) { showMsg(`${name}: ${e.message}`, 'error'); }
    finally { setChecking(null); }
  };

  const syncProducts = async () => {
    setSyncing(true);
    try {
      const res = await api.post<{ synced: number; errors: number }>('/v1/products/sync', {});
      showMsg(`Sync สำเร็จ: ${res.data?.synced ?? 0} สินค้า`);
    } catch (e: any) { showMsg(e.message, 'error'); }
    finally { setSyncing(false); }
  };

  return (
    <>
      <h2 className="text-lg font-semibold">ข้อมูลระบบ</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">API URL</p><p className="font-mono text-sm truncate">{process.env.NEXT_PUBLIC_API_URL || 'localhost:3000'}</p></div>
        <div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">Environment</p><p className="font-mono text-sm">{process.env.NODE_ENV || 'development'}</p></div>
        <div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">API Status</p>
          {healthLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <p className={`text-sm font-medium ${health?.status === 'ok' ? 'text-green-600' : 'text-red-600'}`}>{health?.status === 'ok' ? '✅ Online' : '❌ Offline'}</p>}
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Service Health</h3>
          <button onClick={() => refreshHealth()} className="text-xs text-primary hover:underline flex items-center gap-1"><RefreshCw className="h-3 w-3" /> Refresh</button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {[{ name: 'PostgreSQL', status: health?.database }, { name: 'Redis', status: health?.redis }, { name: 'Meilisearch', status: health?.meilisearch }, { name: 'MinIO', status: health?.minio }].map(svc => (
            <div key={svc.name} className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm">{svc.name}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${svc.status === 'ok' || svc.status === 'connected' ? 'bg-green-100 text-green-700' : svc.status ? 'bg-red-100 text-red-700' : 'bg-muted text-muted-foreground'}`}>{svc.status === 'ok' || svc.status === 'connected' ? 'Online' : svc.status ?? 'Unknown'}</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold mb-2">Actions</h3>
        <div className="flex flex-wrap gap-2">
          <button onClick={syncProducts} disabled={syncing} className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm hover:bg-muted disabled:opacity-50">
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Sync Products (Odoo)
          </button>
          <button onClick={() => checkService('Odoo', '/v1/products/odoo-status')} disabled={!!checking} className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm hover:bg-muted disabled:opacity-50">
            {checking === 'Odoo' ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Check Odoo
          </button>
          <button onClick={() => checkService('API', '/v1/health')} disabled={!!checking} className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm hover:bg-muted disabled:opacity-50">
            {checking === 'API' ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Check API
          </button>
        </div>
      </div>
    </>
  );
}
