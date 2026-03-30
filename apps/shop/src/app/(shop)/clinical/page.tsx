'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Search,
  BookOpen,
  FileText,
  Pill,
  FlaskConical,
  MessageCircle,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const SERVICES = [
  {
    id: 'di',
    title: 'Drug Information (DI) Service',
    description: 'ค้นหาข้อมูลยา ปฏิกิริยา ข้อห้ามใช้',
    icon: BookOpen,
    color: 'bg-blue-500',
    href: '/clinical/di-database',
  },
  {
    id: 'mr',
    title: 'Medication Review (MR)',
    description: 'ตรวจสอบยาซ้ำซ้อน ปฏิกิริยาระหว่างยา',
    icon: FileText,
    color: 'bg-purple-500',
    href: '/clinical/med-review',
  },
  {
    id: 'tdm',
    title: 'TDM Consultation',
    description: 'วิเคราะห์ระดับยาในเลือด',
    icon: FlaskConical,
    color: 'bg-emerald-500',
    href: '/clinical/tdm',
  },
  {
    id: 'consult',
    title: 'ปรึกษาเภสัชกร',
    description: 'สอบถามข้อมูลยาและการใช้ยา',
    icon: MessageCircle,
    color: 'bg-amber-500',
    href: '/chat',
  },
];

const RECENT_DRUGS = [
  { name: 'Metformin', category: 'Diabetes' },
  { name: 'Amlodipine', category: 'Hypertension' },
  { name: 'Simvastatin', category: 'Cholesterol' },
];

export default function ClinicalServicesPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="pb-20">
      <div className="flex items-center gap-3 px-4 py-3">
        <Link href="/" className="rounded-full p-1 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold">บริการทางคลินิก</h1>
      </div>

      <div className="space-y-4 px-4">
        {/* DI Search */}
        <div className="rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 p-4 text-white">
          <h2 className="font-bold flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            ค้นหาข้อมูลยา (DI)
          </h2>
          <div className="mt-3 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9 bg-white/90 border-0"
                placeholder="ชื่อยา / สารตัวยา..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button
              size="sm"
              className="bg-white text-blue-600 hover:bg-white/90"
              onClick={() => router.push(`/clinical/di-database?q=${encodeURIComponent(searchQuery)}`)}
            >
              ค้นหา
            </Button>
          </div>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-2 gap-3">
          {SERVICES.map((service) => {
            const Icon = service.icon;
            return (
              <Link
                key={service.id}
                href={service.href}
                className="rounded-xl border p-3 transition-colors hover:bg-muted/50"
              >
                <div className={`${service.color} w-fit rounded-lg p-2 text-white`}>
                  <Icon className="h-4 w-4" />
                </div>
                <p className="mt-2 text-sm font-medium">{service.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{service.description}</p>
              </Link>
            );
          })}
        </div>

        {/* Recent Drugs */}
        <div className="rounded-xl border p-4">
          <h2 className="text-sm font-bold mb-3">ยาที่ค้นหาล่าสุด</h2>
          <div className="space-y-2">
            {RECENT_DRUGS.map((drug) => (
              <Link
                key={drug.name}
                href={`/clinical/di-database?q=${drug.name}`}
                className="flex items-center justify-between rounded-lg p-2 hover:bg-muted"
              >
                <div className="flex items-center gap-2">
                  <Pill className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium">{drug.name}</p>
                    <p className="text-xs text-muted-foreground">{drug.category}</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </div>

        {/* Quick Links */}
        <div className="rounded-xl border p-4">
          <h2 className="text-sm font-bold mb-3">แหล่งข้อมูลอ้างอิง</h2>
          <div className="space-y-2">
            {[
              { label: 'Thai FDA Drug Database', url: 'https://fda.moph.go.th' },
              { label: 'Lexicomp (Clinical)', url: '#' },
              { label: 'WHO Essential Medicines', url: '#' },
            ].map((link) => (
              <a
                key={link.label}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-lg p-2 hover:bg-muted"
              >
                <span className="text-sm">{link.label}</span>
                <ExternalLink className="h-3 w-3 text-muted-foreground" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
