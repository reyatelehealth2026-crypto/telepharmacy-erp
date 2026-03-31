'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Send,
  Image as ImageIcon,
  Loader2,
  CheckCheck,
  Phone,
  Video,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/store/auth';
import { useAuthGuard } from '@/lib/use-auth-guard';
import {
  getOrCreateSession,
  getMessages,
  sendChatMessage,
  type ChatMessage,
} from '@/lib/chat';

export default function ChatConsultationPage() {
  const { token, loading: authLoading } = useAuthGuard();
  const { patient } = useAuthStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const lastTimestampRef = useRef<string | undefined>(undefined);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize session and load messages
  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    async function init() {
      try {
        const session = await getOrCreateSession(token!);
        if (cancelled) return;
        setSessionId(session.id);

        const res = await getMessages(token!, session.id);
        if (cancelled) return;
        setMessages(res.data);
        setAssignedTo(res.assignedTo);

        if (res.data.length > 0) {
          const last = res.data[res.data.length - 1];
          if (last) lastTimestampRef.current = last.createdAt;
        }
      } catch (err) {
        console.error('Failed to init chat session:', err);
      } finally {
        if (!cancelled) setSessionLoading(false);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [token]);

  // Poll for new messages every 3 seconds
  useEffect(() => {
    if (!sessionId || !token) return;

    const interval = setInterval(async () => {
      try {
        const res = await getMessages(
          token,
          sessionId,
          lastTimestampRef.current,
        );
        if (res.data.length > 0) {
          setMessages((prev) => [...prev, ...res.data]);
          const last = res.data[res.data.length - 1];
          if (last) lastTimestampRef.current = last.createdAt;
        }
        if (res.assignedTo) setAssignedTo(res.assignedTo);
      } catch {
        // Silently ignore polling errors
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [sessionId, token]);

  const handleSend = useCallback(async () => {
    if (!inputText.trim() || !sessionId || !token || sending) return;

    const text = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      const msg = await sendChatMessage(token, sessionId, text);
      setMessages((prev) => [...prev, msg]);
      lastTimestampRef.current = msg.createdAt;
    } catch (err) {
      console.error('Failed to send message:', err);
      // Restore input on failure
      setInputText(text);
    } finally {
      setSending(false);
    }
  }, [inputText, sessionId, token, sending]);

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (authLoading || sessionLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isPharmacistMsg = (role: string) =>
    role === 'system' || role === 'pharmacist';

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <Link href="/" className="rounded-full p-1 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex flex-1 items-center gap-3">
          <div className="relative">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <span className="text-sm font-bold text-primary">พญ.</span>
            </div>
            {assignedTo && (
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-bold truncate">
              {assignedTo ? 'เภสัชกร' : 'ระบบอัตโนมัติ'}
            </h1>
            <p className="text-xs text-muted-foreground">
              {assignedTo ? (
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  ออนไลน์
                </span>
              ) : (
                'รอเภสัชกรรับเรื่อง'
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-1">
          <button className="rounded-full p-2 hover:bg-muted">
            <Phone className="h-4 w-4 text-muted-foreground" />
          </button>
          <button className="rounded-full p-2 hover:bg-muted">
            <Video className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              }`}
            >
              <p className="text-sm">{msg.content}</p>
              <div
                className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
                  msg.role === 'user'
                    ? 'text-primary-foreground/70'
                    : 'text-muted-foreground'
                }`}
              >
                <span>{formatTime(msg.createdAt)}</span>
                {msg.role === 'user' && (
                  <CheckCheck className="h-3 w-3" />
                )}
              </div>
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1 rounded-2xl bg-muted px-4 py-3">
              <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:100ms]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:200ms]" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2 overflow-x-auto px-4 py-2">
        {[
          'ยาที่กินอยู่มีผลข้างเคียง?',
          'สั่งยาซ้ำ',
          'ถามเรื่องยาใหม่',
          'นัดปรึกษา',
        ].map((text) => (
          <button
            key={text}
            onClick={() => setInputText(text)}
            className="whitespace-nowrap rounded-full border px-3 py-1.5 text-xs hover:bg-muted"
          >
            {text}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="border-t p-4 safe-area-bottom">
        <div className="mx-auto flex max-w-lg items-center gap-2">
          <label className="rounded-full p-2 hover:bg-muted cursor-pointer">
            <ImageIcon className="h-5 w-5 text-muted-foreground" />
            <input type="file" accept="image/*" className="hidden" />
          </label>
          <Input
            className="flex-1"
            placeholder="พิมพ์ข้อความ..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button
            size="icon"
            disabled={!inputText.trim() || sending}
            onClick={handleSend}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-2 text-center text-[10px] text-muted-foreground">
          ข้อมูลการสนทนาถูกเก็บเป็นความลับตามมาตรฐาน PDPA
        </p>
      </div>
    </div>
  );
}
