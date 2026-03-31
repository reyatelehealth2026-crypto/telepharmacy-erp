'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Heart,
  Stethoscope,
  Plus,
  X,
  CheckCircle,
  SkipForward,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/auth';
import { useAuthGuard } from '@/lib/use-auth-guard';
import { createAllergy, createDisease } from '@/lib/patient';

interface AllergyEntry {
  drugName: string;
  severity: 'mild' | 'moderate' | 'severe' | 'life_threatening';
  symptoms: string;
}

interface DiseaseEntry {
  diseaseName: string;
  isControlled: boolean;
  medications: string;
}

const COMMON_ALLERGIES = [
  'Penicillin',
  'Sulfonamide',
  'NSAIDs (Aspirin/Ibuprofen)',
  'Cephalosporin',
  'Tetracycline',
  'ACE Inhibitors',
];

const COMMON_DISEASES = [
  'เบาหวาน (Diabetes)',
  'ความดันโลหิตสูง (Hypertension)',
  'หอบหืด (Asthma)',
  'ไขมันในเลือดสูง (Dyslipidemia)',
  'โรคหัวใจ (Heart Disease)',
  'โรคไต (Kidney Disease)',
  'โรคตับ (Liver Disease)',
  'โรคกระเพาะ (Peptic Ulcer)',
];

