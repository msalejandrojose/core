import { getAuthToken, useAuthStore } from '@/store/auth.store';

// Wrapper `fetch` tipado contra la API de Core. Ligero a propósito: cuando
// `@core/api-client` tenga su schema generado (contra la API viva), migrar a él
// como hace el backoffice. Igual que en apps/web, no dependemos del schema para
// no bloquear el build del esqueleto.
//
// IMPORTANTE (arquitectura): la app NUNCA emite eventos de workflows por su
// cuenta. Llama a endpoints de dominio de la API (login, captura, etc.) y es la
// API la que decide y publica el evento correspondiente.

const baseUrl = import.meta.env.VITE_API_URL;

if (!baseUrl) {
  throw new Error('VITE_API_URL no está definida. Revisa apps/mobile/.env');
}

/** Error de la API con el `code` del catálogo unificado del backend. */
export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    // Sesión expirada/invalidada: si la petición llevaba token y la API
    // responde 401, la sesión ya no vale → cerramos sesión de forma central
    // (logout robusto), en vez de que cada pantalla lo gestione a mano. Las
    // peticiones públicas (login, reset…) no llevan token, así que un 401 suyo
    // —credenciales inválidas— no dispara esto.
    if (res.status === 401 && token) {
      useAuthStore.getState().logout();
    }
    const body = (await res.json().catch(() => null)) as {
      code?: string;
      message?: string;
    } | null;
    throw new ApiError(
      body?.code ?? 'UNKNOWN',
      body?.message ?? `Error ${res.status}`,
      res.status,
    );
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
