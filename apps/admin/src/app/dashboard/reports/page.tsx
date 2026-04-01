'use client';

import { useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  Users,
  ClipboardList,
  Loader2,
  AlertTriangle,
  Gift,
  Package,
  Calendar,
  Percent,
  Star,
  ShieldAlert,
  Download,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
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
import { exportToCsv, type CsvColumn } from '@/lib/csv-export';

// ─── Types ───────────────────────────────────────────────────────────────────

type DateRange = '7d' | '30d' | 'month' | 'year';
type ReportTab = 'sales' | 'loyalty' | 'demographics' | 'inventory';

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

interface DailySales { date: string; totalAmount: number; orderCount: number }
interface RxVolume { date: string; total: number; verified: number; avgVerifyMinutes: number }
interface InterventionByType { interventionType: string; count: number }
interface TopProduct { product_name: string; sku: string; total_qty: string; total_revenue: string; order_count: number }

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

const TABS: { key: ReportTab; label: string; icon: React.ElementType }[] = [
  { key: 'sales', label: 'ยอดขาย', icon: TrendingUp },
  { key: 'loyalty', label: 'โปรโมชั่น & Loyalty', icon: Gift },
  { key: 'demographics', label: 'ข้อมูลผู้ป่วย', icon: Users },
  { key: 'inventory', label: 'สุขภาพคลัง', icon: Package },
];

// ─── Mock Data ───────────────────────────────────────────────────────────────


function generateMockPromotions() {
  return [
    { name: 'SUMMER2025', type: 'percentage_discount', usageCount: 342, usageLimit: 500, revenue: 128500 },
    { name: 'NEWUSER50', type: 'fixed_discount', usageCount: 189, usageLimit: 1000, revenue: 94500 },
    { name: 'BUY2GET1', type: 'buy_x_get_y', usageCount: 78, usageLimit: 200, revenue: 62400 },
    { name: 'FLASH30', type: 'percentage_discount', usageCount: 456, usageLimit: 500, revenue: 205200 },
    { name: 'LOYALTY20', type: 'percentage_discount', usageCount: 123, usageLimit: 300, revenue: 49200 },
  ];
}

function generateMockCouponUsage() {
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    return {
      date: d.toISOString().slice(0, 10),
      used: Math.floor(Math.random() * 40) + 10,
      redeemed: Math.floor(Math.random() * 20) + 5,
    };
  });
}

function generateMockPointsData() {
  return Array.from({ length: 12 }, (_, i) => ({
    month: ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'][i],
    earned: Math.floor(Math.random() * 5000) + 2000,
    redeemed: Math.floor(Math.random() * 3000) + 500,
  }));
}

function generateMockTierDistribution() {
  return [
    { name: 'Bronze', value: 1245, color: '#cd7f32' },
    { name: 'Silver', value: 834, color: '#c0c0c0' },
    { name: 'Gold', value: 412, color: '#ffd700' },
    { name: 'Platinum', value: 89, color: '#e5e4e2' },
  ];
}

function generateMockRegistrations() {
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    return {
      date: d.toISOString().slice(0, 10),
      count: Math.floor(Math.random() * 15) + 2,
    };
  });
}

function generateMockProvinceData() {
  return [
    { province: 'กรุงเทพฯ', count: 1842 },
    { province: 'นนทบุรี', count: 523 },
    { province: 'ปทุมธานี', count: 412 },
    { province: 'ชลบุรี', count: 287 },
    { province: 'เชียงใหม่', count: 234 },
    { province: 'สมุทรปราการ', count: 198 },
    { province: 'ภูเก็ต', count: 156 },
    { province: 'ขอนแก่น', count: 134 },
    { province: 'สงขลา', count: 112 },
    { province: 'อื่นๆ', count: 682 },
  ];
}

function generateMockAgeGender() {
  return [
    { group: '0-17', male: 45, female: 52 },
    { group: '18-25', male: 189, female: 234 },
    { group: '26-35', male: 412, female: 478 },
    { group: '36-45', male: 356, female: 389 },
    { group: '46-55', male: 298, female: 312 },
    { group: '56-65', male: 234, female: 267 },
    { group: '65+', male: 178, female: 136 },
  ];
}

