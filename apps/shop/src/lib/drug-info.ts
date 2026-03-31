import { api } from './api';

export interface DrugLookupResult {
  drugs: Array<{
    id?: string;
    name: string;
    genericName: string;
    classification: string;
    indications: string[];
    dosage: string;
    sideEffects: string[];
    contraindications: string[];
    warnings: string[];
    interactions: string[];
    pregnancyCategory: string;
  }>;
  total: number;
}

export async function lookupDrug(token: string, query: string): Promise<DrugLookupResult> {
  const res = await api.get<{ success: boolean } & DrugLookupResult>(
    `/v1/drug-info/lookup?q=${encodeURIComponent(query)}`,
    token,
  );
  return { drugs: res.drugs ?? [], total: res.total ?? 0 };
}

export interface CreateMedReviewData {
  patientId: string;
  medications: Array<{ drugName: string; dosage?: string; frequency?: string }>;
  symptoms?: string;
  concerns?: string;
}

export async function createMedicationReview(
  token: string,
  data: CreateMedReviewData,
): Promise<{ id: string }> {
  const res = await api.post<{ success: boolean; data: { id: string } }>(
    '/v1/drug-info/medication-review',
    data,
    token,
  );
  return res.data;
}

export interface CreateTdmData {
  medicationName: string;
  dose?: string;
  labValue: string;
  labUnit: string;
  samplingTime?: string;
  lastDoseTime?: string;
  notes?: string;
}

export async function createTdmRequest(
  token: string,
  data: CreateTdmData,
): Promise<{ id: string }> {
  const res = await api.post<{ success: boolean; data: { id: string } }>(
    '/v1/drug-info/tdm',
    data,
    token,
  );
  return res.data;
}
