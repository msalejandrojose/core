// Estado de autenticación: JWT + user. Persistido en sessionStorage.
// Sin refresh token en Phase 1 (la API es stateless con access JWT corto).

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
