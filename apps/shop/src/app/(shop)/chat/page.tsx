'use client';

import { useState, useEffect, useRef } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/auth';

interface ChatMessage {
  id: string;
  sender: 'user' | 'pharmacist';
  text: string;
  timestamp: string;
  read: boolean;
  imageUrl?: string;
}

export default function ChatConsultationPage() {
  const { patient } = useAuthStore();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'pharmacist',
      text: 'สวัสดีค่ะ ดิฉันเภสัชกรรุ่งนภา ยินดีให้คำปรึกษาค่ะ มีอะไรให้ช่วยเหลือคะ?',
      timestamp: new Date().toISOString(),
      read: true,
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [pharmacistOnline, setPharmacistOnline] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Simulate pharmacist online status changing
  useEffect(() => {
    const interval = setInterval(() => {
      // Randomly toggle online status (in production, this would be from WebSocket)
      if (Math.random() > 0.9) {
        setPharmacistOnline((prev) => !prev);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSend = () => {
    if (!inputText.trim()) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: inputText,
      timestamp: new Date().toISOString(),
      read: false,
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputText('');
    setSending(true);

    // Simulate pharmacist typing and response
    setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) => (m.id === newMessage.id ? { ...m, read: true } : m))
      );

      setTimeout(() => {
        const pharmacistReply: ChatMessage = {
          id: (Date.now() + 1).toString(),
          sender: 'pharmacist',
          text: 'ขอบคุณสำหรับคำถามค่ะ ดิฉันจะตรวจสอบและตอบกลับให้เร็วที่สุดค่ะ',
          timestamp: new Date().toISOString(),
          read: true,
        };
        setMessages((prev) => [...prev, pharmacistReply]);
        setSending(false);
      }, 1500);
    }, 1000);
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  };

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
            {pharmacistOnline && (
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-bold truncate">เภสัชกรรุ่งนภา</h1>
            <p className="text-xs text-muted-foreground">
              {pharmacistOnline ? (
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  ออนไลน์
                </span>
              ) : (
                'ออฟไลน์'
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
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                msg.sender === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              }`}
            >
              <p className="text-sm">{msg.text}</p>
              <div
                className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
                  msg.sender === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                }`}
              >
                <span>{formatTime(msg.timestamp)}</span>
                {msg.sender === 'user' && (
                  <CheckCheck className={`h-3 w-3 ${msg.read ? 'text-blue-400' : ''}`} />
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
        {['ยาที่กินอยู่มีผลข้างเคียง?', 'สั่งยาซ้ำ', 'ถามเรื่องยาใหม่', 'นัดปรึกษา'].map(
          (text) => (
            <button
              key={text}
              onClick={() => setInputText(text)}
              className="whitespace-nowrap rounded-full border px-3 py-1.5 text-xs hover:bg-muted"
            >
              {text}
            </button>
          )
        )}
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
