'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  FileText,
  Plus,
  Loader2,
  RefreshCw,
  Eye,
  BarChart3,
  BookOpen,
} from 'lucide-react';
import { StatCard } from '@/components/stat-card';
import { PageHeader } from '@/components/page-header';
import { useApi } from '@/lib/use-api';
import { cn } from '@/lib/utils';
import {
  publishContent,
  unpublishContent,
  type Content,
  type ContentType,
  type ContentStatus,
} from '@/lib/content';

interface ContentListResponse {
  data: Content[];
  meta: { page: number; limit: number };
}

type StatusFilter = 'all' | ContentStatus;
type TypeFilter = 'all' | ContentType;

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'published', label: 'เผยแพร่แล้ว' },
  { key: 'draft', label: 'ร่าง' },
];

const TYPE_OPTIONS: { key: TypeFilter; label: string }[] = [
  { key: 'all', label: 'ทุกประเภท' },
  { key: 'health_article', label: 'บทความสุขภาพ' },
  { key: 'product_review', label: 'รีวิวสินค้า' },
  { key: 'faq', label: 'FAQ' },
  { key: 'drug_info', label: 'ข้อมูลยา' },
  { key: 'promotion_banner', label: 'แบนเนอร์โปรโมชั่น' },
];

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700',
  published: 'bg-green-100 text-green-700',
};

const STATUS_LABEL: Record<string, string> = {
  draft: 'ร่าง',
  published: 'เผยแพร่แล้ว',
};

const TYPE_LABEL: Record<string, string> = {
  health_article: 'บทความสุขภาพ',
  product_review: 'รีวิวสินค้า',
  faq: 'FAQ',
  drug_info: 'ข้อมูลยา',
  promotion_banner: 'แบนเนอร์โปรโมชั่น',
};

function formatDate(dateStr: string | null) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
  });
}

export default function ContentPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [page, setPage] = useState(1);
  const [toggling, setToggling] = useState<string | null>(null);

  const params = new URLSearchParams({ page: String(page), limit: '20' });
  if (statusFilter !== 'all') params.set('status', statusFilter);
  if (typeFilter !== 'all') params.set('type', typeFilter);

  const apiPath = `/v1/staff/content?${params}`;
  const { data: result, isLoading, mutate } = useApi<ContentListResponse>(apiPath);

  const articles = result?.data ?? [];
  const publishedCount = articles.filter((a) => a.status === 'published').length;
  const totalViews = articles.reduce((sum, a) => sum + a.viewCount, 0);

  async function handleTogglePublish(article: Content) {
    setToggling(article.id);
    try {
      if (article.status === 'published') {
        await unpublishContent(article.id);
      } else {
        await publishContent(article.id);
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
      <PageHeader title="จัดการบทความ" description="บทความสุขภาพ FAQ และเนื้อหาทั้งหมดในระบบ">
        <div className="flex gap-2">
          <button
            onClick={() => mutate()}
            className="inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors hover:bg-muted"
          >
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            รีเฟรช
          </button>
          <Link
            href="/dashboard/content/new"
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            สร้างบทความ
          </Link>
        </div>
      </PageHeader>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard title="บทความทั้งหมด" value={articles.length} icon={FileText} />
        <StatCard title="เผยแพร่แล้ว" value={publishedCount} icon={BookOpen} description="บทความที่ published" />
        <StatCard title="ยอดเข้าชมรวม" value={totalViews.toLocaleString()} icon={Eye} description="จำนวนครั้งที่เข้าชม" />
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
                <th className="px-4 py-3 font-medium">ชื่อบทความ</th>
                <th className="px-4 py-3 font-medium">ประเภท</th>
                <th className="px-4 py-3 font-medium">สถานะ</th>
                <th className="px-4 py-3 font-medium">วันที่เผยแพร่</th>
                <th className="px-4 py-3 font-medium">ยอดเข้าชม</th>
                <th className="px-4 py-3 font-medium">เผยแพร่</th>
                <th className="px-4 py-3 font-medium">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                    <p className="mt-2">กำลังโหลด...</p>
                  </td>
                </tr>
              ) : articles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    <FileText className="mx-auto h-8 w-8" />
                    <p className="mt-2">ไม่พบบทความ</p>
                  </td>
                </tr>
              ) : (
                articles.map((article) => (
                  <tr key={article.id} className="border-b transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <p className="font-medium">{article.titleTh}</p>
                      {article.titleEn && (
                        <p className="text-xs text-muted-foreground">{article.titleEn}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                        {TYPE_LABEL[article.type] ?? article.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', STATUS_BADGE[article.status] ?? 'bg-muted')}>
                        {STATUS_LABEL[article.status] ?? article.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {formatDate(article.publishedAt)}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span className="inline-flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {article.viewCount.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleTogglePublish(article)}
                        disabled={toggling === article.id}
                        className={cn(
                          'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                          article.status === 'published' ? 'bg-green-500' : 'bg-gray-300',
                        )}
                      >
                        <span
                          className={cn(
                            'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform',
                            article.status === 'published' ? 'translate-x-5' : 'translate-x-0',
                          )}
                        />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/content/${article.id}`}
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
      </div>
    </div>
  );
}
