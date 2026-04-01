'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  ArrowLeft,
  AlertTriangle,
  Pill,
  Calendar,
  Send,
  CheckCircle,
  Loader2,
  ImagePlus,
  X,
  Copy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useAuthGuard } from '@/lib/use-auth-guard';
import { submitAdrReport, type AdrReportResult } from '@/lib/adr';

const SEVERITY_OPTIONS = [
  { value: 'mild' as const, label: 'เล็กน้อย', desc: 'ไม่ต้องหยุดยา ไม่ต้องรักษา', color: 'bg-green-50 border-green-200' },
  { value: 'moderate' as const, label: 'ปานกลาง', desc: 'ต้องการการรักษาแต่ไม่เป็นอันตราย', color: 'bg-yellow-50 border-yellow-200' },
  { value: 'severe' as const, label: 'รุนแรง', desc: 'เป็นอันตราย ต้องเข้ารับการรักษาในโรงพยาบาล', color: 'bg-orange-50 border-orange-200' },
  { value: 'life_threatening' as const, label: 'เสี่ยงชีวิต', desc: 'อันตรายถึงชีวิต ต้องรักษาฉุกเฉิน', color: 'bg-red-50 border-red-200' },
];

const MAX_IMAGES = 5;

export default function AdrReportPage() {
  const router = useRouter();
  const { loading: authLoading, token } = useAuthGuard();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AdrReportResult | null>(null);

  const [form, setForm] = useState({
    drugName: '',
    reactionDescription: '',
    severity: 'mild' as 'mild' | 'moderate' | 'severe' | 'life_threatening',
    onsetDate: '',
  });
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remaining = MAX_IMAGES - imagePreviews.length;
    const selected = Array.from(files).slice(0, remaining);

    selected.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        setImagePreviews((prev) => {
          if (prev.length >= MAX_IMAGES) return prev;
          return [...prev, dataUrl];
        });
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index: number) => {
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!form.drugName.trim() || !form.reactionDescription.trim()) {
      toast.error('กรุณากรอกชื่อยาและอาการที่เกิดขึ้น');
      return;
    }
    if (!token) return;

    setSubmitting(true);
    try {
      const res = await submitAdrReport(token, {
        drugName: form.drugName.trim(),
        reactionDescription: form.reactionDescription.trim(),
        severity: form.severity,
        onsetDate: form.onsetDate || undefined,
        images: imagePreviews.length > 0 ? imagePreviews : undefined,
      });
      setResult(res);
      toast.success('ส่งรายงานผลข้างเคียงสำเร็จ');
    } catch (err: any) {
      toast.error(err?.message || 'ส่งรายงานไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setSubmitting(false);
    }
  };

  const copyReference = () => {
    const ref = result?.referenceNumber || result?.reportNo || result?.id || '';
    navigator.clipboard.writeText(ref);
    toast.success('คัดลอกหมายเลขอ้างอิงแล้ว');
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Confirmation screen with reference number
  if (result) {
    const refNumber = result.referenceNumber || result.reportNo || result.id || '—';
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center px-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <CheckCircle className="h-10 w-10 text-primary" />
        </div>
        <h1 className="mt-4 text-xl font-bold">ส่งรายงานแล้ว</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          ขอบคุณสำหรับการรายงานผลข้างเคียง
          <br />
          เภสัชกรจะติดต่อกลับภายใน 24 ชั่วโมง
        </p>

        {/* Reference Number */}
        <div className="mt-4 w-full max-w-xs rounded-xl border bg-muted/50 p-4 text-center">
          <p className="text-xs text-muted-foreground">หมายเลขอ้างอิง</p>
          <div className="mt-1 flex items-center justify-center gap-2">
            <p className="text-lg font-bold font-mono">{refNumber}</p>
            <button onClick={copyReference} className="p-1 hover:bg-muted rounded">
              <Copy className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">
            กรุณาเก็บหมายเลขนี้ไว้เพื่อติดตามผล
          </p>
        </div>

        <div className="mt-4 rounded-xl bg-amber-50 p-4 text-center">
          <p className="text-xs text-amber-800">
            รายงานนี้จะถูกส่งไปยัง สำนักงานคณะกรรมการอาหารและยา (อย.) ตามกฎหมาย
          </p>
        </div>

        <div className="mt-6 flex gap-3">
          <Button variant="outline" onClick={() => router.push('/profile')}>
            กลับไปโปรไฟล์
          </Button>
          <Button
            onClick={() => {
              setResult(null);
              setForm({ drugName: '', reactionDescription: '', severity: 'mild', onsetDate: '' });
              setImagePreviews([]);
            }}
          >
            รายงานเพิ่มเติม
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24">
      <div className="flex items-center gap-3 px-4 py-3">
        <Link href="/profile" className="rounded-full p-1 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold">รายงานผลข้างเคียงยา (ADR)</h1>
      </div>

      <div className="space-y-4 px-4">
        {/* Warning Banner */}
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            หากมีอาการรุนแรง (หายใจหอบ ผื่นลามถึงลำคอ) โปรดไปพบแพทย์ทันที
          </p>
        </div>

        {/* Drug Name */}
        <div className="rounded-xl border p-4 space-y-3">
          <h2 className="text-sm font-bold flex items-center gap-2">
            <Pill className="h-4 w-4 text-primary" />
            ข้อมูลยา
          </h2>
          <div>
            <label className="text-xs font-medium text-muted-foreground">ชื่อยา *</label>
            <Input
              className="mt-1"
              placeholder="ชื่อยาที่คิดว่าก่อให้เกิดอาการ"
              value={form.drugName}
              onChange={(e) => setForm((f) => ({ ...f, drugName: e.target.value }))}
            />
          </div>
        </div>

        {/* Reaction Description */}
        <div className="rounded-xl border p-4 space-y-3">
          <h2 className="text-sm font-bold">อาการที่เกิดขึ้น *</h2>
          <textarea
            className="w-full rounded-lg border px-3 py-2 text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="อธิบายอาการที่เกิดขึ้น เช่น ผื่นแดง คัน หายใจหอบ..."
            value={form.reactionDescription}
            onChange={(e) => setForm((f) => ({ ...f, reactionDescription: e.target.value }))}
          />
        </div>

        {/* Severity */}
        <div className="rounded-xl border p-4 space-y-3">
          <h2 className="text-sm font-bold">ความรุนแรง</h2>
          <div className="space-y-2">
            {SEVERITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setForm((f) => ({ ...f, severity: opt.value }))}
                className={`w-full rounded-lg border p-3 text-left transition-colors ${
                  form.severity === opt.value
                    ? 'border-primary bg-secondary'
                    : 'hover:bg-muted'
                }`}
              >
                <p className="text-sm font-medium">{opt.label}</p>
                <p className="text-xs text-muted-foreground">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Onset Date */}
        <div className="rounded-xl border p-4 space-y-3">
          <h2 className="text-sm font-bold flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            วันที่เริ่มมีอาการ
          </h2>
          <Input
            type="date"
            value={form.onsetDate}
            onChange={(e) => setForm((f) => ({ ...f, onsetDate: e.target.value }))}
          />
        </div>

        {/* Image Upload (optional, max 5) */}
        <div className="rounded-xl border p-4 space-y-3">
          <h2 className="text-sm font-bold flex items-center gap-2">
            <ImagePlus className="h-4 w-4 text-primary" />
            รูปภาพประกอบ
            <span className="font-normal text-muted-foreground text-xs">
              (ไม่บังคับ สูงสุด {MAX_IMAGES} รูป)
            </span>
          </h2>

          {imagePreviews.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {imagePreviews.map((src, i) => (
                <div key={i} className="group relative h-20 w-20 overflow-hidden rounded-lg border">
                  <Image
                    src={src}
                    alt={`รูปที่ ${i + 1}`}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {imagePreviews.length < MAX_IMAGES && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground transition-colors hover:bg-muted w-full justify-center"
              >
                <ImagePlus className="h-4 w-4" />
                เพิ่มรูปภาพ ({imagePreviews.length}/{MAX_IMAGES})
              </button>
            </>
          )}
        </div>
      </div>

      {/* Submit */}
      <div className="fixed bottom-16 left-0 right-0 z-40 border-t bg-white p-4">
        <div className="mx-auto max-w-lg">
          <Button
            className="w-full"
            size="lg"
            disabled={submitting || !form.drugName.trim() || !form.reactionDescription.trim()}
            onClick={handleSubmit}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                กำลังส่ง...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                ส่งรายงานไป อย.
              </>
            )}
          </Button>
          <p className="mt-2 text-center text-[10px] text-muted-foreground">
            รายงานจะถูกส่งไปยังสำนักงานคณะกรรมการอาหารและยา (อย.) ตามมาตรา 82 พ.ร.บ. ยา
          </p>
        </div>
      </div>
    </div>
  );
}
