'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle,
  QrCode,
  Upload,
  Copy,
  Clock,
  Loader2,
  ShoppingBag,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth';
import { uploadPaymentSlip } from '@/lib/orders';
import { toast } from 'sonner';

export default function CheckoutSuccessPage() {
  const { accessToken } = useAuthStore();
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [slipUploaded, setSlipUploaded] = useState(false);

  const handleSlipUpload = async () => {
    if (!slipFile || !accessToken) return;
    setUploading(true);
    try {
      // In production, orderId would come from the order creation response
      const res = await uploadPaymentSlip(accessToken, 'latest', slipFile);
      setSlipUploaded(true);
      if (res.verified) {
        toast.success('ตรวจสอบสลิปสำเร็จ ยืนยันการชำระเงินแล้ว');
      } else {
        toast.info('ส่งสลิปแล้ว รอเจ้าหน้าที่ตรวจสอบ');
      }
    } catch {
      toast.error('อัปโหลดสลิปไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center px-6 py-10">
      {/* Success Icon */}
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
        <CheckCircle className="h-10 w-10 text-primary" />
      </div>
      <h1 className="mt-4 text-xl font-bold">สั่งซื้อสำเร็จ!</h1>
      <p className="mt-1 text-sm text-muted-foreground">ขอบคุณที่ใช้บริการ REYA Pharmacy</p>

      {/* PromptPay QR Section */}
      <div className="mt-6 w-full max-w-sm rounded-xl border p-4">
        <div className="flex items-center gap-2 mb-3">
          <QrCode className="h-5 w-5 text-blue-600" />
          <h2 className="text-sm font-bold">ชำระเงินผ่าน PromptPay</h2>
        </div>

        {/* QR Code placeholder */}
        <div className="flex flex-col items-center rounded-lg bg-white p-4">
          <div className="flex h-48 w-48 items-center justify-center rounded-lg border-2 border-dashed bg-muted">
            <QrCode className="h-16 w-16 text-muted-foreground/30" />
          </div>
          <p className="mt-2 text-sm font-bold text-primary">฿0.00</p>
          <p className="text-xs text-muted-foreground">REYA Pharmacy Co., Ltd.</p>
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-lg bg-muted p-2">
          <p className="flex-1 text-xs text-muted-foreground">
            พร้อมเพย์: 0-1234-56789-0
          </p>
          <button
            onClick={() => {
              navigator.clipboard.writeText('0123456789');
              toast.success('คัดลอกแล้ว');
            }}
            className="rounded p-1 hover:bg-background"
          >
            <Copy className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>

        <div className="mt-3 flex items-center gap-2 text-xs text-amber-600">
          <Clock className="h-3.5 w-3.5" />
          <span>กรุณาชำระภายใน 30 นาที</span>
        </div>
      </div>

      {/* Slip Upload */}
      <div className="mt-4 w-full max-w-sm rounded-xl border p-4">
        <h2 className="text-sm font-bold">ส่งหลักฐานการชำระเงิน</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          ถ่ายรูปหรือแคปหน้าจอสลิปโอนเงิน ระบบจะตรวจสอบอัตโนมัติ
        </p>

        {slipUploaded ? (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-primary/10 p-3">
            <CheckCircle className="h-4 w-4 text-primary" />
            <p className="text-sm font-medium text-primary">ส่งสลิปแล้ว</p>
          </div>
        ) : (
          <>
            {slipFile && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-muted p-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1 truncate text-xs">{slipFile.name}</span>
                <button
                  onClick={() => setSlipFile(null)}
                  className="text-xs text-destructive"
                >
                  ลบ
                </button>
              </div>
            )}

            <div className="mt-3 flex gap-2">
              <label className="flex-1">
                <span className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary">
                  <Upload className="h-4 w-4" />
                  {slipFile ? 'เปลี่ยนรูป' : 'เลือกรูปสลิป'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) setSlipFile(e.target.files[0]);
                  }}
                />
              </label>
              {slipFile && (
                <Button size="sm" onClick={handleSlipUpload} disabled={uploading}>
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  ส่งสลิป
                </Button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Navigation */}
      <div className="mt-6 flex w-full max-w-sm gap-3">
        <Link
          href="/orders"
          className="flex flex-1 items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-colors hover:bg-muted"
        >
          <ShoppingBag className="h-4 w-4" />
          ดูออเดอร์
        </Link>
        <Link
          href="/"
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          กลับหน้าหลัก
        </Link>
      </div>
    </div>
  );
}
