'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Pill, MessageCircle, Shield, Truck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLiff } from '@/components/providers/liff-provider';
import { useAuthStore } from '@/store/auth';

const features = [
  { icon: Pill, label: 'สั่งยาออนไลน์', desc: 'ส่งถึงบ้านภายใน 1-3 วัน' },
  { icon: MessageCircle, label: 'ปรึกษาเภสัชกร', desc: 'ผู้เชี่ยวชาญพร้อมดูแล' },
  { icon: Shield, label: 'ตรวจสอบยา', desc: 'AI ช่วยตรวจความปลอดภัย' },
  { icon: Truck, label: 'จัดส่งฟรี', desc: 'เมื่อซื้อครบ ฿500' },
];

export default function LoginPage() {
  const router = useRouter();
  const { ready, isLineLoggedIn, login } = useLiff();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (ready && isAuthenticated()) {
      router.replace('/');
    }
  }, [ready, isAuthenticated, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      {/* Logo */}
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-primary text-white shadow-lg">
        <Pill className="h-10 w-10" />
      </div>
      <h1 className="mt-4 text-2xl font-bold">REYA Pharmacy</h1>
      <p className="mt-1 text-sm text-muted-foreground">ร้านยาออนไลน์ พร้อมเภสัชกรดูแล</p>

      {/* Features */}
      <div className="mt-8 grid w-full max-w-sm grid-cols-2 gap-3">
        {features.map((f) => (
          <div key={f.label} className="flex items-center gap-2 rounded-xl bg-secondary p-3">
            <f.icon className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs font-medium">{f.label}</p>
              <p className="text-[10px] text-muted-foreground">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Login Button */}
      <div className="mt-8 w-full max-w-sm space-y-3">
        {!ready ? (
          <Button className="w-full" size="lg" disabled>
            <Loader2 className="h-4 w-4 animate-spin" />
            กำลังโหลด...
          </Button>
        ) : (
          <>
            <Button
              className="w-full bg-[#06C755] hover:bg-[#06C755]/90"
              size="lg"
              onClick={login}
            >
              <svg viewBox="0 0 24 24" className="mr-2 h-5 w-5 fill-white">
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
      <p className="mt-6 text-center text-[10px] text-muted-foreground">
        การเข้าสู่ระบบถือว่าคุณยอมรับ{' '}
        <span className="text-primary underline">ข้อกำหนดการใช้งาน</span> และ{' '}
        <span className="text-primary underline">นโยบายความเป็นส่วนตัว</span>
      </p>
    </div>
  );
}
