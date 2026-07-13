import { createApiClient } from '@core/api-client';
import { queryClient } from './query-client';
import { getAuthToken, useAuthStore } from '@/store/auth.store';

const apiUrl = import.meta.env.VITE_API_URL;

if (!apiUrl) {
  // Fallar pronto y claro si falta la config en lugar de hacer requests a `undefined`.
  throw new Error('VITE_API_URL no está definida. Revisa apps/backoffice/.env');
}

// La API vive bajo `/v1` (ver apps/api/src/main.ts). El schema generado y los
// call sites de la app son prefix-less: el prefijo se añade aquí, una única
// vez, en vez de en cada llamada.
const baseUrl = `${apiUrl}/v1`;

/**
 * Cliente HTTP tipado contra el OpenAPI de `@core/api`.
 * - Inyecta `Authorization: Bearer <token>` leyendo el auth store.
 * - Ante un 401 (sesión expirada/credenciales inválidas) cierra sesión, vacía la
 *   caché de queries y redirige a /login con un hard reload para limpiar estado.
 */
export const apiClient = createApiClient({
  baseUrl,
  getToken: getAuthToken,
});

apiClient.use({
  onResponse({ response }) {
    if (response.status === 401) {
      useAuthStore.getState().logout();
      queryClient.clear();
      // Evita un bucle de redirección si el propio login devolviese 401.
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return response;
  },
});
