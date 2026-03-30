'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { initLiff, getLiffProfile, getLiffAccessToken, liffLogin, liffLogout, isLoggedIn, isInLiff } from '@/lib/liff';
import { loginWithLine } from '@/lib/auth';
import { useAuthStore } from '@/store/auth';
import type { LiffProfile } from '@/lib/liff';

interface LiffContextValue {
  ready: boolean;
  liffProfile: LiffProfile | null;
  isLiffBrowser: boolean;
  isLineLoggedIn: boolean;
  login: () => void;
  logout: () => void;
  error: string | null;
}

const LiffContext = createContext<LiffContextValue>({
  ready: false,
  liffProfile: null,
  isLiffBrowser: false,
  isLineLoggedIn: false,
  login: () => {},
  logout: () => {},
  error: null,
});

export function useLiff() {
  return useContext(LiffContext);
}

export function LiffProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [liffProfile, setLiffProfile] = useState<LiffProfile | null>(null);
  const [isLiffBrowser, setIsLiffBrowser] = useState(false);
  const [isLineLoggedIn, setIsLineLoggedIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { setAuth, accessToken } = useAuthStore();

  useEffect(() => {
    const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID;
    if (!LIFF_ID) {
      // No LIFF ID configured — run in web-only mode
      setReady(true);
      return;
    }

    initLiff()
      .then(async () => {
        setIsLiffBrowser(isInLiff());
        const loggedIn = isLoggedIn();
        setIsLineLoggedIn(loggedIn);

        if (loggedIn) {
          const profile = await getLiffProfile();
          setLiffProfile(profile);

          // Auto-login to backend if no existing token
          if (!useAuthStore.getState().accessToken && profile) {
            const lineToken = getLiffAccessToken();
            if (lineToken) {
              try {
                const res = await loginWithLine(lineToken);
                setAuth({
                  accessToken: res.accessToken,
                  refreshToken: res.refreshToken,
                  patient: res.patient,
                });
              } catch (err) {
                console.error("LINE auto-login failed:", err);
                // Redirect to registration page
                window.location.href = "/register";
                return;
              }
            }
          }
        }
        setReady(true);
      })
      .catch((err) => {
        setError(err?.message || 'LIFF init failed');
        setReady(true);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback(() => {
    liffLogin();
  }, []);

  const logout = useCallback(() => {
    useAuthStore.getState().clearAuth();
    liffLogout();
  }, []);

  return (
    <LiffContext.Provider
      value={{ ready, liffProfile, isLiffBrowser, isLineLoggedIn, login, logout, error }}
    >
      {children}
    </LiffContext.Provider>
  );
}
