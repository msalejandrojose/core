import createFetchClient from 'openapi-fetch';
import type { paths } from './generated/schema';

export interface ApiClientOptions {
  baseUrl: string;
  getToken?: () => string | null;
}

export function createApiClient({ baseUrl, getToken }: ApiClientOptions) {
  const client = createFetchClient<paths>({ baseUrl });

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
