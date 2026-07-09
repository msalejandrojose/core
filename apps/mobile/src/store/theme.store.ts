import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

/**
 * Preferencia de tema (Claro / Oscuro / Sistema). Se persiste en `localStorage`
 * —síncrono, disponible tanto en la PWA como en el WebView de Capacitor— para
 * que se aplique sin parpadeo antes del primer render (ver el script inline de
 * `index.html`). `system` sigue a `prefers-color-scheme`.
 */
export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'system',
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'core-mobile-theme',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
