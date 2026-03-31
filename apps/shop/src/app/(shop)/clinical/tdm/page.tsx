'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  FlaskConical,
  Upload,
  FileText,
  Send,
  CheckCircle,
  Loader2,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useAuthGuard } from '@/lib/use-auth-guard';
import { createTdmRequest } from '@/lib/drug-info';

export default function TDMPage() {
  const router = useRouter();
  const { loading: authLoading, token } = useAuthGuard();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [labFile, setLabFile] = useState<File | null>(null);

  const [form, setForm] = useState({
    medicationName: '',
    labValue: '',
    labUnit: 'mcg/mL',
    samplingTime: '',
    lastDoseTime: '',
    dose: '',
    notes: '',
  });

  const handleSubmit = async () => {
    if (!form.medicationName || !form.labValue) {
      toast.error('กรุณากรอกชื่อยาและค่า Lab');
      return;
    }

    if (!token) return;
    setSubmitting(true);
    try {
      await createTdmRequest(token, {
        medicationName: form.medicationName,
        dose: form.dose || undefined,
        labValue: form.labValue,
        labUnit: form.labUnit,
        samplingTime: form.samplingTime || undefined,
        lastDoseTime: form.lastDoseTime || undefined,
        notes: form.notes || undefined,
      });
      setSubmitted(true);
      toast.success('ส่งคำขอ TDM สำเร็จ');
    } catch (err: any) {
      toast.error(err?.message || 'ส่งคำขอไม่สำเร็จ');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) return <div className="flex items-center justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  if (submitted) {
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center px-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <CheckCircle className="h-10 w-10 text-primary" />
        </div>
        <h1 className="mt-4 text-xl font-bold">ส่งคำขอแล้ว</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          เภสัชกรจะวิเคราะห์ค่า TDM ของคุณภายใน 24 ชั่วโมง
        </p>
        <div className="mt-4 rounded-xl bg-blue-50 p-4 text-center">
          <p className="text-xs text-blue-700">
            คำแนะนำเบื้องต้น: หากค่ายาสูงกว่า therapeutic range
            อาจต้องปรับขนาดยาหรือเวลากิน
          </p>
        </div>
        <Button className="mt-6" onClick={() => router.push('/clinical')}>
          กลับไปหน้าบริการ
        </Button>
      </div>
    );
  }

  return (
    <div className="pb-24">
      <div className="flex items-center gap-3 px-4 py-3">
        <Link href="/clinical" className="rounded-full p-1 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold">TDM Consultation</h1>
      </div>

      <div className="space-y-4 px-4">
        {/* Info */}
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
          <h2 className="font-bold text-emerald-800 flex items-center gap-2">
            <FlaskConical className="h-4 w-4" />
            Therapeutic Drug Monitoring
          </h2>
          <p className="text-sm text-emerald-700 mt-1">
            บริการวิเคราะห์ระดับยาในเลือด เพื่อปรับขนาดยาให้เหมาะสม
          </p>
          <div className="mt-3 space-y-1 text-xs text-emerald-600">
            <p>ยาที่ติดตามบ่อย: Vancomycin, Aminoglycosides, Phenytoin, Digoxin</p>
          </div>
        </div>

        {/* Warning */}
        <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            บริการนี้ใช้สำหรับผู้ป่วยที่มีค่า TDM จาก Lab แล้วเท่านั้น
            หากยังไม่ได้ตรวจ กรุณาติดต่อแพทย์ก่อน
          </p>
        </div>

        {/* Medication */}
        <div className="rounded-xl border p-4 space-y-3">
          <h2 className="text-sm font-bold">ข้อมูลยา</h2>
          <div>
            <label className="text-xs font-medium text-muted-foreground">ชื่อยา *</label>
            <Input
              className="mt-1"
              placeholder="เช่น Vancomycin, Gentamicin"
              value={form.medicationName}
              onChange={(e) => setForm((f) => ({ ...f, medicationName: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">ขนาดยาที่กิน</label>
            <Input
              className="mt-1"
              placeholder="เช่น 1 g IV q12h"
              value={form.dose}
              onChange={(e) => setForm((f) => ({ ...f, dose: e.target.value }))}
            />
          </div>
        </div>

        {/* Lab Results */}
        <div className="rounded-xl border p-4 space-y-3">
          <h2 className="text-sm font-bold">ผลตรวจ Lab *</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">ค่า Drug Level</label>
              <Input
                className="mt-1"
                type="number"
                step="0.1"
                placeholder="15.5"
                value={form.labValue}
                onChange={(e) => setForm((f) => ({ ...f, labValue: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">หน่วย</label>
              <select
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                value={form.labUnit}
                onChange={(e) => setForm((f) => ({ ...f, labUnit: e.target.value }))}
              >
                <option value="mcg/mL">mcg/mL</option>
                <option value="mg/L">mg/L</option>
                <option value="mcg/dL">mcg/dL</option>
                <option value="ng/mL">ng/mL</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">เวลาเก็บเลือด</label>
              <Input
                type="datetime-local"
                className="mt-1"
                value={form.samplingTime}
                onChange={(e) => setForm((f) => ({ ...f, samplingTime: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">เวลากินยาครั้งล่าสุด</label>
              <Input
                type="datetime-local"
                className="mt-1"
                value={form.lastDoseTime}
                onChange={(e) => setForm((f) => ({ ...f, lastDoseTime: e.target.value }))}
              />
            </div>
          </div>
        </div>

        {/* File Upload */}
        <div className="rounded-xl border p-4 space-y-3">
          <h2 className="text-sm font-bold">แนบผล Lab (ถ้ามี)</h2>
          <label className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4 cursor-pointer hover:bg-muted">
            <Upload className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {labFile ? labFile.name : 'เลือกไฟล์ PDF หรือรูป'}
            </span>
            <input
              type="file"
              accept=".pdf,image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && setLabFile(e.target.files[0])}
            />
          </label>
        </div>

        {/* Notes */}
        <div className="rounded-xl border p-4 space-y-3">
          <h2 className="text-sm font-bold">ข้อมูลเพิ่มเติม</h2>
          <textarea
            className="w-full rounded-lg border px-3 py-2 text-sm min-h-[80px]"
            placeholder="ข้อมูลอื่นๆ เช่น การทำงานของไต, น้ำหนัก, อาการข้างเคียง"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
        </div>
      </div>

      {/* Submit */}
      <div className="fixed bottom-16 left-0 right-0 z-40 border-t bg-white p-4">
        <div className="mx-auto max-w-lg">
          <Button
            className="w-full"
            size="lg"
            disabled={submitting}
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
                ส่งคำขอ TDM
              </>
            )}
          </Button>
          <p className="mt-2 text-center text-[10px] text-muted-foreground">
            เภสัชกรจะติดต่อกลับผ่าน LINE ภายใน 24 ชั่วโมง
          </p>
        </div>
      </div>
    </div>
  );
}
