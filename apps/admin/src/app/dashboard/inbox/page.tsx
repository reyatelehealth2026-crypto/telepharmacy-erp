'use client';

import { useState, useEffect, useRef } from 'react';
import { useApi } from '@/lib/use-api';
import { api } from '@/lib/api-client';
import { PageHeader } from '@/components/page-header';
import {
  Inbox,
  Send,
  Loader2,
  User,
  CheckCircle,
  Clock,
  UserCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatSession {
  id: string;
  patientId: string;
  lineUserId: string | null;
  sessionType: string;
  status: string;
  assignedTo: string | null;
  messageCount: number;
  updatedAt: string;
  createdAt: string;
  patientFirstName: string;
  patientLastName: string;
  patientPhone: string | null;
  lastMessage: { content: string; role: string; createdAt: string } | null;
}

interface ChatMessage {
  id: string;
  sessionId: string;
  role: string;
  content: string | null;
  messageType: string | null;
  createdAt: string;
  sentByStaff: string | null;
}

export default function InboxPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('active');

  const { data: sessions, mutate: mutateSessions } = useApi<ChatSession[]>(
    `/v1/staff/line/inbox?status=${statusFilter}&limit=50`,
    { refreshInterval: 5000 },
  );

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="shrink-0 px-6 pt-4 pb-2">
        <PageHeader title="กล่องข้อความ" description="สนทนากับลูกค้าผ่าน LINE" />
      </div>

      <div className="flex min-h-0 flex-1 gap-0 border-t">
        {/* Session List */}
        <div className="w-80 shrink-0 overflow-y-auto border-r bg-muted/30">
          <div className="sticky top-0 z-10 flex gap-1 border-b bg-background p-2">
            {['active', 'resolved'].map((s) => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setSelectedId(null); }}
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
                onClick={() => setSelectedId(s.id)}
                className={cn(
                  'flex w-full flex-col gap-1 border-b px-4 py-3 text-left transition-colors',
                  selectedId === s.id
                    ? 'bg-primary/10'
                    : 'hover:bg-muted/50',
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {s.patientFirstName} {s.patientLastName}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {s.updatedAt && !isNaN(new Date(s.updatedAt).getTime()) 
                      ? new Date(s.updatedAt).toLocaleString('th-TH', {
                          hour: '2-digit',
                          minute: '2-digit',
                          day: '2-digit',
                          month: 'short',
                        })
                      : '-'}
                  </span>
                </div>
                {s.lastMessage && (
                  <p className="truncate text-xs text-muted-foreground">
                    {s.lastMessage.role === 'pharmacist' && '🧑‍⚕️ '}
                    {s.lastMessage.content}
                  </p>
                )}
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                    s.status === 'active'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600',
                  )}>
                    {s.status === 'active' ? <Clock className="h-2.5 w-2.5" /> : <CheckCircle className="h-2.5 w-2.5" />}
                    {s.status === 'active' ? 'เปิด' : 'แก้ไขแล้ว'}
                  </span>
                  {s.assignedTo && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                      <UserCheck className="h-2.5 w-2.5" /> รับแล้ว
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground">
                    {s.messageCount} ข้อความ
                  </span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Chat Panel */}
        {selectedId ? (
          <ChatPanel
            sessionId={selectedId}
            onUpdate={() => mutateSessions()}
          />
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

function ChatPanel({ sessionId, onUpdate }: { sessionId: string; onUpdate: () => void }) {
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data, mutate } = useApi<{ session: any; messages: ChatMessage[] }>(
    `/v1/staff/line/inbox/${sessionId}`,
    { refreshInterval: 3000 },
  );

  const session = data?.session;
  const messages = data?.messages ?? [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  async function handleSend() {
    if (!input.trim() || sending) return;
    setSending(true);
    try {
      await api.post(`/v1/staff/line/inbox/${sessionId}/reply`, { content: input.trim() });
      setInput('');
      mutate();
      onUpdate();
    } catch (e: any) {
      alert(e.message ?? 'ส่งไม่สำเร็จ');
    } finally {
      setSending(false);
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

  if (!data) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
            <User className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">
              {session?.patientFirstName} {session?.patientLastName}
            </p>
            <p className="text-xs text-muted-foreground">
              {session?.lineUserId ? `LINE: ${session.lineUserId.slice(0, 10)}...` : 'ไม่มี LINE'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {session?.status === 'active' && !session?.assignedTo && (
            <button
              onClick={handleAssign}
              className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted"
            >
              <UserCheck className="mr-1 inline h-3 w-3" /> รับเรื่อง
            </button>
          )}
          {session?.status === 'active' && (
            <button
              onClick={handleResolve}
              className="rounded-md border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100"
            >
              <CheckCircle className="mr-1 inline h-3 w-3" /> แก้ไขแล้ว
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              'flex',
              m.role === 'user' ? 'justify-start' : 'justify-end',
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
                      : 'bg-gray-200 text-gray-700',
              )}
            >
              {m.role !== 'user' && (
                <p className="mb-0.5 text-[10px] font-medium opacity-70">
                  {m.role === 'pharmacist' ? '🧑‍⚕️ เภสัชกร' : m.role === 'bot' ? '🤖 Bot' : '⚙️ ระบบ'}
                </p>
              )}
              <p className="whitespace-pre-wrap">{m.content}</p>
              <p className={cn(
                'mt-1 text-[10px]',
                m.role === 'pharmacist' ? 'text-primary-foreground/60' : 'text-muted-foreground',
              )}>
                {new Date(m.createdAt).toLocaleTimeString('th-TH', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {session?.status === 'active' && (
        <div className="border-t p-3">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="พิมพ์ข้อความตอบกลับ..."
              className="flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              ส่ง
            </button>
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">
            ข้อความจะถูกส่งถึงลูกค้าผ่าน LINE โดยตรง
          </p>
        </div>
      )}
    </div>
  );
}
