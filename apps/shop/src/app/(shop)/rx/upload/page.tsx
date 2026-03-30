'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Camera,
  Upload,
  FileImage,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  X,
  ImageIcon,
  Sparkles,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/auth';
import { uploadPrescription, type Prescription, getRxStatusConfig } from '@/lib/prescriptions';
import { toast } from 'sonner';

export default function RxUploadPage() {
  const router = useRouter();
  const { accessToken } = useAuthStore();

  const [files, setFiles] = useState<File[]>([]);
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [submittedRx, setSubmittedRx] = useState<Prescription | null>(null);
  const [error, setError] = useState('');

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).slice(0, 5);
      setFiles((prev) => [...prev, ...newFiles].slice(0, 5));
      setError('');
    }
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!accessToken) {
      toast.error('กรุณาเข้าสู่ระบบก่อน');
      return;
    }
    if (files.length === 0) {
      setError('กรุณาเลือกรูปใบสั่งยาอย่างน้อย 1 รูป');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setOcrProgress(0);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((p) => Math.min(p + 10, 90));
      }, 200);

      const rx = await uploadPrescription(accessToken, files, notes);

      clearInterval(progressInterval);
      setUploadProgress(100);

      // Simulate OCR processing progress
      const ocrInterval = setInterval(() => {
        setOcrProgress((p) => {
          if (p >= 100) {
            clearInterval(ocrInterval);
            return 100;
          }
          return p + 15;
        });
      }, 300);

      setSubmittedRx(rx);
      toast.success('ส่งใบสั่งยาสำเร็จ!');
    } catch (err: any) {
      setError(err?.message || 'ส่งใบสั่งยาไม่สำเร็จ กรุณาลองใหม่');
      setUploading(false);
    }
  };

  // Success state with progress
  if (submittedRx) {
    const statusConfig = getRxStatusConfig(submittedRx.status);
    return (
      <div className="flex flex-col items-center justify-center px-4 py-10">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <CheckCircle className="h-10 w-10 text-primary" />
        </div>
        <h2 className="mt-4 text-xl font-bold">ส่งใบสั่งยาสำเร็จ!</h2>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          เลขที่: {submittedRx.rxNo}
        </p>

        {/* Upload progress */}
        <div className="mt-6 w-full max-w-xs space-y-4">
          <div className="rounded-xl border p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">อัปโหลดรูป</span>
              <span className="text-xs text-primary">เสร็จสิ้น</span>
            </div>
            <Progress value={100} className="mt-2" />
          </div>

          <div className="rounded-xl border p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">อ่านใบสั่งยา (OCR)</span>
              <span className="text-xs text-amber-600">
                {ocrProgress < 100 ? 'กำลังประมวลผล...' : 'เสร็จสิ้น'}
              </span>
            </div>
            <Progress value={ocrProgress} className="mt-2" />
          </div>

          <div className="flex items-start gap-3 rounded-lg bg-amber-50 p-3">
            <Clock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">รอเภสัชกรตรวจสอบ</p>
              <p className="text-xs text-amber-600">คาดว่า 15-30 นาที จะแจ้งผลทาง LINE</p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <Link
            href={`/rx/${submittedRx.id}`}
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
    <div className="pb-40">
      <div className="flex items-center gap-3 px-4 py-3">
        <Link href="/" className="rounded-full p-1 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold">ส่งใบสั่งยา</h1>
      </div>

      <div className="space-y-4 px-4">
        {/* AI Features Banner */}
        <div className="rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 p-4 text-white">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            <span className="font-bold">AI ช่วยอ่านใบสั่งยา</span>
          </div>
          <p className="mt-1 text-xs text-white/80">
            ระบบ AI จะอ่านชื่อยา ขนาด จำนวน จากรูปใบสั่งยาโดยอัตโนมัติ
          </p>
        </div>

        {/* Instructions */}
        <div className="rounded-xl bg-secondary p-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold text-secondary-foreground">วิธีถ่ายรูปให้ดีที่สุด</h2>
          </div>
          <ol className="space-y-1 text-xs text-secondary-foreground/80">
            <li>• ถ่ายในที่มีแสงสว่าง ไม่มีเงา</li>
            <li>• ให้ใบสั่งยาอยู่ในกรอบรูปทั้งหมด</li>
            <li>• ตรวจสอบว่าเห็นชื่อยา ขนาด จำนวน ชัดเจน</li>
            <li>• ถ่ายทีละ 1 หน้า สูงสุด 5 รูป</li>
          </ol>
        </div>

        {/* Upload Area */}
        <div className="rounded-xl border-2 border-dashed p-6">
          <div className="flex flex-col items-center">
            <ImageIcon className="h-12 w-12 text-muted-foreground/40" />
            <p className="mt-2 text-sm font-medium">อัปโหลดรูปใบสั่งยา</p>
            <p className="text-xs text-muted-foreground">สูงสุด 5 รูป (JPG, PNG, ไม่เกิน 5MB/รูป)</p>
            <div className="mt-4 flex gap-3">
              <Button variant="outline" size="sm" type="button">
                <Camera className="h-4 w-4" />
                ถ่ายรูป
              </Button>
              <label>
                <span className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted cursor-pointer">
                  <Upload className="h-4 w-4" />
                  เลือกไฟล์
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFilesChange}
                  disabled={uploading}
                />
              </label>
            </div>
          </div>
        </div>

        {/* Preview Grid */}
        {files.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">รูปที่เลือก ({files.length}/5)</p>
            <div className="grid grid-cols-3 gap-2">
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
                    onClick={() => removeFile(i)}
                    disabled={uploading}
                    className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80 disabled:opacity-50"
                  >
                    <X className="h-3 w-3" />
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
            placeholder="เช่น ยาสำหรับลูกชาย 5 ขวบ / รับยาแทน"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={uploading}
          />
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-xs text-destructive">{error}</p>
          </div>
        )}
      </div>

      {/* Submit */}
      <div className="fixed bottom-16 left-0 right-0 z-40 border-t bg-white p-4">
        <div className="mx-auto max-w-lg space-y-3">
          {uploading && (
            <div className="rounded-lg border p-3">
              <div className="flex items-center justify-between text-xs">
                <span>กำลังอัปโหลด...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="mt-2 h-2" />
            </div>
          )}
          <Button
            className="w-full"
            size="lg"
            disabled={files.length === 0 || uploading}
            onClick={handleSubmit}
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                กำลังส่ง...
              </>
            ) : (
              <>ส่งใบสั่งยา ({files.length} รูป)</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
