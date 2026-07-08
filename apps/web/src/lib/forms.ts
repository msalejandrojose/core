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

// --- Captura pública de leads (dispara `lead.created` en el motor de workflows) ---

export interface CaptureLeadInput {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  customFields?: Record<string, unknown>;
  consentGiven?: boolean;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

export interface CaptureLeadResult {
  id: string;
  status: string;
}

/** ¿El texto parece un email? Enruta el campo libre "contacto" a email o phone. */
export function looksLikeEmail(value: string): boolean {
  return /.+@.+\..+/.test(value.trim());
}

/**
 * Lee los parámetros UTM de una query string (por defecto la de la URL actual)
 * para atribuir el lead a su campaña de origen.
 */
export function readUtmParams(
  search = typeof window !== 'undefined' ? window.location.search : '',
): Pick<CaptureLeadInput, 'utmSource' | 'utmMedium' | 'utmCampaign'> {
  const params = new URLSearchParams(search);
  const clean = (v: string | null) =>
    v && v.trim() ? v.trim().slice(0, 120) : undefined;
  return {
    utmSource: clean(params.get('utm_source')),
    utmMedium: clean(params.get('utm_medium')),
    utmCampaign: clean(params.get('utm_campaign')),
  };
}

/**
 * Captura un lead público (`POST /public/leads`). El backend publica el evento
 * `lead.created`, que a su vez dispara los workflows suscritos (bienvenida por
 * email/SMS/push, notificación interna, etc.). Marca la fuente como WEB_FORM.
 */
export function captureLead(input: CaptureLeadInput): Promise<CaptureLeadResult> {
  return request<CaptureLeadResult>('/public/leads', {
    method: 'POST',
    body: JSON.stringify({ source: 'WEB_FORM', ...input }),
  });
}
