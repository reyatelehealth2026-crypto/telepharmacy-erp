'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Bell, Package, MessageSquare, Pill, Megaphone, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NotificationSetting {
  id: string;
  label: string;
  description: string;
  icon: typeof Bell;
  enabled: boolean;
}

export default function NotificationSettingsPage() {
  const [settings, setSettings] = useState<NotificationSetting[]>([
    {
      id: 'order_status',
      label: 'อัปเดตสถานะออเดอร์',
      description: 'แจ้งเตือนเมื่อสถานะออเดอร์เปลี่ยน (รับยา จัดส่ง ส่งถึง)',
      icon: Package,
      enabled: true,
    },
    {
      id: 'rx_status',
      label: 'สถานะใบสั่งยา',
      description: 'แจ้งเตือนเมื่อใบสั่งยาถูกอนุมัติหรือมีปัญหา',
      icon: Pill,
      enabled: true,
    },
    {
      id: 'chat',
      label: 'ข้อความจากเภสัชกร',
      description: 'แจ้งเตือนเมื่อเภสัชกรตอบกลับ',
      icon: MessageSquare,
      enabled: true,
    },
    {
      id: 'promotion',
      label: 'โปรโมชั่นและส่วนลด',
      description: 'รับข้อมูลโปรโมชั่นและโค้ดส่วนลดพิเศษ',
      icon: Megaphone,
      enabled: true,
    },
    {
      id: 'health_tips',
      label: 'เคล็ดลับสุขภาพ',
      description: 'บทความสุขภาพและข้อมูลยาสัปดาห์ละครั้ง',
      icon: Mail,
      enabled: false,
    },
    {
      id: 'refill_reminder',
      label: 'เตือนกินยาและเติมยา',
      description: 'แจ้งเตือนเมื่อถึงเวลากินยาหรือยาใกล้หมด',
      icon: Pill,
      enabled: true,
    },
  ]);

  const [saving, setSaving] = useState(false);

  const toggleSetting = (id: string) => {
    setSettings((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    );
  };

  const handleSave = () => {
    setSaving(true);
    // In production, this would save to the API
    setTimeout(() => {
      setSaving(false);
    }, 500);
  };

  return (
    <div className="pb-24">
      <div className="flex items-center gap-3 px-4 py-3">
        <Link href="/profile" className="rounded-full p-1 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold">การแจ้งเตือน</h1>
      </div>

      <div className="space-y-4 px-4">
        <p className="text-xs text-muted-foreground">
          เลือกประเภทการแจ้งเตือนที่คุณต้องการรับ การแจ้งเตือนจะส่งผ่าน LINE และในแอป
        </p>

        {settings.map((setting) => {
          const Icon = setting.icon;
          return (
            <div
              key={setting.id}
              className="flex items-start gap-3 rounded-xl border p-4"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{setting.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {setting.description}
                </p>
              </div>
              <button
                role="switch"
                aria-checked={setting.enabled}
                onClick={() => toggleSetting(setting.id)}
                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
                  setting.enabled ? 'bg-primary' : 'bg-muted-foreground/30'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 translate-y-0.5 rounded-full bg-white shadow transition-transform ${
                    setting.enabled ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          );
        })}
      </div>

      <div className="fixed bottom-16 left-0 right-0 z-40 border-t bg-white p-4">
        <div className="mx-auto max-w-lg">
          <Button
            className="w-full"
            size="lg"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
          </Button>
        </div>
      </div>
    </div>
  );
}
