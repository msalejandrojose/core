import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { capacitorStorage } from '@/lib/storage';

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
  /**
   * `true` cuando la sesión persistida ya se ha rehidratado desde el storage
   * (asíncrono). Hasta entonces la app muestra un splash en vez de decidir
   * login vs área autenticada, para no parpadear el login antes del auto-login.
   */
  hasHydrated: boolean;
  login: (token: string, user: AuthUser) => void;
  setUser: (user: AuthUser) => void;
  logout: () => void;
  setHasHydrated: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      hasHydrated: false,
      login: (token, user) => set({ token, user, isAuthenticated: true }),
      setUser: (user) => set({ user }),
      logout: () => set({ token: null, user: null, isAuthenticated: false }),
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      // Storage nativo seguro (Capacitor Preferences); en web cae a localStorage.
      // La sesión persiste en el WebView (nativo) y en la PWA → auto-login.
      name: 'core-mobile-auth',
      storage: createJSONStorage(() => capacitorStorage),
      // Solo se persiste la sesión, no las banderas de UI ni las acciones.
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      // Al terminar de rehidratar (haya o no sesión guardada), levantamos la
      // bandera para que la app deje el splash y renderice las rutas.
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);

/** Lectura del token fuera de React (la usa el wrapper de la API). */
export const getAuthToken = () => useAuthStore.getState().token;
