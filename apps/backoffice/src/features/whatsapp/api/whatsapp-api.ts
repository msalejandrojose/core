import { getAuthToken } from '@/store/auth.store';
import type {
  WhatsappAccount,
  WhatsappConversation,
  WhatsappMessage,
} from './types';

// Cliente `fetch` dedicado para las rutas de WhatsApp. No usamos el api-client
// tipado (`@core/api-client`) porque su esquema se genera desde el OpenAPI de
// una API viva y todavía no incluye estas rutas; en cuanto se regenere, se
// puede migrar. Inyecta el Bearer del auth store, igual que el api-client.
const RAW_BASE_URL = import.meta.env.VITE_API_URL as string | undefined;

if (!RAW_BASE_URL) {
  throw new Error('VITE_API_URL no está definida. Revisa apps/backoffice/.env');
}

const BASE_URL = `${RAW_BASE_URL}/v1`;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    let message = `Error ${res.status}`;
    try {
      const body = (await res.json()) as { message?: string };
      if (body?.message) message = body.message;
    } catch {
      // respuesta sin cuerpo JSON; nos quedamos con el status
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const whatsappApi = {
  listAccounts: () => request<WhatsappAccount[]>('/whatsapp/accounts'),
  listConversations: (accountId?: string) =>
    request<WhatsappConversation[]>(
      `/whatsapp/conversations${accountId ? `?accountId=${encodeURIComponent(accountId)}` : ''}`,
    ),
  listMessages: (conversationId: string) =>
    request<WhatsappMessage[]>(
      `/whatsapp/conversations/${conversationId}/messages`,
    ),
  sendMessage: (conversationId: string, body: string) =>
    request<WhatsappMessage>(
      `/whatsapp/conversations/${conversationId}/messages`,
      { method: 'POST', body: JSON.stringify({ body }) },
    ),
  markRead: (conversationId: string) =>
    request<WhatsappConversation>(
      `/whatsapp/conversations/${conversationId}/read`,
      { method: 'POST' },
    ),
};
