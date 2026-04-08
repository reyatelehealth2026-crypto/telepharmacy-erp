'use client';

import Link from 'next/link';
import {
  Heart,
  Pill,
  Shield,
  Bell,
  Star,
  ChevronRight,
  LogOut,
  FileText,
  Stethoscope,
  Clock,
  Loader2,
  User,
  Pencil,
  Phone,
  Calendar,
  MapPin,
  BadgeCheck,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth';
import { useAuthGuard } from '@/lib/use-auth-guard';
import { getMyProfile, getMyAllergies, getMyDiseases, getMyMedications } from '@/lib/patient';
import type { PatientProfile } from '@/lib/patient';
import { getMyOrders } from '@/lib/orders';
import { getMyPrescriptions } from '@/lib/prescriptions';

const TIER_EMOJI: Record<string, string> = {
  bronze: '🥉',
  silver: '🥈',
  gold: '🥇',
  platinum: '💎',
};

const GENDER_LABEL: Record<string, string> = {
  male: 'ชาย',
  female: 'หญิง',
  other: 'อื่นๆ',
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatAddress(profile: PatientProfile): string | null {
  const parts = [
    profile.address,
    profile.subDistrict,
    profile.district,
    profile.province,
    profile.postalCode,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : null;
}

export default function ProfilePage() {
  const { loading: authLoading } = useAuthGuard();
  const { accessToken, patient, clearAuth } = useAuthStore();
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [counts, setCounts] = useState({ allergies: 0, medications: 0, diseases: 0, orders: 0, prescriptions: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) return;

    Promise.allSettled([
      getMyProfile(accessToken),
      getMyAllergies(accessToken),
      getMyDiseases(accessToken),
      getMyMedications(accessToken, true),
      getMyOrders(accessToken, 1, 1),
      getMyPrescriptions(accessToken, 1, 1),
    ]).then(([profileRes, allergiesRes, diseasesRes, medsRes, ordersRes, rxRes]) => {
      if (profileRes.status === 'fulfilled') setProfile(profileRes.value);
      setCounts({
        allergies: allergiesRes.status === 'fulfilled' ? allergiesRes.value.length : 0,
        diseases: diseasesRes.status === 'fulfilled' ? diseasesRes.value.length : 0,
        medications: medsRes.status === 'fulfilled' ? medsRes.value.length : 0,
        orders: ordersRes.status === 'fulfilled' ? (ordersRes.value.meta?.total ?? ordersRes.value.data?.length ?? 0) : 0,
        prescriptions: rxRes.status === 'fulfilled' ? (rxRes.value.meta?.total ?? rxRes.value.data?.length ?? 0) : 0,
      });
    }).finally(() => setLoading(false));
  }, [accessToken]);

  const displayName = profile
    ? `${profile.firstName} ${profile.lastName}`
    : patient
      ? `${patient.firstName} ${patient.lastName}`
      : 'ผู้ใช้งาน';

  const patientNo = profile?.patientNo ?? patient?.patientNo ?? '-';
  const loyaltyPoints = profile?.loyaltyPoints ?? 0;
  const tier = (profile?.loyaltyTier ?? 'bronze').toLowerCase();
  const dob = profile?.birthDate ?? profile?.dateOfBirth ?? null;
  const gender = profile?.gender ?? null;
  const phone = profile?.phone ?? null;
  const addressStr = profile ? formatAddress(profile) : null;

  const menuItems = [
    {
      href: '/profile/allergies',
      icon: Heart,
      label: 'ประวัติแพ้ยา',
      badge: counts.allergies > 0 ? `${counts.allergies} รายการ` : undefined,
      color: 'text-red-500',
    },
    {
      href: '/profile/medications',
      icon: Pill,
      label: 'ยาที่กินอยู่',
      badge: counts.medications > 0 ? `${counts.medications} รายการ` : undefined,
      color: 'text-blue-500',
    },
    {
      href: '/profile/diseases',
      icon: Stethoscope,
      label: 'โรคประจำตัว',
      badge: counts.diseases > 0 ? `${counts.diseases} รายการ` : undefined,
      color: 'text-purple-500',
    },
    { href: '/rx', icon: FileText, label: 'ใบสั่งยาของฉัน', badge: counts.prescriptions > 0 ? `${counts.prescriptions} รายการ` : undefined, color: 'text-green-500' },
    { href: '/orders', icon: Clock, label: 'ประวัติสั่งซื้อ', badge: counts.orders > 0 ? `${counts.orders} รายการ` : undefined, color: 'text-amber-500' },
    {
      href: '/profile/loyalty',
      icon: Star,
      label: 'แต้มสะสม',
      badge: loyaltyPoints > 0 ? `${(loyaltyPoints ?? 0).toLocaleString()} แต้ม` : undefined,
      color: 'text-yellow-500',
    },
    { href: '/profile/kyc', icon: BadgeCheck, label: 'ยืนยันตัวตน (KYC)', color: 'text-teal-500' },
    { href: '/profile/notifications', icon: Bell, label: 'ตั้งค่าการแจ้งเตือน', color: 'text-indigo-500' },
    { href: '/notifications', icon: Bell, label: 'ประวัติการแจ้งเตือน', color: 'text-indigo-500' },
    { href: '/profile/pdpa', icon: Shield, label: 'ความเป็นส่วนตัว (PDPA)', color: 'text-gray-500' },
  ];

  if (authLoading) return <div className="flex items-center justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="pb-4">
      {/* Profile Header */}
      <div className="bg-gradient-to-br from-primary to-emerald-700 px-4 py-6 text-white">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-2xl">
            {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <User className="h-8 w-8" />}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold">{displayName}</h1>
            <p className="text-sm text-emerald-100">{patientNo}</p>
            <div className="mt-1 flex items-center gap-2">
              <Badge className="bg-white/20 text-white border-0">
                <Star className="mr-1 h-3 w-3" />
                {TIER_EMOJI[tier]} {tier.charAt(0).toUpperCase() + tier.slice(1)}
              </Badge>
              {loyaltyPoints > 0 && (
                <span className="text-xs text-emerald-200">{(loyaltyPoints ?? 0).toLocaleString()} แต้ม</span>
              )}
            </div>
          </div>
          <Link
            href="/profile/edit"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          >
            <Pencil className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Personal Info Section */}
      {!loading && profile && (
        <div className="mx-4 -mt-4 rounded-xl bg-white p-4 shadow-sm border space-y-2">
          {dob && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">วันเกิด:</span>
              <span>{formatDate(dob)}</span>
              {profile.age != null && (
                <span className="text-muted-foreground">({profile.age} ปี)</span>
              )}
            </div>
          )}
          {gender && (
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">เพศ:</span>
              <span>{GENDER_LABEL[gender] ?? gender}</span>
            </div>
          )}
          {phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">โทรศัพท์:</span>
              <span>{phone}</span>
            </div>
          )}
          {addressStr && (
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <span className="text-muted-foreground shrink-0">ที่อยู่:</span>
              <span className="line-clamp-2">{addressStr}</span>
            </div>
          )}
          {!dob && !gender && !phone && !addressStr && (
            <Link href="/profile/edit" className="flex items-center gap-2 text-sm text-primary">
              <Pencil className="h-4 w-4" />
              เพิ่มข้อมูลส่วนตัว
            </Link>
          )}
        </div>
      )}

      {/* Quick Stats */}
      <div className={`grid grid-cols-3 gap-3 px-4 ${!loading && profile && (dob || gender || phone || addressStr) ? 'mt-3' : '-mt-4'}`}>
        <div className="rounded-xl bg-white p-3 text-center shadow-sm border">
          <p className="text-lg font-bold text-primary">-</p>
          <p className="text-xs text-muted-foreground">ออเดอร์</p>
        </div>
        <div className="rounded-xl bg-white p-3 text-center shadow-sm border">
          <p className="text-lg font-bold text-primary">-</p>
          <p className="text-xs text-muted-foreground">ใบสั่งยา</p>
        </div>
        <div className="rounded-xl bg-white p-3 text-center shadow-sm border">
          <p className="text-lg font-bold text-primary">{loyaltyPoints > 0 ? `${(loyaltyPoints / 100).toFixed(0)}K` : '-'}</p>
          <p className="text-xs text-muted-foreground">แต้ม</p>
        </div>
      </div>

      {/* Allergy Alert */}
      {counts.allergies > 0 && (
        <Link href="/profile/allergies" className="mx-4 mt-4 block rounded-xl border border-red-200 bg-red-50 p-3 hover:bg-red-100 transition-colors">
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-red-500" />
            <span className="text-sm font-bold text-red-800">แพ้ยา {counts.allergies} รายการ</span>
            <ChevronRight className="ml-auto h-4 w-4 text-red-400" />
          </div>
          <p className="mt-1 text-xs text-red-700">กดเพื่อดูรายละเอียด</p>
        </Link>
      )}

      {/* Menu */}
      <div className="mt-4 space-y-1 px-4">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-muted"
          >
            <item.icon className={`h-5 w-5 ${item.color}`} />
            <span className="flex-1 text-sm font-medium">{item.label}</span>
            {item.badge && (
              <span className="text-xs text-muted-foreground">{item.badge}</span>
            )}
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        ))}
      </div>

      {/* Logout */}
      <div className="mt-4 px-4">
        <Button
          variant="ghost"
          className="w-full text-destructive hover:text-destructive"
          onClick={() => clearAuth()}
        >
          <LogOut className="h-4 w-4" />
          ออกจากระบบ
        </Button>
      </div>
    </div>
  );
}
