'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  AlertTriangle,
  Pill,
  Calendar,
  Send,
  Clock,
  CheckCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const SEVERITY_OPTIONS = [
  { value: 'mild', label: 'เล็กน้อย', desc: 'ไม่ต้องหยุดยา ไม่ต้องรักษา' },
  { value: 'moderate', label: 'ปานกลาง', desc: 'ต้องการการรักษาแต่ไม่เป็นอันตราย' },
  { value: 'severe', label: 'รุนแรง', desc: 'เป็นอันตราย ต้องเข้ารับการรักษาในโรงพยาบาล' },
  { value: 'life_threatening', label: 'เสี่ยงชีวิต', desc: 'อันตรายถึงชีวิต ต้องรักษาฉุกเฉิน' },
];

const CAUSALITY_CRITERIA = [
  { id: 'time', label: 'ความสัมพันธ์ด้านเวลา', desc: 'อาการเกิดหลังใช้ยา และหายไปเมื่อหยุดยา' },
  { id: 'known', label: 'เป็นอาการที่ทราบแล้ว', desc: 'อาการนี้มีรายงานในวรรณกรรมยา' },
  { id: 'alternative', label: 'ไม่มีสาเหตุอื่น', desc: 'ไม่มีโรคหรือยาอื่นที่อธิบายอาการได้' },
  { id: 'rechallenge', label: 'ทดสอบซ้ำ (Rechallenge)', desc: 'อาการกลับมาเมื่อใช้ยาซ้ำ (ไม่บังคับ)' },
];

export default function AdrReportPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showCausality, setShowCausality] = useState(false);

  const [form, setForm] = useState({
    drugName: '',
    startDate: '',
    reactionDate: '',
    symptoms: '',
    severity: 'mild' as string,
    outcome: '' as 'recovered' | 'recovering' | 'not_recovered' | 'death' | '',
    causalityCriteria: {} as Record<string, boolean>,
  });

  const handleSubmit = async () => {
    if (!form.drugName || !form.symptoms) {
      toast.error('กรุณากรอกชื่อยาและอาการที่เกิดขึ้น');
      return;
    }

    setSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
      toast.success('ส่งรายงานผลข้างเคียงสำเร็จ');
    }, 1500);
  };

  const updateField = (field: string, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  const toggleCausality = (id: string) => {
    setForm((f) => ({
      ...f,
      causalityCriteria: {
        ...f.causalityCriteria,
        [id]: !f.causalityCriteria[id],
      },
    }));
  };

  const calculateCausality = () => {
    const criteria = Object.values(form.causalityCriteria).filter(Boolean).length;
    if (criteria >= 3) return { level: 'Certain', label: 'แน่นอน', color: 'bg-red-100 text-red-800' };
    if (criteria === 2) return { level: 'Probable', label: 'เป็นไปได้สูง', color: 'bg-orange-100 text-orange-800' };
    if (criteria === 1) return { level: 'Possible', label: 'เป็นไปได้', color: 'bg-yellow-100 text-yellow-800' };
    return { level: 'Unlikely', label: 'เป็นไปได้น้อย', color: 'bg-gray-100 text-gray-800' };
  };

  if (submitted) {
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
        <div className="mt-4 rounded-xl bg-amber-50 p-4 text-center">
          <p className="text-xs text-amber-800">
            รายงานนี้จะถูกส่งไปยัง สำนักงานคณะกรรมการอาหารและยา (อย.) ตามกฎหมาย
          </p>
        </div>
        <Button className="mt-6" onClick={() => router.push('/profile')}>
          กลับไปโปรไฟล์
        </Button>
      </div>
    );
  }

  const causalityResult = calculateCausality();

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

        {/* Drug Info */}
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
              onChange={(e) => updateField('drugName', e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">วันที่เริ่มใช้ยา</label>
              <Input
                type="date"
                className="mt-1"
                value={form.startDate}
                onChange={(e) => updateField('startDate', e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">วันที่เกิดอาการ</label>
              <Input
                type="date"
                className="mt-1"
                value={form.reactionDate}
                onChange={(e) => updateField('reactionDate', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Symptoms */}
        <div className="rounded-xl border p-4 space-y-3">
          <h2 className="text-sm font-bold">อาการที่เกิดขึ้น *</h2>
          <textarea
            className="w-full rounded-lg border px-3 py-2 text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="อธิบายอาการที่เกิดขึ้น เช่น ผื่นแดง คัน หายใจหอบ..."
            value={form.symptoms}
            onChange={(e) => updateField('symptoms', e.target.value)}
          />
        </div>

        {/* Severity */}
        <div className="rounded-xl border p-4 space-y-3">
          <h2 className="text-sm font-bold">ความรุนแรง</h2>
          <div className="space-y-2">
            {SEVERITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => updateField('severity', opt.value)}
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

        {/* Causality Assessment (WHO-UMC) */}
        <div className="rounded-xl border p-4">
          <button
            onClick={() => setShowCausality(!showCausality)}
            className="flex w-full items-center justify-between"
          >
            <h2 className="text-sm font-bold">ประเมินความสัมพันธ์ (WHO-UMC)</h2>
            {showCausality ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>

          {showCausality && (
            <div className="mt-3 space-y-3">
              <p className="text-xs text-muted-foreground">
                ทำเครื่องหมายหากตรงตามเกณฑ์:
              </p>
              {CAUSALITY_CRITERIA.map((c) => (
                <label key={c.id} className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={!!form.causalityCriteria[c.id]}
                    onChange={() => toggleCausality(c.id)}
                    className="mt-0.5 h-4 w-4 rounded"
                  />
                  <div>
                    <p className="text-sm">{c.label}</p>
                    <p className="text-xs text-muted-foreground">{c.desc}</p>
                  </div>
                </label>
              ))}

              {/* Result */}
              <div className={`mt-3 rounded-lg p-3 ${causalityResult.color}`}>
                <p className="text-xs font-medium">
                  ผลประเมิน: {causalityResult.label} ({causalityResult.level})
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Outcome */}
        <div className="rounded-xl border p-4 space-y-3">
          <h2 className="text-sm font-bold">ผลลัพธ์</h2>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'recovered', label: 'หายแล้ว' },
              { value: 'recovering', label: 'กำลังหาย' },
              { value: 'not_recovered', label: 'ยังไม่หาย' },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => updateField('outcome', opt.value)}
                className={`rounded-lg border py-2 text-sm transition-colors ${
                  form.outcome === opt.value
                    ? 'border-primary bg-secondary text-primary'
                    : 'hover:bg-muted'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
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
