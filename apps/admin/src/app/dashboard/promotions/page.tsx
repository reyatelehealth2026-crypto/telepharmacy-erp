'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Tag,
  Plus,
  Loader2,
  RefreshCw,
  BarChart3,
  Percent,
  Gift,
  Zap,
} from 'lucide-react';
import { StatCard } from '@/components/stat-card';
import { PageHeader } from '@/components/page-header';
import { useApi } from '@/lib/use-api';
import { cn } from '@/lib/utils';
import {
  activatePromotion,
  deactivatePromotion,
  type Promotion,
  type PromotionStatus,
  type PromotionType,
} from '@/lib/promotions';

interface PromotionsResponse {
  data: Promotion[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

type StatusFilter = 'all' | PromotionStatus;
type TypeFilter = 'all' | PromotionType;

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'active', label: 'ใช้งาน' },
  { key: 'draft', label: 'ร่าง' },
  { key: 'paused', label: 'หยุดชั่วคราว' },
  { key: 'expired', label: 'หมดอายุ' },
  { key: 'cancelled', label: 'ยกเลิก' },
];

const TYPE_OPTIONS: { key: TypeFilter; label: string }[] = [
  { key: 'all', label: 'ทุกประเภท' },
  { key: 'percentage_discount', label: 'ส่วนลด %' },
  { key: 'fixed_discount', label: 'ส่วนลดคงที่' },
  { key: 'buy_x_get_y', label: 'ซื้อ X แถม Y' },
  { key: 'bundle', label: 'Bundle' },
  { key: 'free_delivery', label: 'ส่งฟรี' },
  { key: 'free_gift', label: 'ของแถม' },
  { key: 'points_multiplier', label: 'คูณแต้ม' },
];

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700',
  active: 'bg-green-100 text-green-700',
  paused: 'bg-amber-100 text-amber-700',
  expired: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

const STATUS_LABEL: Record<string, string> = {
  draft: 'ร่าง',
  active: 'ใช้งาน',
  paused: 'หยุดชั่วคราว',
  expired: 'หมดอายุ',
  cancelled: 'ยกเลิก',
};

const TYPE_LABEL: Record<string, string> = {
  percentage_discount: 'ส่วนลด %',
  fixed_discount: 'ส่วนลดคงที่',
  buy_x_get_y: 'ซื้อ X แถม Y',
  bundle: 'Bundle',
  free_delivery: 'ส่งฟรี',
  free_gift: 'ของแถม',
  points_multiplier: 'คูณแต้ม',
};

function formatDate(dateStr: string | null) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
  });
}

export default function PromotionsPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [page, setPage] = useState(1);
  const [toggling, setToggling] = useState<string | null>(null);

  const params = new URLSearchParams({ page: String(page), limit: '20' });
  if (statusFilter !== 'all') params.set('status', statusFilter);
  if (typeFilter !== 'all') params.set('type', typeFilter);

  const apiPath = `/v1/staff/promotions?${params}`;
  const { data: result, isLoading, mutate } = useApi<PromotionsResponse>(apiPath);

  const promotions = result?.data ?? [];
  const meta = result?.meta ?? { page: 1, limit: 20, total: 0, totalPages: 0 };

  const activeCount = promotions.filter((p) => p.status === 'active').length;
  const totalUsage = promotions.reduce((sum, p) => sum + p.usageCount, 0);
  const totalRemaining = promotions.reduce((sum, p) => {
    if (p.usageLimit) return sum + (p.usageLimit - p.usageCount);
    return sum;
  }, 0);

  async function handleToggle(promo: Promotion) {
    setToggling(promo.id);
    try {
      if (promo.status === 'active') {
        await deactivatePromotion(promo.id);
      } else {
        await activatePromotion(promo.id);
      }
      await mutate();
    } catch {
      // toast would go here
    } finally {
      setToggling(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="จัดการโปรโมชั่น" description="โปรโมชั่นและคูปองทั้งหมดในระบบ">
        <div className="flex gap-2">
          <button
            onClick={() => mutate()}
            className="inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors hover:bg-muted"
          >
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            รีเฟรช
          </button>
          <Link
            href="/dashboard/promotions/new"
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            สร้างโปรโมชั่น
          </Link>
        </div>
      </PageHeader>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="โปรโมชั่นทั้งหมด" value={meta.total} icon={Tag} />
        <StatCard title="ใช้งานอยู่" value={activeCount} icon={Zap} description="โปรโมชั่นที่ active" />
        <StatCard title="ใช้งานแล้ว" value={totalUsage.toLocaleString()} icon={BarChart3} description="จำนวนครั้งที่ใช้ทั้งหมด" />
        <StatCard title="คงเหลือ" value={totalRemaining.toLocaleString()} icon={Gift} description="จำนวนครั้งที่เหลือ" />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setStatusFilter(tab.key); setPage(1); }}
              className={cn(
                'shrink-0 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
                statusFilter === tab.key
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value as TypeFilter); setPage(1); }}
          className="h-9 rounded-lg border bg-background px-3 text-sm"
        >
          {TYPE_OPTIONS.map((opt) => (
            <option key={opt.key} value={opt.key}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                <th className="px-4 py-3 font-medium">รหัส</th>
                <th className="px-4 py-3 font-medium">ชื่อ</th>
                <th className="px-4 py-3 font-medium">ประเภท</th>
                <th className="px-4 py-3 font-medium">สถานะ</th>
                <th className="px-4 py-3 font-medium">ใช้แล้ว / จำกัด</th>
                <th className="px-4 py-3 font-medium">ช่วงเวลา</th>
                <th className="px-4 py-3 font-medium">เปิด/ปิด</th>
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
              ) : promotions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    <Tag className="mx-auto h-8 w-8" />
                    <p className="mt-2">ไม่พบโปรโมชั่น</p>
                  </td>
                </tr>
              ) : (
                promotions.map((promo) => (
                  <tr key={promo.id} className="border-b transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs">{promo.code}</td>
                    <td className="px-4 py-3 font-medium">{promo.name}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                        {TYPE_LABEL[promo.type] ?? promo.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', STATUS_BADGE[promo.status] ?? 'bg-muted')}>
                        {STATUS_LABEL[promo.status] ?? promo.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {promo.usageCount}{promo.usageLimit ? ` / ${promo.usageLimit}` : ' / ∞'}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {formatDate(promo.startsAt)} — {formatDate(promo.endsAt)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggle(promo)}
                        disabled={toggling === promo.id || promo.status === 'expired' || promo.status === 'cancelled'}
                        className={cn(
                          'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                          promo.status === 'active' ? 'bg-green-500' : 'bg-gray-300',
                        )}
                      >
                        <span
                          className={cn(
                            'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform',
                            promo.status === 'active' ? 'translate-x-5' : 'translate-x-0',
                          )}
                        />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/promotions/${promo.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                      >
                        แก้ไข
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

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
