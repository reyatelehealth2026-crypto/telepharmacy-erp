'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  User,
  AlertTriangle,
  Heart,
  Pill,
  ClipboardList,
  Loader2,
  Phone,
  MapPin,
  Calendar,
  Bell,
  Star,
  Send,
} from 'lucide-react';
import { useApi } from '@/lib/use-api';
import { cn } from '@/lib/utils';

interface Allergy {
  id: string;
  drugName: string;
  severity: string;
  reactionType: string | null;
  symptoms: string | null;
  source: string | null;
  createdAt: string;
}

interface ChronicDisease {
  id: string;
  diseaseName: string;
  icd10Code: string | null;
  status: string;
  diagnosedDate: string | null;
  hospital: string | null;
}

interface Medication {
  id: string;
  drugName: string;
  genericName: string | null;
  strength: string | null;
  dosageForm: string | null;
  sig: string | null;
  duration: string | null;
  isCurrent: boolean;
}

interface PatientProfile {
  id: string;
  patientNo: string;
  firstName: string;
  lastName: string;
  title: string | null;
  birthDate: string | null;
  age: number | null;
  gender: string | null;
  phone: string | null;
  email: string | null;
  weight: string | null;
  height: string | null;
  bloodType: string | null;
  address: string | null;
  subDistrict: string | null;
  district: string | null;
  province: string;
  postalCode: string | null;
  isPregnant: boolean;
  isBreastfeeding: boolean;
  smoking: string | null;
  alcohol: string | null;
  insuranceType: string | null;
  lineUserId: string | null;
  pdpaConsentAt: string | null;
  createdAt: string;
  allergies: Allergy[];
  chronicDiseases: ChronicDisease[];
  currentMedications: Medication[];
}

interface RxItem {
  id: string;
  rxNo: string;
  status: string;
  aiPriority: string;
  source: string;
  createdAt: string;
  verifiedAt: string | null;
}

const SEVERITY_BADGE: Record<string, string> = {
  mild: 'bg-yellow-100 text-yellow-700',
  moderate: 'bg-orange-100 text-orange-700',
  severe: 'bg-red-100 text-red-700',
  life_threatening: 'bg-red-200 text-red-900',
};

const RX_STATUS_LABEL: Record<string, string> = {
  received: 'รับแล้ว',
  ai_processing: 'AI วิเคราะห์',
  ai_completed: 'รอเภสัชกร',
  pharmacist_reviewing: 'กำลังตรวจ',
  approved: 'อนุมัติ',
  rejected: 'ปฏิเสธ',
  partial: 'บางส่วน',
  dispensing: 'กำลังจ่ายยา',
  dispensed: 'จ่ายยาแล้ว',
  counseling: 'ให้คำปรึกษา',
  counseling_completed: 'ปรึกษาเสร็จ',
  shipped: 'จัดส่งแล้ว',
  delivered: 'ส่งถึงแล้ว',
  cancelled: 'ยกเลิก',
};

