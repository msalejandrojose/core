import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * Subconjunto del `UserResponseDto` de `@core/api` que el backoffice necesita
 * para pintar la sesión (nombre, tipo). La respuesta de `/auth/login` trae más
 * campos; aquí guardamos solo los relevantes.
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
      name: 'bo-auth',
      // sessionStorage: la sesión sobrevive a un reload pero NO se comparte
      // entre pestañas (cada tab abre su propia sesión).
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);

/**
 * Lectura del token fuera de React (la usa el interceptor del api-client).
 * Acceder al store directamente evita tener que pasar el token a mano en cada request.
 */
export const getAuthToken = () => useAuthStore.getState().token;
