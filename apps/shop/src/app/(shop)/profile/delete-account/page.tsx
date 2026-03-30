'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Shield,
  Clock,
  FileText,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/store/auth';
import { toast } from 'sonner';

export default function DeleteAccountPage() {
  const router = useRouter();
  const { clearAuth } = useAuthStore();
  const [step, setStep] = useState<'confirm' | 'reason' | 'final'>('confirm');
  const [confirmText, setConfirmText] = useState('');
  const [reason, setReason] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (confirmText !== 'DELETE') return;
    
    setDeleting(true);
    // Simulate API call
    setTimeout(() => {
      setDeleting(false);
      clearAuth();
      toast.success('บัญชีถูกลบแล้ว');
      router.replace('/');
    }, 2000);
  };

  // ── Step 1: Confirm ────────────────────────────────────────────────
  if (step === 'confirm') {
    return (
      <div className="px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/profile/pdpa" className="rounded-full p-1 hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-bold">ลบบัญชี</h1>
        </div>

        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
            <div>
              <h2 className="font-bold text-red-800">คำเตือน</h2>
              <p className="text-sm text-red-700 mt-1">
                การลบบัญชีจะลบข้อมูลส่วนตัวของคุณออกจากระบบ แต่ข้อมูลใบสั่งยาและการสั่งซื้อจะถูกเก็บไว้ตามกฎหมาย (10 ปี)
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <h3 className="font-medium">ข้อมูลที่จะถูกลบ:</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-red-500" />
              ข้อมูลส่วนตัว (ชื่อ, เบอร์โทร, ที่อยู่)
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-red-500" />
              ประวัติแพ้ยาและโรคประจำตัว
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-red-500" />
              ยาที่กินอยู่ปัจจุบัน
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-red-500" />
              แต้มสะสมและสมาชิก
            </li>
          </ul>

          <h3 className="font-medium mt-4">ข้อมูลที่ยังคงเก็บไว้ (ตามกฎหมาย):</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-amber-500" />
              ใบสั่งยา (10 ปี ตาม พ.ร.บ. ยา)
            </li>
            <li className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-amber-500" />
              ประวัติการสั่งซื้อ (10 ปี)
            </li>
            <li className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-amber-500" />
              รายงานผลข้างเคียง (อย.)
            </li>
          </ul>
        </div>

        <div className="fixed bottom-16 left-0 right-0 z-40 border-t bg-white p-4">
          <div className="mx-auto max-w-lg space-y-2">
            <Button
              variant="destructive"
              className="w-full"
              size="lg"
              onClick={() => setStep('reason')}
            >
              <Trash2 className="h-4 w-4" />
              ดำเนินการลบบัญชี
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => router.back()}
            >
              ยกเลิก
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 2: Reason ────────────────────────────────────────────────
  if (step === 'reason') {
    return (
      <div className="px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setStep('confirm')} className="rounded-full p-1 hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold">เหตุผลในการลบบัญชี</h1>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          ข้อมูลนี้จะช่วยให้เราปรับปรุงบริการ (ไม่บังคับ)
        </p>

        <div className="space-y-2">
          {[
            'ไม่ได้ใช้บริการแล้ว',
            'เปลี่ยนไปใช้ร้านอื่น',
            'กังวลเรื่องความเป็นส่วนตัว',
            'มีปัญหากับบริการ',
            'อื่นๆ',
          ].map((r) => (
            <button
              key={r}
              onClick={() => { setReason(r); setStep('final'); }}
              className="w-full rounded-xl border p-3 text-left hover:bg-muted transition-colors"
            >
              {r}
            </button>
          ))}
        </div>

        <div className="fixed bottom-16 left-0 right-0 z-40 border-t bg-white p-4">
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => setStep('final')}
          >
            ข้าม
          </Button>
        </div>
      </div>
    );
  }

  // ── Step 3: Final Confirmation ──────────────────────────────────
  return (
    <div className="px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => setStep('reason')} className="rounded-full p-1 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold">ยืนยันการลบบัญชี</h1>
      </div>

      <div className="rounded-xl border border-red-200 bg-red-50 p-4 mb-6">
        <p className="text-sm text-red-800">
          เพื่อยืนยันการลบ กรุณาพิมพ์ <strong>DELETE</strong> ในช่องด้านล่าง
        </p>
      </div>

      <Input
        className="uppercase"
        placeholder="พิมพ์ DELETE"
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
      />

      <div className="mt-4 flex items-start gap-2">
        <Clock className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          การลบบัญชีจะมีผลภายใน 30 วัน หากเปลี่ยนใจสามารถติดต่อ DPO ที่ dpo@reyapharmacy.com
        </p>
      </div>

      <div className="fixed bottom-16 left-0 right-0 z-40 border-t bg-white p-4">
        <div className="mx-auto max-w-lg space-y-2">
          <Button
            variant="destructive"
            className="w-full"
            size="lg"
            disabled={confirmText !== 'DELETE' || deleting}
            onClick={handleDelete}
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            {deleting ? 'กำลังลบ...' : 'ยืนยันการลบบัญชี'}
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => router.back()}
            disabled={deleting}
          >
            ยกเลิก
          </Button>
        </div>
      </div>
    </div>
  );
}
