'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Video, FileText, Clock, CheckCircle, Loader2,
  AlertTriangle, Send, MessageCircle,
} from 'lucide-react';
import { useAuthGuard } from '@/lib/use-auth-guard';
import {
  getConsultation, listConsultationMessages, sendConsultationMessage,
  type Consultation, type ChatMessage,
} from '@/lib/telemedicine';
import { toast } from 'sonner';

const STATUS_LABEL: Record<string, string> = {
  requested: 'รอดำเนินการ',
  scope_validated: 'ผ่านการตรวจสอบ',
  consent_pending: 'รอยินยอม',
  consent_accepted: 'ยินยอมแล้ว',
  pharmacist_assigned: 'เภสัชกรรับเรื่อง',
  in_progress: 'กำลังปรึกษา',
  completed: 'เสร็จสิ้น',
  referred: 'ส่งต่อ',
  cancelled: 'ยกเลิก',
  expired: 'หมดอายุ',
};

const STATUS_COLOR: Record<string, string> = {
  requested: 'bg-amber-100 text-amber-700',
  consent_pending: 'bg-blue-100 text-blue-700',
  consent_accepted: 'bg-blue-100 text-blue-700',
  pharmacist_assigned: 'bg-indigo-100 text-indigo-700',
  in_progress: 'bg-green-100 text-green-700',
  completed: 'bg-green-200 text-green-800',
  cancelled: 'bg-red-100 text-red-700',
};