function generateMockLowStock() {
  return [
    { name: 'Paracetamol 500mg', sku: 'PCM-500', currentStock: 12, minStock: 50, daysUntilOut: 3 },
    { name: 'Amoxicillin 250mg', sku: 'AMX-250', currentStock: 8, minStock: 30, daysUntilOut: 2 },
    { name: 'Omeprazole 20mg', sku: 'OMP-020', currentStock: 15, minStock: 40, daysUntilOut: 5 },
    { name: 'Metformin 500mg', sku: 'MTF-500', currentStock: 20, minStock: 60, daysUntilOut: 4 },
    { name: 'Cetirizine 10mg', sku: 'CTZ-010', currentStock: 5, minStock: 25, daysUntilOut: 1 },
    { name: 'Ibuprofen 400mg', sku: 'IBP-400', currentStock: 18, minStock: 35, daysUntilOut: 6 },
  ];
}

function generateMockExpiryWarnings() {
  return [
    { name: 'Aspirin 100mg', sku: 'ASP-100', batch: 'B2024-001', expiryDate: '2025-08-15', qty: 200, daysLeft: 45 },
    { name: 'Diclofenac Gel 1%', sku: 'DCF-GEL', batch: 'B2024-012', expiryDate: '2025-07-30', qty: 85, daysLeft: 29 },
    { name: 'Vitamin C 1000mg', sku: 'VTC-1K', batch: 'B2024-008', expiryDate: '2025-09-01', qty: 340, daysLeft: 62 },
    { name: 'Loratadine 10mg', sku: 'LRT-010', batch: 'B2024-015', expiryDate: '2025-07-20', qty: 120, daysLeft: 19 },
    { name: 'Chlorpheniramine 4mg', sku: 'CPM-004', batch: 'B2024-022', expiryDate: '2025-08-05', qty: 450, daysLeft: 35 },
  ];
}

