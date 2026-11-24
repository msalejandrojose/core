import createFetchClient from 'openapi-fetch';
import type { paths } from './generated/schema';

export interface ApiClientOptions {
  baseUrl: string;
  getToken?: () => string | null;
  /** `fetch` propio (p. ej. para renovar la sesión y reintentar ante un 401). */
  fetch?: (input: Request) => Promise<Response>;
}

export function createApiClient({ baseUrl, getToken, fetch }: ApiClientOptions) {
  const client = createFetchClient<paths>({ baseUrl, ...(fetch ? { fetch } : {}) });

  if (getToken) {
    client.use({
      onRequest({ request }) {
        const token = getToken();
        if (token) {
          request.headers.set('Authorization', `Bearer ${token}`);
        }
      },
    });
  }

  return client;
}

export type ApiClient = ReturnType<typeof createApiClient>;