export default function ConsultationDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { loading: authLoading, token, patient } = useAuthGuard();
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch consultation detail
  useEffect(() => {
    if (!token || !id) return;
    getConsultation(token, id as string)
      .then(data => setConsultation(data))
      .catch(err => toast.error(err.message))
      .finally(() => setLoading(false));
  }, [token, id]);

  // Fetch chat messages and poll for new ones
  useEffect(() => {
    if (!token || !id || !consultation) return;
    const canChat = ['pharmacist_assigned', 'in_progress', 'consent_accepted'].includes(consultation.status);
    if (!canChat && consultation.status !== 'completed') return;

    const fetchMessages = () => {
      listConsultationMessages(token, id as string)
        .then(res => setMessages(res.data ?? []))
        .catch(() => {});
    };

    fetchMessages();

    // Poll every 5 seconds for active consultations
    if (canChat) {
      pollRef.current = setInterval(fetchMessages, 5000);
    }

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [token, id, consultation?.status]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(async () => {
    if (!newMessage.trim() || !token || !id || sending) return;
    setSending(true);
    try {
      const msg = await sendConsultationMessage(token, id as string, newMessage.trim());
      setMessages(prev => [...prev, msg]);
      setNewMessage('');
    } catch (err: any) {
      toast.error(err?.message || 'ส่งข้อความไม่สำเร็จ');
    } finally {
      setSending(false);
    }
  }, [newMessage, token, id, sending]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!consultation) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-2">
        <p className="text-muted-foreground">ไม่พบข้อมูล</p>
        <Link href="/consultation" className="text-sm text-primary underline">กลับ</Link>
      </div>
    );
  }

  const canConsent = consultation.status === 'consent_pending' || consultation.status === 'scope_validated';
  const canJoinVideo = ['pharmacist_assigned', 'in_progress', 'consent_accepted'].includes(consultation.status);
  const canChat = ['pharmacist_assigned', 'in_progress', 'consent_accepted'].includes(consultation.status);
  const showChat = canChat || consultation.status === 'completed';

  return (
    <div className={showChat ? 'flex h-[calc(100vh-4rem)] flex-col' : 'pb-20'}>
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <Link href="/consultation/history" className="rounded-full p-1 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold truncate">
            {consultation.pharmacistName ? `ภญ. ${consultation.pharmacistName}` : 'รายละเอียดการปรึกษา'}
          </h1>
          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[consultation.status] ?? 'bg-muted'}`}>
            {STATUS_LABEL[consultation.status] ?? consultation.status}
          </span>
        </div>
        {canJoinVideo && (
          <Link
            href={`/consultation/${id}/video`}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500 text-white"
          >
            <Video className="h-4 w-4" />
          </Link>
        )}
      </div>

      {/* Consent Required Banner */}
      {canConsent && (
        <div className="border-b bg-amber-50 px-4 py-3">
          <p className="text-xs text-amber-700 mb-2">
            กรุณายินยอมรับบริการก่อนเริ่มการปรึกษา (ตาม พ.ร.บ. เทเลเมดิซีน 2569)
          </p>
          <Link
            href={`/consultation/${id}/consent`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
          >
            <FileText className="h-3.5 w-3.5" /> ยินยอมรับบริการ (e-Consent)
          </Link>
        </div>
      )}

      {/* Referral Notice */}
      {consultation.status === 'referred' && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-700">ส่งต่อพบแพทย์</span>
          </div>
          <p className="mt-1 text-xs text-amber-600">
            เภสัชกรแนะนำให้พบแพทย์เพื่อรับการรักษาเพิ่มเติม
          </p>
        </div>
      )}

      {showChat ? (
        <>
          {/* Chat Messages Area */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {/* Chief complaint as system message */}
            <div className="flex justify-center">
              <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                เรื่อง: {consultation.chiefComplaint}
              </span>
            </div>

            {messages.length === 0 && canChat && (
              <div className="flex justify-center py-8">
                <p className="text-xs text-muted-foreground">เริ่มพิมพ์ข้อความเพื่อสนทนากับเภสัชกร</p>
              </div>
            )}

            {messages.map((msg) => {
              const isMe = msg.senderType === 'patient';
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[75%] rounded-2xl px-3.5 py-2 ${
                      isMe
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-muted rounded-bl-md'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <p className={`mt-1 text-right text-[10px] ${isMe ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                      {new Date(msg.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          {canChat && (
            <div className="border-t bg-white px-4 py-3">
              <div className="flex items-end gap-2">
                <textarea
                  className="flex-1 resize-none rounded-xl border px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  rows={1}
                  placeholder="พิมพ์ข้อความ..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={sending}
                />
                <button
                  onClick={handleSend}
                  disabled={!newMessage.trim() || sending}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          )}

          {consultation.status === 'completed' && (
            <div className="border-t bg-muted/50 px-4 py-3 text-center">
              <p className="text-xs text-muted-foreground">การปรึกษาเสร็จสิ้นแล้ว</p>
            </div>
          )}
        </>
      ) : (
        /* Non-chat view: show detail + timeline */
        <div className="space-y-4 px-4 pt-4">
          {/* Status Card */}
          <div className="rounded-xl border p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">สถานะ</span>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLOR[consultation.status] ?? 'bg-muted'}`}>
                {STATUS_LABEL[consultation.status] ?? consultation.status}
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{consultation.chiefComplaint}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              สร้างเมื่อ: {new Date(consultation.createdAt).toLocaleString('th-TH')}
            </p>
          </div>

          {/* Pharmacist Info */}
          {consultation.pharmacistName && (
            <div className="rounded-xl border p-4">
              <p className="text-sm font-medium">เภสัชกร</p>
              <p className="text-sm">{consultation.pharmacistName}</p>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2">
            {canConsent && (
              <Link
                href={`/consultation/${id}/consent`}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground"
              >
                <FileText className="h-4 w-4" /> ยินยอมรับบริการ (e-Consent)
              </Link>
            )}
            {canJoinVideo && (
              <Link
                href={`/consultation/${id}/video`}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white"
              >
                <Video className="h-4 w-4" /> เข้าร่วมวิดีโอคอล
              </Link>
            )}
          </div>

          {/* Timeline */}
          <div className="rounded-xl border p-4">
            <h3 className="text-sm font-bold mb-3">Timeline</h3>
            <div className="space-y-3">
              {[
                { label: 'ส่งคำขอ', date: consultation.createdAt, done: true },
                { label: 'ยินยอม', date: null, done: ['consent_accepted', 'pharmacist_assigned', 'in_progress', 'completed'].includes(consultation.status) },
                { label: 'เภสัชกรรับเรื่อง', date: null, done: ['pharmacist_assigned', 'in_progress', 'completed'].includes(consultation.status) },
                { label: 'เริ่มปรึกษา', date: consultation.startedAt, done: ['in_progress', 'completed'].includes(consultation.status) },
                { label: 'เสร็จสิ้น', date: consultation.endedAt, done: consultation.status === 'completed' },
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`h-3 w-3 rounded-full ${step.done ? 'bg-green-500' : 'bg-muted-foreground/30'}`} />
                  <span className={`flex-1 text-sm ${step.done ? 'font-medium' : 'text-muted-foreground'}`}>
                    {step.label}
                  </span>
                  {step.date && (
                    <span className="text-xs text-muted-foreground">
                      {new Date(step.date).toLocaleString('th-TH')}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