function generateMockInventoryTrend() {
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    return {
      date: d.toISOString().slice(0, 10),
      lowStock: Math.floor(Math.random() * 8) + 3,
      expiringSoon: Math.floor(Math.random() * 5) + 1,
    };
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtBaht = (n: number) => `฿${n.toLocaleString('th-TH', { minimumFractionDigits: 0 })}`;
const fmtShortDate = (d: string) => {
  const date = new Date(d);
  return `${date.getDate()}/${date.getMonth() + 1}`;
};

// ─── CSV Export Button ────────────────────────────────────────────────────────

function ExportCsvButton({ onClick, label = 'ส่งออก CSV' }: { onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-lg border bg-background px-3 py-1.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted"
    >
      <Download className="h-4 w-4" />
      {label}
    </button>
  );
}

// ─── CSV Export Handlers ─────────────────────────────────────────────────────

function exportDailySales(data: DailySales[]) {
  const columns: CsvColumn<DailySales>[] = [
    { header: 'วันที่', accessor: (r) => r.date },
    { header: 'ยอดขาย (บาท)', accessor: (r) => r.totalAmount, precision: 2 },
    { header: 'จำนวนออเดอร์', accessor: (r) => r.orderCount },
  ];
  exportToCsv(data, columns, `daily-sales-${new Date().toISOString().slice(0, 10)}.csv`);
}

function exportTopProducts(data: TopProduct[]) {
  const columns: CsvColumn<TopProduct>[] = [
    { header: 'ชื่อสินค้า', accessor: (r) => r.product_name },
    { header: 'SKU', accessor: (r) => r.sku },
    { header: 'จำนวนขาย', accessor: (r) => parseFloat(r.total_qty), precision: 0 },
    { header: 'รายได้ (บาท)', accessor: (r) => parseFloat(r.total_revenue), precision: 2 },
    { header: 'จำนวนออเดอร์', accessor: (r) => r.order_count },
  ];
  exportToCsv(data, columns, `top-products-${new Date().toISOString().slice(0, 10)}.csv`);
}

function exportPromotions(data: ReturnType<typeof generateMockPromotions>) {
  const columns: CsvColumn<(typeof data)[0]>[] = [
    { header: 'ชื่อโปรโมชั่น', accessor: (r) => r.name },
    { header: 'ประเภท', accessor: (r) => r.type },
    { header: 'ใช้แล้ว', accessor: (r) => r.usageCount },
    { header: 'จำกัด', accessor: (r) => r.usageLimit },
    { header: 'คงเหลือ', accessor: (r) => r.usageLimit - r.usageCount },
    { header: 'อัตราการใช้ (%)', accessor: (r) => (r.usageCount / r.usageLimit) * 100, precision: 1 },
    { header: 'รายได้ (บาท)', accessor: (r) => r.revenue, precision: 2 },
  ];
  exportToCsv(data, columns, `promotions-${new Date().toISOString().slice(0, 10)}.csv`);
}

function exportCouponUsage(data: ReturnType<typeof generateMockCouponUsage>) {
  const columns: CsvColumn<(typeof data)[0]>[] = [
    { header: 'วันที่', accessor: (r) => r.date },
    { header: 'ใช้คูปอง', accessor: (r) => r.used },
    { header: 'แลกแต้ม', accessor: (r) => r.redeemed },
  ];
  exportToCsv(data, columns, `coupon-usage-${new Date().toISOString().slice(0, 10)}.csv`);
}

function exportRegistrations(data: ReturnType<typeof generateMockRegistrations>) {
  const columns: CsvColumn<(typeof data)[0]>[] = [
    { header: 'วันที่', accessor: (r) => r.date },
    { header: 'จำนวนลงทะเบียน', accessor: (r) => r.count },
  ];
  exportToCsv(data, columns, `registrations-${new Date().toISOString().slice(0, 10)}.csv`);
}

function exportProvinceData(data: ReturnType<typeof generateMockProvinceData>) {
  const columns: CsvColumn<(typeof data)[0]>[] = [
    { header: 'จังหวัด', accessor: (r) => r.province },
    { header: 'จำนวนผู้ป่วย', accessor: (r) => r.count },
  ];
  exportToCsv(data, columns, `province-distribution-${new Date().toISOString().slice(0, 10)}.csv`);
}

function exportAgeGender(data: ReturnType<typeof generateMockAgeGender>) {
  const columns: CsvColumn<(typeof data)[0]>[] = [
    { header: 'กลุ่มอายุ', accessor: (r) => r.group },
    { header: 'ชาย', accessor: (r) => r.male },
    { header: 'หญิง', accessor: (r) => r.female },
    { header: 'รวม', accessor: (r) => r.male + r.female },
  ];
  exportToCsv(data, columns, `age-gender-${new Date().toISOString().slice(0, 10)}.csv`);
}

function exportLowStock(data: ReturnType<typeof generateMockLowStock>) {
  const columns: CsvColumn<(typeof data)[0]>[] = [
    { header: 'ชื่อสินค้า', accessor: (r) => r.name },
    { header: 'SKU', accessor: (r) => r.sku },
    { header: 'สต็อกปัจจุบัน', accessor: (r) => r.currentStock },
    { header: 'สต็อกขั้นต่ำ', accessor: (r) => r.minStock },
    { header: 'จะหมดใน (วัน)', accessor: (r) => r.daysUntilOut },
  ];
  exportToCsv(data, columns, `low-stock-${new Date().toISOString().slice(0, 10)}.csv`);
}

function exportExpiryWarnings(data: ReturnType<typeof generateMockExpiryWarnings>) {
  const columns: CsvColumn<(typeof data)[0]>[] = [
    { header: 'ชื่อสินค้า', accessor: (r) => r.name },
    { header: 'SKU', accessor: (r) => r.sku },
    { header: 'Batch', accessor: (r) => r.batch },
    { header: 'วันหมดอายุ', accessor: (r) => r.expiryDate },
    { header: 'จำนวน', accessor: (r) => r.qty },
    { header: 'เหลือ (วัน)', accessor: (r) => r.daysLeft },
  ];
  exportToCsv(data, columns, `expiry-warnings-${new Date().toISOString().slice(0, 10)}.csv`);
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [range, setRange] = useState<DateRange>('30d');
  const [activeTab, setActiveTab] = useState<ReportTab>('sales');
  const { from, to } = useMemo(() => getDateRange(range), [range]);

  const qp = `from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;

  // Sales data (existing API)
  const { data: summary, isLoading: summaryLoading } = useApi<Summary>(`/v1/staff/reports/summary?${qp}`);
  const { data: dailySales } = useApi<DailySales[]>(`/v1/staff/reports/daily-sales?${qp}`);
  const { data: rxVolume } = useApi<RxVolume[]>(`/v1/staff/reports/rx-volume?${qp}`);
  const { data: interventions } = useApi<InterventionByType[]>(`/v1/staff/reports/interventions?${qp}`);
  const { data: topProducts } = useApi<TopProduct[]>(`/v1/staff/reports/top-products?${qp}&limit=10`);

  // Mock data for new tabs (will be replaced with real API calls when endpoints are ready)
  const mockPromotions = useMemo(() => generateMockPromotions(), []);
  const mockCouponUsage = useMemo(() => generateMockCouponUsage(), []);
  const mockPointsData = useMemo(() => generateMockPointsData(), []);
  const mockTierDistribution = useMemo(() => generateMockTierDistribution(), []);
  const mockRegistrations = useMemo(() => generateMockRegistrations(), []);
  const mockProvinceData = useMemo(() => generateMockProvinceData(), []);
  const mockAgeGender = useMemo(() => generateMockAgeGender(), []);
  const mockLowStock = useMemo(() => generateMockLowStock(), []);
  const mockExpiryWarnings = useMemo(() => generateMockExpiryWarnings(), []);
  const mockInventoryTrend = useMemo(() => generateMockInventoryTrend(), []);

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

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border bg-muted/50 p-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'sales' && (
        <SalesTab
          summary={summary}
          summaryLoading={summaryLoading}
          dailySales={dailySales}
          rxVolume={rxVolume}
          interventions={interventions}
          topProducts={topProducts}
          onExportDailySales={() => dailySales && exportDailySales(dailySales)}
          onExportTopProducts={() => topProducts && exportTopProducts(topProducts)}
        />
      )}
      {activeTab === 'loyalty' && (
        <LoyaltyTab
          promotions={mockPromotions}
          couponUsage={mockCouponUsage}
          pointsData={mockPointsData}
          tierDistribution={mockTierDistribution}
          onExportPromotions={() => exportPromotions(mockPromotions)}
          onExportCouponUsage={() => exportCouponUsage(mockCouponUsage)}
        />
      )}
      {activeTab === 'demographics' && (
        <DemographicsTab
          registrations={mockRegistrations}
          provinceData={mockProvinceData}
          ageGender={mockAgeGender}
          onExportRegistrations={() => exportRegistrations(mockRegistrations)}
          onExportProvinceData={() => exportProvinceData(mockProvinceData)}
          onExportAgeGender={() => exportAgeGender(mockAgeGender)}
        />
      )}
      {activeTab === 'inventory' && (
        <InventoryTab
          lowStock={mockLowStock}
          expiryWarnings={mockExpiryWarnings}
          inventoryTrend={mockInventoryTrend}
          onExportLowStock={() => exportLowStock(mockLowStock)}
          onExportExpiryWarnings={() => exportExpiryWarnings(mockExpiryWarnings)}
        />
      )}
    </div>
  );
}


// ─── Sales Tab ───────────────────────────────────────────────────────────────

function SalesTab({
  summary,
  summaryLoading,
  dailySales,
  rxVolume,
  interventions,
  topProducts,
  onExportDailySales,
  onExportTopProducts,
}: {
  summary?: Summary;
  summaryLoading: boolean;
  dailySales?: DailySales[];
  rxVolume?: RxVolume[];
  interventions?: InterventionByType[];
  topProducts?: TopProduct[];
  onExportDailySales: () => void;
  onExportTopProducts: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* Export Buttons */}
      <div className="flex flex-wrap gap-2">
        <ExportCsvButton onClick={onExportDailySales} label="ส่งออก CSV ยอดขายรายวัน" />
        <ExportCsvButton onClick={onExportTopProducts} label="ส่งออก CSV สินค้าขายดี" />
      </div>
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
              <ChartPlaceholder loading={!dailySales} />
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
              <ChartPlaceholder loading={!rxVolume} />
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
              <ChartPlaceholder loading={!interventions} />
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
                    <div className="min-w-0 flex-1">
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


// ─── Loyalty / Promotions Tab ────────────────────────────────────────────────

function LoyaltyTab({
  promotions,
  couponUsage,
  pointsData,
  tierDistribution,
  onExportPromotions,
  onExportCouponUsage,
}: {
  promotions: ReturnType<typeof generateMockPromotions>;
  couponUsage: ReturnType<typeof generateMockCouponUsage>;
  pointsData: ReturnType<typeof generateMockPointsData>;
  tierDistribution: ReturnType<typeof generateMockTierDistribution>;
  onExportPromotions: () => void;
  onExportCouponUsage: () => void;
}) {
  const totalUsage = promotions.reduce((s, p) => s + p.usageCount, 0);
  const totalRevenue = promotions.reduce((s, p) => s + p.revenue, 0);
  const avgUsageRate = promotions.length
    ? Math.round(promotions.reduce((s, p) => s + (p.usageCount / p.usageLimit) * 100, 0) / promotions.length)
    : 0;
  const totalMembers = tierDistribution.reduce((s, t) => s + t.value, 0);

  return (
    <div className="space-y-6">
      {/* Export Buttons */}
      <div className="flex flex-wrap gap-2">
        <ExportCsvButton onClick={onExportPromotions} label="ส่งออก CSV โปรโมชั่น" />
        <ExportCsvButton onClick={onExportCouponUsage} label="ส่งออก CSV การใช้คูปอง" />
      </div>
      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="คูปองที่ใช้แล้ว" value={totalUsage.toLocaleString()} icon={Gift} description="ทุกโปรโมชั่น" />
        <StatCard title="รายได้จากโปรโมชั่น" value={fmtBaht(totalRevenue)} icon={TrendingUp} />
        <StatCard title="อัตราการใช้เฉลี่ย" value={`${avgUsageRate}%`} icon={Percent} />
        <StatCard title="สมาชิกทั้งหมด" value={totalMembers.toLocaleString()} icon={Star} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Active Promotions Performance */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="font-semibold">ผลงานโปรโมชั่น</h3>
          <p className="mt-1 text-sm text-muted-foreground">การใช้งานและรายได้แต่ละโปรโมชั่น</p>
          <div className="mt-4 space-y-3">
            {promotions.map((p) => {
              const usageRate = Math.round((p.usageCount / p.usageLimit) * 100);
              return (
                <div key={p.name} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.type.replace(/_/g, ' ')}</p>
                    </div>
                    <p className="text-sm font-semibold">{fmtBaht(p.revenue)}</p>
                  </div>
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{p.usageCount}/{p.usageLimit} ใช้แล้ว</span>
                      <span>{usageRate}%</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-primary transition-all"
                        style={{ width: `${Math.min(usageRate, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Coupon Usage Trend */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="font-semibold">แนวโน้มการใช้คูปอง</h3>
          <p className="mt-1 text-sm text-muted-foreground">จำนวนคูปองที่ใช้และแลกรายวัน</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={couponUsage}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tickFormatter={fmtShortDate} className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip labelFormatter={(l) => new Date(String(l)).toLocaleDateString('th-TH')} />
                <Bar dataKey="used" fill="#6366f1" name="ใช้คูปอง" radius={[2, 2, 0, 0]} />
                <Bar dataKey="redeemed" fill="#22c55e" name="แลกแต้ม" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Points Earned vs Redeemed */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="font-semibold">แต้มสะสม vs แลก</h3>
          <p className="mt-1 text-sm text-muted-foreground">แต้มที่ได้รับและแลกใช้รายเดือน</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={pointsData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Line type="monotone" dataKey="earned" stroke="#6366f1" name="ได้รับ" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="redeemed" stroke="#f43f5e" name="แลกใช้" strokeWidth={2} dot={false} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tier Distribution */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="font-semibold">การกระจายระดับสมาชิก</h3>
          <p className="mt-1 text-sm text-muted-foreground">จำนวนสมาชิกแต่ละระดับ</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={tierDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                >
                  {tierDistribution.map((t, idx) => (
                    <Cell key={idx} fill={t.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [Number(value).toLocaleString(), 'สมาชิก']} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}


// ─── Demographics Tab ────────────────────────────────────────────────────────

function DemographicsTab({
  registrations,
  provinceData,
  ageGender,
  onExportRegistrations,
  onExportProvinceData,
  onExportAgeGender,
}: {
  registrations: ReturnType<typeof generateMockRegistrations>;
  provinceData: ReturnType<typeof generateMockProvinceData>;
  ageGender: ReturnType<typeof generateMockAgeGender>;
  onExportRegistrations: () => void;
  onExportProvinceData: () => void;
  onExportAgeGender: () => void;
}) {
  const totalRegistrations = registrations.reduce((s, r) => s + r.count, 0);
  const totalPatients = provinceData.reduce((s, p) => s + p.count, 0);
  const totalMale = ageGender.reduce((s, a) => s + a.male, 0);
  const totalFemale = ageGender.reduce((s, a) => s + a.female, 0);

  return (
    <div className="space-y-6">
      {/* Export Buttons */}
      <div className="flex flex-wrap gap-2">
        <ExportCsvButton onClick={onExportRegistrations} label="ส่งออก CSV ลงทะเบียน" />
        <ExportCsvButton onClick={onExportProvinceData} label="ส่งออก CSV จังหวัด" />
        <ExportCsvButton onClick={onExportAgeGender} label="ส่งออก CSV อายุ/เพศ" />
      </div>
      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="ลงทะเบียนใหม่" value={totalRegistrations.toLocaleString()} icon={Users} description="ช่วงที่เลือก" />
        <StatCard title="ผู้ป่วยทั้งหมด" value={totalPatients.toLocaleString()} icon={Users} />
        <StatCard title="เพศชาย" value={totalMale.toLocaleString()} icon={Users} description={`${Math.round((totalMale / (totalMale + totalFemale)) * 100)}%`} />
        <StatCard title="เพศหญิง" value={totalFemale.toLocaleString()} icon={Users} description={`${Math.round((totalFemale / (totalMale + totalFemale)) * 100)}%`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* New Registrations Over Time */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="font-semibold">ผู้ป่วยลงทะเบียนใหม่</h3>
          <p className="mt-1 text-sm text-muted-foreground">จำนวนการลงทะเบียนรายวัน</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={registrations}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tickFormatter={fmtShortDate} className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  formatter={(value) => [Number(value), 'คน']}
                  labelFormatter={(l) => new Date(String(l)).toLocaleDateString('th-TH')}
                />
                <Area type="monotone" dataKey="count" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.15} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Geographic Distribution */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="font-semibold">การกระจายตามจังหวัด</h3>
          <p className="mt-1 text-sm text-muted-foreground">จำนวนผู้ป่วยแต่ละจังหวัด (Top 10)</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={provinceData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" className="text-xs" />
                <YAxis dataKey="province" type="category" width={80} className="text-xs" />
                <Tooltip formatter={(value) => [Number(value).toLocaleString(), 'คน']} />
                <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Age/Gender Breakdown */}
        <div className="lg:col-span-2 rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="font-semibold">อายุและเพศ</h3>
          <p className="mt-1 text-sm text-muted-foreground">การกระจายตามกลุ่มอายุและเพศ</p>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ageGender}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="group" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="male" fill="#6366f1" name="ชาย" radius={[2, 2, 0, 0]} />
                <Bar dataKey="female" fill="#ec4899" name="หญิง" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}


// ─── Inventory Health Tab ────────────────────────────────────────────────────

function InventoryTab({
  lowStock,
  expiryWarnings,
  inventoryTrend,
  onExportLowStock,
  onExportExpiryWarnings,
}: {
  lowStock: ReturnType<typeof generateMockLowStock>;
  expiryWarnings: ReturnType<typeof generateMockExpiryWarnings>;
  inventoryTrend: ReturnType<typeof generateMockInventoryTrend>;
  onExportLowStock: () => void;
  onExportExpiryWarnings: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* Export Buttons */}
      <div className="flex flex-wrap gap-2">
        <ExportCsvButton onClick={onExportLowStock} label="ส่งออก CSV สินค้าใกล้หมด" />
        <ExportCsvButton onClick={onExportExpiryWarnings} label="ส่งออก CSV ใกล้หมดอายุ" />
      </div>
      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="สินค้าใกล้หมด" value={lowStock.length} icon={AlertTriangle} description="ต่ำกว่า min stock" />
        <StatCard title="ใกล้หมดอายุ" value={expiryWarnings.length} icon={Calendar} description="ภายใน 90 วัน" />
        <StatCard
          title="เร่งด่วนที่สุด"
          value={lowStock.length > 0 ? `${lowStock.reduce((min, i) => Math.min(min, i.daysUntilOut), Infinity)} วัน` : '-'}
          icon={ShieldAlert}
          description="จะหมดเร็วที่สุด"
        />
        <StatCard
          title="มูลค่าใกล้หมดอายุ"
          value={`${expiryWarnings.reduce((s, e) => s + e.qty, 0).toLocaleString()} ชิ้น`}
          icon={Package}
          description="รวมทุก batch"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Inventory Alert Trend */}
        <div className="lg:col-span-2 rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="font-semibold">แนวโน้มปัญหาคลัง</h3>
          <p className="mt-1 text-sm text-muted-foreground">จำนวนรายการที่มีปัญหารายวัน</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={inventoryTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tickFormatter={fmtShortDate} className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip labelFormatter={(l) => new Date(String(l)).toLocaleDateString('th-TH')} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line type="monotone" dataKey="lowStock" stroke="#f97316" name="สินค้าใกล้หมด" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="expiringSoon" stroke="#f43f5e" name="ใกล้หมดอายุ" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="font-semibold">สินค้าใกล้หมด</h3>
          <p className="mt-1 text-sm text-muted-foreground">สต็อกต่ำกว่าจุดสั่งซื้อ</p>
          <div className="mt-4 space-y-2">
            {lowStock.map((item) => (
              <div key={item.sku} className="flex items-center gap-3 rounded-lg border p-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                  item.daysUntilOut <= 2 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {item.daysUntilOut}d
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.sku}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-red-600">{item.currentStock}</p>
                  <p className="text-xs text-muted-foreground">min: {item.minStock}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Expiry Warnings */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="font-semibold">ใกล้หมดอายุ</h3>
          <p className="mt-1 text-sm text-muted-foreground">สินค้าที่จะหมดอายุภายใน 90 วัน</p>
          <div className="mt-4 space-y-2">
            {expiryWarnings.map((item) => (
              <div key={item.batch} className="flex items-center gap-3 rounded-lg border p-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                  item.daysLeft <= 30 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {item.daysLeft}d
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.sku} · Batch: {item.batch}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{item.qty.toLocaleString()} ชิ้น</p>
                  <p className="text-xs text-muted-foreground">
                    หมดอายุ {new Date(item.expiryDate).toLocaleDateString('th-TH')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Shared Components ───────────────────────────────────────────────────────

function ChartPlaceholder({ loading }: { loading: boolean }) {
  return (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'ไม่มีข้อมูล'}
    </div>
  );
}
