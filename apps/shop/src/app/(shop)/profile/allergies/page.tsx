'use client';

import Link from 'next/link';
import { ArrowLeft, Plus, AlertTriangle, Heart, Trash2, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/auth';
import { useAuthGuard } from '@/lib/use-auth-guard';
import { getMyAllergies, createAllergy, deleteAllergy } from '@/lib/patient';
import { toast } from 'sonner';
import type { Allergy } from '@/lib/patient';

const severityConfig: Record<string, { label: string; variant: 'destructive' | 'warning' | 'secondary' }> = {
  severe: { label: 'รุนแรง', variant: 'destructive' },
  life_threatening: { label: 'อันตรายถึงชีวิต', variant: 'destructive' },
  moderate: { label: 'ปานกลาง', variant: 'warning' },
  mild: { label: 'เล็กน้อย', variant: 'secondary' },
};

const sourceLabel: Record<string, string> = {
  doctor_diagnosed: 'แพทย์วินิจฉัย',
  patient_reported: 'แจ้งเอง',
  pharmacist_recorded: 'เภสัชกรบันทึก',
};

export default function AllergiesPage() {
  const { loading: authLoading, token } = useAuthGuard();
  const { accessToken } = useAuthStore();
  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    drugName: '',
    allergyGroup: '',
    severity: 'mild' as Allergy['severity'],
    symptoms: '',
    source: 'patient_reported' as Allergy['source'],
    notes: '',
  });

  useEffect(() => {
    if (!accessToken) return;
    getMyAllergies(accessToken)
      .then(setAllergies)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [accessToken]);

  const handleAdd = async () => {
    if (!accessToken || !form.drugName.trim()) return;
    setSaving(true);
    try {
      const a = await createAllergy(accessToken, {
        drugName: form.drugName.trim(),
        allergyGroup: form.allergyGroup.trim() || null,
        severity: form.severity,
        symptoms: form.symptoms.trim() || null,
        source: form.source,
        notes: form.notes.trim() || null,
      });
      setAllergies((prev) => [a, ...prev]);
      setShowForm(false);
      setForm({ drugName: '', allergyGroup: '', severity: 'mild', symptoms: '', source: 'patient_reported', notes: '' });
    } catch {
      toast.error('เพิ่มข้อมูลไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!accessToken) return;
    if (!confirm('ลบประวัติแพ้ยานี้?')) return;
    try {
      await deleteAllergy(accessToken, id);
      setAllergies((prev) => prev.filter((a) => a.id !== id));
    } catch {
      toast.error('ลบไม่สำเร็จ');
    }
  };

  if (authLoading) return <div className="flex items-center justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="pb-8">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/profile" className="rounded-full p-1 hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold">ประวัติแพ้ยา</h1>
            <p className="text-xs text-muted-foreground">{allergies.length} รายการ</p>
          </div>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" />
          เพิ่ม
        </Button>
      </div>

      {/* Warning Banner */}
      <div className="mx-4 mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
          <p className="text-xs text-amber-700">
            ข้อมูลแพ้ยาจะถูกตรวจสอบทุกครั้งที่สั่งซื้อยา เพื่อความปลอดภัยของคุณ
          </p>
        </div>
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="mx-4 mb-4 rounded-xl border bg-card p-4 space-y-3 shadow-sm">
          <h2 className="font-semibold text-sm">เพิ่มประวัติแพ้ยา</h2>
          <div>
            <label className="text-xs text-muted-foreground">ชื่อยา *</label>
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="เช่น Penicillin, Aspirin"
              value={form.drugName}
              onChange={(e) => setForm((f) => ({ ...f, drugName: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">กลุ่มยา</label>
              <input
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Beta-lactam"
                value={form.allergyGroup}
                onChange={(e) => setForm((f) => ({ ...f, allergyGroup: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">ระดับความรุนแรง</label>
              <select
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.severity}
                onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value as Allergy['severity'] }))}
              >
                <option value="mild">เล็กน้อย</option>
                <option value="moderate">ปานกลาง</option>
                <option value="severe">รุนแรง</option>
                <option value="life_threatening">อันตรายถึงชีวิต</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">อาการที่เกิดขึ้น</label>
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="ผื่นแดง, หายใจหอบ"
              value={form.symptoms}
              onChange={(e) => setForm((f) => ({ ...f, symptoms: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">ที่มาของข้อมูล</label>
            <select
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              value={form.source}
              onChange={(e) => setForm((f) => ({ ...f, source: e.target.value as Allergy['source'] }))}
            >
              <option value="patient_reported">แจ้งเอง</option>
              <option value="doctor_diagnosed">แพทย์วินิจฉัย</option>
              <option value="pharmacist_recorded">เภสัชกรบันทึก</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd} disabled={saving || !form.drugName.trim()} className="flex-1">
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
        ) : allergies.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center">
            <Heart className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">ยังไม่มีประวัติแพ้ยา</p>
            <p className="mt-1 text-xs text-muted-foreground">กด &quot;เพิ่ม&quot; เพื่อบันทึกข้อมูล</p>
          </div>
        ) : (
          allergies.map((allergy) => {
            const config = severityConfig[allergy.severity] ?? { label: 'เล็กน้อย', variant: 'secondary' as const };
            return (
              <div key={allergy.id} className="rounded-xl border p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-medium">{allergy.drugName}</h3>
                    {allergy.allergyGroup && (
                      <p className="text-xs text-muted-foreground">กลุ่ม: {allergy.allergyGroup}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={config.variant}>{config.label}</Badge>
                    <button
                      onClick={() => handleDelete(allergy.id)}
                      className="rounded-full p-1 text-muted-foreground hover:bg-red-50 hover:text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                {allergy.symptoms && (
                  <p className="mt-2 text-sm text-muted-foreground">อาการ: {allergy.symptoms}</p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  ที่มา: {sourceLabel[allergy.source] ?? allergy.source}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
