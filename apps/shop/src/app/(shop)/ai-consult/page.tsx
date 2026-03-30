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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'สวัสดีค่ะ! ดิฉันเป็น AI ผู้ช่วยเภสัชกร 🤖\n\nดิฉันสามารถช่วยแนะนำยาเบื้องต้นจากอาการที่คุณเล่าให้ฟัง แต่ไม่สามารถวินิจฉัยโรคหรือแทนการปรึกษาแพทย์/เภสัชกรได้นะคะ',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse = generateAIResponse(input);
      setMessages((prev) => [...prev, aiResponse]);
      setLoading(false);
    }, 1500);
  };

  const generateAIResponse = (userInput: string): ChatMessage => {
    const lower = userInput.toLowerCase();
    
    if (lower.includes('ปวดหัว') || lower.includes('ไมเกรน')) {
      return {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'อาการปวดหัวอาจเกิดจากหลายสาเหตุค่ะ ยาเบื้องต้นที่แนะนำ:',
        recommendations: [
          { type: 'drug', name: 'พาราเซตามอล (Paracetamol)', description: 'ลดปวด ลดไข้ 500mg 1-2 เม็ด ทุก 4-6 ชม.' },
          { type: 'drug', name: 'ไอบูโพรเฟน (Ibuprofen)', description: 'NSAID ลดอักเสบ 200-400mg หลังอาหาร' },
          { type: 'advice', name: 'คำแนะนำ', description: 'พักผ่อนให้เพียงพอ ดื่มน้ำมากๆ หลีกเลี่ยงแสงจ้า' },
        ],
      };
    }

    if (lower.includes('ท้องเสีย') || lower.includes('ถ่าย')) {
      return {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'ท้องเสียอาจเกิดจากอาหารเป็นพิษหรือไวรัสค่ะ แนะนำ:',
        recommendations: [
          { type: 'drug', name: 'สมูทติ้งเอล (Smecta)', description: 'ดินสมานท้อง ซองละ 3g ผสมน้ำ' },
          { type: 'drug', name: 'ออรัลรีไฮเดรเทชั่น (ORS)', description: 'น้ำเกลือแร่ชดเชยการสูญเสียน้ำ' },
          { type: 'advice', name: 'คำเตือน', description: 'ถ้ามีเลือดหรือท้องเสียมากกว่า 3 วัน ควรพบแพทย์' },
        ],
      };
    }

    if (lower.includes('คัดจมูก') || lower.includes('ไข้หวัด') || lower.includes('จาม')) {
      return {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'อาการไข้หวัดทั่วไป แนะนำยาบรรเทาอาการ:',
        recommendations: [
          { type: 'drug', name: 'ยาแก้แพ้ (Antihistamine)', description: 'Cetirizine 10mg วันละ 1 เม็ด' },
          { type: 'drug', name: 'พาราเซตามอล', description: 'ลดไข้ 500mg เมื่อมีไข้' },
          { type: 'advice', name: 'คำแนะนำ', description: 'ดื่มน้ำอุ่น พักผ่อน งดอาหารเย็น' },
        ],
      };
    }

    if (lower.includes('ผื่น') || lower.includes('คัน')) {
      return {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'ผื่นคันอาจเกิดจากภูมิแพ้หรือผิวหนังอักเสบค่ะ:',
        recommendations: [
          { type: 'drug', name: 'ยาแก้แพ้ (Cetirizine)', description: 'ลดอาการคัน 10mg วันละครั้ง' },
          { type: 'drug', name: 'แคลามายด์โลชั่น', description: 'ทาผิวบรรเทาคัน 3-4 ครั้ง/วัน' },
          { type: 'advice', name: 'คำเตือน', description: 'หากผื่นลามเร็วหรือมีไข้สูง รีบพบแพทย์' },
        ],
      };
    }

    return {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: 'ขออภัยค่ะ ดิฉันไม่แน่ใจอาการนี้ แนะนำให้:\n\n1. อธิบายอาการเพิ่มเติม เช่น ปวดตรงไหน มานานแค่ไหน\n2. หรือคลิก "ปรึกษาเภสัชกร" เพื่อคุยกับเภสัชกรโดยตรง',
    };
  };

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
