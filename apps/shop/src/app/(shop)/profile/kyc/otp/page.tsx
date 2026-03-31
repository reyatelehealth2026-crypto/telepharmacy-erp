'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, CheckCircle, Phone } from 'lucide-react';
import { useAuthGuard } from '@/lib/use-auth-guard';
import { sendOtp, verifyOtp } from '@/lib/kyc';
import { toast } from 'sonner';

export default function KycOtpPage() {
  const router = useRouter();
  const { loading: authLoading } = useAuthGuard();
  const [verificationId, setVerificationId] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [verified, setVerified] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const vid = sessionStorage.getItem('kyc_verification_id');
    if (vid) setVerificationId(vid);
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleSendOtp = async () => {
    if (!verificationId) { toast.error('ไม่พบข้อมูลการยืนยัน'); return; }
    setSending(true);
    try {
      const res = await sendOtp(verificationId);
      setOtpSent(true);
      setCountdown(res.expiresIn || 300);
      toast.success('ส่ง OTP แล้ว');
      inputRefs.current[0]?.focus();
    } catch (err: any) { toast.error(err.message); }
    finally { setSending(false); }
  };

  const handleOtpChange = (idx: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const newOtp = [...otp];
    newOtp[idx] = val.slice(-1);
    setOtp(newOtp);
    if (val && idx < 5) inputRefs.current[idx + 1]?.focus();
    // Auto-submit when all filled
    if (newOtp.every(d => d) && newOtp.join('').length === 6) {
      handleVerify(newOtp.join(''));
    }
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) inputRefs.current[idx - 1]?.focus();
  };

  const handleVerify = async (code: string) => {
    setVerifying(true);
    try {
      const res = await verifyOtp(verificationId, code);
      if (res.verified) {
        setVerified(true);
        toast.success('ยืนยัน OTP สำเร็จ');
      }
    } catch (err: any) {
      toast.error(err.message || 'OTP ไม่ถูกต้อง');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally { setVerifying(false); }
  };

  if (authLoading) return <div className="flex items-center justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  if (verified) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-24 gap-4">
        <CheckCircle className="h-16 w-16 text-green-600" />
        <h2 className="text-lg font-bold">ยืนยัน OTP สำเร็จ</h2>
        <p className="text-center text-sm text-muted-foreground">กรุณาตรวจสอบอีเมลเพื่อยืนยันขั้นตอนสุดท้าย</p>
        <button onClick={() => router.push('/profile/kyc')} className="mt-4 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground">
          กลับหน้า KYC
        </button>
      </div>
    );
  }

  return (
    <div className="pb-20">
      <div className="flex items-center gap-3 px-4 py-3">
        <Link href="/profile/kyc" className="rounded-full p-1 hover:bg-muted"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="text-lg font-bold">ยืนยัน OTP</h1>
      </div>

      <div className="space-y-6 px-4">
        {!otpSent ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Phone className="h-8 w-8 text-primary" />
            </div>
            <p className="text-center text-sm text-muted-foreground">ระบบจะส่งรหัส OTP 6 หลักไปยังเบอร์โทรศัพท์ที่ลงทะเบียนไว้</p>
            <button onClick={handleSendOtp} disabled={sending} className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground disabled:opacity-50">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />}
              {sending ? 'กำลังส่ง...' : 'ส่ง OTP'}
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-6 py-8">
            <p className="text-center text-sm text-muted-foreground">กรอกรหัส OTP 6 หลักที่ได้รับทาง SMS</p>

            {/* OTP Input */}
            <div className="flex gap-2">
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  ref={el => { inputRefs.current[idx] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleOtpChange(idx, e.target.value)}
                  onKeyDown={e => handleKeyDown(idx, e)}
                  className="h-12 w-10 rounded-lg border text-center text-lg font-bold focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              ))}
            </div>

            {verifying && <Loader2 className="h-6 w-6 animate-spin text-primary" />}

            {countdown > 0 && (
              <p className="text-xs text-muted-foreground">หมดอายุใน {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}</p>
            )}

            <button onClick={handleSendOtp} disabled={sending || countdown > 240} className="text-sm text-primary hover:underline disabled:opacity-50">
              ส่ง OTP อีกครั้ง
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
