'use client';

import { useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  Users,
  ClipboardList,
  Loader2,
  Download,
  AlertTriangle,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { StatCard } from '@/components/stat-card';
import { PageHeader } from '@/components/page-header';
import { useApi } from '@/lib/use-api';

type DateRange = '7d' | '30d' | 'month' | 'year';

function getDateRange(range: DateRange): { from: string; to: string } {
  const now = new Date();
  const to = now.toISOString();
  let from: Date;

  switch (range) {
    case '7d':
      from = new Date(now.getTime() - 7 * 86400000);
      break;
    case '30d':
      from = new Date(now.getTime() - 30 * 86400000);
      break;
    case 'month':
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'year':
      from = new Date(now.getFullYear(), 0, 1);
      break;
  }

  return { from: from.toISOString(), to };
}

interface Summary {
  period: { from: string; to: string };
  sales: { totalAmount: number; totalOrders: number; aov: number };
  prescriptions: { total: number; verified: number; rejected: number; pending: number; verifyRate: number };
  interventions: { total: number; rate: number };
  newPatients: number;
}

interface DailySales {
  date: string;
  totalAmount: number;
  orderCount: number;
}

interface RxVolume {
  date: string;
  total: number;
  verified: number;
  avgVerifyMinutes: number;
}

interface InterventionByType {
  interventionType: string;
  count: number;
}

interface TopProduct {
  product_name: string;
  sku: string;
  total_qty: string;
  total_revenue: string;
  order_count: number;
}

const PIE_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4'];

const INTERVENTION_LABELS: Record<string, string> = {
  drug_interaction: 'Drug Interaction',
  allergy_alert: 'แพ้ยา',
  dose_adjustment: 'ปรับขนาดยา',
  therapeutic_duplication: 'ยาซ้ำซ้อน',
  formulary_substitution: 'เปลี่ยนยา',
  patient_education: 'ให้ความรู้',
  prescriber_contact: 'ติดต่อแพทย์',
  other: 'อื่นๆ',
};

export default function ReportsPage() {
  const [range, setRange] = useState<DateRange>('30d');
  const { from, to } = useMemo(() => getDateRange(range), [range]);

  const qp = `from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;

  const { data: summary, isLoading: summaryLoading } = useApi<Summary>(`/v1/staff/reports/summary?${qp}`);
  const { data: dailySales } = useApi<DailySales[]>(`/v1/staff/reports/daily-sales?${qp}`);
  const { data: rxVolume } = useApi<RxVolume[]>(`/v1/staff/reports/rx-volume?${qp}`);
  const { data: interventions } = useApi<InterventionByType[]>(`/v1/staff/reports/interventions?${qp}`);
  const { data: topProducts } = useApi<TopProduct[]>(`/v1/staff/reports/top-products?${qp}&limit=10`);

  const fmtBaht = (n: number) => `฿${n.toLocaleString('th-TH', { minimumFractionDigits: 0 })}`;
  const fmtShortDate = (d: string) => {
    const date = new Date(d);
    return `${date.getDate()}/${date.getMonth() + 1}`;
  };

  return (
    <div className="space-y-6">
      <PageHeader title="รายงาน" description="วิเคราะห์ข้อมูลการดำเนินงาน">
        <select
          value={range}
          onChange={(e) => setRange(e.target.value as DateRange)}
          className="h-9 rounded-lg border px-3 text-sm outline-none"
        >
          <option value="7d">7 วันล่าสุด</option>
          <option value="30d">30 วันล่าสุด</option>
          <option value="month">เดือนนี้</option>
          <option value="year">ปีนี้</option>
        </select>
      </PageHeader>

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="ยอดขายรวม"
          value={summaryLoading ? '...' : fmtBaht(summary?.sales.totalAmount ?? 0)}
          icon={TrendingUp}
          description={summary ? `${summary.sales.totalOrders} ออเดอร์` : undefined}
        />
        <StatCard
          title="AOV"
          value={summaryLoading ? '...' : fmtBaht(summary?.sales.aov ?? 0)}
          icon={BarChart3}
        />
        <StatCard
          title="ผู้ป่วยใหม่"
          value={summaryLoading ? '...' : String(summary?.newPatients ?? 0)}
          icon={Users}
        />
        <StatCard
          title="Rx Verify Rate"
          value={summaryLoading ? '...' : `${summary?.prescriptions.verifyRate ?? 0}%`}
          icon={ClipboardList}
          description={summary ? `${summary.prescriptions.verified}/${summary.prescriptions.total} ใบ` : undefined}
        />
      </div>

      {/* Rx stats row */}
      {summary && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <p className="text-xs text-muted-foreground">ใบสั่งยาทั้งหมด</p>
            <p className="text-2xl font-bold">{summary.prescriptions.total}</p>
          </div>
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <p className="text-xs text-muted-foreground">Intervention</p>
            <p className="text-2xl font-bold">{summary.interventions.total}</p>
            <p className="text-xs text-muted-foreground">Rate: {summary.interventions.rate}%</p>
          </div>
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <p className="text-xs text-muted-foreground">ใบสั่งยารอ</p>
            <p className="text-2xl font-bold text-amber-600">{summary.prescriptions.pending}</p>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Daily Sales */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="font-semibold">ยอดขายรายวัน</h3>
          <p className="mt-1 text-sm text-muted-foreground">ยอดขายและจำนวนออเดอร์</p>
          <div className="mt-4 h-64">
            {dailySales && dailySales.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailySales}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tickFormatter={fmtShortDate} className="text-xs" />
                  <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} className="text-xs" />
                  <Tooltip
                    formatter={(value) => [fmtBaht(Number(value)), 'ยอดขาย']}
                    labelFormatter={(l) => new Date(String(l)).toLocaleDateString('th-TH')}
                  />
                  <Area type="monotone" dataKey="totalAmount" stroke="#6366f1" fill="#6366f1" fillOpacity={0.15} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                {dailySales ? 'ไม่มีข้อมูล' : <Loader2 className="h-5 w-5 animate-spin" />}
              </div>
            )}
          </div>
        </div>

        {/* Rx Volume */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="font-semibold">Rx Volume & Verify Time</h3>
          <p className="mt-1 text-sm text-muted-foreground">จำนวนใบสั่งยาและเวลา verify เฉลี่ย</p>
          <div className="mt-4 h-64">
            {rxVolume && rxVolume.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rxVolume}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tickFormatter={fmtShortDate} className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip labelFormatter={(l) => new Date(l).toLocaleDateString('th-TH')} />
                  <Bar dataKey="total" fill="#6366f1" name="รับ" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="verified" fill="#22c55e" name="verify" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                {rxVolume ? 'ไม่มีข้อมูล' : <Loader2 className="h-5 w-5 animate-spin" />}
              </div>
            )}
          </div>
        </div>

        {/* Interventions Pie */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="font-semibold">Interventions by Type</h3>
          <p className="mt-1 text-sm text-muted-foreground">สัดส่วน Pharmacist Intervention</p>
          <div className="mt-4 h-64">
            {interventions && interventions.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={interventions.map((i) => ({
                      name: INTERVENTION_LABELS[i.interventionType] ?? i.interventionType,
                      value: i.count,
                    }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {interventions.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                {interventions ? 'ไม่มีข้อมูล' : <Loader2 className="h-5 w-5 animate-spin" />}
              </div>
            )}
          </div>
        </div>

        {/* Top Products */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="font-semibold">สินค้าขายดี Top 10</h3>
          <p className="mt-1 text-sm text-muted-foreground">เรียงตามรายได้</p>
          <div className="mt-4">
            {topProducts && topProducts.length > 0 ? (
              <div className="space-y-2">
                {topProducts.map((p, idx) => (
                  <div key={idx} className="flex items-center gap-3 rounded-lg border p-2.5">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium">{p.product_name}</p>
                      <p className="text-xs text-muted-foreground">{p.sku} · {p.order_count} ออเดอร์</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{fmtBaht(parseFloat(p.total_revenue))}</p>
                      <p className="text-xs text-muted-foreground">{parseFloat(p.total_qty).toLocaleString()} ชิ้น</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                {topProducts ? 'ไม่มีข้อมูล' : <Loader2 className="h-5 w-5 animate-spin" />}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
