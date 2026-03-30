import { api } from './api';

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  patient: {
    id: string;
    patientNo: string;
    firstName: string;
    lastName: string;
    isRegistered: boolean;
  };
  isNewPatient: boolean;
}

export interface RegisterData {
  lineUserId: string;
  lineDisplayName: string;
  linePictureUrl?: string;
  firstName: string;
  lastName: string;
  phone: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  weight?: number;
  height?: number;
  pdpaConsent: boolean;
  pdpaConsentVersion: string;
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

export async function loginWithLine(lineAccessToken: string): Promise<LoginResponse> {
  return api.post<LoginResponse>('/v1/auth/line', { lineAccessToken });
}

export async function registerPatient(data: RegisterData): Promise<LoginResponse> {
  return api.post<LoginResponse>('/v1/auth/register', data);
}

export async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
  return api.post('/v1/auth/refresh', { refreshToken });
}

export async function updateProfile(token: string, data: ProfileUpdateData): Promise<void> {
  await api.patch('/v1/patients/me', data, token);
}
