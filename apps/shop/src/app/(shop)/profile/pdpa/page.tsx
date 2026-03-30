'use client';

import Link from 'next/link';
import { ArrowLeft, Shield, Eye, Database, Bell, Trash2, Download, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

const sections = [
  {
    id: 'collect',
    icon: Database,
    title: 'ข้อมูลที่เราเก็บรวบรวม',
    content: `เราเก็บรวบรวมข้อมูลส่วนบุคคลของคุณเพื่อให้บริการร้านยาออนไลน์ ได้แก่:
• ข้อมูลส่วนตัว: ชื่อ-นามสกุล, วันเกิด, เพศ, เบอร์โทรศัพท์
• ข้อมูลสุขภาพ: ประวัติแพ้ยา, โรคประจำตัว, ยาที่ใช้อยู่
• ข้อมูลการสั่งซื้อ: ประวัติการสั่งซื้อ, ใบสั่งยา
• ข้อมูลการใช้งาน: การเข้าถึงแอปพลิเคชัน`,
  },
  {
    id: 'purpose',
    icon: Eye,
    title: 'วัตถุประสงค์การใช้ข้อมูล',
    content: `เราใช้ข้อมูลของคุณเพื่อ:
• ให้บริการสั่งซื้อยาและผลิตภัณฑ์สุขภาพ
• ตรวจสอบประวัติแพ้ยาก่อนจ่ายยา
• ให้คำปรึกษาด้านยาโดยเภสัชกร
• ส่งการแจ้งเตือนเกี่ยวกับยาและสุขภาพ
• ปรับปรุงคุณภาพการให้บริการ`,
  },
  {
    id: 'rights',
    icon: Shield,
    title: 'สิทธิ์ของคุณตาม PDPA',
    content: `ภายใต้พระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 คุณมีสิทธิ์:
• เข้าถึงและขอสำเนาข้อมูลส่วนบุคคล
• แก้ไขข้อมูลที่ไม่ถูกต้อง
• ลบหรือทำลายข้อมูล (ภายใต้เงื่อนไขที่กำหนด)
• คัดค้านการประมวลผลข้อมูล
• ถอนความยินยอมได้ทุกเมื่อ`,
  },
  {
    id: 'notify',
    icon: Bell,
    title: 'การแจ้งเตือนและการตลาด',
    content: `เราส่งการแจ้งเตือนเกี่ยวกับ:
• การอัปเดตสถานะออเดอร์
• การเตือนกินยาตามที่ตั้งไว้
• โปรโมชั่นและข่าวสารสุขภาพ (เฉพาะเมื่อยินยอม)

คุณสามารถจัดการการแจ้งเตือนได้ที่หน้า "การแจ้งเตือน"`,
  },
];

const consentItems = [
  { id: 'marketing', label: 'รับข่าวสารโปรโมชั่นและสุขภาพ', description: 'ข้อมูลสินค้าใหม่ โปรโมชั่น และเคล็ดลับสุขภาพ', defaultChecked: true },
  { id: 'analytics', label: 'ปรับปรุงประสบการณ์การใช้งาน', description: 'วิเคราะห์พฤติกรรมการใช้งานเพื่อปรับปรุงแอป', defaultChecked: true },
  { id: 'research', label: 'การวิจัยด้านสุขภาพ (ไม่ระบุตัวตน)', description: 'ข้อมูลที่ไม่ระบุตัวตนเพื่อการวิจัยทางการแพทย์', defaultChecked: false },
];

export default function PdpaPage() {
  const [expanded, setExpanded] = useState<string | null>('collect');
  const [consents, setConsents] = useState<Record<string, boolean>>(
    Object.fromEntries(consentItems.map((c) => [c.id, c.defaultChecked]))
  );

  return (
    <div className="pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <Link href="/profile" className="rounded-full p-1 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-lg font-bold">ความเป็นส่วนตัว</h1>
          <p className="text-xs text-muted-foreground">นโยบายคุ้มครองข้อมูลส่วนบุคคล (PDPA)</p>
        </div>
      </div>

      {/* Banner */}
      <div className="mx-4 rounded-xl bg-primary/5 border border-primary/20 p-4 flex items-start gap-3">
        <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-primary">ข้อมูลของคุณปลอดภัย</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            เราปฏิบัติตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 อย่างเคร่งครัด
          </p>
        </div>
      </div>

      {/* Accordion Sections */}
      <div className="mt-4 space-y-2 px-4">
        {sections.map((section) => (
          <div key={section.id} className="rounded-xl border overflow-hidden">
            <button
              className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/30"
              onClick={() => setExpanded(expanded === section.id ? null : section.id)}
            >
              <div className="flex items-center gap-3">
                <section.icon className="h-4 w-4 text-primary shrink-0" />
                <span className="text-sm font-medium">{section.title}</span>
              </div>
              {expanded === section.id
                ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                : <ChevronDown className="h-4 w-4 text-muted-foreground" />
              }
            </button>
            {expanded === section.id && (
              <div className="border-t px-4 py-3">
                <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                  {section.content}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Consent Management */}
      <div className="mx-4 mt-4 rounded-xl border p-4">
        <h2 className="text-sm font-semibold mb-3">จัดการความยินยอม</h2>
        <div className="space-y-4">
          {consentItems.map((item) => (
            <div key={item.id} className="flex items-start gap-3">
              <div className="mt-0.5">
                <button
                  role="switch"
                  aria-checked={consents[item.id]}
                  onClick={() => setConsents((c) => ({ ...c, [item.id]: !c[item.id] }))}
                  className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${
                    consents[item.id] ? 'bg-primary' : 'bg-muted-foreground/30'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 translate-y-0.5 rounded-full bg-white shadow transition-transform ${
                      consents[item.id] ? 'translate-x-4' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
              <div>
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
        <Button size="sm" className="mt-4 w-full">
          บันทึกการตั้งค่า
        </Button>
      </div>

      {/* Data Rights Actions */}
      <div className="mx-4 mt-4 space-y-2">
        <button className="flex w-full items-center gap-3 rounded-xl border p-4 text-left hover:bg-muted/30">
          <Download className="h-4 w-4 text-primary shrink-0" />
          <div>
            <p className="text-sm font-medium">ขอสำเนาข้อมูลของฉัน</p>
            <p className="text-xs text-muted-foreground">ดาวน์โหลดข้อมูลส่วนบุคคลทั้งหมด</p>
          </div>
        </button>
        <button className="flex w-full items-center gap-3 rounded-xl border border-red-200 p-4 text-left hover:bg-red-50">
          <Trash2 className="h-4 w-4 text-red-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-700">ขอลบข้อมูลของฉัน</p>
            <p className="text-xs text-red-500">ลบข้อมูลส่วนบุคคลทั้งหมดออกจากระบบ</p>
          </div>
        </button>
      </div>

      {/* Contact */}
      <div className="mx-4 mt-4 rounded-xl bg-muted/50 p-4">
        <p className="text-xs text-muted-foreground text-center">
          หากมีคำถามเกี่ยวกับข้อมูลส่วนบุคคล ติดต่อ DPO ได้ที่{' '}
          <a href="mailto:dpo@reyapharmacy.com" className="text-primary underline">
            dpo@reyapharmacy.com
          </a>
        </p>
      </div>
    </div>
  );
}
