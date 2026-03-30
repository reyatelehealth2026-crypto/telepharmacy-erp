'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Bell,
  Clock,
  Plus,
  Trash2,
  CheckCircle,
  Pill,
  Calendar,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuthStore } from '@/store/auth';
import { toast } from 'sonner';

interface Reminder {
  id: string;
  medicationName: string;
  dosage: string;
  time: string;
  days: string[];
  isActive: boolean;
  lastTaken: string | null;
  adherence: number;
}

export default function MedicationRemindersPage() {
  const router = useRouter();
  const { accessToken } = useAuthStore();
  const [reminders, setReminders] = useState<Reminder[]>([
    {
      id: '1',
      medicationName: 'Metformin 500mg',
      dosage: '1 เม็ด หลังอาหาร',
      time: '08:00',
      days: ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'],
      isActive: true,
      lastTaken: new Date().toISOString(),
      adherence: 92,
    },
    {
      id: '2',
      medicationName: 'Amlodipine 5mg',
      dosage: '1 เม็ด เช้า',
      time: '07:00',
      days: ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'],
      isActive: true,
      lastTaken: new Date(Date.now() - 86400000).toISOString(),
      adherence: 85,
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({
    medicationName: '',
    dosage: '',
    time: '08:00',
    days: ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'] as string[],
  });

  const daysTh = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'];

  const toggleDay = (day: string) => {
    setForm((f) => ({
      ...f,
      days: f.days.includes(day) ? f.days.filter((d) => d !== day) : [...f.days, day],
    }));
  };

  const handleAdd = () => {
    if (!form.medicationName || !form.time) {
      toast.error('กรุณากรอกชื่อยาและเวลา');
      return;
    }
    const newReminder: Reminder = {
      id: Date.now().toString(),
      medicationName: form.medicationName,
      dosage: form.dosage,
      time: form.time,
      days: form.days,
      isActive: true,
      lastTaken: null,
      adherence: 100,
    };
    setReminders((prev) => [...prev, newReminder]);
    setShowAddForm(false);
    setForm({ medicationName: '', dosage: '', time: '08:00', days: daysTh });
    toast.success('เพิ่มการแจ้งเตือนสำเร็จ');
  };

  const toggleReminder = (id: string) => {
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isActive: !r.isActive } : r))
    );
  };

  const deleteReminder = (id: string) => {
    if (confirm('ลบการแจ้งเตือนนี้?')) {
      setReminders((prev) => prev.filter((r) => r.id !== id));
    }
  };

  const markTaken = (id: string) => {
    setReminders((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, lastTaken: new Date().toISOString(), adherence: Math.min(r.adherence + 2, 100) } : r
      )
    );
    toast.success('บันทึกการกินยาสำเร็จ');
  };

  const avgAdherence = reminders.length > 0
    ? Math.round(reminders.reduce((sum, r) => sum + r.adherence, 0) / reminders.length)
    : 0;

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

      {/* Adherence Summary */}
      <div className="mx-4 mb-4 rounded-xl bg-gradient-to-br from-primary to-emerald-700 p-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-emerald-100">ความสม่ำเสมอเฉลี่ย</p>
            <p className="text-3xl font-bold">{avgAdherence}%</p>
          </div>
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20">
            <CheckCircle className="h-7 w-7" />
          </div>
        </div>
        <Progress value={avgAdherence} className="mt-3 bg-white/20" />
        <p className="mt-2 text-xs text-emerald-200">
          {avgAdherence >= 80 ? 'ยอดเยี่ยม! คุณกินยาตามเวลาสม่ำเสมอ' : 'พยายามกินยาให้ตรงเวลาขึ้นนะคะ'}
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
              value={form.medicationName}
              onChange={(e) => setForm((f) => ({ ...f, medicationName: e.target.value }))}
            />
            <input
              className="w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="วิธีใช้ เช่น 1 เม็ด หลังอาหาร"
              value={form.dosage}
              onChange={(e) => setForm((f) => ({ ...f, dosage: e.target.value }))}
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
                {daysTh.map((d) => (
                  <button
                    key={d}
                    onClick={() => toggleDay(d)}
                    className={`h-8 w-8 rounded-full text-xs font-medium ${
                      form.days.includes(d) ? 'bg-primary text-white' : 'bg-muted'
                    }`}
                  >
                    {d}
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
        {reminders.map((reminder) => (
          <div key={reminder.id} className="rounded-xl border p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Pill className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">{reminder.medicationName}</p>
                  <p className="text-xs text-muted-foreground">{reminder.dosage}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs">{reminder.time}</span>
                    <span className="text-xs text-muted-foreground">
                      {reminder.days.join(' ')}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleReminder(reminder.id)}
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
                    <Progress value={reminder.adherence} className="w-24 h-2" />
                    <span className="text-xs font-medium">{reminder.adherence}%</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {reminder.lastTaken &&
                    new Date(reminder.lastTaken).toDateString() === new Date().toDateString() ? (
                    <Badge variant="success">กินแล้ววันนี้</Badge>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => markTaken(reminder.id)}>
                      <CheckCircle className="h-3 w-3 mr-1" />
                      กินแล้ว
                    </Button>
                  )}
                  <button
                    onClick={() => deleteReminder(reminder.id)}
                    className="p-1.5 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}

        {reminders.length === 0 && !showAddForm && (
          <div className="rounded-xl border border-dashed p-8 text-center">
            <Bell className="mx-auto h-8 w-8 text-muted-foreground/30" />
            <p className="mt-2 text-sm text-muted-foreground">ยังไม่มีการแจ้งเตือน</p>
            <p className="text-xs text-muted-foreground">กด + เพื่อเพิ่ม</p>
          </div>
        )}
      </div>
    </div>
  );
}
