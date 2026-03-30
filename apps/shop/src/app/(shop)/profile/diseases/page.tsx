'use client';

import Link from 'next/link';
import { ArrowLeft, Plus, Stethoscope, Trash2, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/auth';
import { getMyDiseases, createDisease, deleteDisease } from '@/lib/patient';
import type { ChronicDisease } from '@/lib/patient';

export default function DiseasesPage() {
  const { accessToken } = useAuthStore();
  const [diseases, setDiseases] = useState<ChronicDisease[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    diseaseName: '',
    icdCode: '',
    diagnosedYear: '',
    isControlled: false,
    medications: '',
    notes: '',
  });

  useEffect(() => {
    if (!accessToken) { setLoading(false); return; }
    getMyDiseases(accessToken)
      .then(setDiseases)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [accessToken]);

  const handleAdd = async () => {
    if (!accessToken || !form.diseaseName.trim()) return;
    setSaving(true);
    try {
      const d = await createDisease(accessToken, {
        diseaseName: form.diseaseName.trim(),
        icdCode: form.icdCode.trim() || null,
        diagnosedYear: form.diagnosedYear ? parseInt(form.diagnosedYear) : null,
        isControlled: form.isControlled,
        medications: form.medications.trim() || null,
        notes: form.notes.trim() || null,
      });
      setDiseases((prev) => [d, ...prev]);
      setShowForm(false);
      setForm({ diseaseName: '', icdCode: '', diagnosedYear: '', isControlled: false, medications: '', notes: '' });
    } catch {
      alert('เพิ่มข้อมูลไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!accessToken) return;
    if (!confirm('ลบโรคประจำตัวนี้?')) return;
    try {
      await deleteDisease(accessToken, id);
      setDiseases((prev) => prev.filter((d) => d.id !== id));
    } catch {
      alert('ลบไม่สำเร็จ');
    }
  };

  return (
    <div className="pb-8">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/profile" className="rounded-full p-1 hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold">โรคประจำตัว</h1>
            <p className="text-xs text-muted-foreground">{diseases.length} รายการ</p>
          </div>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" />
          เพิ่ม
        </Button>
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="mx-4 mb-4 rounded-xl border bg-card p-4 space-y-3 shadow-sm">
          <h2 className="font-semibold text-sm">เพิ่มโรคประจำตัว</h2>
          <div>
            <label className="text-xs text-muted-foreground">ชื่อโรค *</label>
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="เช่น เบาหวาน, ความดันโลหิตสูง"
              value={form.diseaseName}
              onChange={(e) => setForm((f) => ({ ...f, diseaseName: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">รหัส ICD-10</label>
              <input
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="E11"
                value={form.icdCode}
                onChange={(e) => setForm((f) => ({ ...f, icdCode: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">ปีที่วินิจฉัย</label>
              <input
                type="number"
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="2567"
                value={form.diagnosedYear}
                onChange={(e) => setForm((f) => ({ ...f, diagnosedYear: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">ยาที่ใช้รักษา</label>
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Metformin, Amlodipine"
              value={form.medications}
              onChange={(e) => setForm((f) => ({ ...f, medications: e.target.value }))}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="controlled"
              checked={form.isControlled}
              onChange={(e) => setForm((f) => ({ ...f, isControlled: e.target.checked }))}
              className="h-4 w-4 rounded"
            />
            <label htmlFor="controlled" className="text-sm">ควบคุมได้แล้ว</label>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">หมายเหตุ</label>
            <textarea
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd} disabled={saving || !form.diseaseName.trim()} className="flex-1">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'บันทึก'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)} className="flex-1">
              ยกเลิก
            </Button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="space-y-3 px-4">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : diseases.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center">
            <Stethoscope className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">ยังไม่มีข้อมูลโรคประจำตัว</p>
            <p className="mt-1 text-xs text-muted-foreground">กด &quot;เพิ่ม&quot; เพื่อบันทึกข้อมูล</p>
          </div>
        ) : (
          diseases.map((disease) => (
            <div key={disease.id} className="rounded-xl border p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Stethoscope className="h-4 w-4 text-purple-500 shrink-0" />
                  <div>
                    <h3 className="font-medium text-sm">{disease.diseaseName}</h3>
                    {disease.icdCode && (
                      <span className="text-xs text-muted-foreground">ICD: {disease.icdCode}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {disease.isControlled ? (
                    <Badge variant="success">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      ควบคุมได้
                    </Badge>
                  ) : (
                    <Badge variant="warning">
                      <XCircle className="mr-1 h-3 w-3" />
                      ยังไม่ควบคุม
                    </Badge>
                  )}
                  <button
                    onClick={() => handleDelete(disease.id)}
                    className="rounded-full p-1 text-muted-foreground hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              {disease.diagnosedYear && (
                <p className="mt-2 text-xs text-muted-foreground">วินิจฉัยปี: {disease.diagnosedYear}</p>
              )}
              {disease.medications && (
                <p className="mt-1 text-xs text-muted-foreground">ยาที่ใช้: {disease.medications}</p>
              )}
              {disease.notes && (
                <p className="mt-1 text-xs text-muted-foreground">{disease.notes}</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
