'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Shield,
  Eye,
  Download,
  Clock,
  User,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface AuditEntry {
  id: string;
  action: string;
  resource: string;
  timestamp: string;
  actor: string;
  ip?: string;
  details?: string;
}

const MOCK_AUDIT_LOG: AuditEntry[] = [
  {
    id: '1',
    action: 'LOGIN',
    resource: 'User Account',
    timestamp: '2026-03-30T08:15:00',
    actor: 'สมชาย ใจดี',
    ip: '203.0.113.45',
  },
  {
    id: '2',
    action: 'VIEW',
    resource: 'Prescription RX-20260330-001',
    timestamp: '2026-03-30T08:16:30',
    actor: 'สมชาย ใจดี',
    details: 'Viewed prescription details',
  },
  {
    id: '3',
    action: 'CREATE',
    resource: 'Order ORD-20260330-001',
    timestamp: '2026-03-30T08:20:15',
    actor: 'สมชาย ใจดี',
    details: 'Placed order for 3 items',
  },
  {
    id: '4',
    action: 'UPDATE',
    resource: 'Patient Profile',
    timestamp: '2026-03-29T14:22:00',
    actor: 'สมชาย ใจดี',
    details: 'Updated phone number',
  },
  {
    id: '5',
    action: 'VIEW',
    resource: 'Medical History',
    timestamp: '2026-03-28T09:45:00',
    actor: 'Pharmacist: รุ่งนภา',
    ip: 'Internal',
    details: 'Pharmacist reviewed allergies',
  },
];

const ACTION_COLORS: Record<string, string> = {
  LOGIN: 'bg-blue-100 text-blue-800',
  LOGOUT: 'bg-gray-100 text-gray-800',
  VIEW: 'bg-green-100 text-green-800',
  CREATE: 'bg-purple-100 text-purple-800',
  UPDATE: 'bg-amber-100 text-amber-800',
  DELETE: 'bg-red-100 text-red-800',
};

export default function AuditTrailPage() {
  const [filter, setFilter] = useState<string>('all');

  const filteredLog = filter === 'all'
    ? MOCK_AUDIT_LOG
    : MOCK_AUDIT_LOG.filter((e) => e.action === filter);

  return (
    <div className="pb-20">
      <div className="flex items-center gap-3 px-4 py-3">
        <Link href="/profile/pdpa" className="rounded-full p-1 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold">ประวัติการเข้าถึงข้อมูล</h1>
      </div>

      {/* Banner */}
      <div className="mx-4 mb-4 rounded-xl bg-primary/5 border border-primary/20 p-3">
        <div className="flex items-start gap-2">
          <Shield className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-primary">PDPA Compliance</p>
            <p className="text-[10px] text-muted-foreground">
              บันทึกทุกการเข้าถึงข้อมูลส่วนบุคคลตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto px-4 pb-3">
        {[
          { value: 'all', label: 'ทั้งหมด' },
          { value: 'LOGIN', label: 'เข้าสู่ระบบ' },
          { value: 'VIEW', label: 'ดูข้อมูล' },
          { value: 'UPDATE', label: 'แก้ไข' },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-full px-3 py-1 text-xs whitespace-nowrap ${
              filter === f.value
                ? 'bg-primary text-white'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Audit Log */}
      <div className="space-y-2 px-4">
        {filteredLog.map((entry) => (
          <div key={entry.id} className="rounded-xl border p-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className={`text-[10px] ${ACTION_COLORS[entry.action] || 'bg-gray-100'}`}
                >
                  {entry.action}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(entry.timestamp).toLocaleString('th-TH', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
            <p className="mt-2 text-sm font-medium">{entry.resource}</p>
            {entry.details && (
              <p className="text-xs text-muted-foreground">{entry.details}</p>
            )}
            <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {entry.actor}
              </span>
              {entry.ip && (
                <span className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {entry.ip}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Export */}
      <div className="mx-4 mt-4">
        <button className="flex w-full items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium transition-colors hover:bg-muted">
          <Download className="h-4 w-4" />
          ดาวน์โหลดประวัติ (CSV)
        </button>
      </div>

      {/* Retention Info */}
      <div className="mx-4 mt-4 rounded-xl bg-muted/50 p-4">
        <h3 className="text-xs font-bold mb-2">นโยบายการเก็บข้อมูล</h3>
        <ul className="space-y-1 text-[10px] text-muted-foreground">
          <li>• ประวัติการเข้าถึง: 10 ปี</li>
          <li>• ข้อมูลสั่งซื้อ: 10 ปี</li>
          <li>• ใบสั่งยา: 10 ปี (ตาม พ.ร.บ. ยา)</li>
          <li>• ข้อความแชท: 2 ปี</li>
        </ul>
      </div>
    </div>
  );
}