export default function PatientDetailPage() {
  const params = useParams();
  const patientId = params.id as string;

  const { data: patient, isLoading } = useApi<PatientProfile>(
    `/v1/staff/patients/${patientId}`,
  );
  const { data: rxData } = useApi<{ data: RxItem[] }>(
    patientId ? `/v1/prescriptions?patientId=${patientId}&limit=20` : null,
  );

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-2">
        <p className="text-muted-foreground">ไม่พบข้อมูลลูกค้า</p>
        <Link href="/dashboard/patients" className="text-sm text-primary underline">กลับ</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/patients"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">
            {patient.title ? `${patient.title}. ` : ''}
            {patient.firstName} {patient.lastName}
          </h1>
          <p className="text-sm text-muted-foreground">
            {patient.patientNo} · สมัคร {new Date(patient.createdAt).toLocaleDateString('th-TH')}
          </p>
        </div>
        {(patient.isPregnant || patient.isBreastfeeding) && (
          <div className="flex gap-1">
            {patient.isPregnant && (
              <span className="rounded-full bg-pink-100 px-2.5 py-1 text-xs font-medium text-pink-700">ตั้งครรภ์</span>
            )}
            {patient.isBreastfeeding && (
              <span className="rounded-full bg-purple-100 px-2.5 py-1 text-xs font-medium text-purple-700">ให้นมบุตร</span>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Column 1: Personal Info */}
        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
              <User className="h-4 w-4" /> ข้อมูลส่วนตัว
            </h3>
            <dl className="space-y-2 text-sm">
              {[
                { label: 'อายุ', value: patient.age ? `${patient.age} ปี` : '-' },
                { label: 'เพศ', value: patient.gender === 'male' ? 'ชาย' : patient.gender === 'female' ? 'หญิง' : patient.gender ?? '-' },
                { label: 'กรุ๊ปเลือด', value: patient.bloodType ?? '-' },
                { label: 'น้ำหนัก', value: patient.weight ? `${patient.weight} kg` : '-' },
                { label: 'ส่วนสูง', value: patient.height ? `${patient.height} cm` : '-' },
                { label: 'สิทธิ์ประกัน', value: patient.insuranceType ?? '-' },
              ].map((item) => (
                <div key={item.label} className="flex justify-between">
                  <dt className="text-muted-foreground">{item.label}</dt>
                  <dd className="font-medium">{item.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
              <Phone className="h-4 w-4" /> ข้อมูลติดต่อ
            </h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">โทรศัพท์</dt>
                <dd className="font-medium">{patient.phone ?? '-'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">อีเมล</dt>
                <dd className="font-medium">{patient.email ?? '-'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">LINE</dt>
                <dd className="font-medium">{patient.lineUserId ? 'เชื่อมแล้ว' : 'ไม่มี'}</dd>
              </div>
            </dl>
            {patient.address && (
              <div className="mt-3 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                <MapPin className="mb-1 inline h-3 w-3" /> {patient.address}, {patient.subDistrict}, {patient.district}, {patient.province} {patient.postalCode}
              </div>
            )}
          </div>

          {patient.pdpaConsentAt && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-xs text-green-700">
              PDPA ยินยอมเมื่อ {new Date(patient.pdpaConsentAt).toLocaleDateString('th-TH')}
            </div>
          )}
        </div>

        {/* Column 2: Clinical Profile */}
        <div className="space-y-4">
          {/* Allergies */}
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-red-600">
              <AlertTriangle className="h-4 w-4" /> แพ้ยา ({patient.allergies.length})
            </h3>
            {patient.allergies.length > 0 ? (
              <div className="space-y-2">
                {patient.allergies.map((a) => (
                  <div key={a.id} className="rounded-lg border border-red-100 bg-red-50/50 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{a.drugName}</span>
                      <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', SEVERITY_BADGE[a.severity] ?? 'bg-muted')}>
                        {a.severity}
                      </span>
                    </div>
                    {a.symptoms && <p className="mt-1 text-xs text-muted-foreground">อาการ: {a.symptoms}</p>}
                    {a.source && <p className="text-xs text-muted-foreground">แหล่งข้อมูล: {a.source}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">ไม่มีประวัติแพ้ยา</p>
            )}
          </div>

          {/* Chronic Diseases */}
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
              <Heart className="h-4 w-4" /> โรคประจำตัว ({patient.chronicDiseases.length})
            </h3>
            {patient.chronicDiseases.length > 0 ? (
              <div className="space-y-2">
                {patient.chronicDiseases.map((d) => (
                  <div key={d.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{d.diseaseName}</span>
                      <span className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-medium',
                        d.status === 'active' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700',
                      )}>
                        {d.status}
                      </span>
                    </div>
                    {d.icd10Code && <p className="text-xs text-muted-foreground">ICD-10: {d.icd10Code}</p>}
                    {d.hospital && <p className="text-xs text-muted-foreground">รพ.: {d.hospital}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">ไม่มี</p>
            )}
          </div>

          {/* Current Medications */}
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
              <Pill className="h-4 w-4" /> ยาที่ใช้อยู่ ({patient.currentMedications.length})
            </h3>
            {patient.currentMedications.length > 0 ? (
              <div className="space-y-2">
                {patient.currentMedications.map((m) => (
                  <div key={m.id} className="rounded-lg border p-3">
                    <p className="text-sm font-medium">{m.drugName}</p>
                    <p className="text-xs text-muted-foreground">
                      {[m.strength, m.dosageForm].filter(Boolean).join(' · ')}
                    </p>
                    {m.sig && <p className="text-xs text-muted-foreground">Sig: {m.sig}</p>}
                    {m.duration && <p className="text-xs text-muted-foreground">ระยะเวลา: {m.duration}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">ไม่มี</p>
            )}
          </div>
        </div>

        {/* Column 3: Prescription History + Adherence + Loyalty */}
        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
              <ClipboardList className="h-4 w-4" /> ประวัติใบสั่งยา
            </h3>
            {rxData?.data && rxData.data.length > 0 ? (
              <div className="space-y-2">
                {rxData.data.map((rx) => (
                  <Link
                    key={rx.id}
                    href={`/dashboard/pharmacist/${rx.id}`}
                    className="block rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-medium">{rx.rxNo}</span>
                      <span className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-medium',
                        rx.status === 'approved' && 'bg-green-100 text-green-700',
                        rx.status === 'rejected' && 'bg-red-100 text-red-700',
                        (rx.status === 'received' || rx.status === 'ai_completed') && 'bg-amber-100 text-amber-700',
                      )}>
                        {RX_STATUS_LABEL[rx.status] ?? rx.status}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {new Date(rx.createdAt).toLocaleDateString('th-TH')}
                      <span className="capitalize">· {rx.source}</span>
                      <span className="capitalize">· {rx.aiPriority}</span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">ยังไม่มีใบสั่งยา</p>
            )}
          </div>

          {/* Adherence Stats */}
          <AdherenceCard patientId={patientId} />

          {/* Loyalty */}
          <LoyaltyCard patientId={patientId} />
        </div>
      </div>
    </div>
  );
}

function AdherenceCard({ patientId }: { patientId: string }) {
  const { data: stats } = useApi<{ totalReminders: number; activeReminders: number; adherenceRate: number; takenCount: number; missedCount: number; streak: number }>(`/v1/staff/adherence/stats/${patientId}`);
  const { data: reminders } = useApi<{ id: string; drugName: string; isActive: boolean; times: string[] }[]>(`/v1/staff/adherence/reminders?patientId=${patientId}&limit=10`);

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold"><Bell className="h-4 w-4" /> Adherence</h3>
      {stats && (
        <div className="mb-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-muted/50 p-2"><p className="text-lg font-bold">{Math.round(stats.adherenceRate)}%</p><p className="text-xs text-muted-foreground">อัตราทานยา</p></div>
          <div className="rounded-lg bg-muted/50 p-2"><p className="text-lg font-bold">{stats.streak}</p><p className="text-xs text-muted-foreground">Streak</p></div>
          <div className="rounded-lg bg-muted/50 p-2"><p className="text-lg font-bold">{stats.activeReminders}</p><p className="text-xs text-muted-foreground">Active</p></div>
        </div>
      )}
      {reminders && Array.isArray(reminders) && reminders.length > 0 && (
        <div className="space-y-1">
          {reminders.slice(0, 5).map(r => (
            <div key={r.id} className="flex items-center justify-between rounded-lg border p-2 text-xs">
              <span className="font-medium">{r.drugName}</span>
              <span className={cn('rounded-full px-2 py-0.5', r.isActive ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground')}>{r.isActive ? 'Active' : 'Off'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LoyaltyCard({ patientId }: { patientId: string }) {
  const { data: loyalty } = useApi<{ points: number; tier: string; lifetimePoints: number }>(`/v1/staff/loyalty/${patientId}`);
  const [adjusting, setAdjusting] = useState(false);

  async function handleAdjust() {
    const input = prompt('จำนวนแต้ม (+ เพิ่ม, - ลด):');
    if (!input) return;
    const reason = prompt('เหตุผล:');
    if (!reason) return;
    setAdjusting(true);
    try {
      const { api } = await import('@/lib/api-client');
      await api.post(`/v1/staff/loyalty/${patientId}/adjust`, { points: parseInt(input), reason });
      window.location.reload();
    } catch (e: any) { alert(e.message); }
    finally { setAdjusting(false); }
  }

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold"><Star className="h-4 w-4" /> Loyalty</h3>
      {loyalty && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">แต้มปัจจุบัน</span><span className="font-bold">{loyalty.points?.toLocaleString() ?? 0}</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Tier</span><span className="font-medium capitalize">{loyalty.tier ?? '-'}</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">แต้มสะสมตลอด</span><span>{loyalty.lifetimePoints?.toLocaleString() ?? 0}</span></div>
          <button onClick={handleAdjust} disabled={adjusting} className="mt-2 w-full rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50">
            ปรับแต้ม
          </button>
        </div>
      )}
    </div>
  );
}