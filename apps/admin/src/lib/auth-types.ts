import type { UserRole } from '@telepharmacy/shared';

export interface StaffUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  licenseNo?: string | null;
  avatarUrl?: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface StaffLoginResponse extends AuthTokens {
  tokenType: string;
  staff: {
    id: string;
    name: string;
    role: UserRole;
    licenseNo?: string;
  };
}

export interface JwtPayload {
  sub: string;
  type: 'staff' | 'patient';
  role?: UserRole;
  iat?: number;
  exp?: number;
}

/** Decode JWT payload without verification (client-side only). */
export function decodeJwt(token: string): JwtPayload | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

/** Check if a JWT token is expired (with 30s buffer). */
export function isTokenExpired(token: string): boolean {
  const payload = decodeJwt(token);
  if (!payload?.exp) return true;
  return Date.now() >= (payload.exp - 30) * 1000;
}

/** SLA thresholds in minutes by priority. */
export const SLA_MINUTES: Record<string, number> = {
  urgent: 15,
  high: 15,
  medium: 30,
  low: 60,
};
