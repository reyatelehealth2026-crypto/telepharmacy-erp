'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Save,
  Loader2,
  User,
  Phone,
  Calendar,
  Ruler,
  Weight,
  Droplets,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/store/auth';
import { useAuthGuard } from '@/lib/use-auth-guard';
import { getMyProfile, updateProfile, type PatientProfile } from '@/lib/patient';
import { toast } from 'sonner';

export default function EditProfilePage() {
  const router = useRouter();
  const { loading: authLoading, token } = useAuthGuard();
  const { accessToken, patient } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    dateOfBirth: '',
    gender: '' as 'male' | 'female' | 'other' | '',
    weight: '',
    height: '',
    bloodType: '',
  });

  useEffect(() => {
    if (!accessToken) return;
    fetchProfile();
  }, [accessToken]);

  const fetchProfile = async () => {
    try {
      const profile = await getMyProfile(accessToken!);
      setForm({
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone ?? '',
        dateOfBirth: profile.dateOfBirth ?? '',
        gender: (profile.gender as any) ?? '',
        weight: profile.weight?.toString() ?? '',
        height: profile.height?.toString() ?? '',
        bloodType: profile.bloodType ?? '',
      });
    } catch {
      toast.error('โหลดข้อมูลไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!accessToken) return;

    setSaving(true);
    try {
      await updateProfile(accessToken, {
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        gender: form.gender || undefined,
        weight: form.weight ? parseFloat(form.weight) : undefined,
        height: form.height ? parseFloat(form.height) : undefined,
        bloodType: form.bloodType || undefined,
      });
      toast.success('บันทึกข้อมูลสำเร็จ');
      router.push('/profile');
    } catch {
      toast.error('บันทึกไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  if (authLoading) return <div className="flex items-center justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="pb-24">
      <div className="flex items-center gap-3 px-4 py-3">
        <Link href="/profile" className="rounded-full p-1 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold">แก้ไขข้อมูลส่วนตัว</h1>
      </div>

      <div className="space-y-4 px-4">
        {/* Profile Photo */}
        <div className="flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-2xl">
            <User className="h-10 w-10 text-primary" />
          </div>
        </div>

        {/* Name */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">ชื่อ</label>
            <div className="mt-1 flex items-center gap-2 rounded-lg border px-3 py-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <input
                className="w-full bg-transparent text-sm outline-none"
                placeholder="ชื่อจริง"
                value={form.firstName}
                onChange={(e) => updateField('firstName', e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">นามสกุล</label>
            <div className="mt-1 flex items-center gap-2 rounded-lg border px-3 py-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <input
                className="w-full bg-transparent text-sm outline-none"
                placeholder="นามสกุล"
                value={form.lastName}
                onChange={(e) => updateField('lastName', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Phone */}
        <div>
          <label className="text-xs font-medium text-muted-foreground">เบอร์โทรศัพท์</label>
          <div className="mt-1 flex items-center gap-2 rounded-lg border px-3 py-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <input
              type="tel"
              className="w-full bg-transparent text-sm outline-none"
              placeholder="08x-xxx-xxxx"
              value={form.phone}
              onChange={(e) => updateField('phone', e.target.value)}
            />
          </div>
        </div>

        {/* Date of Birth */}
        <div>
          <label className="text-xs font-medium text-muted-foreground">วันเกิด</label>
          <div className="mt-1 flex items-center gap-2 rounded-lg border px-3 py-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <input
              type="date"
              className="w-full bg-transparent text-sm outline-none"
              value={form.dateOfBirth}
              onChange={(e) => updateField('dateOfBirth', e.target.value)}
            />
          </div>
        </div>

        {/* Gender */}
        <div>
          <label className="text-xs font-medium text-muted-foreground">เพศ</label>
          <div className="mt-1 flex gap-2">
            {[
              { value: 'male', label: 'ชาย' },
              { value: 'female', label: 'หญิง' },
              { value: 'other', label: 'อื่นๆ' },
            ].map((g) => (
              <button
                key={g.value}
                onClick={() => updateField('gender', g.value)}
                className={`flex-1 rounded-lg border py-2.5 text-sm font-medium transition-colors ${
                  form.gender === g.value
                    ? 'border-primary bg-secondary text-primary'
                    : 'hover:bg-muted'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        {/* Health Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">น้ำหนัก (กก.)</label>
            <div className="mt-1 flex items-center gap-2 rounded-lg border px-3 py-2">
              <Weight className="h-4 w-4 text-muted-foreground" />
              <input
                type="number"
                className="w-full bg-transparent text-sm outline-none"
                placeholder="60"
                value={form.weight}
                onChange={(e) => updateField('weight', e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">ส่วนสูง (ซม.)</label>
            <div className="mt-1 flex items-center gap-2 rounded-lg border px-3 py-2">
              <Ruler className="h-4 w-4 text-muted-foreground" />
              <input
                type="number"
                className="w-full bg-transparent text-sm outline-none"
                placeholder="170"
                value={form.height}
                onChange={(e) => updateField('height', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Blood Type */}
        <div>
          <label className="text-xs font-medium text-muted-foreground">กรุ๊ปเลือด</label>
          <div className="mt-1 flex items-center gap-2 rounded-lg border px-3 py-2">
            <Droplets className="h-4 w-4 text-muted-foreground" />
            <select
              className="w-full bg-transparent text-sm outline-none"
              value={form.bloodType}
              onChange={(e) => updateField('bloodType', e.target.value)}
            >
              <option value="">ไม่ระบุ</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
            </select>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="fixed bottom-16 left-0 right-0 z-40 border-t bg-white p-4">
        <div className="mx-auto max-w-lg">
          <Button className="w-full" size="lg" disabled={saving} onClick={handleSave}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
          </Button>
        </div>
      </div>
    </div>
  );
}
