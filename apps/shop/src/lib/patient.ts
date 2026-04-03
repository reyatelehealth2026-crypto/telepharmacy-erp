import { api } from './api';

// ── Types ──────────────────────────────────────────────────────────────────

export interface PatientProfile {
  id: string;
  patientNo: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  dateOfBirth: string | null;
  birthDate: string | null;
  gender: string | null;
  bloodType: string | null;
  weight: number | null;
  height: number | null;
  age: number | null;
  address: string | null;
  subDistrict: string | null;
  district: string | null;
  province: string | null;
  postalCode: string | null;
  loyaltyPoints: number;
  loyaltyTier: string;
  createdAt: string;
}

export interface Allergy {
  id: string;
  drugName: string;
  allergyGroup: string | null;
  reactionType?: 'allergic' | 'side_effect' | 'intolerance';
  severity: 'mild' | 'moderate' | 'severe' | 'life_threatening';
  symptoms: string | null;
  source: 'doctor_diagnosed' | 'patient_reported' | 'pharmacist_recorded';
  notes: string | null;
  createdAt: string;
}

export interface ChronicDisease {
  id: string;
  diseaseName: string;
  icdCode: string | null;
  diagnosedYear: number | null;
  isControlled: boolean;
  medications: string | null;
  notes: string | null;
  createdAt: string;
}

export interface Medication {
  id: string;
  drugName: string;
  genericName: string | null;
  dosage: string | null;
  sig: string | null;
  prescribedBy: string | null;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
  notes: string | null;
  createdAt: string;
}

export interface LoyaltyTransaction {
  id: string;
  type: 'earn' | 'redeem' | 'expire' | 'adjust';
  points: number;
  description: string;
  createdAt: string;
}

// ── API helpers ────────────────────────────────────────────────────────────

function unwrap<T>(res: any): T {
  return res.data as T;
}

function mapChronicDiseaseRow(row: Record<string, unknown>): ChronicDisease {
  const diagnosed = row.diagnosedDate as string | null | undefined;
  let diagnosedYear: number | null = null;
  if (diagnosed && /^\d{4}/.test(diagnosed)) {
    diagnosedYear = parseInt(diagnosed.slice(0, 4), 10);
  }
  return {
    id: String(row.id),
    diseaseName: String(row.diseaseName ?? ''),
    icdCode: (row.icd10Code as string | null) ?? null,
    diagnosedYear,
    isControlled: row.status === 'under_treatment',
    medications: null,
    notes: (row.notes as string | null) ?? null,
    createdAt: String(row.createdAt ?? ''),
  };
}

function mapMedicationRow(row: Record<string, unknown>): Medication {
  return {
    id: String(row.id),
    drugName: String(row.drugName ?? ''),
    genericName: (row.genericName as string | null) ?? null,
    dosage: (row.strength as string | null) ?? null,
    sig: (row.sig as string | null) ?? null,
    prescribedBy: (row.prescribedBy as string | null) ?? null,
    startDate: null,
    endDate: null,
    isCurrent: Boolean(row.isCurrent ?? true),
    notes: null,
    createdAt: String(row.createdAt ?? ''),
  };
}

export async function getMyProfile(token: string): Promise<PatientProfile> {
  const res = await api.get<any>('/v1/patients/me', token);
  return unwrap<PatientProfile>(res);
}

export async function getMyAllergies(token: string): Promise<Allergy[]> {
  const res = await api.get<any>('/v1/patients/me/allergies', token);
  return unwrap<Allergy[]>(res);
}

export async function createAllergy(token: string, data: Omit<Allergy, 'id' | 'createdAt'>): Promise<Allergy> {
  const res = await api.post<any>('/v1/patients/me/allergies', data, token);
  return unwrap<Allergy>(res);
}

export async function deleteAllergy(token: string, allergyId: string): Promise<void> {
  await api.delete(`/v1/patients/me/allergies/${allergyId}`, token);
}

export async function getMyDiseases(token: string): Promise<ChronicDisease[]> {
  const res = await api.get<any>('/v1/patients/me/diseases', token);
  const raw = unwrap<unknown[]>(res);
  const arr = Array.isArray(raw) ? raw : [];
  return arr.map((r) => mapChronicDiseaseRow(r as Record<string, unknown>));
}

export async function createDisease(token: string, data: Omit<ChronicDisease, 'id' | 'createdAt'>): Promise<ChronicDisease> {
  const noteLines: string[] = [];
  if (data.notes?.trim()) noteLines.push(data.notes.trim());
  if (data.diagnosedYear != null) noteLines.push(`ปีที่วินิจฉัย: ${data.diagnosedYear}`);
  if (data.medications?.trim()) noteLines.push(`ยาที่ใช้: ${data.medications.trim()}`);
  noteLines.push(data.isControlled ? 'ควบคุมอาการได้' : 'ยังไม่ควบคุม');
  const body = {
    diseaseName: data.diseaseName,
    icd10Code: data.icdCode?.trim() || undefined,
    notes: noteLines.join('\n'),
    status: data.isControlled ? ('under_treatment' as const) : ('active' as const),
  };
  const res = await api.post<any>('/v1/patients/me/diseases', body, token);
  return mapChronicDiseaseRow(unwrap<Record<string, unknown>>(res));
}

export async function deleteDisease(token: string, diseaseId: string): Promise<void> {
  await api.delete(`/v1/patients/me/diseases/${diseaseId}`, token);
}

export async function getMyMedications(token: string, currentOnly = true): Promise<Medication[]> {
  const res = await api.get<any>(`/v1/patients/me/medications?current_only=${currentOnly}`, token);
  const raw = unwrap<unknown[]>(res);
  const arr = Array.isArray(raw) ? raw : [];
  return arr.map((r) => mapMedicationRow(r as Record<string, unknown>));
}

export async function createMedication(token: string, data: Omit<Medication, 'id' | 'createdAt'>): Promise<Medication> {
  const body = {
    drugName: data.drugName,
    genericName: data.genericName || undefined,
    strength: data.dosage || undefined,
    sig: data.sig || undefined,
    prescribedBy: data.prescribedBy || undefined,
    isCurrent: data.isCurrent,
  };
  const res = await api.post<any>('/v1/patients/me/medications', body, token);
  return mapMedicationRow(unwrap<Record<string, unknown>>(res));
}

export async function deleteMedication(token: string, medicationId: string): Promise<void> {
  await api.delete(`/v1/patients/me/medications/${medicationId}`, token);
}

export interface ProfileUpdateData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  weight?: number;
  height?: number;
  bloodType?: string;
  address?: string;
  subDistrict?: string;
  district?: string;
  province?: string;
  postalCode?: string;
}

export async function updateProfile(token: string, data: ProfileUpdateData): Promise<PatientProfile> {
  const res = await api.patch<any>('/v1/patients/me', data, token);
  return unwrap<PatientProfile>(res);
}
