// Estado de autenticación. Token + user persistidos en sessionStorage
// (se borran al cerrar pestaña; persistencia "fuerte" en localStorage
// se reconsidera con refresh tokens en una fase futura).
//
// La API es stateless: el JWT corto se renueva por re-login en Phase 1.

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  login: (token: string, user: User) => void;
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
      name: 'core-bo-auth',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
