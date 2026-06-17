// Singleton del cliente @core/api-client.
//
// Lee VITE_API_URL del .env.local (committed) y adjunta el JWT del
// authStore en cada request. Cuando @core/api-client esté generado
// con openapi-fetch, este archivo se completará con createApiClient.

import { useAuthStore } from '@/store/auth.store';

export interface ApiClient {
  baseUrl: string;
  getToken: () => string | null;
}

export const apiClient: ApiClient = {
  baseUrl: import.meta.env.VITE_API_URL,
  getToken: () => useAuthStore.getState().token,
};
