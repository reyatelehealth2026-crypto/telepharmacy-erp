'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Bell,
  Clock,
  Plus,
  Trash2,
  CheckCircle,
  Pill,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuthStore } from '@/store/auth';
import { toast } from 'sonner';
import {
  getMyReminders,
  createReminder,
  acknowledgeReminder,
  toggleReminder as apiToggleReminder,
  deleteReminder as apiDeleteReminder,
  getMyStats,
  type Reminder,
  type AdherenceStats,
} from '@/lib/adherence';

/** Map ISO weekday number (1=Mon…7=Sun) to Thai short name */
const DAY_LABELS: Record<number, string> = {
  1: 'จ', 2: 'อ', 3: 'พ', 4: 'พฤ', 5: 'ศ', 6: 'ส', 7: 'อา',
};
const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7];

export default function MedicationRemindersPage() {
  const { accessToken } = useAuthStore();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [stats, setStats] = useState<AdherenceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({
    drugName: '',
    sig: '',
    time: '08:00',
    days: ALL_DAYS as number[],
  });

  const fetchData = useCallback(async () => {
    if (!accessToken) { setLoading(false); return; }
    try {
      const [r, s] = await Promise.all([
        getMyReminders(accessToken),
        getMyStats(accessToken).catch(() => null),
      ]);
      setReminders(r);
      if (s) setStats(s);
    } catch {
      // silent — page still renders empty state
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleDay = (day: number) => {
    setForm((f) => ({
      ...f,
      days: f.days.includes(day) ? f.days.filter((d) => d !== day) : [...f.days, day],
    }));
  };

  const handleAdd = async () => {
    if (!form.drugName || !form.time || !accessToken) {
      toast.error('กรุณากรอกชื่อยาและเวลา');
      return;
    }
    try {
      await createReminder(accessToken, {
        drugName: form.drugName,
        sig: form.sig || undefined,
        reminderTimes: [form.time],
        reminderDays: form.days,
      });
      setShowAddForm(false);
      setForm({ drugName: '', sig: '', time: '08:00', days: ALL_DAYS });
      toast.success('เพิ่มการแจ้งเตือนสำเร็จ');
      fetchData();
    } catch {
      toast.error('ไม่สามารถเพิ่มการแจ้งเตือน');
    }
  };

  const handleToggle = async (id: string) => {
    if (!accessToken) return;
    try {
      const updated = await apiToggleReminder(accessToken, id);
      setReminders((prev) => prev.map((r) => (r.id === id ? updated : r)));
    } catch {
      toast.error('ไม่สามารถเปลี่ยนสถานะ');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('ลบการแจ้งเตือนนี้?') || !accessToken) return;
    try {
      await apiDeleteReminder(accessToken, id);
      setReminders((prev) => prev.filter((r) => r.id !== id));
      toast.success('ลบการแจ้งเตือนสำเร็จ');
    } catch {
      toast.error('ไม่สามารถลบการแจ้งเตือน');
    }
  };

  const handleMarkTaken = async (id: string) => {
    if (!accessToken) return;
    try {
      const updated = await acknowledgeReminder(accessToken, id);
      setReminders((prev) => prev.map((r) => (r.id === id ? updated : r)));
      toast.success('บันทึกการกินยาสำเร็จ');
    } catch {
      toast.error('ไม่สามารถบันทึก');
    }
  };

  const adherenceRate = stats?.adherenceRate ?? 0;

  return (
    <div className="pb-24">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/profile" className="rounded-full p-1 hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold">การแจ้งเตือนกินยา</h1>
            <p className="text-xs text-muted-foreground">{reminders.length} รายการ</p>
          </div>
        </div>
        <Button size="sm" onClick={() => setShowAddForm(true)}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Adherence Summary */}
          <div className="mx-4 mb-4 rounded-xl bg-gradient-to-br from-primary to-emerald-700 p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-100">ความสม่ำเสมอเฉลี่ย</p>
                <p className="text-3xl font-bold">{adherenceRate}%</p>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20">
                <CheckCircle className="h-7 w-7" />
              </div>
            </div>
            <Progress value={adherenceRate} className="mt-3 bg-white/20" />
            <p className="mt-2 text-xs text-emerald-200">
              {adherenceRate >= 80 ? 'ยอดเยี่ยม! คุณกินยาตามเวลาสม่ำเสมอ' : 'พยายามกินยาให้ตรงเวลาขึ้นนะคะ'}
            </p>
          </div>

          <div className="space-y-3 px-4">
            {/* Add Form */}
            {showAddForm && (
              <div className="rounded-xl border p-4 space-y-3">
                <h2 className="font-semibold text-sm">เพิ่มการแจ้งเตือน</h2>
                <input
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  placeholder="ชื่อยา"
                  value={form.drugName}
                  onChange={(e) => setForm((f) => ({ ...f, drugName: e.target.value }))}
                />
                <input
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  placeholder="วิธีใช้ เช่น 1 เม็ด หลังอาหาร"
                  value={form.sig}
                  onChange={(e) => setForm((f) => ({ ...f, sig: e.target.value }))}
                />
                <input
                  type="time"
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  value={form.time}
                  onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                />
                <div>
                  <p className="text-xs text-muted-foreground mb-1">วัน</p>
                  <div className="flex gap-1">
                    {ALL_DAYS.map((d) => (
                      <button
                        key={d}
                        onClick={() => toggleDay(d)}
                        className={`h-8 w-8 rounded-full text-xs font-medium ${
                          form.days.includes(d) ? 'bg-primary text-white' : 'bg-muted'
                        }`}
                      >
                        {DAY_LABELS[d]}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAdd} className="flex-1">
                    บันทึก
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowAddForm(false)} className="flex-1">
                    ยกเลิก
                  </Button>
                </div>
              </div>
            )}

        {/* Reminder List */}
        {reminders.map((reminder) => {
          const dayLabels = (reminder.reminderDays ?? ALL_DAYS)
            .map((d) => DAY_LABELS[d] ?? d)
            .join(' ');
          const timeStr = (reminder.reminderTimes ?? []).join(', ') || '—';
          const adherence = parseFloat(reminder.weeklyAdherence ?? '0');
          const confirmedToday =
            reminder.lastConfirmedAt &&
            new Date(reminder.lastConfirmedAt).toDateString() === new Date().toDateString();

          return (
            <div key={reminder.id} className="rounded-xl border p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Pill className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{reminder.drugName}</p>
                    {reminder.sig && (
                      <p className="text-xs text-muted-foreground">{reminder.sig}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs">{timeStr}</span>
                      <span className="text-xs text-muted-foreground">{dayLabels}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggle(reminder.id)}
                    className={`h-6 w-11 rounded-full transition-colors ${
                      reminder.isActive ? 'bg-primary' : 'bg-muted-foreground/30'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                        reminder.isActive ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Adherence & Actions */}
              <div className="mt-3 pt-3 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">ความสม่ำเสมอ</p>
                    <div className="flex items-center gap-2">
                      <Progress value={adherence} className="w-24 h-2" />
                      <span className="text-xs font-medium">{Math.round(adherence)}%</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {confirmedToday ? (
                      <Badge variant="success">กินแล้ววันนี้</Badge>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => handleMarkTaken(reminder.id)}>
                        <CheckCircle className="h-3 w-3 mr-1" />
                        กินแล้ว
                      </Button>
                    )}
                    <button
                      onClick={() => handleDelete(reminder.id)}
                      className="p-1.5 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {reminders.length === 0 && !showAddForm && (
          <div className="rounded-xl border border-dashed p-8 text-center">
            <Bell className="mx-auto h-8 w-8 text-muted-foreground/30" />
            <p className="mt-2 text-sm text-muted-foreground">ยังไม่มีการแจ้งเตือน</p>
            <p className="text-xs text-muted-foreground">กด + เพื่อเพิ่ม</p>
          </div>
        )}
          </div>
        </>
      )}
    </div>
  );
}
