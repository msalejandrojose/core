import type { FormSchemaJson } from '@core/forms';
import { getApiUrl } from './api';

export type FormResponsePolicy =
  | 'SINGLE_PER_LINK'
  | 'SINGLE_PER_USER'
  | 'UNLIMITED';

export interface PublicForm {
  id: string;
  title: string;
  description: string | null;
  schema: FormSchemaJson;
}

export interface PublicInstance {
  id: string;
  hash: string;
  responsePolicy: FormResponsePolicy;
  requiresAuth: boolean;
  opensAt: string | null;
  closesAt: string | null;
  maxResponses: number | null;
  status: 'ACTIVE' | 'CLOSED';
}

export interface PublicFormResponse {
  form: PublicForm;
  instance: PublicInstance;
}

/** Error de la API con el `code` del catálogo unificado (p. ej. FORM_INSTANCE_CLOSED). */
export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${getApiUrl()}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    // El filtro global de la API responde { code, message, statusCode, ... }.
    const body = (await res.json().catch(() => null)) as {
      code?: string;
      message?: string;
    } | null;
    throw new ApiError(
      body?.code ?? 'UNKNOWN',
      body?.message ?? `Error ${res.status}`,
      res.status,
    );
  }
  return res.json() as Promise<T>;
}

export function fetchPublicForm(hash: string): Promise<PublicFormResponse> {
  return request<PublicFormResponse>(
    `/public/forms/${encodeURIComponent(hash)}`,
  );
}

export function submitPublicForm(
  hash: string,
  answers: Record<string, unknown>,
): Promise<unknown> {
  return request(`/public/forms/${encodeURIComponent(hash)}/responses`, {
    method: 'POST',
    body: JSON.stringify({ answers }),
  });
}
