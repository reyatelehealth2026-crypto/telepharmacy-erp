'use client';

import Link from 'next/link';
import { ArrowLeft, Plus, Pill, Trash2, Bell, RefreshCw, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/auth';
import { getMyMedications, createMedication, deleteMedication } from '@/lib/patient';
import type { Medication } from '@/lib/patient';

export default function MedicationsPage() {
  const { accessToken } = useAuthStore();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    drugName: '',
    genericName: '',
    dosage: '',
    sig: '',
    prescribedBy: '',
    isCurrent: true,
    notes: '',
  });

  useEffect(() => {
    if (!accessToken) { setLoading(false); return; }
    getMyMedications(accessToken, false)
      .then(setMedications)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [accessToken]);

  const handleAdd = async () => {
    if (!accessToken || !form.drugName.trim()) return;
    setSaving(true);
    try {
      const m = await createMedication(accessToken, {
        drugName: form.drugName.trim(),
        genericName: form.genericName.trim() || null,
        dosage: form.dosage.trim() || null,
        sig: form.sig.trim() || null,
        prescribedBy: form.prescribedBy.trim() || null,
        startDate: null,
        endDate: null,
        isCurrent: form.isCurrent,
        notes: form.notes.trim() || null,
      });
      setMedications((prev) => [m, ...prev]);
      setShowForm(false);
      setForm({ drugName: '', genericName: '', dosage: '', sig: '', prescribedBy: '', isCurrent: true, notes: '' });
    } catch {
      alert('เพิ่มข้อมูลไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!accessToken) return;
    if (!confirm('ลบรายการยานี้?')) return;
    try {
      await deleteMedication(accessToken, id);
      setMedications((prev) => prev.filter((m) => m.id !== id));
    } catch {
      alert('ลบไม่สำเร็จ');
    }
  };

  const currentMeds = medications.filter((m) => m.isCurrent);
  const pastMeds = medications.filter((m) => !m.isCurrent);

  return (
    <div className="pb-8">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/profile" className="rounded-full p-1 hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold">ยาที่กินอยู่</h1>
            <p className="text-xs text-muted-foreground">{currentMeds.length} รายการ</p>
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
          <h2 className="font-semibold text-sm">เพิ่มยาที่ใช้</h2>
          <div>
            <label className="text-xs text-muted-foreground">ชื่อยา *</label>
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="เช่น Metformin 500mg"
              value={form.drugName}
              onChange={(e) => setForm((f) => ({ ...f, drugName: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">วิธีใช้</label>
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="1 เม็ด หลังอาหาร 2 ครั้ง/วัน"
              value={form.sig}
              onChange={(e) => setForm((f) => ({ ...f, sig: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">สั่งโดย</label>
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="นพ. / เภสัชกร"
              value={form.prescribedBy}
              onChange={(e) => setForm((f) => ({ ...f, prescribedBy: e.target.value }))}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isCurrent"
              checked={form.isCurrent}
              onChange={(e) => setForm((f) => ({ ...f, isCurrent: e.target.checked }))}
              className="h-4 w-4 rounded"
            />
            <label htmlFor="isCurrent" className="text-sm">กินอยู่ในปัจจุบัน</label>
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
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : medications.length === 0 ? (
        <div className="mx-4 rounded-xl border border-dashed p-8 text-center">
          <Pill className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">ยังไม่มีรายการยา</p>
          <p className="mt-1 text-xs text-muted-foreground">กด &quot;เพิ่ม&quot; เพื่อบันทึกข้อมูล</p>
        </div>
      ) : (
        <div className="space-y-4 px-4">
          {/* Current Medications */}
          {currentMeds.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                ยาที่กินอยู่ ({currentMeds.length})
              </h2>
              <div className="space-y-3">
                {currentMeds.map((med) => (
                  <MedCard key={med.id} med={med} onDelete={handleDelete} />
                ))}
              </div>
            </div>
          )}

          {/* Past Medications */}
          {pastMeds.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                ยาในอดีต ({pastMeds.length})
              </h2>
              <div className="space-y-3">
                {pastMeds.map((med) => (
                  <MedCard key={med.id} med={med} onDelete={handleDelete} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MedCard({ med, onDelete }: { med: Medication; onDelete: (id: string) => void }) {
  return (
    <div className="rounded-xl border p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Pill className="h-4 w-4 text-primary shrink-0" />
          <div>
            <h3 className="font-medium text-sm">{med.drugName}</h3>
            {med.genericName && (
              <p className="text-xs text-muted-foreground">{med.genericName}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {med.isCurrent && <Badge variant="success">กินอยู่</Badge>}
          <button
            onClick={() => onDelete(med.id)}
            className="rounded-full p-1 text-muted-foreground hover:bg-red-50 hover:text-red-500"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {med.sig && (
        <p className="mt-2 text-sm text-muted-foreground">วิธีใช้: {med.sig}</p>
      )}
      {med.prescribedBy && (
        <p className="mt-1 text-xs text-muted-foreground">สั่งโดย: {med.prescribedBy}</p>
      )}
      <div className="mt-3 flex gap-2">
        <Button size="sm" variant="outline" className="text-xs gap-1">
          <RefreshCw className="h-3 w-3" />
          สั่งยาซ้ำ
        </Button>
        <Button size="sm" variant="outline" className="text-xs gap-1">
          <Bell className="h-3 w-3" />
          ตั้งเตือน
        </Button>
      </div>
    </div>
  );
}
