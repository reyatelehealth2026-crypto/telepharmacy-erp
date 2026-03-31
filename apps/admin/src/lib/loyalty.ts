import { api, apiFetch } from './api-client';

export interface PatientLoyalty {
  points: number;
  tier: string;
  lifetimePoints: number;
  redeemedPoints: number;
}

export async function getPatientLoyalty(patientId: string) {
  return apiFetch<PatientLoyalty>(`/v1/staff/loyalty/${patientId}`);
}

export async function adjustPoints(patientId: string, points: number, reason: string) {
  return api.post(`/v1/staff/loyalty/${patientId}/adjust`, { points, reason });
}
