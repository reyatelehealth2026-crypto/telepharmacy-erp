import { Settings, Shield, Bell, Database } from 'lucide-react';
import { PageHeader } from '@/components/page-header';

export default function SettingsPage() {
  const sections = [
    {
      icon: Settings,
      title: 'ตั้งค่าทั่วไป',
      description: 'ชื่อร้าน, ที่อยู่, เบอร์โทร, เวลาทำการ',
    },
    {
      icon: Shield,
      title: 'จัดการพนักงาน',
      description: 'เพิ่ม/แก้ไขพนักงาน, กำหนดสิทธิ์',
    },
    {
      icon: Bell,
      title: 'การแจ้งเตือน',
      description: 'ตั้งค่า LINE notification, email alerts',
    },
    {
      icon: Database,
      title: 'ข้อมูลระบบ',
      description: 'Backup, system config, API keys',
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="ตั้งค่า"
        description="จัดการการตั้งค่าระบบ"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {sections.map((section) => (
          <div
            key={section.title}
            className="flex cursor-pointer items-start gap-4 rounded-xl border bg-card p-6 shadow-sm transition-colors hover:bg-muted/50"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
              <section.icon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold">{section.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {section.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
