'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  User,
  Pill,
  ShieldAlert,
  MessageSquare,
  Loader2,
  Send,
} from 'lucide-react';
import { useApi } from '@/lib/use-api';
import { api } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { SLA_MINUTES } from '@/lib/auth-types';
import { useAuth } from '@/lib/auth-context';

// ─── Types ───────────────────────────────────────────────────

interface PrescriptionItem {
  id: string;
  itemNo: number;
  drugName: string;
  strength: string | null;
  dosageForm: string | null;
  quantity: string;
  sig: string | null;
  duration: string | null;
  matchedProductId: string | null;
  matchConfidence: string | null;
  matchStatus: string;
  status: string;
}

interface PrescriptionDetail {
  id: string;
  rxNo: string;
  patientId: string;
  prescriberName: string | null;
  prescriberHospital: string | null;
  source: string;
  diagnosis: string | null;
  images: { imageUrl: string }[];
  ocrStatus: string;
  ocrResult: unknown;
  ocrConfidence: string | null;
  aiChecksPassed: boolean | null;
  aiChecksResult: {
    hasIssues?: boolean;
    overallRisk?: string;
    alerts?: { type: string; severity: string; message: string; recommendation?: string }[];
  } | null;
  aiPriority: string;
  status: string;
  rejectionReason: string | null;
  verifiedBy: string | null;
  verifiedAt: string | null;
  createdAt: string;
  items: PrescriptionItem[];
}

interface PatientProfile {
  id: string;
  patientNo: string;
  firstName: string;
  lastName: string;
  age: number | null;
  gender: string | null;
  phone: string | null;
  weight: string | null;
  isPregnant: boolean;
  isBreastfeeding: boolean;
  allergies: { id: string; drugName: string; severity: string; symptoms: string | null }[];
  chronicDiseases: { id: string; diseaseName: string; icd10Code: string | null; status: string }[];
  currentMedications: { id: string; drugName: string; strength: string | null; sig: string | null }[];
}

// ─── Severity helpers ────────────────────────────────────────

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-800 border-red-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  moderate: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  low: 'bg-blue-100 text-blue-800 border-blue-200',
  info: 'bg-slate-100 text-slate-800 border-slate-200',
};

const INTERVENTION_TYPES = [
  { value: 'drug_interaction', label: 'Drug Interaction' },
  { value: 'allergy_prevented', label: 'แพ้ยา' },
  { value: 'dose_adjustment', label: 'ปรับขนาดยา' },
  { value: 'therapeutic_duplication', label: 'ยาซ้ำซ้อน' },
  { value: 'formulary_substitution', label: 'เปลี่ยนยาตามบัญชี' },
  { value: 'patient_education', label: 'ให้ความรู้ลูกค้า' },
  { value: 'prescriber_contact', label: 'ติดต่อแพทย์' },
  { value: 'other', label: 'อื่นๆ' },
];

const COUNSELING_METHODS = [
  { value: 'video_call', label: 'Video Call' },
  { value: 'voice_call', label: 'Voice Call' },
  { value: 'line_chat', label: 'LINE Chat' },
  { value: 'in_person', label: 'พบตัว' },
];

// ─── Main Page ───────────────────────────────────────────────

