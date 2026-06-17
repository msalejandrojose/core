import { createApiClient } from '@core/api-client';
import { getAuthToken, useAuthStore } from '@/store/auth.store';

const baseUrl = import.meta.env.VITE_API_URL;

if (!baseUrl) {
  // Fallar pronto y claro si falta la config en lugar de hacer requests a `undefined`.
  throw new Error('VITE_API_URL no está definida. Revisa apps/backoffice/.env.local');
}

/**
 * Cliente HTTP tipado contra el OpenAPI de `@core/api`.
 * - Inyecta `Authorization: Bearer <token>` leyendo el auth store.
 * - Cierra sesión automáticamente ante un 401 (sesión expirada/credenciales inválidas).
 */
export const apiClient = createApiClient({
  baseUrl,
  getToken: getAuthToken,
});

apiClient.use({
  onResponse({ response }) {
    if (response.status === 401) {
      useAuthStore.getState().logout();
    }
    return response;
  },
});
