'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import {
  createPromotion,
  type CreatePromotionPayload,
  type PromotionType,
  type MembershipTier,
} from '@/lib/promotions';

const PROMOTION_TYPES: { value: PromotionType; label: string; description: string }[] = [
  { value: 'percentage_discount', label: 'ส่วนลด %', description: 'ลดราคาเป็นเปอร์เซ็นต์' },
  { value: 'fixed_discount', label: 'ส่วนลดคงที่', description: 'ลดราคาเป็นจำนวนเงิน (บาท)' },
  { value: 'buy_x_get_y', label: 'ซื้อ X แถม Y', description: 'ซื้อสินค้าครบจำนวน แถมฟรี' },
  { value: 'bundle', label: 'Bundle', description: 'ราคาพิเศษเมื่อซื้อเป็นชุด' },
  { value: 'free_delivery', label: 'ส่งฟรี', description: 'ฟรีค่าจัดส่ง' },
  { value: 'free_gift', label: 'ของแถม', description: 'แถมสินค้าเมื่อซื้อครบ' },
  { value: 'points_multiplier', label: 'คูณแต้ม', description: 'ได้แต้มสะสมเพิ่ม' },
];

const TIER_OPTIONS: { value: MembershipTier; label: string }[] = [
  { value: 'bronze', label: 'Bronze' },
  { value: 'silver', label: 'Silver' },
  { value: 'gold', label: 'Gold' },
  { value: 'platinum', label: 'Platinum' },
];

const labelClass = 'block text-sm font-medium text-foreground mb-1.5';
const inputClass = 'w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50';

export default function NewPromotionPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<PromotionType>('percentage_discount');
  const [value, setValue] = useState('');
  const [minOrderAmount, setMinOrderAmount] = useState('');
  const [maxDiscount, setMaxDiscount] = useState('');
  const [usageLimit, setUsageLimit] = useState('');
  const [usagePerCustomer, setUsagePerCustomer] = useState('1');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [tierRequired, setTierRequired] = useState('');
  const [productIds, setProductIds] = useState('');
  const [categoryIds, setCategoryIds] = useState('');
  const [buyQuantity, setBuyQuantity] = useState('');
  const [getQuantity, setGetQuantity] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload: CreatePromotionPayload = {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        type,
      };

      if (description.trim()) payload.description = description.trim();
      if (value) payload.value = Number(value);
      if (minOrderAmount) payload.minOrderAmount = Number(minOrderAmount);
      if (maxDiscount) payload.maxDiscount = Number(maxDiscount);
      if (usageLimit) payload.usageLimit = Number(usageLimit);
      if (usagePerCustomer) payload.usagePerCustomer = Number(usagePerCustomer);
      if (startsAt) payload.startsAt = new Date(startsAt).toISOString();
      if (endsAt) payload.endsAt = new Date(endsAt).toISOString();
      if (tierRequired) payload.tierRequired = tierRequired as MembershipTier;
      if (productIds.trim()) payload.productIds = productIds.split(',').map((s) => s.trim()).filter(Boolean);
      if (categoryIds.trim()) payload.categoryIds = categoryIds.split(',').map((s) => s.trim()).filter(Boolean);
      if (buyQuantity) payload.buyQuantity = Number(buyQuantity);
      if (getQuantity) payload.getQuantity = Number(getQuantity);

      await createPromotion(payload);
      router.push('/dashboard/promotions');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาด';
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="สร้างโปรโมชั่นใหม่" description="กรอกข้อมูลโปรโมชั่นที่ต้องการสร้าง">
        <Link
          href="/dashboard/promotions"
          className="inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" />
          กลับ
        </Link>
      </PageHeader>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Info */}
        <section className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">ข้อมูลพื้นฐาน</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>รหัสคูปอง *</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="เช่น SAVE20"
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>ชื่อโปรโมชั่น *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="เช่น ลด 20% สำหรับสมาชิกใหม่"
                required
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>รายละเอียด</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className={inputClass}
              />
            </div>
          </div>
        </section>

        {/* Type & Value */}
        <section className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">ประเภทและมูลค่า</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelClass}>ประเภทโปรโมชั่น *</label>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {PROMOTION_TYPES.map((pt) => (
                  <button
                    key={pt.value}
                    type="button"
                    onClick={() => setType(pt.value)}
                    className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                      type === pt.value
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <p className="font-medium">{pt.label}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{pt.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={labelClass}>
                มูลค่า {type === 'percentage_discount' ? '(%)' : type === 'fixed_discount' ? '(บาท)' : ''}
              </label>
              <input
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                min={0}
                max={type === 'percentage_discount' ? 100 : undefined}
                step="0.01"
                className={inputClass}
              />
            </div>

            {type === 'percentage_discount' && (
              <div>
                <label className={labelClass}>ส่วนลดสูงสุด (บาท) *</label>
                <input
                  type="number"
                  value={maxDiscount}
                  onChange={(e) => setMaxDiscount(e.target.value)}
                  min={0}
                  step="0.01"
                  required
                  className={inputClass}
                />
              </div>
            )}

            <div>
              <label className={labelClass}>ยอดสั่งซื้อขั้นต่ำ (บาท)</label>
              <input
                type="number"
                value={minOrderAmount}
                onChange={(e) => setMinOrderAmount(e.target.value)}
                min={0}
                step="0.01"
                className={inputClass}
              />
            </div>

            {type === 'buy_x_get_y' && (
              <>
                <div>
                  <label className={labelClass}>จำนวนซื้อ (Buy) *</label>
                  <input
                    type="number"
                    value={buyQuantity}
                    onChange={(e) => setBuyQuantity(e.target.value)}
                    min={1}
                    required
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>จำนวนแถม (Get) *</label>
                  <input
                    type="number"
                    value={getQuantity}
                    onChange={(e) => setGetQuantity(e.target.value)}
                    min={1}
                    required
                    className={inputClass}
                  />
                </div>
              </>
            )}
          </div>
        </section>

        {/* Date Range */}
        <section className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">ช่วงเวลา</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>เริ่มต้น</label>
              <input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>สิ้นสุด</label>
              <input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </section>

        {/* Targeting */}
        <section className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">เงื่อนไขและการกำหนดเป้าหมาย</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>ระดับสมาชิกขั้นต่ำ</label>
              <select
                value={tierRequired}
                onChange={(e) => setTierRequired(e.target.value)}
                className={inputClass}
              >
                <option value="">ไม่จำกัด</option>
                {TIER_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>จำกัดการใช้ (ครั้ง)</label>
              <input
                type="number"
                value={usageLimit}
                onChange={(e) => setUsageLimit(e.target.value)}
                min={1}
                placeholder="ไม่จำกัด"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>จำกัดต่อลูกค้า (ครั้ง)</label>
              <input
                type="number"
                value={usagePerCustomer}
                onChange={(e) => setUsagePerCustomer(e.target.value)}
                min={1}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Product IDs (คั่นด้วย ,)</label>
              <input
                type="text"
                value={productIds}
                onChange={(e) => setProductIds(e.target.value)}
                placeholder="uuid1, uuid2"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Category IDs (คั่นด้วย ,)</label>
              <input
                type="text"
                value={categoryIds}
                onChange={(e) => setCategoryIds(e.target.value)}
                placeholder="uuid1, uuid2"
                className={inputClass}
              />
            </div>
          </div>
        </section>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Link
            href="/dashboard/promotions"
            className="inline-flex h-10 items-center rounded-lg border px-6 text-sm font-medium transition-colors hover:bg-muted"
          >
            ยกเลิก
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            สร้างโปรโมชั่น
          </button>
        </div>
      </form>
    </div>
  );
}
