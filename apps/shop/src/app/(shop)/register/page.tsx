'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Shield,
  CheckCircle2,
  Loader2,
  ChevronDown,
  ChevronUp,
  Star,
  CreditCard,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLiff } from '@/components/providers/liff-provider';
import { getLiffAccessToken } from '@/lib/liff';
import { registerPatient } from '@/lib/auth';
import { useAuthStore } from '@/store/auth';

const PDPA_VERSION = '1.0';

const pdpaSections = [
  {
    title: 'ข้อมูลที่จัดเก็บ',
    content: 'ชื่อ-นามสกุล, วันเกิด, เพศ, เบอร์โทร, ประวัติแพ้ยา, โรคประจำตัว, ยาที่ใช้, ประวัติสั่งซื้อ, ใบสั่งยา',
  },
  {
    title: 'วัตถุประสงค์',
    content: 'ให้บริการสั่งซื้อยา, ตรวจสอบความปลอดภัยยา, ให้คำปรึกษาโดยเภสัชกร, ส่งการแจ้งเตือน, ปรับปรุงบริการ',
  },
  {
    title: 'สิทธิ์ของคุณ',
    content: 'เข้าถึง/สำเนาข้อมูล, แก้ไขข้อมูล, ลบข้อมูล, คัดค้านการประมวลผล, ถอนความยินยอมได้ทุกเมื่อ',
  },
  {
    title: 'ระยะเวลาจัดเก็บ',
    content: 'ข้อมูลยาและใบสั่งยา: 10 ปี (ตาม พ.ร.บ. ยา), ข้อมูลทั่วไป: 5 ปีหลังยุติบริการ',
  },
];

