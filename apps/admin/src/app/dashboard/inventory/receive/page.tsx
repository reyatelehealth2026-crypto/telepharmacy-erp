'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Package, CheckCircle } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { api } from '@/lib/api-client';

export default function ReceiveLotPage() {
  const [productId, setProductId] = useState('');
  const [lotNo, setLotNo] = useState('');
  const [quantity, setQuantity] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!productId || !lotNo || !quantity || !expiryDate) return;
    setSubmitting(true);
    try {
      await api.post('/v1/staff/inventory/lots', {
        productId, lotNo, quantity: parseInt(quantity),
        expiryDate, costPrice: costPrice ? parseFloat(costPrice) : undefined,
      });
      setSuccess(true);
      setProductId(''); setLotNo(''); setQuantity(''); setExpiryDate(''); setCostPrice('');
      setTimeout(() => setSuccess(false), 3000);
    } catch (e: any) { alert(e.message ?? 'Error'); }
    finally { setSubmitting(false); }
  }

  const ic = 'w-full rounded-lg border px-3 py-2 text-sm';

  return (
    <div className="space-y-6">
      <PageHeader title="รับสินค้าเข้า" description="บันทึกการรับ Lot สินค้าใหม่">
        <Link href="/dashboard/inventory" className="inline-flex h-9 items-center gap-2 rounded-lg border px-4 text-sm hover:bg-muted">
          <ArrowLeft className="h-4 w-4" /> กลับคลังสินค้า
        </Link>
      </PageHeader>

      {success && <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700 flex items-center gap-2"><CheckCircle className="h-4 w-4" /> บันทึกการรับสินค้าเรียบร้อย</div>}

      <form onSubmit={handleSubmit} className="max-w-xl rounded-xl border bg-card p-6 shadow-sm space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Product ID *</label>
          <input value={productId} onChange={e => setProductId(e.target.value)} className={ic} placeholder="UUID ของสินค้า" required />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Lot No. *</label>
            <input value={lotNo} onChange={e => setLotNo(e.target.value)} className={ic} placeholder="เลข Lot" required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">จำนวน *</label>
            <input type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} className={ic} required />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">วันหมดอายุ *</label>
            <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} className={ic} required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">ราคาทุน (฿)</label>
            <input type="number" step="0.01" value={costPrice} onChange={e => setCostPrice(e.target.value)} className={ic} />
          </div>
        </div>
        <button type="submit" disabled={submitting} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />}
          บันทึกรับสินค้า
        </button>
      </form>
    </div>
  );
}
