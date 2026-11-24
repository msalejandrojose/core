import { createApiClient } from '@core/api-client';
import { getAuthToken, useAuthStore } from '@/store/auth.store';
import { refreshSession } from '@/lib/session';
import { API_BASE_URL } from './config';

// La API vive bajo `/v1` (ver apps/api/src/main.ts). El schema generado y los
// call sites de la app son prefix-less: el prefijo lo pone `API_BASE_URL`, una
// única vez. Sin `VITE_API_URL` no se lanza aquí (dejaba la app en blanco): lo
// gestiona `main.tsx` con `apiConfigured`.
const baseUrl = API_BASE_URL;

// Endpoints donde un 401 significa "credenciales incorrectas" (no sesión
// expirada) y por tanto NO deben renovar ni cerrar sesión: p. ej.
// change-password devuelve 401 INVALID_CREDENTIALS si la contraseña actual no
// es correcta; los de login/refresh son públicos.
const NO_REFRESH_ON_401 = ['/auth/change-password', '/auth/login', '/auth/refresh'];

/**
 * `fetch` con sesión que se renueva sola: si una llamada con token vuelve 401
 * (el JWT de 60 min caducó), cambia el refresh token por un par nuevo y la
 * repite una vez. Solo cierra sesión si la API dice que la sesión ya no vale;
 * sin red se devuelve el 401 tal cual y la sesión sigue guardada.
 */
async function sessionFetch(request: Request): Promise<Response> {
  const retry = request.clone();
  const response = await fetch(request);
  const sentToken = request.headers.get('Authorization');
  if (
    response.status !== 401 ||
    !sentToken ||
    NO_REFRESH_ON_401.some((p) => request.url.includes(p))
  ) {
    return response;
  }

  // Otra llamada ya renovó mientras esta iba en vuelo: reintentar sin renovar.
  const current = getAuthToken();
  const outcome =
    current && `Bearer ${current}` !== sentToken ? 'ok' : await refreshSession();
  if (outcome === 'expired') {
    useAuthStore.getState().logout();
    return response;
  }
  if (outcome === 'offline') return response;

  retry.headers.set('Authorization', `Bearer ${getAuthToken()}`);
  return fetch(retry);
}

/**
 * Cliente HTTP tipado contra el OpenAPI de `@core/api` (openapi-fetch).
 * Inyecta `Authorization: Bearer <token>` leyendo el auth store y renueva la
 * sesión ante un 401 (ver `sessionFetch`); el cambio de estado del store al
 * cerrar sesión redirige a /login.
 *
 * IMPORTANTE (arquitectura): la app NUNCA emite eventos de workflows por su
 * cuenta. Llama a endpoints de dominio y es la API quien publica el evento.
 */
export const apiClient = createApiClient({
  baseUrl,
  getToken: getAuthToken,
  fetch: sessionFetch,
});