export default function RegisterPage() {
  const router = useRouter();
  const { liffProfile, ready: liffReady } = useLiff();
  const { setAuth, patient } = useAuthStore();

  const [step, setStep] = useState<'pdpa' | 'profile'>('pdpa');
  const [pdpaAgreed, setPdpaAgreed] = useState(false);
  const [expandedPdpa, setExpandedPdpa] = useState<number | null>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    dateOfBirth: '',
    gender: '' as '' | 'male' | 'female' | 'other',
    weight: '',
    height: '',
  });

  // Pre-fill name from LINE profile when available
  useEffect(() => {
    if (liffProfile?.displayName && !form.firstName) {
      const parts = liffProfile.displayName.split(' ');
      setForm((f) => ({
        ...f,
        firstName: parts[0] ?? '',
        lastName: parts.slice(1).join(' '),
      }));
    }
  }, [liffProfile]); // eslint-disable-line react-hooks/exhaustive-deps

  // If already registered, go home
  useEffect(() => {
    if (liffReady && patient?.isRegistered) {
      router.replace('/');
    }
  }, [liffReady, patient, router]);

  const updateField = (field: string, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    setError('');
  };

  const handleRegister = async () => {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.phone.trim() || !form.dateOfBirth || !form.gender) {
      setError('กรุณากรอกข้อมูลที่จำเป็นให้ครบ');
      return;
    }

    const lineAccessToken = getLiffAccessToken();
    if (!lineAccessToken) {
      setError('ไม่พบ LINE access token กรุณาเข้าสู่ระบบด้วย LINE ใหม่อีกครั้ง');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await registerPatient({
        lineAccessToken,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim(),
        dateOfBirth: form.dateOfBirth,
        gender: form.gender as 'male' | 'female' | 'other',
        weight: form.weight ? parseFloat(form.weight) : undefined,
        height: form.height ? parseFloat(form.height) : undefined,
        pdpaConsent: true,
        pdpaConsentVersion: PDPA_VERSION,
      });

      setAuth({
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
        patient: res.patient,
      });

      router.replace('/onboarding/health');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setLoading(false);
    }
  };

  // Step 1: PDPA Consent
  if (step === 'pdpa') {
    return (
      <div className="pb-32">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => router.replace('/login')}
            className="rounded-full p-1 hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold">สมัครสมาชิก REYA</h1>
        </div>

        {/* Member Card Preview */}
        <div className="px-4 pb-4">
          <div className="rounded-2xl bg-gradient-to-br from-primary to-emerald-700 p-4 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {liffProfile?.pictureUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={liffProfile.pictureUrl}
                    alt="Profile"
                    className="h-12 w-12 rounded-full border-2 border-white/30"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
                    <User className="h-6 w-6" />
                  </div>
                )}
                <div>
                  <p className="font-bold">{liffProfile?.displayName ?? 'ผู้ใช้ใหม่'}</p>
                  <p className="text-xs text-emerald-200">กำลังสมัครสมาชิก...</p>
                </div>
              </div>
              <CreditCard className="h-6 w-6 text-white/50" />
            </div>
            <div className="mt-3 flex items-center gap-1">
              <Star className="h-3 w-3 text-amber-300" />
              <span className="text-xs text-emerald-200">สมาชิก Bronze — 0 แต้ม</span>
            </div>
          </div>
        </div>

        <div className="space-y-4 px-4">
          {/* PDPA Banner */}
          <div className="rounded-xl bg-primary/5 border border-primary/20 p-4">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <h2 className="text-sm font-bold text-primary">นโยบายคุ้มครองข้อมูลส่วนบุคคล</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  ตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA)
                  กรุณาอ่านและยอมรับก่อนสมัครสมาชิก
                </p>
              </div>
            </div>
          </div>

          {/* PDPA Sections */}
          <div className="space-y-2">
            {pdpaSections.map((section, i) => (
              <div key={i} className="rounded-xl border overflow-hidden">
                <button
                  className="flex w-full items-center justify-between p-3 text-left hover:bg-muted/30"
                  onClick={() => setExpandedPdpa(expandedPdpa === i ? null : i)}
                >
                  <span className="text-sm font-medium">{section.title}</span>
                  {expandedPdpa === i ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
                {expandedPdpa === i && (
                  <div className="border-t px-3 py-2">
                    <p className="text-xs text-muted-foreground leading-relaxed">{section.content}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Consent Checkbox */}
          <label className="flex items-start gap-3 rounded-xl border p-4 cursor-pointer">
            <input
              type="checkbox"
              checked={pdpaAgreed}
              onChange={(e) => setPdpaAgreed(e.target.checked)}
              className="mt-0.5 h-5 w-5 rounded accent-primary"
            />
            <div>
              <p className="text-sm font-medium">ยินยอมให้จัดเก็บและใช้ข้อมูล</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                ข้าพเจ้ายินยอมให้ REYA Pharmacy เก็บรวบรวม ใช้ และเปิดเผยข้อมูลส่วนบุคคล
                ตามวัตถุประสงค์ที่ระบุข้างต้น
              </p>
            </div>
          </label>
        </div>

        <div className="fixed bottom-16 left-0 right-0 z-40 border-t bg-white p-4">
          <div className="mx-auto max-w-lg">
            <Button
              className="w-full"
              size="lg"
              disabled={!pdpaAgreed}
              onClick={() => setStep('profile')}
            >
              <CheckCircle2 className="h-4 w-4" />
              ยอมรับและกรอกข้อมูล
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Profile Setup
  return (
    <div className="pb-32">
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={() => setStep('pdpa')} className="rounded-full p-1 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-lg font-bold">ข้อมูลส่วนตัว</h1>
          <p className="text-xs text-muted-foreground">กรอกข้อมูลเพื่อรับบัตรสมาชิก</p>
        </div>
      </div>

      {/* Member Card with name preview */}
      <div className="px-4 pb-4">
        <div className="rounded-2xl bg-gradient-to-br from-primary to-emerald-700 p-4 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {liffProfile?.pictureUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={liffProfile.pictureUrl}
                  alt="Profile"
                  className="h-12 w-12 rounded-full border-2 border-white/30"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
                  <User className="h-6 w-6" />
                </div>
              )}
              <div>
                <p className="font-bold">
                  {form.firstName || form.lastName
                    ? `${form.firstName} ${form.lastName}`.trim()
                    : (liffProfile?.displayName ?? 'กรอกชื่อด้านล่าง')}
                </p>
                <p className="text-xs text-emerald-200">
                  {patient?.patientNo ?? 'กำลังสร้างหมายเลขสมาชิก...'}
                </p>
              </div>
            </div>
            <CreditCard className="h-6 w-6 text-white/50" />
          </div>
          <div className="mt-3 flex items-center gap-1">
            <Star className="h-3 w-3 text-amber-300" />
            <span className="text-xs text-emerald-200">สมาชิก Bronze — 0 แต้ม</span>
          </div>
        </div>
      </div>

      <div className="space-y-4 px-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">ชื่อ *</label>
            <Input
              className="mt-1"
              placeholder="ชื่อจริง"
              value={form.firstName}
              onChange={(e) => updateField('firstName', e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">นามสกุล *</label>
            <Input
              className="mt-1"
              placeholder="นามสกุล"
              value={form.lastName}
              onChange={(e) => updateField('lastName', e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground">เบอร์โทรศัพท์ *</label>
          <Input
            className="mt-1"
            type="tel"
            placeholder="08x-xxx-xxxx"
            value={form.phone}
            onChange={(e) => updateField('phone', e.target.value)}
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground">วันเกิด *</label>
          <Input
            className="mt-1"
            type="date"
            value={form.dateOfBirth}
            onChange={(e) => updateField('dateOfBirth', e.target.value)}
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground">เพศ *</label>
          <div className="mt-1 flex gap-2">
            {[
              { value: 'male', label: 'ชาย' },
              { value: 'female', label: 'หญิง' },
              { value: 'other', label: 'อื่นๆ' },
            ].map((g) => (
              <button
                key={g.value}
                onClick={() => updateField('gender', g.value)}
                className={`flex-1 rounded-lg border py-2.5 text-sm font-medium transition-colors ${
                  form.gender === g.value
                    ? 'border-primary bg-secondary text-primary'
                    : 'hover:bg-muted'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">น้ำหนัก (กก.)</label>
            <Input
              className="mt-1"
              type="number"
              placeholder="60"
              value={form.weight}
              onChange={(e) => updateField('weight', e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">ส่วนสูง (ซม.)</label>
            <Input
              className="mt-1"
              type="number"
              placeholder="170"
              value={form.height}
              onChange={(e) => updateField('height', e.target.value)}
            />
          </div>
        </div>

        {error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>
        )}
      </div>

      <div className="fixed bottom-16 left-0 right-0 z-40 border-t bg-white p-4">
        <div className="mx-auto max-w-lg">
          <Button
            className="w-full"
            size="lg"
            disabled={loading}
            onClick={handleRegister}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {loading ? 'กำลังบันทึก...' : 'บันทึกและรับบัตรสมาชิก'}
          </Button>
        </div>
      </div>
    </div>
  );
}
