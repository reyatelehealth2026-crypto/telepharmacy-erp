'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MessageCircle, Video, Clock, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthGuard } from '@/lib/use-auth-guard';
import { toast } from 'sonner';
import { requestConsultation, type ConsultationType } from '@/lib/consultation';

type ConsultationMethod = 'chat' | 'video';

const METHOD_TO_TYPE: Record<ConsultationMethod, ConsultationType> = {
  chat: 'general_health',
  video: 'medication_review',
};

export default function ConsultationPage() {
  const router = useRouter();
  const { loading: authLoading, token } = useAuthGuard();
  const [consultationMethod, setConsultationMethod] = useState<ConsultationMethod>('chat');
  const [topic, setTopic] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
      toast.success('ส่งคำขอปรึกษาเรียบร้อยแล้ว');
      // Navigate to consent page — consent is required before starting consultation
      router.push(`/consultation/${res.consultationId}/consent`);
    } catch (err: any) {
      toast.error(err?.message || 'ส่งคำขอไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pb-32">
      <div className="flex items-center gap-3 px-4 py-3">
        <Link href="/" className="rounded-full p-1 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold">ปรึกษาเภสัชกร</h1>
      </div>

      <div className="space-y-4 px-4">
        {/* Service Info */}
        <div className="rounded-xl bg-secondary p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-secondary-foreground">
              บริการให้คำปรึกษาโดยเภสัชกร
            </h2>
            <Link href="/consultation/history" className="text-xs text-primary underline">
              ประวัติ
            </Link>
          </div>
          <p className="mt-1 text-xs text-secondary-foreground/80">
            เภสัชกรที่มีใบอนุญาตพร้อมให้คำปรึกษาเรื่องยาและสุขภาพ
          </p>
        </div>

        {/* Consultation Type Selection — chat or video */}
        <div>
          <h2 className="text-sm font-bold">เลือกประเภทการปรึกษา</h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <button
              className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-colors ${
                consultationMethod === 'chat'
                  ? 'border-primary bg-primary/5'
                  : 'border-transparent bg-muted/50 hover:bg-muted'
              }`}
              onClick={() => setConsultationMethod('chat')}
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-full ${
                consultationMethod === 'chat' ? 'bg-primary text-white' : 'bg-muted-foreground/10 text-muted-foreground'
              }`}>
                <MessageCircle className="h-6 w-6" />
              </div>
              <span className="text-sm font-medium">แชท</span>
              <span className="text-xs text-muted-foreground">ส่งข้อความ</span>
              {consultationMethod === 'chat' && (
                <CheckCircle className="h-4 w-4 text-primary" />
              )}
            </button>

            <button
              className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-colors ${
                consultationMethod === 'video'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-transparent bg-muted/50 hover:bg-muted'
              }`}
              onClick={() => setConsultationMethod('video')}
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-full ${
                consultationMethod === 'video' ? 'bg-blue-500 text-white' : 'bg-muted-foreground/10 text-muted-foreground'
              }`}>
                <Video className="h-6 w-6" />
              </div>
              <span className="text-sm font-medium">วิดีโอคอล</span>
              <span className="text-xs text-muted-foreground">พูดคุยสด</span>
              {consultationMethod === 'video' && (
                <CheckCircle className="h-4 w-4 text-blue-500" />
              )}
            </button>
          </div>
        </div>

        {/* Consent Notice */}
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs text-amber-700">
            ⚖️ ตาม พ.ร.บ. เทเลเมดิซีน พ.ศ. 2569 ท่านจะต้องลงนามยินยอมรับบริการ (e-Consent) ก่อนเริ่มการปรึกษา
          </p>
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
            <p className="mt-1 text-xs text-destructive">
              กรุณาระบุอย่างน้อย 10 ตัวอักษร ({topic.length}/10)
            </p>
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

      {/* Submit Button */}
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
            ) : consultationMethod === 'chat' ? (
              <MessageCircle className="h-4 w-4" />
            ) : (
              <Video className="h-4 w-4" />
            )}
            {submitting
              ? 'กำลังส่ง...'
              : consultationMethod === 'chat'
                ? 'เริ่มแชทกับเภสัชกร'
                : 'ขอนัดวิดีโอคอล'}
          </Button>
        </div>
      </div>
    </div>
  );
}
