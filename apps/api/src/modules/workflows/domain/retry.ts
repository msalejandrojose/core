import { RetryPolicy } from './dsl/workflow-dsl';

// Base por defecto del backoff cuando el DSL no declara `baseSeconds`.
export const DEFAULT_RETRY_BASE_SECONDS = 10;
// Tope de seguridad del backoff (evita esperas absurdas con exponencial).
export const MAX_RETRY_BACKOFF_SECONDS = 24 * 60 * 60; // 24h

// Segundos a esperar antes de reintentar un step, dado el nº de intento que
// acaba de fallar (1-based). `linear` → base·intento; `exponential` (defecto) →
// base·2^(intento-1). El resultado se acota a [1, MAX_RETRY_BACKOFF_SECONDS].
export function computeBackoffSeconds(
  policy: RetryPolicy,
  failedAttempt: number,
): number {
  const base = policy.baseSeconds ?? DEFAULT_RETRY_BASE_SECONDS;
  const n = Math.max(1, failedAttempt);
  const raw =
    policy.backoff === 'linear' ? base * n : base * Math.pow(2, n - 1);
  const seconds = Math.ceil(raw);
  return Math.min(Math.max(seconds, 1), MAX_RETRY_BACKOFF_SECONDS);
}

// ¿Quedan reintentos tras fallar el intento `failedAttempt`? maxAttempts es el
// nº TOTAL de intentos permitidos (incluido el primero).
export function canRetry(policy: RetryPolicy, failedAttempt: number): boolean {
  return failedAttempt < policy.maxAttempts;
}
