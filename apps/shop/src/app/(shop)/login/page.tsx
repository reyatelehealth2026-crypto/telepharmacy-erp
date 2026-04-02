'use client';fix

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Pill, MessageCircle, Shield, Truck, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLiff } from '@/components/providers/liff-provider';
import { useAuthStore } from '@/store/auth';

const features = [
  { icon: Pill, label: 'สั่งยาออนไลน์', desc: 'ส่งถึงบ้านภายใน 1-3 วัน', color: 'bg-emerald-50 text-emerald-600' },
  { icon: MessageCircle, label: 'ปรึกษาเภสัชกร', desc: 'ผู้เชี่ยวชาญพร้อมดูแล', color: 'bg-blue-50 text-blue-600' },
  { icon: Shield, label: 'ตรวจสอบยา', desc: 'AI ช่วยตรวจความปลอดภัย', color: 'bg-purple-50 text-purple-600' },
  { icon: Truck, label: 'จัดส่งฟรี', desc: 'เมื่อซื้อครบ ฿500', color: 'bg-amber-50 text-amber-600' },
];

export default function LoginPage() {
  const router = useRouter();
  const { ready, isLineLoggedIn, login } = useLiff();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!ready) return;
    if (isAuthenticated()) {
      const patient = useAuthStore.getState().patient;
      if (patient && !patient.isRegistered) {
        router.replace('/register');
      } else {
        router.replace('/');
      }
    }
  }, [ready, isAuthenticated, router]);

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      {/* Background decoration */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/6" />
      <div className="pointer-events-none absolute -left-16 bottom-20 h-48 w-48 rounded-full bg-emerald-200/30" />

      <div className="relative flex flex-1 flex-col items-center justify-center px-6 py-12">
        {/* Logo / Brand */}
        <div className="animate-scale-in flex flex-col items-center">
          <div className="relative">
            <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-primary to-emerald-700 text-white shadow-xl animate-pulse-green">
              <Pill className="h-12 w-12" />
            </div>
            <div className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-amber-400 shadow-md">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
          </div>
          <h1 className="mt-5 text-3xl font-bold tracking-tight text-foreground">
            REYA Pharmacy
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            ร้านยาออนไลน์ พร้อมเภสัชกรดูแล
          </p>
        </div>

        {/* Feature Grid */}
        <div className="mt-10 grid w-full max-w-sm grid-cols-2 gap-3 animate-slide-up">
          {features.map((f) => (
            <div
              key={f.label}
              className="flex items-start gap-2.5 rounded-2xl bg-white/80 p-3.5 shadow-card ring-1 ring-border/50"
            >
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${f.color}`}>
                <f.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold leading-tight">{f.label}</p>
                <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">
                  {f.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Login CTA */}
        <div className="mt-8 w-full max-w-sm space-y-3 animate-slide-up">
          {!ready ? (
            <Button className="w-full rounded-2xl" size="lg" disabled>
              <Loader2 className="h-4 w-4 animate-spin" />
              กำลังโหลด...
            </Button>
          ) : (
            <>
              <Button
                className="w-full rounded-2xl bg-[#06C755] text-base font-semibold hover:bg-[#06C755]/90 shadow-md"
                size="lg"
                onClick={login}
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white shrink-0">
                  <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                </svg>
                เข้าสู่ระบบด้วย LINE
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                เข้าสู่ระบบครั้งแรก = สมัครสมาชิกอัตโนมัติ
              </p>
            </>
          )}
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-[11px] text-muted-foreground leading-relaxed">
          การเข้าสู่ระบบถือว่าคุณยอมรับ{' '}
          <span className="text-primary underline underline-offset-2">ข้อกำหนดการใช้งาน</span>{' '}
          และ{' '}
          <span className="text-primary underline underline-offset-2">นโยบายความเป็นส่วนตัว</span>
        </p>
      </div>
    </div>
  );
}
