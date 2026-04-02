import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { useLiff } from '@/components/providers/liff-provider';

export function useAuthGuard() {
  const router = useRouter();
  const { accessToken, patient } = useAuthStore();
  const { ready: liffReady } = useLiff();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Wait for both Zustand hydration (accessToken resolved) AND LIFF init
    // before deciding whether to redirect. This prevents the false-negative
    // redirect that caused the login → register → login loop.
    if (!liffReady) return;

    if (!accessToken) {
      router.replace('/login');
    }
    setLoading(false);
  }, [liffReady, accessToken, router]);

  return { token: accessToken, patient, loading };
}
