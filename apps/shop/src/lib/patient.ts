import { api } from './api';

// ── Types ──────────────────────────────────────────────────────────────────

export interface PatientProfile {
  id: string;
  patientNo: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  bloodType: string | null;
  weight: number | null;
  height: number | null;
  loyaltyPoints: number;
  loyaltyTier: string;
  createdAt: string;
}

export interface Allergy {
  id: string;
  drugName: string;
  allergyGroup: string | null;
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
  return unwrap<ChronicDisease[]>(res);
}

export async function createDisease(token: string, data: Omit<ChronicDisease, 'id' | 'createdAt'>): Promise<ChronicDisease> {
  const res = await api.post<any>('/v1/patients/me/diseases', data, token);
  return unwrap<ChronicDisease>(res);
}

export async function deleteDisease(token: string, diseaseId: string): Promise<void> {
  await api.delete(`/v1/patients/me/diseases/${diseaseId}`, token);
}

export async function getMyMedications(token: string, currentOnly = true): Promise<Medication[]> {
  const res = await api.get<any>(`/v1/patients/me/medications?current_only=${currentOnly}`, token);
  return unwrap<Medication[]>(res);
}

export async function createMedication(token: string, data: Omit<Medication, 'id' | 'createdAt'>): Promise<Medication> {
  const res = await api.post<any>('/v1/patients/me/medications', data, token);
  return unwrap<Medication>(res);
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
}

export async function updateProfile(token: string, data: ProfileUpdateData): Promise<PatientProfile> {
  const res = await api.patch<any>('/v1/patients/me', data, token);
  return unwrap<PatientProfile>(res);
}
