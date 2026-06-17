import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Información mínima del usuario autenticado. La forma definitiva la dará el
 * `@core/api-client` cuando BO-02 conecte el login real; de momento basta con
 * lo necesario para pintar el avatar / nombre en el layout.
 */
export interface AuthUser {
  id: string;
  email: string;
  name?: string;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      login: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
    }),
    {
      name: 'core-backoffice-auth',
    },
  ),
);

/**
 * Lectura del token fuera de React (la usa el interceptor del api-client).
 * Acceder al store directamente evita tener que pasar el token a mano en cada request.
 */
export const getAuthToken = () => useAuthStore.getState().token;
