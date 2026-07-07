import { getAuthToken } from '@/store/auth.store';

const baseUrl = import.meta.env.VITE_API_URL;

export interface AsyncValidateResult {
  valid: boolean;
  message?: string;
}

/**
 * Ejecuta un validador asíncrono del backend (`POST /forms/validate/:ref`) para
 * las validaciones `{ kind: 'async', ref }` de `@core/forms`.
 *
 * Fail-open: si la red o el endpoint fallan, devuelve `valid: true` para no
 * bloquear el formulario — la validación autoritativa es la del submit en el
 * servidor. Este endpoint es solo UX en vivo.
 */
export async function validateAsync(
  ref: string,
  value: unknown,
  context?: Record<string, unknown>,
): Promise<AsyncValidateResult> {
  try {
    const token = getAuthToken();
    const res = await fetch(
      `${baseUrl}/forms/validate/${encodeURIComponent(ref)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ value, context }),
      },
    );
    if (!res.ok) return { valid: true };
    return (await res.json()) as AsyncValidateResult;
  } catch {
    return { valid: true };
  }
}
