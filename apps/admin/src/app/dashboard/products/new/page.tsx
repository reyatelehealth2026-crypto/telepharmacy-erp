'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { api } from '@/lib/api-client';

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<Record<string, any>>({
    nameTh: '', nameEn: '', sku: '', genericName: '', brand: '',
    dosageForm: '', strength: '', unit: 'item',
    sellPrice: '', comparePrice: '', stockQty: '0',
    shortDescription: '', howToUse: '', warnings: '',
    barcode: '', drugClassification: '',
    requiresPrescription: false, requiresPharmacist: false, status: 'active',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setForm((prev: any) => ({ ...prev, [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nameTh.trim()) { setError('กรุณาระบุชื่อสินค้า (ไทย)'); return; }
    setLoading(true); setError('');
    try {
      await api.post('/v1/products', {
        ...form,
        sellPrice: form.sellPrice ? Number(form.sellPrice) : undefined,
        comparePrice: form.comparePrice ? Number(form.comparePrice) : undefined,
        stockQty: form.stockQty ? Number(form.stockQty) : undefined,
      });
      router.push('/dashboard/products');
    } catch (err) { setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด'); }
    finally { setLoading(false); }
  };

  const cls = "w-full rounded-lg border px-3 py-2 text-sm";

  return (
    <div className="space-y-6">
      <PageHeader title="เพิ่มสินค้าใหม่" description="กรอกข้อมูลสินค้า" />
      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><label className="mb-1 block text-sm font-medium">ชื่อสินค้า (ไทย) *</label><input name="nameTh" value={form.nameTh} onChange={handleChange} required className={cls} /></div>
          <div><label className="mb-1 block text-sm font-medium">ชื่อสินค้า (EN)</label><input name="nameEn" value={form.nameEn} onChange={handleChange} className={cls} /></div>
          <div><label className="mb-1 block text-sm font-medium">SKU</label><input name="sku" value={form.sku} onChange={handleChange} placeholder="auto" className={cls} /></div>
          <div><label className="mb-1 block text-sm font-medium">ชื่อสามัญ</label><input name="genericName" value={form.genericName} onChange={handleChange} className={cls} /></div>
          <div><label className="mb-1 block text-sm font-medium">แบรนด์</label><input name="brand" value={form.brand} onChange={handleChange} className={cls} /></div>
          <div><label className="mb-1 block text-sm font-medium">ประเภท</label><select name="drugClassification" value={form.drugClassification} onChange={handleChange} className={cls}><option value="">-- เลือก --</option><option value="hhr">ยาสามัญ (HHR)</option><option value="dangerous_drug">ยาอันตราย</option><option value="specially_controlled">ยาควบคุมพิเศษ</option><option value="supplement">อาหารเสริม</option><option value="device">อุปกรณ์</option><option value="herbal">สมุนไพร</option></select></div>
          <div><label className="mb-1 block text-sm font-medium">รูปแบบ</label><input name="dosageForm" value={form.dosageForm} onChange={handleChange} placeholder="แคปซูล, ยาเม็ด" className={cls} /></div>
          <div><label className="mb-1 block text-sm font-medium">ความแรง</label><input name="strength" value={form.strength} onChange={handleChange} placeholder="500mg" className={cls} /></div>
          <div><label className="mb-1 block text-sm font-medium">หน่วย</label><input name="unit" value={form.unit} onChange={handleChange} className={cls} /></div>
          <div><label className="mb-1 block text-sm font-medium">ราคาขาย (บาท)</label><input name="sellPrice" type="number" step="0.01" value={form.sellPrice} onChange={handleChange} className={cls} /></div>
          <div><label className="mb-1 block text-sm font-medium">ราคาเปรียบเทียบ</label><input name="comparePrice" type="number" step="0.01" value={form.comparePrice} onChange={handleChange} className={cls} /></div>
          <div><label className="mb-1 block text-sm font-medium">จำนวนสต็อก</label><input name="stockQty" type="number" value={form.stockQty} onChange={handleChange} className={cls} /></div>
          <div><label className="mb-1 block text-sm font-medium">บาร์โค้ด</label><input name="barcode" value={form.barcode} onChange={handleChange} className={cls} /></div>
          <div><label className="mb-1 block text-sm font-medium">สถานะ</label><select name="status" value={form.status} onChange={handleChange} className={cls}><option value="active">Active</option><option value="draft">Draft</option><option value="inactive">Inactive</option></select></div>
          <div className="flex items-center gap-4 pt-4">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="requiresPrescription" checked={form.requiresPrescription} onChange={handleChange} className="rounded" />ต้องมีใบสั่งยา</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="requiresPharmacist" checked={form.requiresPharmacist} onChange={handleChange} className="rounded" />ต้องมีเภสัชกรจ่าย</label>
          </div>
        </div>
        <div className="space-y-3">
          <div><label className="mb-1 block text-sm font-medium">รายละเอียด</label><textarea name="shortDescription" value={form.shortDescription} onChange={handleChange} rows={2} className={cls} /></div>
          <div><label className="mb-1 block text-sm font-medium">วิธีใช้</label><textarea name="howToUse" value={form.howToUse} onChange={handleChange} rows={2} className={cls} /></div>
          <div><label className="mb-1 block text-sm font-medium">คำเตือน</label><textarea name="warnings" value={form.warnings} onChange={handleChange} rows={2} className={cls} /></div>
        </div>
        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">{loading ? 'กำลังบันทึก...' : 'บันทึกสินค้า'}</button>
          <button type="button" onClick={() => router.back()} className="rounded-lg border px-6 py-2 text-sm font-medium hover:bg-muted">ยกเลิก</button>
        </div>
      </form>
    </div>
  );
}
