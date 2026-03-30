'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Camera, Upload, FileImage, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function RxUploadPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-20">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <CheckCircle className="h-8 w-8 text-primary" />
        </div>
        <h2 className="mt-4 text-lg font-bold">ส่งใบสั่งยาแล้ว</h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          ระบบกำลังตรวจสอบใบสั่งยาของคุณ
          <br />
          คาดว่าจะใช้เวลาประมาณ 15-30 นาที
        </p>
        <div className="mt-6 w-full max-w-xs space-y-3">
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <Clock className="h-5 w-5 text-amber-500" />
            <div>
              <p className="text-sm font-medium">รอตรวจสอบ</p>
              <p className="text-xs text-muted-foreground">เภสัชกรจะตรวจสอบใบสั่งยา</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border p-3 opacity-50">
            <AlertCircle className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">แจ้งผลและราคา</p>
              <p className="text-xs text-muted-foreground">แจ้งผ่าน LINE</p>
            </div>
          </div>
        </div>
        <div className="mt-6 flex gap-3">
          <Link
            href="/rx/status"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            ดูสถานะ
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            กลับหน้าหลัก
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-32">
      <div className="flex items-center gap-3 px-4 py-3">
        <Link href="/" className="rounded-full p-1 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold">ส่งใบสั่งยา</h1>
      </div>

      <div className="space-y-4 px-4">
        {/* Instructions */}
        <div className="rounded-xl bg-secondary p-4">
          <h2 className="text-sm font-bold text-secondary-foreground">วิธีส่งใบสั่งยา</h2>
          <ol className="mt-2 space-y-1 text-xs text-secondary-foreground/80">
            <li>1. ถ่ายรูปใบสั่งยาให้ชัดเจน</li>
            <li>2. ตรวจสอบว่าเห็นชื่อยา ขนาด จำนวน ชัดเจน</li>
            <li>3. กดส่ง รอเภสัชกรตรวจสอบ 15-30 นาที</li>
            <li>4. เภสัชกรจะแจ้งผลและราคาผ่าน LINE</li>
          </ol>
        </div>

        {/* Upload Area */}
        <div className="rounded-xl border-2 border-dashed p-6">
          <div className="flex flex-col items-center">
            <FileImage className="h-12 w-12 text-muted-foreground/40" />
            <p className="mt-2 text-sm font-medium">อัปโหลดรูปใบสั่งยา</p>
            <p className="text-xs text-muted-foreground">สูงสุด 5 รูป (JPG, PNG)</p>
            <div className="mt-4 flex gap-3">
              <Button variant="outline" size="sm">
                <Camera className="h-4 w-4" />
                ถ่ายรูป
              </Button>
              <label>
                <span className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 py-1 text-xs font-medium transition-colors hover:bg-muted cursor-pointer">
                  <Upload className="h-4 w-4" />
                  เลือกไฟล์
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) {
                      setFiles(Array.from(e.target.files).slice(0, 5));
                    }
                  }}
                />
              </label>
            </div>
          </div>
        </div>

        {/* Preview */}
        {files.length > 0 && (
          <div>
            <p className="text-sm font-medium">รูปที่เลือก ({files.length})</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {files.map((file, i) => (
                <div
                  key={i}
                  className="relative aspect-square overflow-hidden rounded-lg bg-muted"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={URL.createObjectURL(file)}
                    alt={`ใบสั่งยา ${i + 1}`}
                    className="h-full w-full object-cover"
                  />
                  <button
                    onClick={() => setFiles(files.filter((_, j) => j !== i))}
                    className="absolute right-1 top-1 rounded-full bg-black/50 p-0.5 text-white"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="text-sm font-medium">หมายเหตุ (ไม่บังคับ)</label>
          <Input
            className="mt-1"
            placeholder="เช่น ยาสำหรับลูกชาย 5 ขวบ"
          />
        </div>
      </div>

      {/* Submit */}
      <div className="fixed bottom-16 left-0 right-0 z-40 border-t bg-white p-4">
        <div className="mx-auto max-w-lg">
          <Button
            className="w-full"
            size="lg"
            disabled={files.length === 0}
            onClick={() => setSubmitted(true)}
          >
            ส่งใบสั่งยา ({files.length} รูป)
          </Button>
        </div>
      </div>
    </div>
  );
}