export default function HealthOnboardingPage() {
  const router = useRouter();
  const { loading: authLoading, token } = useAuthGuard();
  const { accessToken } = useAuthStore();
  const [step, setStep] = useState<'allergies' | 'diseases' | 'done'>('allergies');
  const [saving, setSaving] = useState(false);

  // Allergy state
  const [allergies, setAllergies] = useState<AllergyEntry[]>([]);
  const [allergyForm, setAllergyForm] = useState<AllergyEntry>({
    drugName: '',
    severity: 'mild',
    symptoms: '',
  });
  const [showAllergyForm, setShowAllergyForm] = useState(false);

  // Disease state
  const [diseases, setDiseases] = useState<DiseaseEntry[]>([]);
  const [diseaseForm, setDiseaseForm] = useState<DiseaseEntry>({
    diseaseName: '',
    isControlled: false,
    medications: '',
  });
  const [showDiseaseForm, setShowDiseaseForm] = useState(false);

  const addAllergy = () => {
    if (!allergyForm.drugName.trim()) return;
    setAllergies((prev) => [...prev, { ...allergyForm }]);
    setAllergyForm({ drugName: '', severity: 'mild', symptoms: '' });
    setShowAllergyForm(false);
  };

  const addQuickAllergy = (name: string) => {
    if (allergies.some((a) => a.drugName === name)) return;
    setAllergies((prev) => [...prev, { drugName: name, severity: 'moderate', symptoms: '' }]);
  };

  const removeAllergy = (idx: number) => {
    setAllergies((prev) => prev.filter((_, i) => i !== idx));
  };

  const addDisease = () => {
    if (!diseaseForm.diseaseName.trim()) return;
    setDiseases((prev) => [...prev, { ...diseaseForm }]);
    setDiseaseForm({ diseaseName: '', isControlled: false, medications: '' });
    setShowDiseaseForm(false);
  };

  const addQuickDisease = (name: string) => {
    if (diseases.some((d) => d.diseaseName === name)) return;
    setDiseases((prev) => [...prev, { diseaseName: name, isControlled: false, medications: '' }]);
  };

  const removeDisease = (idx: number) => {
    setDiseases((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSaveAndFinish = async () => {
    if (!accessToken) {
      router.replace('/');
      return;
    }

    setSaving(true);
    try {
      // Save allergies in parallel
      await Promise.allSettled(
        allergies.map((a) =>
          createAllergy(accessToken, {
            drugName: a.drugName,
            allergyGroup: null,
            severity: a.severity,
            symptoms: a.symptoms || null,
            source: 'patient_reported',
            notes: null,
          })
        )
      );

      // Save diseases in parallel
      await Promise.allSettled(
        diseases.map((d) =>
          createDisease(accessToken, {
            diseaseName: d.diseaseName,
            icdCode: null,
            diagnosedYear: null,
            isControlled: d.isControlled,
            medications: d.medications || null,
            notes: null,
          })
        )
      );

      setStep('done');
    } catch {
      // Continue even if some fail
      setStep('done');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) return <div className="flex items-center justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  // ── Done Step ──────────────────────────────────────────────────────────
  if (step === 'done') {
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center px-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <CheckCircle className="h-10 w-10 text-primary" />
        </div>
        <h1 className="mt-4 text-xl font-bold">ยินดีต้อนรับสู่ REYA!</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          ข้อมูลสุขภาพของคุณถูกบันทึกแล้ว
          <br />
          ระบบจะตรวจสอบความปลอดภัยยาทุกครั้งที่สั่งซื้อ
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {allergies.length > 0 && (
            <Badge variant="destructive">แพ้ยา {allergies.length} รายการ</Badge>
          )}
          {diseases.length > 0 && (
            <Badge variant="warning">โรคประจำตัว {diseases.length} รายการ</Badge>
          )}
          {allergies.length === 0 && diseases.length === 0 && (
            <Badge variant="success">ไม่มีข้อมูลเพิ่มเติม</Badge>
          )}
        </div>
        <Button className="mt-6" size="lg" onClick={() => router.replace('/')}>
          เริ่มใช้งาน
        </Button>
      </div>
    );
  }

  // ── Allergies Step ─────────────────────────────────────────────────────
  if (step === 'allergies') {
    return (
      <div className="pb-32">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => router.back()} className="rounded-full p-1 hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold">ประวัติแพ้ยา</h1>
            <p className="text-xs text-muted-foreground">ขั้นตอนที่ 2/2 — ข้อมูลสุขภาพ</p>
          </div>
        </div>

        <div className="space-y-4 px-4">
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              ข้อมูลแพ้ยาสำคัญมาก ระบบจะตรวจสอบทุกครั้งก่อนจ่ายยาเพื่อความปลอดภัย
            </p>
          </div>

          {/* Quick Add */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">แพ้ยาที่พบบ่อย (กดเพื่อเพิ่ม)</p>
            <div className="flex flex-wrap gap-2">
              {COMMON_ALLERGIES.map((name) => {
                const added = allergies.some((a) => a.drugName === name);
                return (
                  <button
                    key={name}
                    disabled={added}
                    onClick={() => addQuickAllergy(name)}
                    className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                      added
                        ? 'border-primary bg-secondary text-primary opacity-60'
                        : 'hover:border-primary hover:bg-secondary'
                    }`}
                  >
                    {added ? '✓ ' : '+ '}{name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Added allergies */}
          {allergies.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">ยาที่แพ้ ({allergies.length})</p>
              {allergies.map((a, i) => (
                <div key={i} className="flex items-center justify-between rounded-xl border p-3">
                  <div className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-red-500" />
                    <div>
                      <p className="text-sm font-medium">{a.drugName}</p>
                      <p className="text-xs text-muted-foreground capitalize">{a.severity}</p>
                    </div>
                  </div>
                  <button onClick={() => removeAllergy(i)} className="p-1 text-muted-foreground hover:text-red-500">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Custom form */}
          {showAllergyForm ? (
            <div className="rounded-xl border p-4 space-y-3">
              <p className="text-sm font-medium">เพิ่มยาที่แพ้อื่นๆ</p>
              <Input
                placeholder="ชื่อยา"
                value={allergyForm.drugName}
                onChange={(e) => setAllergyForm((f) => ({ ...f, drugName: e.target.value }))}
              />
              <select
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={allergyForm.severity}
                onChange={(e) =>
                  setAllergyForm((f) => ({ ...f, severity: e.target.value as AllergyEntry['severity'] }))
                }
              >
                <option value="mild">เล็กน้อย (ผื่น, คัน)</option>
                <option value="moderate">ปานกลาง (บวม, หายใจลำบาก)</option>
                <option value="severe">รุนแรง (Anaphylaxis)</option>
                <option value="life_threatening">อันตรายถึงชีวิต</option>
              </select>
              <Input
                placeholder="อาการที่เกิด (ไม่บังคับ)"
                value={allergyForm.symptoms}
                onChange={(e) => setAllergyForm((f) => ({ ...f, symptoms: e.target.value }))}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={addAllergy} disabled={!allergyForm.drugName.trim()} className="flex-1">
                  เพิ่ม
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowAllergyForm(false)} className="flex-1">
                  ยกเลิก
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" className="w-full" onClick={() => setShowAllergyForm(true)}>
              <Plus className="h-4 w-4" />
              เพิ่มยาอื่นที่แพ้
            </Button>
          )}
        </div>

        <div className="fixed bottom-16 left-0 right-0 z-40 border-t bg-white p-4">
          <div className="mx-auto flex max-w-lg gap-3">
            <Button variant="ghost" className="text-muted-foreground" onClick={() => setStep('diseases')}>
              <SkipForward className="h-4 w-4" />
              ข้าม
            </Button>
            <Button className="flex-1" size="lg" onClick={() => setStep('diseases')}>
              ถัดไป
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Diseases Step ──────────────────────────────────────────────────────
  return (
    <div className="pb-32">
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={() => setStep('allergies')} className="rounded-full p-1 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-lg font-bold">โรคประจำตัว</h1>
          <p className="text-xs text-muted-foreground">ขั้นตอนที่ 2/2 — ข้อมูลสุขภาพ</p>
        </div>
      </div>

      <div className="space-y-4 px-4">
        <div className="flex items-start gap-3 rounded-xl bg-secondary p-3">
          <Stethoscope className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-secondary-foreground">
            ข้อมูลโรคประจำตัวช่วยให้เภสัชกรตรวจสอบข้อห้ามใช้ยา (Contraindication) ได้แม่นยำขึ้น
          </p>
        </div>

        {/* Quick Add */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">โรคที่พบบ่อย (กดเพื่อเพิ่ม)</p>
          <div className="flex flex-wrap gap-2">
            {COMMON_DISEASES.map((name) => {
              const added = diseases.some((d) => d.diseaseName === name);
              return (
                <button
                  key={name}
                  disabled={added}
                  onClick={() => addQuickDisease(name)}
                  className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                    added
                      ? 'border-primary bg-secondary text-primary opacity-60'
                      : 'hover:border-primary hover:bg-secondary'
                  }`}
                >
                  {added ? '✓ ' : '+ '}{name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Added diseases */}
        {diseases.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">โรคประจำตัว ({diseases.length})</p>
            {diseases.map((d, i) => (
              <div key={i} className="flex items-center justify-between rounded-xl border p-3">
                <div className="flex items-center gap-2">
                  <Stethoscope className="h-4 w-4 text-purple-500" />
                  <p className="text-sm font-medium">{d.diseaseName}</p>
                </div>
                <button onClick={() => removeDisease(i)} className="p-1 text-muted-foreground hover:text-red-500">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Custom form */}
        {showDiseaseForm ? (
          <div className="rounded-xl border p-4 space-y-3">
            <p className="text-sm font-medium">เพิ่มโรคประจำตัวอื่นๆ</p>
            <Input
              placeholder="ชื่อโรค"
              value={diseaseForm.diseaseName}
              onChange={(e) => setDiseaseForm((f) => ({ ...f, diseaseName: e.target.value }))}
            />
            <Input
              placeholder="ยาที่ใช้รักษา (ไม่บังคับ)"
              value={diseaseForm.medications}
              onChange={(e) => setDiseaseForm((f) => ({ ...f, medications: e.target.value }))}
            />
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={diseaseForm.isControlled}
                onChange={(e) => setDiseaseForm((f) => ({ ...f, isControlled: e.target.checked }))}
                className="h-4 w-4 rounded"
              />
              <span className="text-sm">ควบคุมได้แล้ว</span>
            </label>
            <div className="flex gap-2">
              <Button size="sm" onClick={addDisease} disabled={!diseaseForm.diseaseName.trim()} className="flex-1">
                เพิ่ม
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowDiseaseForm(false)} className="flex-1">
                ยกเลิก
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" className="w-full" onClick={() => setShowDiseaseForm(true)}>
            <Plus className="h-4 w-4" />
            เพิ่มโรคอื่นๆ
          </Button>
        )}
      </div>

      <div className="fixed bottom-16 left-0 right-0 z-40 border-t bg-white p-4">
        <div className="mx-auto flex max-w-lg gap-3">
          <Button variant="ghost" className="text-muted-foreground" onClick={handleSaveAndFinish}>
            <SkipForward className="h-4 w-4" />
            ข้าม
          </Button>
          <Button className="flex-1" size="lg" disabled={saving} onClick={handleSaveAndFinish}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            {saving ? 'กำลังบันทึก...' : 'บันทึกและเริ่มใช้งาน'}
          </Button>
        </div>
      </div>
    </div>
  );
}
