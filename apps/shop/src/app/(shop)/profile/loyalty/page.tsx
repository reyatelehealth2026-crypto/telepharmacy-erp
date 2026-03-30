'use client';

import Link from 'next/link';
import { ArrowLeft, Star, Gift, TrendingUp, Clock, ChevronRight, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth';
import { getMyProfile } from '@/lib/patient';
import type { PatientProfile } from '@/lib/patient';

const TIER_CONFIG: Record<string, { label: string; color: string; bg: string; next: string; nextAt: number }> = {
  bronze: { label: 'Bronze', color: 'text-amber-700', bg: 'bg-amber-100', next: 'Silver', nextAt: 1000 },
  silver: { label: 'Silver', color: 'text-slate-600', bg: 'bg-slate-100', next: 'Gold', nextAt: 5000 },
  gold: { label: 'Gold', color: 'text-yellow-600', bg: 'bg-yellow-100', next: 'Platinum', nextAt: 10000 },
  platinum: { label: 'Platinum', color: 'text-purple-600', bg: 'bg-purple-100', next: '', nextAt: 0 },
};

const mockHistory = [
  { id: '1', type: 'earn' as const, points: 120, description: 'สั่งซื้อ #ORD-0042', createdAt: '2026-03-28T10:00:00Z' },
  { id: '2', type: 'earn' as const, points: 85, description: 'สั่งซื้อ #ORD-0039', createdAt: '2026-03-20T14:30:00Z' },
  { id: '3', type: 'redeem' as const, points: -200, description: 'แลกส่วนลด ฿20', createdAt: '2026-03-15T09:15:00Z' },
  { id: '4', type: 'earn' as const, points: 50, description: 'โบนัสสมัครสมาชิก', createdAt: '2026-03-01T00:00:00Z' },
];

export default function LoyaltyPage() {
  const { accessToken } = useAuthStore();
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) { setLoading(false); return; }
    getMyProfile(accessToken)
      .then(setProfile)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [accessToken]);

  const points = profile?.loyaltyPoints ?? 2450;
  const tier = (profile?.loyaltyTier ?? 'silver').toLowerCase();
  const tierConfig = TIER_CONFIG[tier] ?? TIER_CONFIG.silver!;
  const progressPct = tierConfig.nextAt > 0 ? Math.min((points / tierConfig.nextAt) * 100, 100) : 100;

  return (
    <div className="pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <Link href="/profile" className="rounded-full p-1 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold">แต้มสะสม</h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Points Card */}
          <div className="mx-4 rounded-2xl bg-gradient-to-br from-primary to-emerald-700 p-5 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-100">แต้มสะสมของคุณ</p>
                <p className="mt-1 text-4xl font-bold">{points.toLocaleString()}</p>
                <p className="text-sm text-emerald-200">แต้ม</p>
              </div>
              <div className={`flex h-16 w-16 items-center justify-center rounded-full ${tierConfig.bg}`}>
                <Star className={`h-8 w-8 ${tierConfig.color}`} />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-emerald-200 mb-1">
                <span>ระดับ {tierConfig.label}</span>
                {tierConfig.next && <span>ต้องการ {tierConfig.nextAt.toLocaleString()} แต้ม → {tierConfig.next}</span>}
              </div>
              <div className="h-2 rounded-full bg-white/20">
                <div
                  className="h-2 rounded-full bg-white transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Tier Benefits */}
          <div className="mx-4 mt-4 rounded-xl border p-4">
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Gift className="h-4 w-4 text-primary" />
              สิทธิประโยชน์ระดับ {tierConfig.label}
            </h2>
            <div className="space-y-2">
              {tier === 'bronze' && (
                <>
                  <p className="text-sm text-muted-foreground">• สะสม 1 แต้ม ทุก ฿10 ที่ซื้อ</p>
                  <p className="text-sm text-muted-foreground">• แลก 100 แต้ม = ส่วนลด ฿10</p>
                </>
              )}
              {tier === 'silver' && (
                <>
                  <p className="text-sm text-muted-foreground">• สะสม 1.5 แต้ม ทุก ฿10 ที่ซื้อ</p>
                  <p className="text-sm text-muted-foreground">• แลก 100 แต้ม = ส่วนลด ฿12</p>
                  <p className="text-sm text-muted-foreground">• ส่งฟรีเมื่อซื้อครบ ฿300</p>
                </>
              )}
              {tier === 'gold' && (
                <>
                  <p className="text-sm text-muted-foreground">• สะสม 2 แต้ม ทุก ฿10 ที่ซื้อ</p>
                  <p className="text-sm text-muted-foreground">• แลก 100 แต้ม = ส่วนลด ฿15</p>
                  <p className="text-sm text-muted-foreground">• ส่งฟรีทุกออเดอร์</p>
                  <p className="text-sm text-muted-foreground">• ปรึกษาเภสัชกรฟรีไม่จำกัด</p>
                </>
              )}
              {tier === 'platinum' && (
                <>
                  <p className="text-sm text-muted-foreground">• สะสม 3 แต้ม ทุก ฿10 ที่ซื้อ</p>
                  <p className="text-sm text-muted-foreground">• แลก 100 แต้ม = ส่วนลด ฿20</p>
                  <p className="text-sm text-muted-foreground">• ส่งฟรีทุกออเดอร์ + บริการด่วน</p>
                  <p className="text-sm text-muted-foreground">• เภสัชกรประจำตัว</p>
                </>
              )}
            </div>
          </div>

          {/* How to Earn */}
          <div className="mx-4 mt-4 rounded-xl border p-4">
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              วิธีสะสมแต้ม
            </h2>
            <div className="space-y-2">
              {[
                { label: 'ซื้อสินค้า', pts: '1 แต้ม / ฿10' },
                { label: 'รีวิวสินค้า', pts: '+10 แต้ม' },
                { label: 'แนะนำเพื่อน', pts: '+100 แต้ม' },
                { label: 'วันเกิด', pts: '+200 แต้ม' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                  <span className="text-sm font-medium text-primary">{item.pts}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Transaction History */}
          <div className="mx-4 mt-4">
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              ประวัติแต้ม
            </h2>
            <div className="space-y-2">
              {mockHistory.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between rounded-xl border p-3">
                  <div>
                    <p className="text-sm font-medium">{tx.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(tx.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <span className={`text-sm font-bold ${tx.points > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {tx.points > 0 ? '+' : ''}{tx.points.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
            <Link
              href="/profile/loyalty/history"
              className="mt-3 flex items-center justify-center gap-1 text-sm text-primary"
            >
              ดูประวัติทั้งหมด
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
