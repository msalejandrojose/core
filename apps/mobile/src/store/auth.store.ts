import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * Subconjunto del `UserResponseDto` de `@core/api` que la app necesita para
 * pintar la sesión. `/auth/login` y `/auth/me` devuelven más campos; guardamos
 * solo los relevantes. La app es para usuarios de tipo `APP`.
 */
export interface AuthUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  userType: 'BACKOFFICE' | 'APP';
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (token: string, user: AuthUser) => void;
  setUser: (user: AuthUser) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      login: (token, user) => set({ token, user, isAuthenticated: true }),
      setUser: (user) => set({ user }),
      logout: () => set({ token: null, user: null, isAuthenticated: false }),
    }),
    {
      // localStorage: la sesión persiste en el WebView (nativo) y en la PWA.
      name: 'core-mobile-auth',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

/** Lectura del token fuera de React (la usa el wrapper de la API). */
export const getAuthToken = () => useAuthStore.getState().token;
