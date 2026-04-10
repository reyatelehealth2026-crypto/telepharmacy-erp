'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Link2, Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLiff } from '@/components/providers/liff-provider';
import { claimLineAccount } from '@/lib/auth';
import { useAuthStore } from '@/store/auth';

export default function LineLinkPage() {
  const router = useRouter();
  const { ready, liffProfile, isLineLoggedIn, login, error: liffError } = useLiff();
  const { setAuth } = useAuthStore();

  const [patientNo, setPatientNo] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  async function handleSubmit() {
    if (!patientNo.trim() || !phone.trim() || !dateOfBirth) {
      setError('กรุณากรอกหมายเลขสมาชิก เบอร์โทร และวันเดือนปีเกิดให้ครบ');
      return;
    }

    if (!liffProfile?.userId) {
      setError('ไม่พบ LINE user กรุณาเปิดหน้านี้จากใน LINE และเข้าสู่ระบบก่อน');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const res = await claimLineAccount({
        patientNo: patientNo.trim(),
        phone: phone.trim(),
        dateOfBirth,
        lineUserId: liffProfile.userId,
      });

      setAuth({
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
        patient: res.patient,
      });

      setSuccessMessage(res.isNewPatient ? 'เชื่อมบัญชีสำเร็จ' : 'เชื่อมบัญชี LINE สำเร็จ');
      window.setTimeout(() => {
        router.replace('/profile');
      }, 900);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'เชื่อมบัญชีไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="pb-10">
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => router.back()}
          className="rounded-full p-1 hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold">เชื่อมบัญชี LINE เดิม</h1>
      </div>

      <div className="space-y-4 px-4">
        <div className="rounded-2xl bg-gradient-to-br from-primary to-emerald-700 p-4 text-white shadow-lg">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-emerald-100">บัญชี LINE ปัจจุบัน</p>
              <h2 className="mt-1 text-lg font-bold">{liffProfile?.displayName ?? 'ยังไม่พบโปรไฟล์ LINE'}</h2>
              <p className="mt-1 text-xs text-emerald-100/90">
                {liffProfile?.userId ? `LINE ID: ${liffProfile.userId.slice(0, 12)}...` : 'กรุณาเปิดหน้านี้จากใน LINE'}
              </p>
            </div>
            <div className="rounded-2xl bg-white/15 p-3">
              <Link2 className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 text-amber-500" />
            <div>
              <p className="text-sm font-semibold">ใช้ข้อมูลสมาชิกเดิมเพื่อยืนยันตัวตน</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                กรอกหมายเลขสมาชิก เบอร์โทรศัพท์ และวันเดือนปีเกิดให้ตรงกับข้อมูลเดิมของคุณ
                ระบบจะย้ายการเชื่อมต่อ LINE ไปยังบัญชีที่ถูกต้องให้อัตโนมัติ
              </p>
            </div>
          </div>
        </div>

        {!ready ? (
          <div className="flex items-center justify-center rounded-2xl border bg-card p-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !isLineLoggedIn || !liffProfile ? (
          <div className="rounded-2xl border bg-card p-5 text-center shadow-sm">
            <p className="text-sm font-medium">กรุณาเข้าสู่ระบบ LINE ก่อนเชื่อมบัญชี</p>
            <p className="mt-1 text-xs text-muted-foreground">
              หน้านี้จะทำงานได้เมื่อเปิดจากใน LINE หรือเข้าสู่ระบบผ่าน LIFF แล้ว
            </p>
            <Button className="mt-4 w-full" onClick={login}>
              เปิด LINE Login
            </Button>
            {(error || liffError) && (
              <p className="mt-3 text-xs text-destructive">{error || liffError}</p>
            )}
          </div>
        ) : (
          <div className="space-y-4 rounded-2xl border bg-card p-4 shadow-sm">
            <div className="space-y-2">
              <label className="text-sm font-medium">หมายเลขสมาชิก</label>
              <Input
                value={patientNo}
                onChange={(e) => setPatientNo(e.target.value)}
                placeholder="เช่น PT-00045"
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">เบอร์โทรศัพท์</label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="08xxxxxxxx"
                inputMode="tel"
                autoComplete="tel"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">วันเดือนปีเกิด</label>
              <Input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
              />
            </div>

            {error && (
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            {successMessage && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                {successMessage}
              </div>
            )}

            <Button className="w-full" size="lg" onClick={handleSubmit} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
              เชื่อมบัญชีเดิมกับ LINE นี้
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
