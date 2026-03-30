const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

type RequestOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  token?: string;
};

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
