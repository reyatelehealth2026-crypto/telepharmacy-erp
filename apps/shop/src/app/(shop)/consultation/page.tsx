'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, MessageCircle, Video, Phone, Clock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthGuard } from '@/lib/use-auth-guard';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { requestConsultation, type ConsultationType } from '@/lib/consultation';

type ConsultationMethod = 'chat' | 'video' | 'phone';

const METHOD_TO_TYPE: Record<ConsultationMethod, ConsultationType> = {
  chat: 'general_health',
  video: 'medication_review',
  phone: 'general_health',
};

export default function ConsultationPage() {
  const { loading: authLoading, token } = useAuthGuard();
  const [submitted, setSubmitted] = useState(false);
  const [consultationId, setConsultationId] = useState<string | null>(null);
  const [consultationMethod, setConsultationMethod] = useState<ConsultationMethod>('chat');
  const [topic, setTopic] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (authLoading) return <div className="flex items-center justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  const handleSubmit = async () => {
    if (topic.length < 10) {
      toast.error('กรุณาระบุรายละเอียดอย่างน้อย 10 ตัวอักษร');
      return;
    }
    if (!token) {
      toast.error('กรุณาเข้าสู่ระบบก่อน');
      return;
    }

    setSubmitting(true);
    try {
      const res = await requestConsultation(token, {
        type: METHOD_TO_TYPE[consultationMethod],
        chiefComplaint: topic,
      });
      setConsultationId(res.consultationId);
      setSubmitted(true);
    } catch (err: any) {
      toast.error(err?.message || 'ส่งคำขอไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-20">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <CheckCircle className="h-8 w-8 text-primary" />
        </div>
        <h2 className="mt-4 text-lg font-bold">ส่งคำขอแล้ว</h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          เภสัชกรจะติดต่อกลับภายใน 15 นาที
          <br />
          ผ่านทาง LINE
        </p>
        {consultationId && (
          <p className="mt-2 text-xs text-muted-foreground">
            หมายเลขคำขอ: {consultationId}
          </p>
        )}
        <Link
          href="/"
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          กลับหน้าหลัก
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-32">
      <div className="flex items-center gap-3 px-4 py-3">
        <Link href="/" className="rounded-full p-1 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold">ปรึกษาเภสัชกร</h1>
      </div>

      <div className="space-y-4 px-4">
        <div className="rounded-xl bg-secondary p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-secondary-foreground">
              บริการให้คำปรึกษาโดยเภสัชกร
            </h2>
            <Link href="/consultation/history" className="text-xs text-primary underline">ประวัติ</Link>
          </div>
          <p className="mt-1 text-xs text-secondary-foreground/80">
            เภสัชกรที่มีใบอนุญาตพร้อมให้คำปรึกษาเรื่องยาและสุขภาพ
          </p>
        </div>

        {/* Method Selection */}
        <div>
          <h2 className="text-sm font-bold">เลือกช่องทาง</h2>
          <div className="mt-3 space-y-2">
            <button
              className={`flex w-full items-center gap-3 rounded-xl border p-4 ${consultationMethod === 'chat' ? 'border-primary bg-secondary' : 'hover:bg-muted'}`}
              onClick={() => setConsultationMethod('chat')}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white">
                <MessageCircle className="h-5 w-5" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium">แชท LINE</p>
                <p className="text-xs text-muted-foreground">ตอบกลับภายใน 5 นาที</p>
              </div>
              {consultationMethod === 'chat' && <CheckCircle className="ml-auto h-5 w-5 text-primary" />}
            </button>
            <button
              className={`flex w-full items-center gap-3 rounded-xl border p-4 ${consultationMethod === 'video' ? 'border-primary bg-secondary' : 'hover:bg-muted'}`}
              onClick={() => setConsultationMethod('video')}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500 text-white">
                <Video className="h-5 w-5" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium">วิดีโอคอล</p>
                <p className="text-xs text-muted-foreground">นัดเวลาล่วงหน้า</p>
              </div>
              {consultationMethod === 'video' && <CheckCircle className="ml-auto h-5 w-5 text-primary" />}
            </button>
            <button
              className={`flex w-full items-center gap-3 rounded-xl border p-4 ${consultationMethod === 'phone' ? 'border-primary bg-secondary' : 'hover:bg-muted'}`}
              onClick={() => setConsultationMethod('phone')}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500 text-white">
                <Phone className="h-5 w-5" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium">โทรศัพท์</p>
                <p className="text-xs text-muted-foreground">โทรกลับภายใน 15 นาที</p>
              </div>
              {consultationMethod === 'phone' && <CheckCircle className="ml-auto h-5 w-5 text-primary" />}
            </button>
          </div>
        </div>

        {/* Topic */}
        <div>
          <label className="text-sm font-bold">เรื่องที่ต้องการปรึกษา</label>
          <textarea
            className="mt-2 w-full rounded-xl border p-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            rows={4}
            placeholder="เช่น อยากถามเรื่องยาที่กินอยู่, มีอาการข้างเคียงจากยา, อยากเปลี่ยนยา..."
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
          {topic.length > 0 && topic.length < 10 && (
            <p className="mt-1 text-xs text-destructive">กรุณาระบุอย่างน้อย 10 ตัวอักษร ({topic.length}/10)</p>
          )}
        </div>

        {/* Available Hours */}
        <div className="rounded-xl border p-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold">เวลาให้บริการ</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            จันทร์ - เสาร์: 08:00 - 20:00
            <br />
            อาทิตย์: 09:00 - 18:00
          </p>
        </div>
      </div>

      <div className="fixed bottom-16 left-0 right-0 z-40 border-t bg-white p-4">
        <div className="mx-auto max-w-lg">
          <Button
            className="w-full"
            size="lg"
            onClick={handleSubmit}
            disabled={topic.length < 10 || submitting}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MessageCircle className="h-4 w-4" />
            )}
            {submitting ? 'กำลังส่ง...' : 'ส่งคำขอปรึกษา'}
          </Button>
        </div>
      </div>
    </div>
  );
}
