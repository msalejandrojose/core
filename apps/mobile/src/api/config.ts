/**
 * URL base de la API, sin `/v1` ni barra final. Sale de `VITE_API_URL` al
 * compilar (en los builds nativos, de `apps/mobile/.env.production.local`).
 *
 * Si falta, la app NO lanza al importar: antes `api/client.ts` hacía `throw`
 * y, como se importa desde casi todo, la app nativa se quedaba en blanco sin
 * pintar nada. Ahora `main.tsx` mira `apiConfigured` y enseña una pantalla que
 * dice qué falta.
 */
export const API_URL = (import.meta.env.VITE_API_URL ?? '').trim().replace(/\/+$/, '');

export const apiConfigured = API_URL !== '';

/** Base de las rutas de la API (`/v1` lo añade aquí, una sola vez). */
export const API_BASE_URL = `${API_URL}/v1`;
