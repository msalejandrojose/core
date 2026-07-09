import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Limpia el DOM entre tests para evitar fugas de estado entre casos.
afterEach(() => {
  cleanup();
});

// jsdom no implementa matchMedia; el ThemeProvider lo usa para resolver el tema
// `system`. Stub por defecto: el sistema NO prefiere oscuro.
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}

// Capacitor Preferences no existe fuera del WebView; el auth store lo usa como
// backend de persistencia. Lo stubbeamos con un almacén en memoria para que los
// tests que tocan el store no fallen al hidratar.
vi.mock('@capacitor/preferences', () => {
  const mem = new Map<string, string>();
  return {
    Preferences: {
      get: async ({ key }: { key: string }) => ({
        value: mem.get(key) ?? null,
      }),
      set: async ({ key, value }: { key: string; value: string }) => {
        mem.set(key, value);
      },
      remove: async ({ key }: { key: string }) => {
        mem.delete(key);
      },
    },
  };
});
