'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  FileText,
  AlertTriangle,
  CheckCircle,
  Pill,
  Send,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface MedicationReviewRequest {
  medications: string[];
  symptoms: string;
  concerns: string;
}

export default function MedicationReviewPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState<MedicationReviewRequest>({
    medications: [''],
    symptoms: '',
    concerns: '',
  });

  const addMedication = () => {
    setForm((f) => ({ ...f, medications: [...f.medications, ''] }));
  };

  const updateMedication = (idx: number, value: string) => {
    setForm((f) => ({
      ...f,
      medications: f.medications.map((m, i) => (i === idx ? value : m)),
    }));
  };

  const removeMedication = (idx: number) => {
    setForm((f) => ({
      ...f,
      medications: f.medications.filter((_, i) => i !== idx),
    }));
  };

  const handleSubmit = async () => {
    const validMeds = form.medications.filter((m) => m.trim()).length;
    if (validMeds === 0) {
      toast.error('กรุณาระบุยาอย่างน้อย 1 รายการ');
      return;
    }

    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
      toast.success('ส่งคำขอ Medication Review สำเร็จ');
    }, 1500);
  };

  if (submitted) {
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center px-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <CheckCircle className="h-10 w-10 text-primary" />
        </div>
        <h1 className="mt-4 text-xl font-bold">ส่งคำขอแล้ว</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          เภสัชกรจะตรวจสอบยาของคุณภายใน 24-48 ชั่วโมง
          <br />
          และส่งรายงานผ่าน LINE
        </p>
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
        <h1 className="text-lg font-bold">Medication Review</h1>
      </div>

      <div className="space-y-4 px-4">
        {/* Info */}
        <div className="rounded-xl bg-purple-50 border border-purple-200 p-4">
          <h2 className="font-bold text-purple-800 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            บริการตรวจสอบยา (MR)
          </h2>
          <p className="text-sm text-purple-700 mt-1">
            เภสัชกรจะตรวจสอบ:
          </p>
          <ul className="text-xs text-purple-600 mt-2 space-y-1">
            <li>• ยาซ้ำซ้อน (Duplicate Therapy)</li>
            <li>• ปฏิกิริยาระหว่างยา (Drug-Drug Interactions)</li>
            <li>• ข้อห้ามใช้ยาตามโรค (Contraindications)</li>
            <li>• ความเหมาะสมของขนาดยา (Dosing)</li>
          </ul>
        </div>

        {/* Medications */}
        <div className="rounded-xl border p-4 space-y-3">
          <h2 className="text-sm font-bold flex items-center gap-2">
            <Pill className="h-4 w-4 text-primary" />
            รายการยาที่ใช้ปัจจุบัน *
          </h2>
          {form.medications.map((med, idx) => (
            <div key={idx} className="flex gap-2">
              <input
                className="flex-1 rounded-lg border px-3 py-2 text-sm"
                placeholder={`ยาตัวที่ ${idx + 1}`}
                value={med}
                onChange={(e) => updateMedication(idx, e.target.value)}
              />
              {form.medications.length > 1 && (
                <button
                  onClick={() => removeMedication(idx)}
                  className="px-3 text-destructive"
                >
                  ลบ
                </button>
              )}
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addMedication}>
            + เพิ่มยา
          </Button>
        </div>

        {/* Symptoms */}
        <div className="rounded-xl border p-4 space-y-3">
          <h2 className="text-sm font-bold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            อาการที่สงสัยว่าเป็นผลจากยา
          </h2>
          <textarea
            className="w-full rounded-lg border px-3 py-2 text-sm min-h-[80px]"
            placeholder="เช่น คลื่นไส้ วิงเวียน ผื่นขึ้น..."
            value={form.symptoms}
            onChange={(e) => setForm((f) => ({ ...f, symptoms: e.target.value }))}
          />
        </div>

        {/* Concerns */}
        <div className="rounded-xl border p-4 space-y-3">
          <h2 className="text-sm font-bold">ข้อกังวลอื่นๆ</h2>
          <textarea
            className="w-full rounded-lg border px-3 py-2 text-sm min-h-[80px]"
            placeholder="คำถามหรือข้อสงสัยเกี่ยวกับยาของคุณ"
            value={form.concerns}
            onChange={(e) => setForm((f) => ({ ...f, concerns: e.target.value }))}
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
                ส่งคำขอตรวจสอบยา
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
