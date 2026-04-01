'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, CheckCircle, FileSignature } from 'lucide-react';
import { useAuthGuard } from '@/lib/use-auth-guard';
import { getConsentTemplate, acceptConsultationConsent, type ConsentTemplate } from '@/lib/telemedicine';
import { toast } from 'sonner';

export default function ConsentPage() {
  const { id } = useParams();
  const router = useRouter();
  const { loading: authLoading, token } = useAuthGuard();
  const [template, setTemplate] = useState<ConsentTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [startTime] = useState(Date.now());
  const contentRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);

  useEffect(() => {
    if (!token) return;
    getConsentTemplate(token)
      .then(data => setTemplate(data))
      .catch(err => toast.error(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  // Track scroll to end
  const handleScroll = () => {
    if (!contentRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
    if (scrollTop + clientHeight >= scrollHeight - 20) setScrolledToEnd(true);
  };

  // Signature canvas handlers
  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    setDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const touch = 'touches' in e ? e.touches[0] : undefined;
    const x = touch ? touch.clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
    const y = touch ? touch.clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const touch = 'touches' in e ? e.touches[0] : undefined;
    const x = touch ? touch.clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
    const y = touch ? touch.clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000';
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSigned(true);
  };

  const stopDraw = () => setDrawing(false);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSigned(false);
  };

  const handleAccept = async () => {
    if (!template || !token || !hasSigned || !scrolledToEnd) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const signatureData = canvas.toDataURL('image/png');
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);

    setSubmitting(true);
    try {
      await acceptConsultationConsent(token, id as string, {
        templateId: template.id,
        signatureData,
        scrolledToEnd: true,
        timeSpentSeconds: timeSpent,
      });
      toast.success('ยินยอมเรียบร้อยแล้ว');
      router.push(`/consultation/${id}`);
    } catch (err: any) {
      toast.error(err.message || 'เกิดข้อผิดพลาด');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) return <div className="flex items-center justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="pb-32">
      <div className="flex items-center gap-3 px-4 py-3">
        <Link href={`/consultation/${id}`} className="rounded-full p-1 hover:bg-muted"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="text-lg font-bold">ยินยอมรับบริการ</h1>
      </div>

      <div className="space-y-4 px-4">
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
          กรุณาอ่านเอกสารยินยอมให้ครบถ้วนก่อนลงลายมือชื่อ (ตาม พ.ร.บ. เทเลเมดิซีน 2569)
        </div>

        {/* Consent Content */}
        <div ref={contentRef} onScroll={handleScroll} className="max-h-[50vh] overflow-y-auto rounded-xl border p-4 text-sm leading-relaxed">
          <h2 className="text-base font-bold mb-2">{template?.title ?? 'เอกสารยินยอม'}</h2>
          {template?.clauses?.map(clause => (
            <div key={clause.id} className="mb-4">
              <h3 className="font-semibold">{clause.title}</h3>
              <p className="mt-1 text-muted-foreground">{clause.content}</p>
            </div>
          )) ?? <p className="text-muted-foreground whitespace-pre-wrap">{template?.content ?? 'กำลังโหลด...'}</p>}
        </div>

        {!scrolledToEnd && (
          <p className="text-center text-xs text-amber-600">↓ กรุณาเลื่อนอ่านให้จบก่อนลงลายมือชื่อ</p>
        )}

        {/* Signature Pad */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-bold">ลายมือชื่อ</label>
            <button onClick={clearSignature} className="text-xs text-primary hover:underline">ล้าง</button>
          </div>
          <canvas
            ref={canvasRef}
            width={320}
            height={120}
            className="w-full rounded-xl border bg-white touch-none"
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={stopDraw}
            onMouseLeave={stopDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={stopDraw}
          />
        </div>
      </div>

      <div className="fixed bottom-16 left-0 right-0 z-40 border-t bg-white p-4">
        <div className="mx-auto max-w-lg">
          <button
            onClick={handleAccept}
            disabled={!scrolledToEnd || !hasSigned || submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSignature className="h-4 w-4" />}
            {submitting ? 'กำลังบันทึก...' : 'ยินยอมและลงลายมือชื่อ'}
          </button>
        </div>
      </div>
    </div>
  );
}
