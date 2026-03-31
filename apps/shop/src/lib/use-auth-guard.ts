import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';

export function useAuthGuard() {
  const router = useRouter();
  const { accessToken, patient, isAuthenticated } = useAuthStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login');
    }
    setLoading(false);
  }, [isAuthenticated, router]);

  return { token: accessToken, patient, loading };
}
