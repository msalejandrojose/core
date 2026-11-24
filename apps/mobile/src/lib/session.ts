import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { API_BASE_URL } from '@/api/config';
import { useAuthStore } from '@/store/auth.store';

/**
 * Renovación de la sesión con el refresh token (TASK-425).
 *
 * El access token es un JWT de 60 min. Antes, al caducar, el primer 401
 * cerraba sesión y había que volver a entrar. Ahora:
 *   - Un 401 en una llamada con sesión renueva el par de tokens y la reintenta
 *     (ver `api/client.ts`).
 *   - Al arrancar y al volver a la app se renueva por adelantado si el token
 *     caduca pronto, para que la primera pantalla no pague un 401 + reintento.
 *   - Solo se cierra sesión si la API dice que el refresh token ya no vale
 *     (401). Sin red o con la API caída, la sesión se queda como estaba.
 *
 * Las renovaciones simultáneas comparten una única petición: el refresh token
 * rota en cada uso, así que dos en paralelo con el mismo token se pisarían.
 */

export type RefreshOutcome = 'ok' | 'expired' | 'offline';

let inFlight: Promise<RefreshOutcome> | null = null;

export function refreshSession(): Promise<RefreshOutcome> {
  inFlight ??= doRefresh().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function doRefresh(): Promise<RefreshOutcome> {
  const { refreshToken } = useAuthStore.getState();
  if (!refreshToken) return 'expired';
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    return 'offline';
  }
  // Si mientras tanto se cerró sesión (o se entró con otra cuenta), no tocar nada.
  if (useAuthStore.getState().refreshToken !== refreshToken) return 'expired';
  if (res.status === 401 || res.status === 400) return 'expired';
  if (!res.ok) return 'offline';
  try {
    const data = (await res.json()) as { accessToken: string; refreshToken?: string };
    if (!data.accessToken || !data.refreshToken) return 'offline';
    useAuthStore.getState().setTokens(data.accessToken, data.refreshToken);
    return 'ok';
  } catch {
    return 'offline';
  }
}

/** Segundos hasta que caduca un JWT (por su `exp`), o null si no se puede leer. */
export function secondsToExpiry(token: string, now = Date.now()): number | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
    const { exp } = JSON.parse(json) as { exp?: number };
    return typeof exp === 'number' ? exp - Math.floor(now / 1000) : null;
  } catch {
    return null;
  }
}

/** Margen con el que se renueva por adelantado. */
const EARLY_REFRESH_SEC = 5 * 60;

/**
 * Renueva ya si el token caduca en menos de 5 min. Si la API dice que la
 * sesión ya no vale, cierra sesión; sin red no hace nada (se reintenta luego).
 */
export async function refreshIfStale(): Promise<void> {
  const { token, refreshToken } = useAuthStore.getState();
  if (!token || !refreshToken) return;
  const left = secondsToExpiry(token);
  if (left !== null && left > EARLY_REFRESH_SEC) return;
  const outcome = await refreshSession();
  if (outcome === 'expired') useAuthStore.getState().logout();
}

/**
 * Al cerrar sesión, avisa a la API para invalidar el refresh token de este
 * dispositivo. Sin esperar ni reintentar: si falla, caduca solo.
 */
function revokeOnLogout(): () => void {
  return useAuthStore.subscribe((state, prev) => {
    if (prev.refreshToken && !state.refreshToken && !state.isAuthenticated) {
      void fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: prev.refreshToken }),
      }).catch(() => undefined);
    }
  });
}

/**
 * Arranca la sesión que se mantiene sola: renueva al terminar de leer la
 * sesión guardada y cada vez que la app vuelve a primer plano, y revoca el
 * refresh token al cerrar sesión. Se llama una vez desde `main.tsx`.
 */
export function installSessionKeepAlive(): void {
  revokeOnLogout();
  const persist = useAuthStore.persist;
  if (persist.hasHydrated()) void refreshIfStale();
  else persist.onFinishHydration(() => void refreshIfStale());

  if (Capacitor.isNativePlatform()) {
    void App.addListener('resume', () => void refreshIfStale());
  } else {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void refreshIfStale();
    });
  }
}
