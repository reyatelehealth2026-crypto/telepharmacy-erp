'use client';

import useSWR, { type SWRConfiguration } from 'swr';
import { apiFetch } from './api-client';

/** SWR fetcher that uses the auth-aware apiFetch. */
async function fetcher<T>(path: string): Promise<T> {
  const { data } = await apiFetch<T>(path);
  return data;
}

/** SWR fetcher that returns { data, meta }. */
async function fetcherWithMeta<T>(path: string): Promise<{ data: T; meta?: Record<string, unknown> }> {
  return apiFetch<T>(path);
}

/** Hook for API GET requests via SWR with auth. Returns unwrapped data. */
export function useApi<T = unknown>(path: string | null, config?: SWRConfiguration<T>) {
  return useSWR<T>(path, fetcher<T>, {
    revalidateOnFocus: false,
    ...config,
  });
}

/** Hook for paginated API GET requests. Returns { data, meta }. */
export function useApiPaginated<T = unknown>(
  path: string | null,
  config?: SWRConfiguration<{ data: T; meta?: Record<string, unknown> }>,
) {
  return useSWR(path, fetcherWithMeta<T>, {
    revalidateOnFocus: false,
    ...config,
  });
}
