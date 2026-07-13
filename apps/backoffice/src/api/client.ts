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
// La API vive versionada bajo `/v1` (ver `app.setGlobalPrefix` en apps/api);
// `SwaggerModule` genera el schema OpenAPI sin ese prefijo, así que hay que
// añadirlo aquí para que las rutas tipadas apunten a la URL real. Mismo
// convenio que los helpers de subida (`features/files/lib/http.ts`, etc.).
export const apiClient = createApiClient({
  baseUrl: `${baseUrl}/v1`,
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
