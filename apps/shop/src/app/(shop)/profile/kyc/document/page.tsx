'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Upload, Camera, CheckCircle, FileText } from 'lucide-react';
import { useAuthGuard } from '@/lib/use-auth-guard';
import { uploadDocument, type UploadDocumentResult } from '@/lib/kyc';
import { toast } from 'sonner';

export default function KycDocumentPage() {
  const router = useRouter();
  const { loading: authLoading, patient } = useAuthGuard();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadDocumentResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    setFile(f);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(f);
  };

  const handleUpload = async () => {
    if (!file || !patient?.id) return;
    setUploading(true);
    try {
      const res = await uploadDocument(patient.id, file);
      setResult(res);
      toast.success('อัปโหลดสำเร็จ');
    } catch (err: any) {
      toast.error(err.message || 'อัปโหลดไม่สำเร็จ');
    } finally {
      setUploading(false);
    }
  };

  if (authLoading) return <div className="flex items-center justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  if (result) {
    return (
      <div className="pb-20">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link href="/profile/kyc" className="rounded-full p-1 hover:bg-muted"><ArrowLeft className="h-5 w-5" /></Link>
          <h1 className="text-lg font-bold">ผลการอ่านบัตร</h1>
        </div>
        <div className="space-y-4 px-4">
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <p className="text-sm font-medium text-green-700">อ่านข้อมูลจากบัตรสำเร็จ</p>
          </div>
          <div className="rounded-xl border p-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">เลขบัตร</span><span className="font-mono">{result.extractedData.nationalId}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">ชื่อ</span><span>{result.extractedData.thaiName}</span></div>
            {result.extractedData.dateOfBirth && <div className="flex justify-between"><span className="text-muted-foreground">วันเกิด</span><span>{result.extractedData.dateOfBirth}</span></div>}
          </div>
          <button onClick={() => router.push('/profile/kyc/liveness')} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground">
            <Camera className="h-4 w-4" /> ถัดไป: ตรวจสอบใบหน้า
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-32">
      <div className="flex items-center gap-3 px-4 py-3">
        <Link href="/profile/kyc" className="rounded-full p-1 hover:bg-muted"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="text-lg font-bold">อัปโหลดบัตรประชาชน</h1>
      </div>

      <div className="space-y-4 px-4">
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
          ถ่ายรูปบัตรประชาชนด้านหน้าให้ชัดเจน ไม่มีแสงสะท้อน
        </div>

        <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />

        {preview ? (
          <div className="space-y-3">
            <img src={preview} alt="Preview" className="w-full rounded-xl border" />
            <div className="flex gap-2">
              <button onClick={() => { setFile(null); setPreview(null); }} className="flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium hover:bg-muted">ถ่ายใหม่</button>
              <button onClick={handleUpload} disabled={uploading} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploading ? 'กำลังอัปโหลด...' : 'อัปโหลด'}
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => inputRef.current?.click()} className="flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-12 hover:bg-muted/50">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Camera className="h-8 w-8 text-primary" />
            </div>
            <p className="text-sm font-medium">ถ่ายรูปบัตรประชาชน</p>
            <p className="text-xs text-muted-foreground">รองรับ JPEG, PNG ขนาดไม่เกิน 10MB</p>
          </button>
        )}

        <div className="rounded-xl border p-4 text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">คำแนะนำ:</p>
          <p>• วางบัตรบนพื้นเรียบ สีเข้ม</p>
          <p>• ถ่ายในที่แสงสว่างเพียงพอ</p>
          <p>• ไม่มีนิ้วมือบังข้อมูล</p>
          <p>• เห็นรูปถ่ายและข้อมูลชัดเจน</p>
        </div>
      </div>
    </div>
  );
}
