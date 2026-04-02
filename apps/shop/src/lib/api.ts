import { useAuthStore } from '@/store/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

type RequestOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  token?: string;
};

let refreshPromise: Promise<void> | null = null;

async function doRefresh(): Promise<void> {
  const { refreshToken, setAuth, clearAuth } = useAuthStore.getState();

  if (!refreshToken) {
    clearAuth();
    window.location.href = '/login';
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) throw new Error('Refresh failed');

    const json = await res.json();
    const payload = json?.data ?? json;
    const newAccessToken: string = payload?.accessToken ?? '';
    const newRefreshToken: string = payload?.refreshToken ?? useAuthStore.getState().refreshToken ?? '';
    if (!newAccessToken) throw new Error('Refresh failed: no token in response');
    setAuth({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      patient: useAuthStore.getState().patient,
    });
  } catch {
    clearAuth();
    window.location.href = '/login';
  }
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {}, token } = opts;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (res.status === 401 && token) {
    if (!refreshPromise) {
      refreshPromise = doRefresh().finally(() => {
        refreshPromise = null;
      });
    }
    await refreshPromise;

    const newToken = useAuthStore.getState().accessToken;
    if (!newToken) throw new Error('Authentication failed');

    return request<T>(path, { ...opts, token: newToken });
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.error?.message || error.message || `HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  get: <T>(path: string, token?: string) => request<T>(path, { token }),
  post: <T>(path: string, body: unknown, token?: string) =>
    request<T>(path, { method: 'POST', body, token }),
  patch: <T>(path: string, body: unknown, token?: string) =>
    request<T>(path, { method: 'PATCH', body, token }),
  delete: <T>(path: string, token?: string) =>
    request<T>(path, { method: 'DELETE', token }),
};
