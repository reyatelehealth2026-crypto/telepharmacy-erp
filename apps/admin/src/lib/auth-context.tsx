'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import type { UserRole } from '@telepharmacy/shared';
import type { StaffUser } from './auth-types';
import { decodeJwt } from './auth-types';
import {
  getAccessToken,
  clearTokens,
  setTokens,
  apiFetch,
} from './api-client';

interface AuthContextValue {
  user: StaffUser | null;
  role: UserRole | null;
  loading: boolean;
  /** Login and persist tokens + cookie. */
  login: (email: string, password: string) => Promise<void>;
  /** Clear tokens and redirect to /login. */
  logout: () => void;
  /** Check if user has one of the given roles. */
  hasRole: (...roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<StaffUser | null>(null);
  const [loading, setLoading] = useState(true);

  const role = user?.role ?? null;

  // Fetch staff profile from /auth/me on mount
  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setLoading(false);
      return;
    }

    const payload = decodeJwt(token);
    if (!payload || payload.type !== 'staff') {
      clearTokens();
      deleteCookie('access_token');
      setLoading(false);
      return;
    }

    apiFetch<StaffUser>('/v1/auth/me')
      .then(({ data }) => {
        setUser(data);
      })
      .catch(() => {
        clearTokens();
        deleteCookie('access_token');
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
    const res = await fetch(`${apiUrl}/v1/auth/staff-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message ?? 'เข้าสู่ระบบไม่สำเร็จ');
    }

    const data = await res.json();
    const accessToken: string =
      data.data?.accessToken ?? data.accessToken;
    const refreshToken: string =
      data.data?.refreshToken ?? data.refreshToken;

    setTokens(accessToken, refreshToken);

    // Set cookie for middleware to read
    setCookie('access_token', accessToken, 7);

    // Decode staff info from response
    const staffInfo = data.data?.staff ?? data.staff;
    const payload = decodeJwt(accessToken);

    // Fetch full profile
    try {
      const { data: profile } = await apiFetch<StaffUser>('/v1/auth/me');
      setUser(profile);
    } catch {
      // Fallback to login response data
      const [firstName, ...lastParts] = (staffInfo?.name ?? '').split(' ');
      setUser({
        id: staffInfo?.id ?? payload?.sub ?? '',
        email,
        firstName: firstName ?? '',
        lastName: lastParts.join(' '),
        role: staffInfo?.role ?? payload?.role ?? 'customer_service',
        licenseNo: staffInfo?.licenseNo,
        avatarUrl: null,
      });
    }
  }, []);

  const logout = useCallback(() => {
    clearTokens();
    deleteCookie('access_token');
    setUser(null);
    window.location.href = '/login';
  }, []);

  const hasRole = useCallback(
    (...roles: UserRole[]) => {
      if (!role) return false;
      return roles.includes(role);
    },
    [role],
  );

  return (
    <AuthContext.Provider value={{ user, role, loading, login, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

/** Access the auth context. Must be used within an AuthProvider. */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

// --- Cookie helpers (client-side) ---

function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}
