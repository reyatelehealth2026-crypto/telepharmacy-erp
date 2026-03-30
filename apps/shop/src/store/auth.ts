import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  patient: {
    id: string;
    patientNo: string;
    firstName: string;
    lastName: string;
    isRegistered: boolean;
  } | null;
  setAuth: (data: {
    accessToken: string;
    refreshToken: string;
    patient: AuthState['patient'];
  }) => void;
  clearAuth: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      patient: null,

      setAuth: (data) =>
        set({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          patient: data.patient,
        }),

      clearAuth: () =>
        set({ accessToken: null, refreshToken: null, patient: null }),

      isAuthenticated: () => !!get().accessToken,
    }),
    { name: 'reya-auth' }
  )
);
