import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

/**
 * Preferencia de tema. Se persiste en localStorage (a diferencia de la sesión,
 * que va en sessionStorage) para que se comparta entre pestañas y reinicios.
 * `system` sigue a `prefers-color-scheme`.
 */
export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'system',
      setTheme: (theme) => set({ theme }),
    }),
    { name: 'bo-theme', storage: createJSONStorage(() => localStorage) },
  ),
);
