import { isTokenExpired } from './auth-types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

/** Token storage keys. */
const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

/** Get stored access token. */
export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

/** Get stored refresh token. */
export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

/** Persist tokens after login or refresh. */
export function setTokens(accessToken: string, refreshToken?: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
}

/** Clear tokens on logout. */
export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

let refreshPromise: Promise<string | null> | null = null;

/** Attempt to refresh the access token using the refresh token. */
async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${API_URL}/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      clearTokens();
      return null;
    }

    const data = await res.json();
    const newAccessToken: string = data.data?.accessToken ?? data.accessToken;
    if (newAccessToken) {
      setTokens(newAccessToken);
      return newAccessToken;
    }
    return null;
  } catch {
    clearTokens();
    return null;
  }
}

/** Get a valid access token, refreshing if needed. Deduplicates concurrent refresh calls. */
async function getValidToken(): Promise<string | null> {
  const token = getAccessToken();
  if (!token) return null;

  if (!isTokenExpired(token)) return token;

  // Deduplicate concurrent refresh requests
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown[];
}

export class ApiRequestError extends Error {
  status: number;
  error: ApiError;

  constructor(status: number, error: ApiError) {
    super(error.message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.error = error;
  }
}

/**
 * Auth-aware fetch wrapper for the telepharmacy API.
 * - Injects JWT Bearer token
 * - Auto-refreshes on token expiry
 * - Redirects to /login on 401 after failed refresh
 * - Unwraps the standard `{ success, data, meta }` envelope
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<{ data: T; meta?: Record<string, unknown> }> {
  const token = await getValidToken();

  const headers = new Headers(options.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const url = path.startsWith('http') ? path : `${API_URL}${path}`;

  let res = await fetch(url, { ...options, headers });

  // If 401, try refresh once then retry
  if (res.status === 401 && token) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers.set('Authorization', `Bearer ${newToken}`);
      res = await fetch(url, { ...options, headers });
    } else {
      // Refresh failed — redirect to login
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new ApiRequestError(401, {
        code: 'UNAUTHORIZED',
        message: 'Session expired',
      });
    }
  }

  // Handle non-JSON responses (204, etc.)
  if (res.status === 204) {
    return { data: undefined as T };
  }

  const json = await res.json();

  if (!res.ok) {
    const error: ApiError = json.error ?? {
      code: 'API_ERROR',
      message: json.message ?? `Request failed (${res.status})`,
    };
    throw new ApiRequestError(res.status, error);
  }

  // Unwrap envelope: API returns { success, data, meta }
  if (json.success !== undefined) {
    return { data: json.data as T, meta: json.meta };
  }

  // Some endpoints return data directly
  return { data: json as T };
}

/** Convenience helpers. */
export const api = {
  get: <T = unknown>(path: string) => apiFetch<T>(path),

  post: <T = unknown>(path: string, body?: unknown) =>
    apiFetch<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T = unknown>(path: string, body?: unknown) =>
    apiFetch<T>(path, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T = unknown>(path: string) =>
    apiFetch<T>(path, { method: 'DELETE' }),

  upload: <T = unknown>(path: string, formData: FormData) =>
    apiFetch<T>(path, { method: 'POST', body: formData }),
};
