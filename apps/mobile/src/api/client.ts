import { createApiClient } from '@core/api-client';
import { getAuthToken, useAuthStore } from '@/store/auth.store';

const baseUrl = import.meta.env.VITE_API_URL;

if (!baseUrl) {
  // Fallar pronto y claro si falta la config en vez de hacer requests a `undefined`.
  throw new Error('VITE_API_URL no está definida. Revisa apps/mobile/.env');
}

/**
 * Cliente HTTP tipado contra el OpenAPI de `@core/api` (openapi-fetch).
 * Sustituye al antiguo wrapper `fetch` a mano: params, body y respuestas quedan
 * inferidos por ruta desde el schema generado.
 *
 * - Inyecta `Authorization: Bearer <token>` leyendo el auth store (en el factory).
 * - Logout robusto: ante un 401 con sesión activa cierra sesión; el cambio de
 *   estado del store redirige a /login. Las llamadas públicas (login, reset…) no
 *   llevan token, así que su 401 —credenciales inválidas— no cierra nada.
 *
 * IMPORTANTE (arquitectura): la app NUNCA emite eventos de workflows por su
 * cuenta. Llama a endpoints de dominio y es la API quien publica el evento.
 */
export const apiClient = createApiClient({ baseUrl, getToken: getAuthToken });

apiClient.use({
  onResponse({ response }) {
    if (response.status === 401 && getAuthToken()) {
      useAuthStore.getState().logout();
    }
    return response;
  },
});
