'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Users,
  UserPlus,
  Heart,
  AlertTriangle,
  Search,
  Loader2,
  Eye,
} from 'lucide-react';
import { StatCard } from '@/components/stat-card';
import { PageHeader } from '@/components/page-header';
import { useApi } from '@/lib/use-api';
import { cn } from '@/lib/utils';

interface Patient {
  id: string;
  patientNo: string;
  firstName: string;
  lastName: string;
  birthDate: string | null;
  gender: string | null;
  phone: string | null;
  province: string;
  createdAt: string;
}

interface PatientsResponse {
  data: Patient[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

function getAge(birthDate: string | null): string {
  if (!birthDate) return '-';
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return String(age);
}

export default function PatientsPage() {
  const [query, setQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);

  const apiPath = `/v1/staff/patients?page=${page}&limit=20${searchTerm ? `&q=${encodeURIComponent(searchTerm)}` : ''}`;
  const { data: result, isLoading } = useApi<PatientsResponse>(apiPath);

  const handleSearch = useCallback(() => {
    setSearchTerm(query);
    setPage(1);
  }, [query]);

  const patients = result?.data ?? [];
  const meta = result?.meta ?? { page: 1, limit: 20, total: 0, totalPages: 0 };

  return (
    <div className="space-y-6">
      <PageHeader
        title="ข้อมูลลูกค้า"
        description="จัดการข้อมูลลูกค้าและประวัติสุขภาพ"
      >
        <form
          onSubmit={(e) => { e.preventDefault(); handleSearch(); }}
          className="flex items-center gap-2"
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ค้นหาชื่อ, รหัสลูกค้า, เบอร์โทร..."
              className="h-9 w-72 rounded-lg border pl-9 pr-3 text-sm outline-none ring-ring/20 placeholder:text-muted-foreground focus:ring-2"
            />
          </div>
          <button
            type="submit"
            className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            ค้นหา
          </button>
        </form>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="ลูกค้าทั้งหมด"
          value={isLoading ? '...' : meta.total.toLocaleString()}
          icon={Users}
        />
        <StatCard
          title="หน้าปัจจุบัน"
          value={`${meta.page}/${meta.totalPages || 1}`}
          icon={UserPlus}
          description={`แสดง ${patients.length} จาก ${meta.total}`}
        />
        <StatCard
          title="กำลังค้นหา"
          value={searchTerm || '-'}
          icon={Search}
        />
        <StatCard
          title="จำนวนที่แสดง"
          value={String(patients.length)}
          icon={Heart}
        />
      </div>

      {/* Patients Table */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                <th className="px-4 py-3 font-medium">รหัสลูกค้า</th>
                <th className="px-4 py-3 font-medium">ชื่อ-นามสกุล</th>
                <th className="px-4 py-3 font-medium">อายุ</th>
                <th className="px-4 py-3 font-medium">เพศ</th>
                <th className="px-4 py-3 font-medium">เบอร์โทร</th>
                <th className="px-4 py-3 font-medium">จังหวัด</th>
                <th className="px-4 py-3 font-medium">วันที่ลงทะเบียน</th>
                <th className="px-4 py-3 font-medium">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                    <p className="mt-2">กำลังโหลด...</p>
                  </td>
                </tr>
              ) : patients.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    <Users className="mx-auto h-8 w-8" />
                    <p className="mt-2">ไม่พบข้อมูลลูกค้า</p>
                  </td>
                </tr>
              ) : (
                patients.map((p) => (
                  <tr key={p.id} className="border-b transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs">{p.patientNo}</td>
                    <td className="px-4 py-3 font-medium">{p.firstName} {p.lastName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{getAge(p.birthDate)}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {p.gender === 'male' ? 'ชาย' : p.gender === 'female' ? 'หญิง' : p.gender ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{p.phone ?? '-'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.province || '-'}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(p.createdAt).toLocaleDateString('th-TH')}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/patients/${p.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        ดูโปรไฟล์
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-xs text-muted-foreground">
              แสดง {(meta.page - 1) * meta.limit + 1}–{Math.min(meta.page * meta.limit, meta.total)} จาก {meta.total}
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-50"
              >
                ก่อนหน้า
              </button>
              <button
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={page >= meta.totalPages}
                className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-50"
              >
                ถัดไป
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