export default function PrescriptionReviewPage() {
  const router = useRouter();
  const params = useParams();
  const rxId = params.id as string;

  const { data: rx, isLoading: rxLoading, mutate: mutateRx } =
    useApi<PrescriptionDetail>(`/v1/prescriptions/${rxId}`);
  const { data: patient, isLoading: patientLoading } =
    useApi<PatientProfile>(rx?.patientId ? `/v1/staff/patients/${rx.patientId}` : null);

  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'review' | 'intervention' | 'counseling'>('review');
  const [submitting, setSubmitting] = useState(false);
  const [decision, setDecision] = useState<string>('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [interventionType, setInterventionType] = useState('other');
  const [interventionNote, setInterventionNote] = useState('');
  const [counselingMethod, setCounselingMethod] = useState('line_chat');
  const [counselingNotes, setCounselingNotes] = useState('');
  const [licenseInput, setLicenseInput] = useState('');

  const isVerified = rx?.status === 'approved' || rx?.status === 'rejected' || rx?.status === 'partial';
  const needsLicense = !user?.licenseNo && !licenseInput.trim();

  async function handleVerify(dec: string) {
    if (dec === 'rejected' && !rejectionReason.trim()) {
      alert('กรุณาระบุเหตุผลที่ปฏิเสธ');
      return;
    }
    if (!user?.licenseNo && !licenseInput.trim()) {
      alert('กรุณากรอกเลขใบอนุญาตเภสัชกรก่อนอนุมัติ');
      return;
    }
    setSubmitting(true);
    try {
      if (!user?.licenseNo && licenseInput.trim()) {
        await api.patch('/v1/auth/me', { licenseNo: licenseInput.trim() });
      }
      await api.patch(`/v1/prescriptions/${rxId}/verify`, {
        decision: dec,
        rejectionReason: dec === 'rejected' ? rejectionReason : undefined,
        interventionType: interventionNote ? interventionType : undefined,
        interventionNote: interventionNote || undefined,
      });
      await mutateRx();
      setDecision(dec);
    } catch (err: any) {
      alert(err.message ?? 'เกิดข้อผิดพลาด');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogIntervention() {
    if (!interventionNote.trim()) return;
    setSubmitting(true);
    try {
      await api.post(`/v1/prescriptions/${rxId}/interventions`, {
        interventionType,
        description: interventionNote,
      });
      setInterventionNote('');
      alert('บันทึก intervention สำเร็จ');
    } catch (err: any) {
      alert(err.message ?? 'เกิดข้อผิดพลาด');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStartCounseling() {
    setSubmitting(true);
    try {
      const { data: session } = await api.post<{ id: string }>(
        `/v1/prescriptions/${rxId}/counseling`,
        { method: counselingMethod },
      );
      alert(`เริ่ม counseling session: ${session.id}`);
      await mutateRx();
    } catch (err: any) {
      alert(err.message ?? 'เกิดข้อผิดพลาด');
    } finally {
      setSubmitting(false);
    }
  }

  if (rxLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!rx) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-2">
        <p className="text-muted-foreground">ไม่พบใบสั่งยา</p>
        <Link href="/dashboard/pharmacist" className="text-sm text-primary underline">
          กลับไปคิว
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/pharmacist"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{rx.rxNo}</h1>
          <p className="text-sm text-muted-foreground">
            {rx.source} · สร้าง {new Date(rx.createdAt).toLocaleString('th-TH')}
          </p>
        </div>
        <span
          className={cn(
            'rounded-full border px-3 py-1 text-xs font-semibold capitalize',
            rx.aiPriority === 'urgent' && 'border-red-200 bg-red-100 text-red-700',
            rx.aiPriority === 'high' && 'border-orange-200 bg-orange-100 text-orange-700',
            rx.aiPriority === 'medium' && 'border-yellow-200 bg-yellow-100 text-yellow-700',
            rx.aiPriority === 'low' && 'border-green-200 bg-green-100 text-green-700',
          )}
        >
          {rx.aiPriority}
        </span>
        {isVerified && (
          <span
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-semibold',
              rx.status === 'approved' && 'border-green-200 bg-green-100 text-green-700',
              rx.status === 'rejected' && 'border-red-200 bg-red-100 text-red-700',
              rx.status === 'partial' && 'border-amber-200 bg-amber-100 text-amber-700',
            )}
          >
            {rx.status === 'approved' ? 'อนุมัติ' : rx.status === 'rejected' ? 'ปฏิเสธ' : 'อนุมัติบางส่วน'}
          </span>
        )}
      </div>

      {/* 3-Column Layout */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Column 1: Rx Image + OCR */}
        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <FileText className="h-4 w-4" /> ภาพใบสั่งยา
            </h3>
            {rx.images && rx.images.length > 0 ? (
              <div className="space-y-2">
                {rx.images.map((img, idx) => (
                  <div key={idx} className="overflow-hidden rounded-lg border">
                    <img
                      src={img.imageUrl}
                      alt={`Rx image ${idx + 1}`}
                      className="h-auto w-full object-contain"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-48 items-center justify-center rounded-lg bg-muted/50 text-sm text-muted-foreground">
                ไม่มีภาพ
              </div>
            )}
            <div className="mt-3 text-xs text-muted-foreground">
              <p>OCR: {rx.ocrStatus === 'completed' ? `สำเร็จ (${rx.ocrConfidence}%)` : rx.ocrStatus}</p>
              {rx.prescriberName && <p>แพทย์: {rx.prescriberName}</p>}
              {rx.prescriberHospital && <p>รพ.: {rx.prescriberHospital}</p>}
              {rx.diagnosis && <p>วินิจฉัย: {rx.diagnosis}</p>}
            </div>
          </div>
        </div>

        {/* Column 2: Parsed Items + Safety Alerts */}
        <div className="space-y-4">
          {/* Prescription Items */}
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Pill className="h-4 w-4" /> รายการยา ({rx.items.length})
            </h3>
            {rx.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">ยังไม่มีรายการยา (รอ OCR)</p>
            ) : (
              <div className="space-y-2">
                {rx.items.map((item, idx) => (
                  <div key={item.id} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium">
                          {idx + 1}. {item.drugName}
                        </p>
                        {item.strength && (
                          <p className="text-xs text-muted-foreground">{item.strength} {item.dosageForm}</p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">x{item.quantity}</span>
                    </div>
                    {item.sig && (
                      <p className="mt-1 text-xs text-muted-foreground">Sig: {item.sig}</p>
                    )}
                    {item.duration && (
                      <p className="text-xs text-muted-foreground">ระยะเวลา: {item.duration}</p>
                    )}
                    {item.matchStatus !== 'pending' && (
                      <p className="mt-1 text-xs">
                        Product match: {item.matchStatus}{' '}
                        {item.matchConfidence && `(${item.matchConfidence}%)`}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Safety Alerts */}
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <ShieldAlert className="h-4 w-4" /> Safety Alerts
            </h3>
            {rx.aiChecksResult?.alerts && rx.aiChecksResult.alerts.length > 0 ? (
              <div className="space-y-2">
                {rx.aiChecksResult.alerts.map((alert, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      'rounded-lg border p-3',
                      SEVERITY_COLORS[alert.severity] ?? SEVERITY_COLORS.info,
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      <span className="text-xs font-semibold uppercase">{alert.type}</span>
                      <span className="ml-auto text-xs capitalize">{alert.severity}</span>
                    </div>
                    <p className="mt-1 text-xs">{alert.message}</p>
                    {alert.recommendation && (
                      <p className="mt-1 text-xs opacity-75">แนะนำ: {alert.recommendation}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : rx.aiChecksPassed === true ? (
              <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                <CheckCircle className="h-4 w-4" />
                ผ่านการตรวจสอบ AI ทุกรายการ
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">รอผลตรวจ AI</p>
            )}
          </div>
        </div>

        {/* Column 3: Patient Profile + Actions */}
        <div className="space-y-4">
          {/* Patient Profile */}
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <User className="h-4 w-4" /> ข้อมูลลูกค้า
            </h3>
            {patientLoading ? (
              <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
            ) : patient ? (
              <div className="space-y-3 text-sm">
                <div>
                  <p className="font-medium">{patient.firstName} {patient.lastName}</p>
                  <p className="text-xs text-muted-foreground">
                    {patient.patientNo} · {patient.age ? `${patient.age} ปี` : ''} · {patient.gender ?? ''}
                    {patient.weight ? ` · ${patient.weight} kg` : ''}
                  </p>
                  {(patient.isPregnant || patient.isBreastfeeding) && (
                    <div className="mt-1 flex gap-1">
                      {patient.isPregnant && (
                        <span className="rounded-full bg-pink-100 px-2 py-0.5 text-xs font-medium text-pink-700">ตั้งครรภ์</span>
                      )}
                      {patient.isBreastfeeding && (
                        <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">ให้นมบุตร</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Allergies */}
                <div>
                  <p className="text-xs font-semibold text-red-600">
                    แพ้ยา ({patient.allergies.length})
                  </p>
                  {patient.allergies.length > 0 ? (
                    <ul className="mt-1 space-y-1">
                      {patient.allergies.map((a) => (
                        <li key={a.id} className="rounded bg-red-50 px-2 py-1 text-xs text-red-700">
                          {a.drugName} — {a.severity}
                          {a.symptoms && ` (${a.symptoms})`}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-muted-foreground">ไม่มีประวัติแพ้ยา</p>
                  )}
                </div>

                {/* Chronic Diseases */}
                <div>
                  <p className="text-xs font-semibold">โรคประจำตัว ({patient.chronicDiseases.length})</p>
                  {patient.chronicDiseases.length > 0 ? (
                    <ul className="mt-1 space-y-1">
                      {patient.chronicDiseases.map((d) => (
                        <li key={d.id} className="text-xs text-muted-foreground">
                          {d.diseaseName} {d.icd10Code && `(${d.icd10Code})`} — {d.status}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-muted-foreground">ไม่มี</p>
                  )}
                </div>

                {/* Current Meds */}
                <div>
                  <p className="text-xs font-semibold">ยาที่ใช้อยู่ ({patient.currentMedications.length})</p>
                  {patient.currentMedications.length > 0 ? (
                    <ul className="mt-1 space-y-1">
                      {patient.currentMedications.map((m) => (
                        <li key={m.id} className="text-xs text-muted-foreground">
                          {m.drugName} {m.strength ?? ''} — {m.sig ?? ''}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-muted-foreground">ไม่มี</p>
                  )}
                </div>

                <Link
                  href={`/dashboard/patients/${patient.id}`}
                  className="inline-block text-xs text-primary underline"
                >
                  ดูโปรไฟล์ฉบับเต็ม →
                </Link>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">ไม่พบข้อมูลลูกค้า</p>
            )}
          </div>

          {/* Action Tabs */}
          <div className="rounded-xl border bg-card shadow-sm">
            <div className="flex border-b">
              {[
                { key: 'review', label: 'ตัดสิน', icon: CheckCircle },
                { key: 'intervention', label: 'Intervention', icon: FileText },
                { key: 'counseling', label: 'Counseling', icon: MessageSquare },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors',
                    activeTab === tab.key
                      ? 'border-b-2 border-primary text-primary'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-4">
              {/* Review Tab */}
              {activeTab === 'review' && (
                <div className="space-y-3">
                  {isVerified ? (
                    <div className={cn(
                      'rounded-lg border p-3 text-sm',
                      rx.status === 'approved' && 'border-green-200 bg-green-50 text-green-700',
                      rx.status === 'rejected' && 'border-red-200 bg-red-50 text-red-700',
                    )}>
                      <p className="font-medium">
                        {rx.status === 'approved' ? 'อนุมัติแล้ว' : rx.status === 'rejected' ? 'ปฏิเสธแล้ว' : 'อนุมัติบางส่วน'}
                      </p>
                      {rx.rejectionReason && <p className="mt-1 text-xs">เหตุผล: {rx.rejectionReason}</p>}
                      {rx.verifiedAt && (
                        <p className="mt-1 text-xs">เมื่อ {new Date(rx.verifiedAt).toLocaleString('th-TH')}</p>
                      )}
                    </div>
                  ) : (
                    <>
                      {!user?.licenseNo && (
                        <div>
                          <label className="text-xs font-semibold text-amber-700">
                            เลขใบอนุญาตเภสัชกร <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={licenseInput}
                            onChange={(e) => setLicenseInput(e.target.value)}
                            placeholder="เช่น ภก. 12345"
                            className="mt-1 w-full rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-amber-400"
                          />
                          <p className="mt-0.5 text-[10px] text-amber-600">จำเป็นต้องกรอกก่อนอนุมัติ — ระบบจะบันทึกไว้กับบัญชีของคุณ</p>
                        </div>
                      )}
                      <div>
                        <label className="text-xs font-medium">เหตุผลปฏิเสธ (ถ้าปฏิเสธ)</label>
                        <textarea
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          rows={2}
                          placeholder="ระบุเหตุผล..."
                          className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none ring-ring/20 placeholder:text-muted-foreground focus:ring-2"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium">Intervention note (ถ้ามี)</label>
                        <textarea
                          value={interventionNote}
                          onChange={(e) => setInterventionNote(e.target.value)}
                          rows={2}
                          placeholder="บันทึก intervention..."
                          className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none ring-ring/20 placeholder:text-muted-foreground focus:ring-2"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleVerify('approved')}
                          disabled={submitting}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                        >
                          <CheckCircle className="h-4 w-4" />
                          อนุมัติ
                        </button>
                        <button
                          onClick={() => handleVerify('partial')}
                          disabled={submitting}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-600 disabled:opacity-50"
                        >
                          บางส่วน
                        </button>
                        <button
                          onClick={() => handleVerify('rejected')}
                          disabled={submitting}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                        >
                          <XCircle className="h-4 w-4" />
                          ปฏิเสธ
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Intervention Tab */}
              {activeTab === 'intervention' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium">ประเภท Intervention</label>
                    <select
                      value={interventionType}
                      onChange={(e) => setInterventionType(e.target.value)}
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none"
                    >
                      {INTERVENTION_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium">รายละเอียด</label>
                    <textarea
                      value={interventionNote}
                      onChange={(e) => setInterventionNote(e.target.value)}
                      rows={4}
                      placeholder="อธิบาย intervention ที่ทำ..."
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none ring-ring/20 placeholder:text-muted-foreground focus:ring-2"
                    />
                  </div>
                  <button
                    onClick={handleLogIntervention}
                    disabled={submitting || !interventionNote.trim()}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                    บันทึก Intervention
                  </button>
                </div>
              )}

              {/* Counseling Tab */}
              {activeTab === 'counseling' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium">วิธีการให้คำปรึกษา</label>
                    <select
                      value={counselingMethod}
                      onChange={(e) => setCounselingMethod(e.target.value)}
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none"
                    >
                      {COUNSELING_METHODS.map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium">บันทึก</label>
                    <textarea
                      value={counselingNotes}
                      onChange={(e) => setCounselingNotes(e.target.value)}
                      rows={3}
                      placeholder="หัวข้อที่ให้คำปรึกษา..."
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none ring-ring/20 placeholder:text-muted-foreground focus:ring-2"
                    />
                  </div>
                  <button
                    onClick={handleStartCounseling}
                    disabled={submitting}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                  >
                    <MessageSquare className="h-4 w-4" />
                    เริ่ม Counseling Session
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
