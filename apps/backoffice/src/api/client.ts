import { createApiClient } from '@core/api-client';
import { queryClient } from './query-client';
import { getAuthToken, useAuthStore } from '@/store/auth.store';

const baseUrl = import.meta.env.VITE_API_URL;

if (!baseUrl) {
  // Fallar pronto y claro si falta la config en lugar de hacer requests a `undefined`.
  throw new Error('VITE_API_URL no está definida. Revisa apps/backoffice/.env');
}

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
