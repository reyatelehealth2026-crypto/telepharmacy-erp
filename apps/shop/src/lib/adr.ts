import { api } from './api';

export interface CreateAdrData {
  drugName: string;
  startDate?: string;
  reactionDate?: string;
  symptoms: string;
  severity: string;
  outcome?: string;
  causalityAssessment?: string;
}

export async function submitAdrReport(token: string, data: CreateAdrData): Promise<{ id: string }> {
  return api.post<{ id: string }>('/v1/adr', data, token);
}
