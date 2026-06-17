// Singleton del cliente @core/api-client.
//
// - Lee la baseUrl de VITE_API_URL.
// - Inyecta el JWT del authStore en cada request.
// - Si la API responde 401, expulsa al usuario (logout + redirect a /login).
//
// La forma final depende del package @core/api-client (openapi-fetch).
// Cuando esté generado, este factory pasará a usar createApiClient
// directamente; mientras tanto exportamos el shape mínimo que el resto
// del scaffold necesita para compilar.

import { useAuthStore } from '@/store/auth.store';

export interface ApiClient {
  baseUrl: string;
  getToken: () => string | null;
  on401: () => void;
}

export const apiClient: ApiClient = {
  baseUrl: import.meta.env.VITE_API_URL,
  getToken: () => useAuthStore.getState().token,
  on401: () => {
    useAuthStore.getState().logout();
    if (typeof window !== 'undefined') window.location.assign('/login');
  },
};
