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

/** Base64url segment → base64 with padding for atob() (JWT uses base64url, not raw base64). */
function base64UrlToJson(base64Url: string): string {
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = (4 - (base64.length % 4)) % 4;
  const padded = base64 + '='.repeat(pad);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

/** Decode JWT payload without verification (client-side + Edge middleware). */
export function decodeJwt(token: string): JwtPayload | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const json = base64UrlToJson(base64Url);
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
