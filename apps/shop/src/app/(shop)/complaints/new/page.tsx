'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ImagePlus, X, Loader2, CheckCircle2 } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/store/auth';
import { createComplaint, type ComplaintCategory, type ComplaintSeverity } from '@/lib/complaints';

const CATEGORIES: { value: ComplaintCategory; label: string }[] = [
  { value: 'service', label: 'บริการ' },
  { value: 'product_quality', label: 'คุณภาพสินค้า' },
  { value: 'delivery', label: 'การจัดส่ง' },
  { value: 'billing', label: 'การเรียกเก็บเงิน' },
  { value: 'other', label: 'อื่นๆ' },
];

const SEVERITIES: { value: ComplaintSeverity; label: string }[] = [
  { value: 'low', label: 'น้อย' },
  { value: 'medium', label: 'ปานกลาง' },
  { value: 'high', label: 'มาก' },
  { value: 'critical', label: 'วิกฤต' },
];

const MAX_IMAGES = 5;

export default function NewComplaintPage() {
  const router = useRouter();
  const { accessToken } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [category, setCategory] = useState<ComplaintCategory | ''>('');
  const [severity, setSeverity] = useState<ComplaintSeverity>('medium');
  const [description, setDescription] = useState('');
  const [orderId, setOrderId] = useState('');
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remaining = MAX_IMAGES - imagePreviews.length;
    const selected = Array.from(files).slice(0, remaining);

    selected.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        setImagePreviews((prev) => {
          if (prev.length >= MAX_IMAGES) return prev;
          return [...prev, result];
        });
      };
      reader.readAsDataURL(file);
    });

    // Reset input so same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index: number) => {
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !category || !description.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      await createComplaint(accessToken, {
        category,
        description: description.trim(),
        severity,
        images: imagePreviews.length > 0 ? imagePreviews : undefined,
        orderId: orderId.trim() || undefined,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setSubmitting(false);
    }
  };

  if (!accessToken) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-muted-foreground">
        <p className="text-sm">กรุณาเข้าสู่ระบบเพื่อแจ้งข้อร้องเรียน</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-4 px-4 py-24">
        <CheckCircle2 className="h-16 w-16 text-emerald-500" />
        <h2 className="text-lg font-bold">ส่งข้อร้องเรียนเรียบร้อย</h2>
        <p className="text-center text-sm text-muted-foreground">
          เราได้รับข้อร้องเรียนของคุณแล้ว ทีมงานจะดำเนินการตรวจสอบและติดต่อกลับโดยเร็ว
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.push('/complaints')}>
            ดูข้อร้องเรียน
          </Button>
          <Button onClick={() => router.push('/')}>กลับหน้าหลัก</Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="px-4 pt-3">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          กลับ
        </button>
      </div>

      <div className="px-4 pt-3">
        <h1 className="text-lg font-bold">แจ้งข้อร้องเรียน</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          กรุณากรอกรายละเอียดปัญหาที่พบ
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 px-4 pt-4 pb-8">
        {/* Category */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            หมวดหมู่ <span className="text-destructive">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setCategory(cat.value)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  category === cat.value
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Severity */}
        <div className="space-y-2">
          <label className="text-sm font-medium">ระดับความรุนแรง</label>
          <div className="flex flex-wrap gap-2">
            {SEVERITIES.map((sev) => (
              <button
                key={sev.value}
                type="button"
                onClick={() => setSeverity(sev.value)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  severity === sev.value
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
              >
                {sev.label}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label htmlFor="description" className="text-sm font-medium">
            รายละเอียด <span className="text-destructive">*</span>
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="อธิบายปัญหาที่พบ..."
            rows={4}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            required
          />
        </div>

        {/* Image Upload */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            รูปภาพประกอบ{' '}
            <span className="font-normal text-muted-foreground">
              (สูงสุด {MAX_IMAGES} รูป)
            </span>
          </label>

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
                className="flex items-center gap-2 rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground transition-colors hover:bg-muted"
              >
                <ImagePlus className="h-4 w-4" />
                เพิ่มรูปภาพ ({imagePreviews.length}/{MAX_IMAGES})
              </button>
            </>
          )}
        </div>

        {/* Order Reference */}
        <div className="space-y-2">
          <label htmlFor="orderId" className="text-sm font-medium">
            หมายเลขออเดอร์{' '}
            <span className="font-normal text-muted-foreground">(ถ้ามี)</span>
          </label>
          <Input
            id="orderId"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            placeholder="เช่น ORD-XXXXXX"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Submit */}
        <Button
          type="submit"
          className="w-full"
          disabled={submitting || !category || !description.trim()}
        >
          {submitting ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              กำลังส่ง...
            </span>
          ) : (
            'ส่งข้อร้องเรียน'
          )}
        </Button>
      </form>
    </div>
  );
}
