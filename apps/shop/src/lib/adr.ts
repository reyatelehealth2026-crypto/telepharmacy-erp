import { api } from './api';

export interface CreateAdrData {
  drugName: string;
  reactionDescription: string;
  severity: 'mild' | 'moderate' | 'severe' | 'life_threatening';
  onsetDate?: string;
  images?: string[];
  startDate?: string;
  reactionDate?: string;
  symptoms?: string;
  outcome?: string;
  causalityAssessment?: string;
}

export interface AdrReportResult {
  id: string;
  referenceNumber?: string;
  reportNo?: string;
  createdAt?: string;
}

export async function submitAdrReport(
  token: string,
  data: CreateAdrData,
): Promise<AdrReportResult> {
  const res = await api.post<{ data: AdrReportResult }>('/v1/adr/reports', data, token);
  // Handle both wrapped and unwrapped responses
  return (res as any).data ?? res;
}
