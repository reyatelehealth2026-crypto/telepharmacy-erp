'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Send,
  Sparkles,
  Bot,
  User,
  Pill,
  AlertTriangle,
  Stethoscope,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { sendAiChat } from '@/lib/ai-chat';
import { useAuthStore } from '@/store/auth';
import { useAuthGuard } from '@/lib/use-auth-guard';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  recommendations?: Array<{
    type: 'drug' | 'advice';
    name: string;
    description: string;
  }>;
}

const SUGGESTED_QUESTIONS = [
  'มีอาการปวดหัว ควรซื้อยาอะไรดี?',
  'ท้องเสียควรกินยาอะไร',
  'มีผื่นคันแต่ไม่แพ้อาหาร',
  'เป็นไข้หวัดแล้วเวียนหัว',
];

export default function AIChatbotPage() {
  const router = useRouter();
  const { token, loading: authLoading } = useAuthGuard();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'สวัสดีค่ะ! ดิฉันเป็น AI ผู้ช่วยเภสัชกร 🤖\n\nดิฉันสามารถช่วยแนะนำยาเบื้องต้นจากอาการที่คุณเล่าให้ฟัง แต่ไม่สามารถวินิจฉัยโรคหรือแทนการปรึกษาแพทย์/เภสัชกรได้นะคะ',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !token) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const history = messages
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({ role: m.role, content: m.content }));

      const response = await sendAiChat(token, input, history);

      const recommendations: ChatMessage['recommendations'] = [];

      if (response.products?.length) {
        for (const p of response.products) {
          recommendations.push({
            type: 'drug',
            name: p.name,
            description: p.reason,
          });
        }
      }

      if (response.disclaimer) {
        recommendations.push({
          type: 'advice',
          name: 'คำเตือน',
          description: response.disclaimer,
        });
      }

      if (response.shouldTransfer) {
        recommendations.push({
          type: 'advice',
          name: 'แนะนำ',
          description: 'ควรปรึกษาเภสัชกรโดยตรง',
        });
      }

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.message,
        ...(recommendations.length > 0 ? { recommendations } : {}),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'ขออภัย ไม่สามารถเชื่อมต่อ AI ได้ กรุณาลองใหม่',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <Link href="/" className="rounded-full p-1 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex flex-1 items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-purple-600">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold">AI เภสัชกร</h1>
            <p className="text-xs text-muted-foreground">ปรึกษาอาการเบื้องต้น</p>
          </div>
        </div>
        <Badge variant="secondary" className="text-[10px]">Beta</Badge>
      </div>

      {/* Disclaimer */}
      <div className="bg-amber-50 px-4 py-2 text-center">
        <p className="text-[10px] text-amber-700">
          <AlertTriangle className="inline h-3 w-3 mr-1" />
          AI นี้ไม่สามารถวินิจฉัยโรคหรือทดแทนการพบแพทย์ได้
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                {msg.role === 'assistant' ? (
                  <Bot className="h-3 w-3" />
                ) : (
                  <User className="h-3 w-3" />
                )}
                <span className="text-[10px] opacity-70">
                  {msg.role === 'assistant' ? 'AI เภสัชกร' : 'คุณ'}
                </span>
              </div>
              <p className="text-sm whitespace-pre-line">{msg.content}</p>

              {msg.recommendations && (
                <div className="mt-3 space-y-2">
                  {msg.recommendations.map((rec, i) => (
                    <div
                      key={i}
                      className={`rounded-lg p-2 text-xs ${
                        rec.type === 'drug'
                          ? 'bg-blue-50 text-blue-800'
                          : rec.type === 'advice'
                          ? 'bg-amber-50 text-amber-800'
                          : 'bg-muted'
                      }`}
                    >
                      <div className="flex items-center gap-1 font-medium">
                        {rec.type === 'drug' && <Pill className="h-3 w-3" />}
                        {rec.name}
                      </div>
                      <p className="opacity-80">{rec.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
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

      {/* Suggested Questions */}
      {messages.length === 1 && (
        <div className="flex gap-2 overflow-x-auto px-4 py-2">
          {SUGGESTED_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => { setInput(q); }}
              className="whitespace-nowrap rounded-full border px-3 py-1.5 text-xs hover:bg-muted"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="border-t p-4 safe-area-bottom">
        <div className="mx-auto flex max-w-lg items-center gap-2">
          <input
            className="flex-1 rounded-full border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="เล่าอาการของคุณ..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <Button
            size="icon"
            className="rounded-full"
            disabled={!input.trim() || loading}
            onClick={handleSend}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-2 flex items-center justify-center gap-2">
          <Link
            href="/chat"
            className="text-xs text-primary flex items-center gap-1"
          >
            <Stethoscope className="h-3 w-3" />
            ปรึกษาเภสัชกรจริง
          </Link>
        </div>
      </div>
    </div>
  );
}