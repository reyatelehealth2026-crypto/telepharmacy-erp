'use client';

import { useState } from 'react';
import { Send, Radio, Loader2, CheckCircle } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { api } from '@/lib/api-client';

export default function MessagingPage() {
  const [tab, setTab] = useState<'push' | 'broadcast'>('push');
  const [to, setTo] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState('');

  async function handleSend() {
    if (!message) return;
    setSending(true);
    try {
      if (tab === 'push') {
        if (!to) { alert('กรุณาระบุ LINE User ID'); setSending(false); return; }
        await api.post('/v1/line/send', { to, type: 'text', message });
      } else {
        await api.post('/v1/line/broadcast', { message: { type: 'bubble', body: { type: 'box', layout: 'vertical', contents: [{ type: 'text', text: message }] } }, altText: message });
      }
      setResult('ส่งสำเร็จ');
      setMessage('');
      setTimeout(() => setResult(''), 3000);
    } catch (e: any) { setResult(e.message ?? 'Error'); }
    finally { setSending(false); }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="LINE Messaging" description="ส่งข้อความถึงลูกค้าผ่าน LINE" />

      {result && <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700 flex items-center gap-2"><CheckCircle className="h-4 w-4" /> {result}</div>}

      <div className="flex gap-2">
        <button onClick={() => setTab('push')} className={`rounded-lg px-4 py-2 text-sm font-medium ${tab === 'push' ? 'bg-primary text-primary-foreground' : 'border hover:bg-muted'}`}>
          <Send className="mr-1 inline h-4 w-4" /> Push Message
        </button>
        <button onClick={() => setTab('broadcast')} className={`rounded-lg px-4 py-2 text-sm font-medium ${tab === 'broadcast' ? 'bg-primary text-primary-foreground' : 'border hover:bg-muted'}`}>
          <Radio className="mr-1 inline h-4 w-4" /> Broadcast
        </button>
      </div>

      <div className="max-w-xl rounded-xl border bg-card p-6 shadow-sm space-y-4">
        {tab === 'push' && (
          <div>
            <label className="mb-1 block text-sm font-medium">LINE User ID *</label>
            <input value={to} onChange={e => setTo(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="U1234567890abcdef..." />
          </div>
        )}
        {tab === 'broadcast' && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
            ⚠️ Broadcast จะส่งถึงผู้ใช้ทุกคนที่เพิ่มเพื่อน LINE OA
          </div>
        )}
        <div>
          <label className="mb-1 block text-sm font-medium">ข้อความ *</label>
          <textarea value={message} onChange={e => setMessage(e.target.value)} rows={4} className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="พิมพ์ข้อความ..." />
        </div>
        <button onClick={handleSend} disabled={!message || sending} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {tab === 'push' ? 'ส่งข้อความ' : 'Broadcast'}
        </button>
      </div>
    </div>
  );
}
