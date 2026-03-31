import { api } from './api';

export type ConsultationType =
  | 'follow_up_chronic'
  | 'medication_refill'
  | 'minor_ailment'
  | 'general_health'
  | 'medication_review';

export interface RequestConsultationData {
  type: ConsultationType;
  chiefComplaint: string;
  symptoms?: string[];
}

export interface ConsultationResponse {
  consultationId: string;
  status: string;
  canProceed: boolean;
  message: string;
  nextStep: string;
}

export async function requestConsultation(
  token: string,
  data: RequestConsultationData,
): Promise<ConsultationResponse> {
  return api.post<ConsultationResponse>('/v1/telemedicine/consultations/request', data, token);
}
