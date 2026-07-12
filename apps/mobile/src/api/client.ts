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
// La API vive versionada bajo `/v1` (ver `app.setGlobalPrefix` en apps/api);
// `SwaggerModule` genera el schema OpenAPI sin ese prefijo, así que hay que
// añadirlo aquí para que las rutas tipadas apunten a la URL real. Mismo
// convenio que `uploadFormFile` en `components/forms/upload.ts`.
export const apiClient = createApiClient({
  baseUrl: `${baseUrl}/v1`,
  getToken: getAuthToken,
});

// Endpoints donde un 401 significa "credenciales incorrectas" (no sesión
// expirada) y por tanto NO deben cerrar sesión: p. ej. change-password devuelve
// 401 INVALID_CREDENTIALS si la contraseña actual no es correcta.
const NO_LOGOUT_ON_401 = ['/auth/change-password'];

apiClient.use({
  onResponse({ request, response }) {
    const isCredentialCheck = NO_LOGOUT_ON_401.some((p) =>
      request.url.includes(p),
    );
    if (response.status === 401 && getAuthToken() && !isCredentialCheck) {
      useAuthStore.getState().logout();
    }
    return response;
  },
});
