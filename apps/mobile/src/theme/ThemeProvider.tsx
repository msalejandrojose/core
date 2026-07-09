import { useEffect, type ReactNode } from 'react';
import { StatusBar, Style } from '@capacitor/status-bar';
import { useThemeStore, type Theme } from '@/store/theme.store';

function systemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/** ¿El tema efectivo (resolviendo `system`) es oscuro? */
function resolveDark(theme: Theme): boolean {
  return theme === 'dark' || (theme === 'system' && systemPrefersDark());
}

/**
 * Aplica el tema al documento cableando los tokens del DS:
 *   - `system` → sin atributo, manda `prefers-color-scheme` (bloque @media).
 *   - `light` / `dark` → `data-theme` fuerza el bloque correspondiente.
 * En nativo ajusta también el color del texto de la status bar y el
 * `theme-color` para que el chrome del sistema acompañe al tema.
 */
function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === 'system') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', theme);
  }

  const dark = resolveDark(theme);

  const meta = document.querySelector('meta[name="theme-color"]');
  meta?.setAttribute('content', dark ? '#1c1b19' : '#f0efec');

  // StatusBar solo existe en nativo; en web/PWA lanza y se ignora.
  StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light }).catch(
    () => {},
  );
}

/**
 * Sincroniza la preferencia de tema con el documento. Cuando el tema es
 * `system`, escucha los cambios de `prefers-color-scheme` en caliente.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    applyTheme(theme);
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  return <>{children}</>;
}
