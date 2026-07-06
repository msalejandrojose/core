import {
  canRetry,
  computeBackoffSeconds,
  DEFAULT_RETRY_BASE_SECONDS,
  MAX_RETRY_BACKOFF_SECONDS,
} from './retry';
import { RetryPolicy } from './dsl/workflow-dsl';

const policy = (p: Partial<RetryPolicy>): RetryPolicy => ({
  maxAttempts: 3,
  ...p,
});

describe('computeBackoffSeconds', () => {
  it('exponencial por defecto: base·2^(intento-1)', () => {
    const p = policy({ baseSeconds: 10 });
    expect(computeBackoffSeconds(p, 1)).toBe(10); // 10·2^0
    expect(computeBackoffSeconds(p, 2)).toBe(20); // 10·2^1
    expect(computeBackoffSeconds(p, 3)).toBe(40); // 10·2^2
  });

  it('lineal: base·intento', () => {
    const p = policy({ backoff: 'linear', baseSeconds: 15 });
    expect(computeBackoffSeconds(p, 1)).toBe(15);
    expect(computeBackoffSeconds(p, 2)).toBe(30);
    expect(computeBackoffSeconds(p, 3)).toBe(45);
  });

  it('usa la base por defecto cuando no se declara baseSeconds', () => {
    const p = policy({ backoff: 'linear' });
    expect(computeBackoffSeconds(p, 1)).toBe(DEFAULT_RETRY_BASE_SECONDS);
  });

  it('acota el resultado al máximo de seguridad', () => {
    const p = policy({ maxAttempts: 10, baseSeconds: 100000 });
    expect(computeBackoffSeconds(p, 10)).toBe(MAX_RETRY_BACKOFF_SECONDS);
  });

  it('nunca devuelve menos de 1 segundo', () => {
    const p = policy({ backoff: 'linear', baseSeconds: 1 });
    expect(computeBackoffSeconds(p, 0)).toBeGreaterThanOrEqual(1);
  });
});

describe('canRetry', () => {
  it('quedan intentos mientras el fallo sea anterior al último', () => {
    const p = policy({ maxAttempts: 3 });
    expect(canRetry(p, 1)).toBe(true);
    expect(canRetry(p, 2)).toBe(true);
    expect(canRetry(p, 3)).toBe(false);
    expect(canRetry(p, 4)).toBe(false);
  });
});
