'use client';

import { useState } from 'react';
import { Settings, Shield, Bell, Database, Save, UserPlus } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { api } from '@/lib/api-client';

export default function SettingsPage() {
  const [tab, setTab] = useState('general');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [g, setG] = useState({ pharmacyName: 'REYA Pharmacy', phone: '', email: '', address: '', openHours: '09:00-21:00' });
  const [n, setN] = useState({ newOrder: true, lowStock: true, rxPending: true });
  const [s, setS] = useState({ email: '', password: '', firstName: '', lastName: '', role: 'pharmacist_tech' });

  const save = () => { setSaving(true); setTimeout(() => { setSaving(false); setMsg('Saved!'); setTimeout(() => setMsg(''), 2000); }, 300); };
  const addStaff = async () => {
    if (!s.email || !s.password) return;
    try { await api.post('/v1/auth/staff-register', s); setMsg('Staff added!'); setS({ email: '', password: '', firstName: '', lastName: '', role: 'pharmacist_tech' }); }
    catch (e: any) { setMsg(e?.message || 'Error'); }
  };

  const tabs = [{ id: 'general', I: Settings, l: 'General' }, { id: 'staff', I: Shield, l: 'Staff' }, { id: 'noti', I: Bell, l: 'Notifications' }, { id: 'sys', I: Database, l: 'System' }];
  const ic = 'w-full rounded-lg border px-3 py-2 text-sm';
  const bc = 'inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50';

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="System configuration" />
      {msg && <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">{msg}</div>}
      <div className="grid gap-6 lg:grid-cols-[180px_1fr]">
        <nav className="flex gap-1 lg:flex-col">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={"flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium w-full text-left " + (tab === t.id ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
              <t.I className="h-4 w-4" />{t.l}
            </button>
          ))}
        </nav>
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          {tab === 'general' && (<>
            <h2 className="text-lg font-semibold">General Settings</h2>
            <div className="grid gap-4 sm:grid-cols-2 max-w-xl">
              <div className="sm:col-span-2"><label className="mb-1 block text-sm font-medium">Pharmacy Name</label><input value={g.pharmacyName} onChange={e => setG(p => ({...p, pharmacyName: e.target.value}))} className={ic} /></div>
              <div><label className="mb-1 block text-sm font-medium">Phone</label><input value={g.phone} onChange={e => setG(p => ({...p, phone: e.target.value}))} className={ic} /></div>
              <div><label className="mb-1 block text-sm font-medium">Email</label><input value={g.email} onChange={e => setG(p => ({...p, email: e.target.value}))} className={ic} /></div>
              <div className="sm:col-span-2"><label className="mb-1 block text-sm font-medium">Address</label><textarea value={g.address} onChange={e => setG(p => ({...p, address: e.target.value}))} rows={2} className={ic} /></div>
              <div><label className="mb-1 block text-sm font-medium">Hours</label><input value={g.openHours} onChange={e => setG(p => ({...p, openHours: e.target.value}))} className={ic} /></div>
            </div>
            <button onClick={save} disabled={saving} className={bc}><Save className="h-4 w-4" />{saving ? 'Saving...' : 'Save'}</button>
          </>)}
          {tab === 'staff' && (<>
            <h2 className="text-lg font-semibold">Staff Management</h2>
            <div className="rounded-lg border p-4 space-y-3">
              <h3 className="font-medium text-sm">Add New Staff</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div><label className="mb-1 block text-sm font-medium">Email *</label><input type="email" value={s.email} onChange={e => setS(p => ({...p, email: e.target.value}))} className={ic} /></div>
                <div><label className="mb-1 block text-sm font-medium">Password *</label><input type="password" value={s.password} onChange={e => setS(p => ({...p, password: e.target.value}))} className={ic} /></div>
                <div><label className="mb-1 block text-sm font-medium">First Name</label><input value={s.firstName} onChange={e => setS(p => ({...p, firstName: e.target.value}))} className={ic} /></div>
                <div><label className="mb-1 block text-sm font-medium">Last Name</label><input value={s.lastName} onChange={e => setS(p => ({...p, lastName: e.target.value}))} className={ic} /></div>
                <div><label className="mb-1 block text-sm font-medium">Role</label><select value={s.role} onChange={e => setS(p => ({...p, role: e.target.value}))} className={ic}><option value="pharmacist_tech">Pharmacy Tech</option><option value="pharmacist">Pharmacist</option><option value="super_admin">Super Admin</option></select></div>
              </div>
              <button onClick={addStaff} className={bc}><UserPlus className="h-4 w-4" />Add Staff</button>
            </div>
          </>)}
          {tab === 'noti' && (<>
            <h2 className="text-lg font-semibold">Notifications</h2>
            <div className="space-y-3">
              <label className="flex items-center gap-3"><input type="checkbox" checked={n.newOrder} onChange={e => setN(p => ({...p, newOrder: e.target.checked}))} className="rounded" /><span className="text-sm">New orders</span></label>
              <label className="flex items-center gap-3"><input type="checkbox" checked={n.lowStock} onChange={e => setN(p => ({...p, lowStock: e.target.checked}))} className="rounded" /><span className="text-sm">Low stock alerts</span></label>
              <label className="flex items-center gap-3"><input type="checkbox" checked={n.rxPending} onChange={e => setN(p => ({...p, rxPending: e.target.checked}))} className="rounded" /><span className="text-sm">Prescription pending</span></label>
            </div>
            <button onClick={save} disabled={saving} className={bc}><Save className="h-4 w-4" />{saving ? 'Saving...' : 'Save'}</button>
          </>)}
          {tab === 'sys' && (<>
            <h2 className="text-lg font-semibold">System Info</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border p-4"><p className="text-sm text-muted-foreground">API</p><p className="font-mono text-sm">{process.env.NEXT_PUBLIC_API_URL || 'localhost:3000'}</p></div>
              <div className="rounded-lg border p-4"><p className="text-sm text-muted-foreground">Env</p><p className="font-mono text-sm">{process.env.NODE_ENV || 'dev'}</p></div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => api.post('/v1/products/sync').then(() => setMsg('Sync started')).catch((e: any) => setMsg(e.message))} className="rounded-lg border px-4 py-2 text-sm hover:bg-muted">Sync Products</button>
              <button onClick={() => api.get('/v1/health').then(() => setMsg('API OK')).catch((e: any) => setMsg(e.message))} className="rounded-lg border px-4 py-2 text-sm hover:bg-muted">Check API</button>
            </div>
          </>)}
        </div>
      </div>
    </div>
  );
}
